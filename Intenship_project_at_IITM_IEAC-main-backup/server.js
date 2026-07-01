const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const ExcelJS = require('exceljs');
const db = require('./db_lowdb');
const { nanoid } = require('nanoid');

db.init();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Dedicated route for forcing xlsx downloads with correct headers
app.get('/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // sanitize — prevent path traversal
  const filePath = path.join(__dirname, 'public', filename);
  // Explicitly set correct MIME type for xlsx files – Express / the OS
  // may default to application/octet-stream on some Windows setups.
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // res.download() sets Content-Disposition: attachment and sends the file
  res.download(filePath, filename, (err) => {
    if (err && !res.headersSent) {
      console.error('Download error:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

io.on('connection', socket => {
  console.log('socket connected');
});

async function getInstrumentsWithBookings() {
  const instruments = await db.getInstruments();
  const bookings = await db.getBookings();
  const users = await db.getUsers();

  return instruments.map(inst => {
    // Find active approved booking
    const activeBooking = bookings.find(b => 
      String(b.instrumentId) === String(inst.id) && 
      !b.returnedDate && 
      b.status === 'approved'
    );

    let bookedBy = null;
    let nextAvailableDate = null;
    if (activeBooking) {
      const user = users.find(u => String(u.id) === String(activeBooking.userId));
      bookedBy = user ? user.name : 'Unknown User';
      nextAvailableDate = activeBooking.dueDate;
    }

    // Find all future bookings / pre-bookings (both pending and approved)
    const futureBookings = bookings
      .filter(b => 
        String(b.instrumentId) === String(inst.id) && 
        !b.returnedDate && 
        (b.status === 'approved' || b.status === 'pending') &&
        (!activeBooking || b.id !== activeBooking.id)
      )
      .map(b => {
        const user = users.find(u => String(u.id) === String(b.userId));
        return {
          id: b.id,
          userName: user ? user.name : 'Unknown User',
          userId: b.userId,
          status: b.status,
          startDate: b.startDate,
          dueDate: b.dueDate
        };
      });

    return {
      ...inst,
      bookedBy,
      nextAvailableDate,
      futureBookings
    };
  });
}

async function broadcastUpdate() {
  try {
    const instruments = await getInstrumentsWithBookings();
    io.emit('instruments', instruments);
  } catch (err) {
    console.error('broadcastUpdate error', err);
  }
}

app.get('/api/instruments', async (req, res) => {
  const instruments = await getInstrumentsWithBookings();
  res.json(instruments);
});

app.post('/api/instruments', async (req, res) => {
  // Accept full instrument object (including learning fields and file URLs)
  const payload = req.body || {};
  payload.location = payload.location || 'warehouse';
  // normalize productImages if provided as comma-separated string
  if (payload.productImages && typeof payload.productImages === 'string'){
    payload.productImages = payload.productImages.split(',').map(s=>s.trim()).filter(Boolean);
  }
  const info = await db.insertInstrument(payload);
  broadcastUpdate();
  res.json({ id: info.id });
});

app.put('/api/instruments/:id', async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  if (payload.productImages && typeof payload.productImages === 'string'){
    payload.productImages = payload.productImages.split(',').map(s=>s.trim()).filter(Boolean);
  }
  await db.updateInstrument(id, payload);
  broadcastUpdate();
  res.json({ ok: true });
});

app.delete('/api/instruments/:id', async (req, res) => {
  const id = req.params.id;
  await db.deleteInstrument(id);
  broadcastUpdate();
  res.json({ ok: true });
});

app.get('/api/users', async (req, res) => {
  const users = await db.getUsers();
  // Filter passwords before sending list
  const sanitized = users.map(({ password, ...u }) => u);
  res.json(sanitized);
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Mail ID and password are required.' });
  }
  const user = await db.getUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid Mail ID or password.' });
  }
  const { password: _, ...userInfo } = user;
  // Always normalize role to lowercase so frontend checks work consistently
  res.json({ ...userInfo, role: (userInfo.role || 'engineer').toLowerCase() });
});

app.post('/api/users', async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ error: 'All fields (Name, Mail ID, Phone, Password, Role) are required.' });
  }
  const existing = await db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Mail ID is already registered.' });
  }
  const newUser = await db.insertUser({ name, email, phone, password, role: role.toLowerCase() });
  const { password: _, ...sanitized } = newUser;
  res.json(sanitized);
});

app.post('/api/book', async (req, res) => {
  const { userId, instrumentId, days = 7, remarks, startDate: explicitStart, endDate: explicitEnd } = req.body;
  const inst = await db.getInstrumentById(instrumentId);
  if (!inst) return res.status(404).json({ error: 'Instrument not found' });

  const users = await db.getUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Pre-booking logic: find maximum due date from all active/future bookings
  const bookings = await db.getBookings();
  const activeAndFuture = bookings.filter(b => 
    String(b.instrumentId) === String(instrumentId) && 
    !b.returnedDate && 
    b.status !== 'denied'
  );

  let start, due;
  const isPreBooking = activeAndFuture.length > 0;

  if (explicitStart && explicitEnd) {
    // User-chosen date range (pre-booking with calendar)
    start = new Date(explicitStart);
    due = new Date(explicitEnd);
    // Validate: end must be after start
    if (due <= start) return res.status(400).json({ error: 'End date must be after start date.' });
  } else if (isPreBooking) {
    const dueDates = activeAndFuture.map(b => new Date(b.dueDate).getTime());
    const maxDue = Math.max(...dueDates);
    start = new Date(maxDue + 1000);
    due = new Date(start.getTime() + days * 24 * 3600 * 1000);
  } else {
    start = new Date();
    due = new Date(start.getTime() + days * 24 * 3600 * 1000);
  }

  if ((user.role || '').toLowerCase() === 'admin') {
    // Admin booked directly -> auto-approve and generate excel
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Booking');
      sheet.addRow(['SNo', 'Instrument Name', 'Model', 'Serial', 'Booked By', 'Start Date', 'Due Date', 'Previous Insight', 'Remarks']);
      const prev = inst.lastInsight || '';
      sheet.addRow([1, inst.name, inst.model, inst.serial, user.name, start.toISOString(), due.toISOString(), prev, remarks || '']);
      const fileName = `booking-${Date.now()}.xlsx`;
      const filePath = path.join(__dirname, 'public', fileName);
      await workbook.xlsx.writeFile(filePath);
      const sheetUrl = `/download/` + fileName;

      await db.insertBooking({
        userId,
        instrumentId,
        startDate: start.toISOString(),
        dueDate: due.toISOString(),
        remarks,
        status: 'approved',
        sheetUrl
      });
      
      // Only change status to booked if not already booked
      if (inst.status !== 'booked') {
        await db.updateInstrument(instrumentId, { status: 'booked', location: 'with_user' });
      }
      broadcastUpdate();

      try {
        io.emit('insight', { toUserId: userId, items: [{ instrumentId, instrumentName: inst.name, insight: prev }] });
      } catch (err) { console.error('emit insight error', err); }

      res.json({ ok: true, sheet: sheetUrl });
    } catch (err) {
      console.error('Failed to generate booking sheet for admin', err);
      await db.insertBooking({
        userId,
        instrumentId,
        startDate: start.toISOString(),
        dueDate: due.toISOString(),
        remarks,
        status: 'approved'
      });
      if (inst.status !== 'booked') {
        await db.updateInstrument(instrumentId, { status: 'booked', location: 'with_user' });
      }
      broadcastUpdate();
      res.json({ ok: true });
    }
  } else {
    // Engineer booked -> creates request
    await db.insertBooking({
      userId,
      instrumentId,
      startDate: start.toISOString(),
      dueDate: due.toISOString(),
      remarks,
      status: 'pending'
    });
    
    // Only set to requested if it is currently available
    if (inst.status === 'available') {
      await db.updateInstrument(instrumentId, { status: 'requested' });
    }
    broadcastUpdate();
    res.json({ ok: true, pending: true, message: isPreBooking ? 'Pre-booking request sent to admin for approval.' : 'Booking request sent to admin for approval.' });
  }
});

app.post('/api/book/bulk', async (req, res) => {
  const { userId, instrumentIds = [], days = 7, remarks, startDate: explicitStart, endDate: explicitEnd } = req.body;
  const users = await db.getUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const bookings = await db.getBookings();

  if ((user.role || '').toLowerCase() === 'admin') {
    // Admin bulk bookings auto-approved and bulk sheet generated
    const groupId = nanoid(8);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bookings');
    sheet.addRow(['SNo', 'Instrument Name', 'Model', 'Serial', 'Booked By', 'Start Date', 'Due Date', 'Previous Insight', 'Remarks']);
    let idx = 1;
    const itemsForNotification = [];
    const createdBookingIds = [];

    for (const instrumentId of instrumentIds) {
      try {
        const inst = await db.getInstrumentById(instrumentId);
        if (!inst) continue;

        // Calculate individual start date for this instrument
        const activeAndFuture = bookings.filter(b => 
          String(b.instrumentId) === String(instrumentId) && 
          !b.returnedDate && 
          b.status !== 'denied'
        );
        let start, due;
        if (explicitStart && explicitEnd) {
          start = new Date(explicitStart);
          due = new Date(explicitEnd);
        } else if (activeAndFuture.length > 0) {
          const dueDates = activeAndFuture.map(b => new Date(b.dueDate).getTime());
          start = new Date(Math.max(...dueDates) + 1000);
          due = new Date(start.getTime() + days * 24 * 3600 * 1000);
        } else {
          start = new Date();
          due = new Date(start.getTime() + days * 24 * 3600 * 1000);
        }
        
        const prev = inst.lastInsight || '';
        sheet.addRow([idx++, inst.name, inst.model, inst.serial, user.name, start.toISOString(), due.toISOString(), prev, remarks || '']);
        
        const b = await db.insertBooking({
          userId,
          instrumentId,
          startDate: start.toISOString(),
          dueDate: due.toISOString(),
          remarks,
          status: 'approved',
          bulkGroupId: groupId
        });
        createdBookingIds.push(b.id);
        
        // Only set status to booked if not already booked
        if (inst.status !== 'booked') {
          await db.updateInstrument(instrumentId, { status: 'booked', location: 'with_user' });
        }
        itemsForNotification.push({ instrumentId, instrumentName: inst.name, insight: prev });
      } catch (err) {
        console.error('bulk book error for', instrumentId, err);
      }
    }

    if (createdBookingIds.length === 0) {
      return res.status(400).json({ error: 'No instruments selected for booking.' });
    }

    // Add calibration reminders
    try {
      const calSheet = workbook.addWorksheet('CalibrationDue');
      calSheet.addRow(['SNo', 'Instrument Name', 'Model', 'Serial', 'Next Calibration Date', 'Days Left']);
      const all = await db.getInstruments();
      const now = new Date();
      const cutoff = new Date(now.getTime() + 15 * 24 * 3600 * 1000);
      let cidx = 1;
      all.forEach(i => {
        if (i.nextCalibrationDate) {
          const nd = new Date(i.nextCalibrationDate);
          if (nd >= now && nd <= cutoff) {
            const daysLeft = Math.ceil((nd - now) / (24 * 3600 * 1000));
            calSheet.addRow([cidx++, i.name, i.model, i.serial, i.nextCalibrationDate, daysLeft]);
          }
        }
      });

      const sum = workbook.addWorksheet('Summary');
      sum.addRow(['TotalBooked', createdBookingIds.length]);
      sum.addRow(['BookedBy', user.name]);
      sum.addRow(['StartDate', new Date().toISOString()]);
      sum.addRow(['DueDate', new Date(Date.now() + days * 24 * 3600 * 1000).toISOString()]);
      sum.addRow(['Remarks', remarks || '']);
    } catch (err) {
      console.error('failed to add calibration sheet', err);
    }

    try {
      const fileName = `booking-${Date.now()}.xlsx`;
      const filePath = path.join(__dirname, 'public', fileName);
      await workbook.xlsx.writeFile(filePath);
      const sheetUrl = '/download/' + fileName;

      for (const bid of createdBookingIds) {
        await db.updateBooking(bid, { sheetUrl });
      }

      broadcastUpdate();
      try {
        if (itemsForNotification.length) io.emit('insight', { toUserId: userId, items: itemsForNotification });
      } catch (err) { console.error('emit bulk insight error', err); }

      res.json({ ok: true, sheet: sheetUrl });
    } catch (err) {
      console.error('Failed to generate bulk booking sheet', err);
      broadcastUpdate();
      res.json({ ok: true });
    }
  } else {
    // Engineer bulk bookings -> ONE grouped pending request sharing a bulkGroupId
    const groupId = nanoid(8);
    let count = 0;
    for (const instrumentId of instrumentIds) {
      try {
        const inst = await db.getInstrumentById(instrumentId);
        if (!inst) continue;

        // Calculate individual start date for this instrument
        const activeAndFuture = bookings.filter(b => 
          String(b.instrumentId) === String(instrumentId) && 
          !b.returnedDate && 
          b.status !== 'denied'
        );
        let start, due;
        if (explicitStart && explicitEnd) {
          start = new Date(explicitStart);
          due = new Date(explicitEnd);
        } else if (activeAndFuture.length > 0) {
          const dueDates = activeAndFuture.map(b => new Date(b.dueDate).getTime());
          start = new Date(Math.max(...dueDates) + 1000);
          due = new Date(start.getTime() + days * 24 * 3600 * 1000);
        } else {
          start = new Date();
          due = new Date(start.getTime() + days * 24 * 3600 * 1000);
        }

        await db.insertBooking({
          userId,
          instrumentId,
          startDate: start.toISOString(),
          dueDate: due.toISOString(),
          remarks,
          status: 'pending',
          bulkGroupId: groupId   // links all instruments to one group request
        });
        
        // Only set to requested if currently available
        if (inst.status === 'available') {
          await db.updateInstrument(instrumentId, { status: 'requested' });
        }
        count++;
      } catch (err) {
        console.error('bulk book request error for', instrumentId, err);
      }
    }
    broadcastUpdate();
    if (count === 0) return res.status(400).json({ error: 'No instruments requested.' });
    res.json({ ok: true, pending: true, message: `Bulk booking request for ${count} instrument(s) submitted for admin approval.` });
  }
});

// ── Admin Booking Requests management ──────────────────────────────────────

// GET /api/booking-requests
// Returns pending requests grouped: single bookings are one entry each,
// bulk bookings (sharing a bulkGroupId) are collapsed into ONE entry.
app.get('/api/booking-requests', async (req, res) => {
  const rows = await db.getBookings();
  const pending = rows.filter(b => b.status === 'pending');
  const users = await db.getUsers();
  const instruments = await db.getInstruments();

  // Group: key = bulkGroupId (for bulk) or bookingId (for single)
  const groups = {};
  for (const b of pending) {
    const key = b.bulkGroupId || b.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  }

  const result = Object.entries(groups).map(([requestId, bookings]) => {
    const first = bookings[0];
    const user = users.find(u => String(u.id) === String(first.userId)) || {};
    const isBulk = !!first.bulkGroupId;
    const instrumentList = bookings.map(b => {
      const inst = instruments.find(i => String(i.id) === String(b.instrumentId)) || {};
      return {
        bookingId: b.id,
        id: inst.id || b.instrumentId,
        name: inst.name || 'Unknown',
        model: inst.model || 'N/A',
        serial: inst.serial || 'N/A'
      };
    });
    return {
      requestId,                       // bulkGroupId OR bookingId
      type: isBulk ? 'bulk' : 'single',
      userId: first.userId,
      userName: user.name || 'Unknown User',
      userEmail: user.email || 'N/A',
      instruments: instrumentList,
      startDate: first.startDate,
      dueDate: first.dueDate,
      remarks: first.remarks,
      status: 'pending'
    };
  });

  res.json(result);
});

// POST /api/booking-requests/:id/approve
// :id is either a bulkGroupId (for bulk) or a single bookingId.
app.post('/api/booking-requests/:id/approve', async (req, res) => {
  const { id } = req.params;

  // Check if this is a bulk group
  const allBookings = await db.getBookings();
  const bulkBookings = allBookings.filter(b => b.bulkGroupId === id && b.status === 'pending');

  if (bulkBookings.length > 0) {
    // ── BULK GROUP APPROVAL ─────────────────────────────────────────────────
    const users = await db.getUsers();
    const user = users.find(u => String(u.id) === String(bulkBookings[0].userId)) || { name: 'Unknown User' };
    const start = new Date(bulkBookings[0].startDate);
    const due = new Date(bulkBookings[0].dueDate);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bookings');
    sheet.addRow(['SNo', 'Instrument Name', 'Model', 'Serial', 'Booked By', 'Start Date', 'Due Date', 'Previous Insight', 'Remarks']);
    let idx = 1;
    const insightItems = [];

    for (const b of bulkBookings) {
      const inst = await db.getInstrumentById(b.instrumentId);
      if (!inst) continue;
      const prev = inst.lastInsight || '';
      sheet.addRow([idx++, inst.name, inst.model, inst.serial, user.name, start.toISOString(), due.toISOString(), prev, b.remarks || '']);
      insightItems.push({ instrumentId: b.instrumentId, instrumentName: inst.name, insight: prev });
    }

    // Calibration due + Summary sheets
    try {
      const calSheet = workbook.addWorksheet('CalibrationDue');
      calSheet.addRow(['SNo', 'Instrument Name', 'Model', 'Serial', 'Next Calibration Date', 'Days Left']);
      const all = await db.getInstruments();
      const now = new Date();
      const cutoff = new Date(now.getTime() + 15 * 24 * 3600 * 1000);
      let cidx = 1;
      all.forEach(i => {
        if (i.nextCalibrationDate) {
          const nd = new Date(i.nextCalibrationDate);
          if (nd >= now && nd <= cutoff) {
            calSheet.addRow([cidx++, i.name, i.model, i.serial, i.nextCalibrationDate, Math.ceil((nd - now) / (24 * 3600 * 1000))]);
          }
        }
      });
      const sum = workbook.addWorksheet('Summary');
      sum.addRow(['TotalBooked', bulkBookings.length]);
      sum.addRow(['BookedBy', user.name]);
      sum.addRow(['StartDate', start.toISOString()]);
      sum.addRow(['DueDate', due.toISOString()]);
      sum.addRow(['Remarks', bulkBookings[0].remarks || '']);
    } catch (err) { console.error('failed calibration/summary sheet', err); }

    try {
      const fileName = `booking-bulk-${id}-${Date.now()}.xlsx`;
      const filePath = path.join(__dirname, 'public', fileName);
      await workbook.xlsx.writeFile(filePath);
      const sheetUrl = `/download/` + fileName;

      // Approve every booking in the group and set sheetUrl on each
      for (const b of bulkBookings) {
        await db.updateBooking(b.id, { status: 'approved', sheetUrl });
        // Check if there is currently an active approved booking (other than the one we are approving)
        const bookingsList = await db.getBookings();
        const activeApproved = bookingsList.find(x => 
          String(x.instrumentId) === String(b.instrumentId) && 
          !x.returnedDate && 
          x.status === 'approved' && 
          x.id !== b.id
        );
        if (!activeApproved) {
          await db.updateInstrument(b.instrumentId, { status: 'booked', location: 'with_user' });
        }
      }
      broadcastUpdate();
      try { io.emit('insight', { toUserId: bulkBookings[0].userId, items: insightItems }); } catch (_) {}
      res.json({ ok: true, sheet: sheetUrl });
    } catch (err) {
      console.error('Failed to generate bulk sheet on approval', err);
      for (const b of bulkBookings) {
        await db.updateBooking(b.id, { status: 'approved' });
        const bookingsList = await db.getBookings();
        const activeApproved = bookingsList.find(x => 
          String(x.instrumentId) === String(b.instrumentId) && 
          !x.returnedDate && 
          x.status === 'approved' && 
          x.id !== b.id
        );
        if (!activeApproved) {
          await db.updateInstrument(b.instrumentId, { status: 'booked', location: 'with_user' });
        }
      }
      broadcastUpdate();
      res.json({ ok: true });
    }
  } else {
    // ── SINGLE BOOKING APPROVAL ─────────────────────────────────────────────
    const booking = await db.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking request not found' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Request is not pending.' });

    const inst = await db.getInstrumentById(booking.instrumentId);
    if (!inst) return res.status(404).json({ error: 'Instrument not found' });

    const users = await db.getUsers();
    const user = users.find(u => String(u.id) === String(booking.userId)) || { name: 'Unknown User' };
    const start = new Date(booking.startDate);
    const due = new Date(booking.dueDate);

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Booking');
      sheet.addRow(['SNo', 'Instrument Name', 'Model', 'Serial', 'Booked By', 'Start Date', 'Due Date', 'Previous Insight', 'Remarks']);
      const prev = inst.lastInsight || '';
      sheet.addRow([1, inst.name, inst.model, inst.serial, user.name, start.toISOString(), due.toISOString(), prev, booking.remarks || '']);
      const fileName = `booking-${booking.id}-${Date.now()}.xlsx`;
      const filePath = path.join(__dirname, 'public', fileName);
      await workbook.xlsx.writeFile(filePath);
      const sheetUrl = `/download/` + fileName;

      await db.updateBooking(booking.id, { status: 'approved', sheetUrl });
      
      const bookingsList = await db.getBookings();
      const activeApproved = bookingsList.find(x => 
        String(x.instrumentId) === String(booking.instrumentId) && 
        !x.returnedDate && 
        x.status === 'approved' && 
        x.id !== booking.id
      );
      if (!activeApproved) {
        await db.updateInstrument(booking.instrumentId, { status: 'booked', location: 'with_user' });
      }
      broadcastUpdate();
      try { io.emit('insight', { toUserId: booking.userId, items: [{ instrumentId: booking.instrumentId, instrumentName: inst.name, insight: prev }] }); } catch (_) {}
      res.json({ ok: true, sheet: sheetUrl });
    } catch (err) {
      console.error('Failed to generate sheet on approval', err);
      await db.updateBooking(booking.id, { status: 'approved' });
      const bookingsList = await db.getBookings();
      const activeApproved = bookingsList.find(x => 
        String(x.instrumentId) === String(booking.instrumentId) && 
        !x.returnedDate && 
        x.status === 'approved' && 
        x.id !== booking.id
      );
      if (!activeApproved) {
        await db.updateInstrument(booking.instrumentId, { status: 'booked', location: 'with_user' });
      }
      broadcastUpdate();
      res.json({ ok: true });
    }
  }
});

// POST /api/booking-requests/:id/deny
// :id is either a bulkGroupId or a single bookingId.
app.post('/api/booking-requests/:id/deny', async (req, res) => {
  const { id } = req.params;

  const allBookings = await db.getBookings();
  const bulkBookings = allBookings.filter(b => b.bulkGroupId === id && b.status === 'pending');

  if (bulkBookings.length > 0) {
    for (const b of bulkBookings) {
      await db.updateBooking(b.id, { status: 'denied' });
      await db.updateInstrument(b.instrumentId, { status: 'available', location: 'warehouse' });
    }
    broadcastUpdate();
    res.json({ ok: true });
  } else {
    const booking = await db.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking request not found' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Request is not pending.' });
    await db.updateBooking(booking.id, { status: 'denied' });
    await db.updateInstrument(booking.instrumentId, { status: 'available', location: 'warehouse' });
    broadcastUpdate();
    res.json({ ok: true });
  }
});

// DELETE /api/users/:id  (admin only — protected by trust on frontend)
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const users = await db.getUsers();
  const user = users.find(u => String(u.id) === String(id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  // Prevent deleting the primary built-in admin by email
  if ((user.email || '').toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'Cannot delete the primary admin account.' });
  }
  await db.deleteUser(id);
  res.json({ ok: true });
});

async function handleInstrumentReturnTransition(instrumentId, returnedBookingId) {
  const bookingsList = await db.getBookings();
  
  // Find approved future pre-bookings for this instrument (excluding the returned one)
  const approvedPre = bookingsList
    .filter(b => 
      String(b.instrumentId) === String(instrumentId) && 
      !b.returnedDate && 
      b.status === 'approved' && 
      b.id !== returnedBookingId
    )
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (approvedPre.length > 0) {
    const nextB = approvedPre[0];
    // Calculate requested duration in days
    const durationMs = new Date(nextB.dueDate) - new Date(nextB.startDate);
    const days = Math.max(1, Math.round(durationMs / (24 * 3600 * 1000)));
    
    // Shift dates to start NOW since it's checked out to the next pre-booker
    const now = new Date();
    const newDue = new Date(now.getTime() + days * 24 * 3600 * 1000);
    
    await db.updateBooking(nextB.id, {
      startDate: now.toISOString(),
      dueDate: newDue.toISOString()
    });
    await db.updateInstrument(instrumentId, { status: 'booked', location: 'with_user' });
  } else {
    // Check if there are any pending pre-bookings
    const pendingPre = bookingsList.filter(b => 
      String(b.instrumentId) === String(instrumentId) && 
      !b.returnedDate && 
      b.status === 'pending'
    );
    if (pendingPre.length > 0) {
      await db.updateInstrument(instrumentId, { status: 'requested', location: 'warehouse' });
    } else {
      await db.updateInstrument(instrumentId, { status: 'available', location: 'warehouse' });
    }
  }
}

app.post('/api/return', async (req, res) => {
  const { instrumentId, remarks } = req.body;
  const booking = await db.findActiveBookingByInstrument(instrumentId);
  if (!booking) return res.status(404).json({ error: 'Active booking not found' });
  const returnedDate = new Date().toISOString();
  await db.returnBooking(booking.id, returnedDate, remarks);
  await handleInstrumentReturnTransition(instrumentId, booking.id);
  broadcastUpdate();
  res.json({ ok: true });
});

app.post('/api/return/bulk', async (req, res) => {
  const { instrumentIds = [], remarks } = req.body;
  for (const instrumentId of instrumentIds) {
    try {
      const booking = await db.findActiveBookingByInstrument(instrumentId);
      if (!booking) continue;
      const returnedDate = new Date().toISOString();
      await db.returnBooking(booking.id, returnedDate, remarks);
      await handleInstrumentReturnTransition(instrumentId, booking.id);
      // store last insight if provided
      if (remarks && remarks.length) await db.setInstrumentInsight(instrumentId, remarks);
    } catch (err) {
      console.error('bulk return error for', instrumentId, err);
    }
  }
  broadcastUpdate();
  res.json({ ok: true });
});

app.get('/api/calibration/due', async (req, res)=>{
  const days = Number(req.query.days) || 15;
  const rows = await db.getInstrumentsDueForCalibration(days);
  res.json(rows);
});

app.post('/api/instrument/insight', async (req, res)=>{
  const { instrumentId, insight } = req.body;
  if(!instrumentId) return res.status(400).json({ error: 'instrumentId required' });
  await db.setInstrumentInsight(instrumentId, insight || '');
  res.json({ ok: true });
});

app.get('/api/bookings', async (req, res) => {
  const rows = await db.getBookings();
  const users = await db.getUsers();
  const instruments = await db.getInstruments();
  const result = rows.map(b => ({ ...b, userName: (users.find(u=>u.id===b.userId)||{}).name, instrumentName: (instruments.find(i=>i.id===b.instrumentId)||{}).name, instrumentModel: (instruments.find(i=>i.id===b.instrumentId)||{}).model, instrumentSerial: (instruments.find(i=>i.id===b.instrumentId)||{}).serial }));
  res.json(result.sort((a,b)=> new Date(b.startDate)-new Date(a.startDate)));
});

app.get('/api/calibrations', async (req, res) => {
  const instruments = await db.getInstruments();
  const rows = instruments.map(i => {
    const next = i.nextCalibrationDate || null;
    const dueIn = next ? (new Date(next) - new Date()) : null;
    return { ...i, dueInMilliseconds: dueIn };
  });
  res.json(rows);
});

app.post('/api/calibrate', async (req, res) => {
  // Accept optional calibration certificate URL and cycle days from frontend
  const { instrumentId, byUserId, certificateUrl, cycleDays } = req.body;
  if(!instrumentId) return res.status(400).json({ error: 'instrumentId required' });
  const now = new Date();
  const days = Number(cycleDays) || 365;
  const next = new Date(now.getTime() + days*24*3600*1000);
  const update = {
    lastCalibrationDate: now.toISOString(),
    nextCalibrationDate: next.toISOString(),
    calibrationCycleDays: days
  };
  if (certificateUrl) update.calibrationCertificateUrl = certificateUrl;
  await db.updateInstrument(instrumentId, update);
  // optionally record who performed it (not persisted separately currently)
  broadcastUpdate();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on', PORT));
