const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const ExcelJS = require('exceljs');
const db = require('./db_lowdb');
const { nanoid } = require('nanoid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

db.init();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const JWT_SECRET = process.env.JWT_SECRET || 'iitm-ieac-super-secret-key-98765';

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication and Authorization Middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Authentication required. Please log in.' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    req.user = decoded; // { id, email, role }
    next();
  });
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const role = (req.user.role || '').toLowerCase();
    if (!allowedRoles.map(r => r.toLowerCase()).includes(role)) {
      return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
    }
    next();
  };
};

const safeDateString = (dateVal, fallback = 'N/A') => {
  if (!dateVal) return fallback;
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
};

// Dedicated route for forcing xlsx downloads with correct headers
app.get('/download/:filename', authenticateToken, async (req, res) => {
  const filename = path.basename(req.params.filename); // sanitize — prevent path traversal

  try {
    const bookings = await db.getBookings();
    const instruments = await db.getInstruments();
    const users = await db.getUsers();

    // Look up bookings that match the requested sheet URL in the database
    const targetBookings = bookings.filter(b => b.sheetUrl === '/download/' + filename);
    const isBulk = targetBookings.length > 0 && targetBookings.some(b => b.bulkGroupId);

    if (targetBookings.length > 0) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(isBulk ? 'Bookings' : 'Booking');
      
      // Headers
      sheet.addRow([
        'SNo', 
        'Instrument Name', 
        'Model', 
        'Serial', 
        'Booked By', 
        'Start Date', 
        'Due Date', 
        'Previous Insight', 
        'Remarks', 
        'Returned Date', 
        'Returned By', 
        'Return Notes'
      ]);

      let idx = 1;
      for (const b of targetBookings) {
        const inst = instruments.find(i => String(i.id) === String(b.instrumentId)) || {};
        const user = users.find(u => String(u.id) === String(b.userId)) || {};
        const prev = inst.lastInsight || '';
        
        sheet.addRow([
          idx++,
          inst.name || 'Unknown',
          inst.model || 'N/A',
          inst.serial || 'N/A',
          user.name || 'Unknown User',
          safeDateString(b.startDate),
          safeDateString(b.dueDate),
          prev,
          b.remarks || '',
          b.returnedDate ? safeDateString(b.returnedDate) : 'Active',
          b.returnedByName || 'N/A',
          b.returnRemarks || ''
        ]);
      }

      // Add Calibration due + Summary sheets for bulk bookings
      if (isBulk) {
        try {
          const calSheet = workbook.addWorksheet('CalibrationDue');
          calSheet.addRow(['SNo', 'Instrument Name', 'Model', 'Serial', 'Next Calibration Date', 'Days Left']);
          const now = new Date();
          const cutoff = new Date(now.getTime() + 15 * 24 * 3600 * 1000);
          let cidx = 1;
          instruments.forEach(i => {
            if (i.nextCalibrationDate) {
              const nd = new Date(i.nextCalibrationDate);
              if (nd >= now && nd <= cutoff) {
                calSheet.addRow([cidx++, i.name, i.model, i.serial, i.nextCalibrationDate, Math.ceil((nd - now) / (24 * 3600 * 1000))]);
              }
            }
          });

          const firstB = targetBookings[0];
          const user = users.find(u => String(u.id) === String(firstB.userId)) || { name: 'Unknown User' };
          const sum = workbook.addWorksheet('Summary');
          sum.addRow(['TotalBooked', targetBookings.length]);
          sum.addRow(['BookedBy', user.name]);
          sum.addRow(['StartDate', safeDateString(firstB.startDate)]);
          sum.addRow(['DueDate', safeDateString(firstB.dueDate)]);
          sum.addRow(['Remarks', firstB.remarks || '']);
        } catch (err) {
          console.error('failed calibration/summary sheet', err);
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
      return;
    }
  } catch (err) {
    console.error('Dynamic XLSX generation failed:', err);
  }

  // Fallback to static file if not dynamically generated
  const filePath = path.join(__dirname, 'public', filename);
  res.sendFile(filePath, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }, (err) => {
    if (err && !res.headersSent) {
      console.error('Download error:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

io.on('connection', socket => {
  console.log('socket connected');
});

function findCurrentApprovedBooking(bookings, instrumentId) {
  const now = new Date();
  const approved = bookings
    .filter(b => String(b.instrumentId) === String(instrumentId) && !b.returnedDate && b.status === 'approved')
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const active = approved.filter(b => {
    const start = new Date(b.startDate);
    const due = new Date(b.dueDate);
    return start <= now && due >= now;
  });
  if (active.length > 0) {
    return active[active.length - 1];
  }

  const overdue = approved.filter(b => new Date(b.dueDate) < now);
  if (overdue.length > 0) {
    return overdue[overdue.length - 1];
  }

  if (approved.length > 0) {
    return approved[0];
  }

  return null;
}

async function getInstrumentsWithBookings() {
  const instruments = await db.getInstruments();
  const bookings = await db.getBookings();
  const users = await db.getUsers();

  return instruments.map(inst => {
    const activeBooking = findCurrentApprovedBooking(bookings, inst.id);

    let bookedBy = null;
    let nextAvailableDate = null;
    if (activeBooking) {
      const user = users.find(u => String(u.id) === String(activeBooking.userId));
      bookedBy = user ? user.name : 'Unknown User';
      nextAvailableDate = activeBooking.dueDate;
    }

    const futureBookings = bookings
      .filter(b => 
        String(b.instrumentId) === String(inst.id) && 
        !b.returnedDate && 
        (b.status === 'approved' || b.status === 'pending') &&
        (!activeBooking || b.id !== activeBooking.id)
      )
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
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

    const nextBooking = futureBookings.length > 0 ? futureBookings[0] : null;

    return {
      ...inst,
      bookedBy,
      nextAvailableDate,
      futureBookings,
      nextBooking
    };
  });
}

async function broadcastUpdate() {
  try {
    const instruments = await getInstrumentsWithBookings();
    io.emit('instruments', instruments);
    io.emit('bookings');
  } catch (err) {
    console.error('broadcastUpdate error', err);
  }
}

app.get('/api/instruments', authenticateToken, async (req, res) => {
  const instruments = await getInstrumentsWithBookings();
  res.json(instruments);
});

app.post('/api/instruments', authenticateToken, requireRole(['admin']), async (req, res) => {
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

app.put('/api/instruments/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  if (payload.productImages && typeof payload.productImages === 'string'){
    payload.productImages = payload.productImages.split(',').map(s=>s.trim()).filter(Boolean);
  }
  await db.updateInstrument(id, payload);
  broadcastUpdate();
  res.json({ ok: true });
});

app.delete('/api/instruments/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const id = req.params.id;
  await db.deleteInstrument(id);
  broadcastUpdate();
  res.json({ ok: true });
});

app.get('/api/users', authenticateToken, async (req, res) => {
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
  if (!user) {
    return res.status(401).json({ error: 'Invalid Mail ID or password.' });
  }
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid Mail ID or password.' });
  }
  const { password: _, ...userInfo } = user;
  const role = (userInfo.role || 'engineer').toLowerCase();
  
  const tokenPayload = { id: userInfo.id, email: userInfo.email, role };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: false, // Set to true if deploying over HTTPS
    sameSite: 'strict',
    maxAge: 8 * 3600 * 1000 // 8 hours
  });

  res.json({ ...userInfo, role });
});

app.post('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
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

app.post('/api/book', authenticateToken, async (req, res) => {
  const { instrumentId, days = 7, remarks, startDate: explicitStart, endDate: explicitEnd } = req.body;
  const userId = req.user.id;
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
  } else if (isPreBooking) {
    // Pre-booking logic: find maximum due date from all active/future bookings
    let maxDue = new Date();
    activeAndFuture.forEach(b => {
      const d = new Date(b.dueDate);
      if (d > maxDue) {
        maxDue = d;
      }
    });
    // Start after the maximum due date (plus 1 second to avoid sub-second overlap issues)
    start = new Date(maxDue.getTime() + 1000);
    due = new Date(start.getTime() + days * 24 * 3600 * 1000);
  } else {
    // Standard duration booking (starting now)
    start = new Date();
    due = new Date(start.getTime() + days * 24 * 3600 * 1000);
  }

  // Validate: end must be after start
  if (due <= start) return res.status(400).json({ error: 'End date must be after start date.' });

  const now = new Date();
  const currentBooking = activeAndFuture.find(b => {
    if (b.status !== 'approved') return false;
    const bStart = new Date(b.startDate);
    const bDue = new Date(b.dueDate);
    return bStart <= now && bDue >= now;
  });

  const futureQueue = activeAndFuture.filter(b => {
    const bStart = new Date(b.startDate);
    return bStart > now || b.status === 'pending';
  });

  if (futureQueue.length > 0 && (!currentBooking || explicitStart || explicitEnd)) {
    return res.status(400).json({
      error: 'This instrument already has a pending/future pre-booking queue. Only one queued request is allowed at a time.'
    });
  }

  // Validate that the requested range does not overlap with any existing non-denied booking
  const overlap = activeAndFuture.find(b => {
    const bStart = new Date(b.startDate);
    const bDue = new Date(b.dueDate);
    return start < bDue && due > bStart;
  });
  if (overlap) {
    return res.status(400).json({ 
      error: `Requested booking dates overlap with an existing booking/request for this instrument (${new Date(overlap.startDate).toLocaleDateString()} to ${new Date(overlap.dueDate).toLocaleDateString()}).` 
    });
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

app.post('/api/book/bulk', authenticateToken, async (req, res) => {
  const { instrumentIds = [], days = 7, remarks, startDate: explicitStart, endDate: explicitEnd } = req.body;
  const userId = req.user.id;
  const users = await db.getUsers();
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const bookings = await db.getBookings();

  let start, due;
  if (explicitStart && explicitEnd) {
    start = new Date(explicitStart);
    due = new Date(explicitEnd);
  } else {
    start = new Date();
    due = new Date(start.getTime() + days * 24 * 3600 * 1000);
  }

  if (due <= start) return res.status(400).json({ error: 'End date must be after start date.' });

  // Validate that no instrument has an overlapping booking/request
  for (const instrumentId of instrumentIds) {
    const inst = await db.getInstrumentById(instrumentId);
    if (!inst) continue;

    const activeAndFuture = bookings.filter(b => 
      String(b.instrumentId) === String(instrumentId) && 
      !b.returnedDate && 
      b.status !== 'denied'
    );

    const now = new Date();
    const futureQueue = activeAndFuture.filter(b => {
      const bStart = new Date(b.startDate);
      return b.status === 'pending' || bStart > now;
    });
    if (futureQueue.length > 0) {
      return res.status(400).json({
        error: 'This instrument already has a pending or future pre-booking queue. Only one queue is allowed at a time.'
      });
    }

    const overlap = activeAndFuture.find(b => {
      const bStart = new Date(b.startDate);
      const bDue = new Date(b.dueDate);
      return start < bDue && due > bStart;
    });

    if (overlap) {
      return res.status(400).json({ 
        error: `Booking dates for instrument "${inst.name}" overlap with an existing booking/request (${new Date(overlap.startDate).toLocaleDateString()} to ${new Date(overlap.dueDate).toLocaleDateString()}).` 
      });
    }
  }

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
app.post('/api/booking-requests/:id/approve', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;

  // Check if this is a bulk group
  const allBookings = await db.getBookings();
  const bulkBookings = allBookings.filter(b => b.bulkGroupId === id && b.status === 'pending');

  if (bulkBookings.length > 0) {
    // Validate that none of the instruments has an overlapping approved booking
    const bookingsList = await db.getBookings();
    for (const b of bulkBookings) {
      const inst = await db.getInstrumentById(b.instrumentId);
      if (!inst) continue;

      const activeApproved = bookingsList.filter(x => 
        String(x.instrumentId) === String(b.instrumentId) && 
        !x.returnedDate && 
        x.status === 'approved' && 
        x.id !== b.id
      );

      const bStart = new Date(b.startDate);
      const bDue = new Date(b.dueDate);
      const overlap = activeApproved.find(x => {
        const xStart = new Date(x.startDate);
        const xDue = new Date(x.dueDate);
        return bStart < xDue && bDue > xStart;
      });

      if (overlap) {
        return res.status(400).json({ 
          error: `Approval failed. Instrument "${inst.name}" has an overlapping approved booking from ${new Date(overlap.startDate).toLocaleDateString()} to ${new Date(overlap.dueDate).toLocaleDateString()}.` 
        });
      }
    }

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

    // Validate that this instrument doesn't have an overlapping approved booking
    const bookingsList = await db.getBookings();
    const activeApproved = bookingsList.filter(x => 
      String(x.instrumentId) === String(booking.instrumentId) && 
      !x.returnedDate && 
      x.status === 'approved' && 
      x.id !== booking.id
    );

    const bStart = new Date(booking.startDate);
    const bDue = new Date(booking.dueDate);
    const overlap = activeApproved.find(x => {
      const xStart = new Date(x.startDate);
      const xDue = new Date(x.dueDate);
      return bStart < xDue && bDue > xStart;
    });

    if (overlap) {
      return res.status(400).json({ 
        error: `Approval failed. Instrument "${inst.name}" has an overlapping approved booking from ${new Date(overlap.startDate).toLocaleDateString()} to ${new Date(overlap.dueDate).toLocaleDateString()}.` 
      });
    }

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
app.post('/api/booking-requests/:id/deny', authenticateToken, requireRole(['admin']), async (req, res) => {
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

// DELETE /api/users/:id  (admin only)
app.delete('/api/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
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

async function reconcileInstrumentStatus(instrumentId) {
  const bookingsList = await db.getBookings();
  const now = new Date();
  const remaining = bookingsList.filter(b => String(b.instrumentId) === String(instrumentId) && !b.returnedDate);
  const active = remaining.find(b => {
    if (b.status !== 'approved') return false;
    const start = new Date(b.startDate);
    const due = new Date(b.dueDate);
    return start <= now && due >= now;
  });
  if (active) {
    return await db.updateInstrument(instrumentId, { status: 'booked', location: 'with_user' });
  }
  const futureApproved = remaining.some(b => b.status === 'approved' && new Date(b.startDate) > now);
  const pending = remaining.some(b => b.status === 'pending');
  if (pending || futureApproved) {
    return await db.updateInstrument(instrumentId, { status: 'requested', location: 'warehouse' });
  }
  return await db.updateInstrument(instrumentId, { status: 'available', location: 'warehouse' });
}

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
    // There is an approved pre-booking. Mark instrument status as booked.
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

app.post('/api/return', authenticateToken, async (req, res) => {
  const { instrumentId, remarks } = req.body;
  const booking = await db.findActiveBookingByInstrument(instrumentId);
  if (!booking) return res.status(404).json({ error: 'Active booking not found' });
  if (req.user.role !== 'admin' && String(booking.userId) !== String(req.user.id)) {
    return res.status(403).json({ error: 'You are not authorized to return this instrument.' });
  }
  const returnedDate = new Date().toISOString();
  const users = await db.getUsers();
  const returnUser = users.find(u => String(u.id) === String(req.user.id));
  await db.returnBooking(booking.id, returnedDate, remarks, req.user.id, returnUser?.name || 'Unknown');
  await handleInstrumentReturnTransition(instrumentId, booking.id);
  broadcastUpdate();
  res.json({ ok: true });
});

app.post('/api/return/bulk', authenticateToken, async (req, res) => {
  const { instrumentIds = [], remarks } = req.body;
  const users = await db.getUsers();
  const returnUser = users.find(u => String(u.id) === String(req.user.id));
  for (const instrumentId of instrumentIds) {
    try {
      const booking = await db.findActiveBookingByInstrument(instrumentId);
      if (!booking) continue;
      if (req.user.role !== 'admin' && String(booking.userId) !== String(req.user.id)) continue;
      const returnedDate = new Date().toISOString();
      await db.returnBooking(booking.id, returnedDate, remarks, req.user.id, returnUser?.name || 'Unknown');
      await handleInstrumentReturnTransition(instrumentId, booking.id);
      if (remarks && remarks.length) await db.setInstrumentInsight(instrumentId, remarks);
    } catch (err) {
      console.error('bulk return error for', instrumentId, err);
    }
  }
  broadcastUpdate();
  res.json({ ok: true });
});

app.get('/api/calibration/due', authenticateToken, async (req, res)=>{
  const days = Number(req.query.days) || 15;
  const rows = await db.getInstrumentsDueForCalibration(days);
  res.json(rows);
});

app.post('/api/instrument/insight', authenticateToken, async (req, res)=>{
  const { instrumentId, insight } = req.body;
  if(!instrumentId) return res.status(400).json({ error: 'instrumentId required' });
  await db.setInstrumentInsight(instrumentId, insight || '');
  res.json({ ok: true });
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
  const rows = await db.getBookings();
  const users = await db.getUsers();
  const instruments = await db.getInstruments();
  const result = rows.map(b => {
    const user = users.find(u => String(u.id) === String(b.userId)) || {}
    const inst = instruments.find(i => String(i.id) === String(b.instrumentId)) || {}
    return {
      ...b,
      userName: user.name,
      instrumentName: inst.name,
      instrumentModel: inst.model,
      instrumentSerial: inst.serial,
      instrumentImage: Array.isArray(inst.productImages) ? inst.productImages[0] : null
    }
  })
  res.json(result.sort((a,b)=> new Date(b.startDate)-new Date(a.startDate)))
});

app.get('/api/calibrations', authenticateToken, async (req, res) => {
  const instruments = await db.getInstruments();
  const rows = instruments.map(i => {
    const next = i.nextCalibrationDate || null;
    const dueIn = next ? (new Date(next) - new Date()) : null;
    return { ...i, dueInMilliseconds: dueIn };
  });
  res.json(rows);
});

app.post('/api/calibrate', authenticateToken, requireRole(['admin', 'engineer', 'technician']), async (req, res) => {
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

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/admin/extract-bookings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Start date and End date are required.' });
    }

    const startDateLimit = new Date(start);
    const endDateLimit = new Date(end + "T23:59:59.999Z");

    const bookings = await db.getBookings();
    const users = await db.getUsers();
    const instruments = await db.getInstruments();

    // Filter bookings where startDate falls within range
    const filtered = bookings.filter(b => {
      const bStart = new Date(b.startDate);
      return bStart >= startDateLimit && bStart <= endDateLimit;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Extracted Bookings');

    sheet.addRow(['SNo', 'Instrument Name', 'Model', 'Serial', 'Booked By', 'Start Date', 'Due Date', 'Returned Date', 'Returned By', 'Return Notes', 'Original Remarks', 'Status']);

    filtered.forEach((b, idx) => {
      const inst = instruments.find(i => String(i.id) === String(b.instrumentId)) || {};
      const user = users.find(u => String(u.id) === String(b.userId)) || {};
      sheet.addRow([
        idx + 1,
        inst.name || 'Unknown',
        inst.model || 'N/A',
        inst.serial || 'N/A',
        user.name || 'Unknown User',
        new Date(b.startDate).toLocaleDateString(),
        new Date(b.dueDate).toLocaleDateString(),
        b.returnedDate ? new Date(b.returnedDate).toLocaleDateString() : 'Active',
        b.returnedByName || 'N/A',
        b.returnRemarks || '',
        b.remarks || '',
        b.status || 'approved'
      ]);
    });

    const fileName = `booking-extract-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, 'public', fileName);
    await workbook.xlsx.writeFile(filePath);
    const sheetUrl = `/download/` + fileName;

    res.json({ ok: true, sheet: sheetUrl });
  } catch (err) {
    console.error('Failed to extract bookings', err);
    res.status(500).json({ error: 'Failed to generate extract sheet' });
  }
});

app.delete('/api/bookings/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const booking = await db.getBookingById(id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  await db.deleteBooking(id);
  await reconcileInstrumentStatus(booking.instrumentId);
  broadcastUpdate();
  res.json({ ok: true });
});

app.delete('/api/bookings/group/:groupId', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { groupId } = req.params;
  const group = await db.getBookingsByBulkGroupId(groupId);
  if (!group || group.length === 0) {
    return res.status(404).json({ error: 'Booking group not found.' });
  }
  const instrumentIds = Array.from(new Set(group.map(b => String(b.instrumentId))));
  await db.deleteBookingsByBulkGroupId(groupId);
  for (const instrumentId of instrumentIds) {
    await reconcileInstrumentStatus(instrumentId);
  }
  broadcastUpdate();
  res.json({ ok: true });
});

app.post('/api/admin/clear-bookings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { start, end } = req.body;
    const bookings = await db.getBookings();
    const originalCount = bookings.length;

    let remainingBookings;
    const deletedBookings = [];

    if (!start && !end) {
      deletedBookings.push(...bookings);
      remainingBookings = [];
    } else {
      const startDateLimit = new Date(start);
      const endDateLimit = new Date(end + "T23:59:59.999Z");

      if (isNaN(startDateLimit.getTime()) || isNaN(endDateLimit.getTime())) {
        return res.status(400).json({ error: 'Invalid date range provided.' });
      }

      // Keep bookings that do not overlap the selected range by start, due, or return dates.
      remainingBookings = bookings.filter(b => {
        const bStart = new Date(b.startDate);
        const bDue = b.dueDate ? new Date(b.dueDate) : null;
        const bReturned = b.returnedDate ? new Date(b.returnedDate) : null;

        const overlapsStart = bStart >= startDateLimit && bStart <= endDateLimit;
        const overlapsDue = bDue && bDue >= startDateLimit && bDue <= endDateLimit;
        const overlapsReturn = bReturned && bReturned >= startDateLimit && bReturned <= endDateLimit;
        const spansRange = bStart < startDateLimit && bDue && bDue > endDateLimit;

        const keep = !(overlapsStart || overlapsDue || overlapsReturn || spansRange);
        if (!keep) {
          deletedBookings.push(b);
        }
        return keep;
      });
    }

    const deletedCount = originalCount - remainingBookings.length;

    await db.setBookings(remainingBookings);

    const instruments = await db.getInstruments();
    const affectedInstrumentIds = new Set(deletedBookings.map(b => String(b.instrumentId)));

    if (!start && !end) {
      for (const inst of instruments) {
        await db.updateInstrument(inst.id, { status: 'available', location: 'warehouse' });
      }
    } else {
      for (const instrumentId of affectedInstrumentIds) {
        await reconcileInstrumentStatus(instrumentId);
      }
    }

    broadcastUpdate();
    res.json({ ok: true, count: deletedCount });
  } catch (err) {
    console.error('Failed to clear bookings', err);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// ==========================================
// VENDOR MANAGEMENT ENDPOINTS
// ==========================================

function validateVendorPayload(payload) {
  if (!payload.name || !payload.name.trim()) {
    return 'Vendor Name cannot be empty.';
  }
  if (payload.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      return 'Invalid email address format.';
    }
  }
  if (payload.mobileNumber) {
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(payload.mobileNumber)) {
      return 'Invalid mobile number format.';
    }
  }
  if (payload.alternativeMobileNumber) {
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(payload.alternativeMobileNumber)) {
      return 'Invalid alternative mobile number format.';
    }
  }
  if (payload.gstin) {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    if (!gstinRegex.test(payload.gstin)) {
      return 'Invalid GSTIN format (must be 15 characters, e.g. 22AAAAA1111A1Z1).';
    }
  }
  return null;
}

async function validateProductPayload(vendorId, payload, editingProductId = null) {
  if (!payload.name || !payload.name.trim()) {
    return 'Product Name cannot be empty.';
  }
  if (!payload.utilityName || !payload.utilityName.trim()) {
    return 'Assigned Utility is required.';
  }
  const products = await db.getProductsByVendor(vendorId);
  const duplicate = products.some(p => 
    p.name.toLowerCase().trim() === payload.name.toLowerCase().trim() && 
    String(p.id) !== String(editingProductId)
  );
  if (duplicate) {
    return 'A product with this name already exists for this vendor.';
  }
  return null;
}

app.get('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const allVendors = await db.getVendors();
    const allProducts = await db.getProducts();

    const q = (req.query.q || '').toLowerCase().trim();
    const utilityFilter = (req.query.utility || '').toLowerCase().trim();
    const vendorFilter = (req.query.vendor || '').trim();
    const productFilter = (req.query.product || '').trim();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const productsByVendor = {};
    for (const prod of allProducts) {
      if (!productsByVendor[prod.vendorId]) {
        productsByVendor[prod.vendorId] = [];
      }
      productsByVendor[prod.vendorId].push(prod);
    }

    let filteredVendors = allVendors.filter(v => {
      const vProds = productsByVendor[v.id] || [];

      if (vendorFilter && String(v.id) !== String(vendorFilter)) {
        return false;
      }

      if (productFilter) {
        const hasProd = vProds.some(p => 
          String(p.id) === String(productFilter) || 
          p.name.toLowerCase().includes(productFilter.toLowerCase())
        );
        if (!hasProd) return false;
      }

      if (utilityFilter) {
        const hasUtil = vProds.some(p => (p.utilityId || '').toLowerCase() === utilityFilter);
        if (!hasUtil) return false;
      }

      if (q) {
        const matchVendor = (v.name || '').toLowerCase().includes(q) ||
                            (v.companyName || '').toLowerCase().includes(q) ||
                            (v.contactPerson || '').toLowerCase().includes(q);
        
        const matchProduct = vProds.some(p => 
          (p.name || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.utilityName || '').toLowerCase().includes(q)
        );

        if (!matchVendor && !matchProduct) return false;
      }

      return true;
    });

    const total = filteredVendors.length;
    const startIdx = (page - 1) * limit;
    const paginatedVendors = filteredVendors.slice(startIdx, startIdx + limit);

    const result = paginatedVendors.map(v => ({
      ...v,
      products: productsByVendor[v.id] || [],
      productCount: (productsByVendor[v.id] || []).length
    }));

    res.json({
      vendors: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await db.getVendorById(id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }
    const products = await db.getProductsByVendor(id);
    res.json({
      ...vendor,
      products,
      productCount: products.length
    });
  } catch (err) {
    console.error('Error fetching vendor details:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/vendors', authenticateToken, requireRole(['admin']), async (req, res) => {
  const payload = req.body || {};
  const err = validateVendorPayload(payload);
  if (err) {
    return res.status(400).json({ error: err });
  }
  const info = await db.insertVendor(payload);
  res.json(info);
});

app.put('/api/vendors/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const err = validateVendorPayload(payload);
  if (err) {
    return res.status(400).json({ error: err });
  }
  const updated = await db.updateVendor(id, payload);
  if (!updated) {
    return res.status(404).json({ error: 'Vendor not found' });
  }
  res.json(updated);
});

app.delete('/api/vendors/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const id = req.params.id;
  const vendor = await db.getVendorById(id);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' });
  }
  await db.deleteVendor(id);
  res.json({ ok: true });
});

// Products CRUD inside Vendor
app.post('/api/vendors/:vendorId/products', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { vendorId } = req.params;
  const payload = req.body || {};
  
  const vendor = await db.getVendorById(vendorId);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found.' });
  }

  const err = await validateProductPayload(vendorId, payload);
  if (err) {
    return res.status(400).json({ error: err });
  }

  const utName = (payload.utilityName || '').trim();
  if (utName) {
    const ut = await db.insertUtility(utName);
    payload.utilityId = ut.id;
    payload.utilityName = ut.name;
  }

  payload.vendorId = vendorId;
  const newProd = await db.insertProduct(payload);
  res.json(newProd);
});

app.put('/api/vendors/:vendorId/products/:productId', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { vendorId, productId } = req.params;
  const payload = req.body || {};

  const vendor = await db.getVendorById(vendorId);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found.' });
  }

  const prod = await db.getProductById(productId);
  if (!prod || String(prod.vendorId) !== String(vendorId)) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const err = await validateProductPayload(vendorId, payload, productId);
  if (err) {
    return res.status(400).json({ error: err });
  }

  const utName = (payload.utilityName || '').trim();
  if (utName) {
    const ut = await db.insertUtility(utName);
    payload.utilityId = ut.id;
    payload.utilityName = ut.name;
  }

  const updated = await db.updateProduct(productId, payload);
  res.json(updated);
});

app.delete('/api/vendors/:vendorId/products/:productId', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { vendorId, productId } = req.params;
  const vendor = await db.getVendorById(vendorId);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found.' });
  }
  const prod = await db.getProductById(productId);
  if (!prod || String(prod.vendorId) !== String(vendorId)) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  await db.deleteProduct(productId);
  res.json({ ok: true });
});

// Utilities endpoints
app.get('/api/utilities', authenticateToken, async (req, res) => {
  const utils = await db.getUtilities();
  res.json(utils);
});

app.post('/api/utilities', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Utility name cannot be empty.' });
  }
  const ut = await db.insertUtility(name);
  res.json(ut);
});

// XLSX Export
app.post('/api/vendors/export', authenticateToken, async (req, res) => {
  try {
    const { vendorIds } = req.body;
    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({ error: 'No vendors selected for export.' });
    }

    const workbook = new ExcelJS.Workbook();

    for (const vId of vendorIds) {
      const vendor = await db.getVendorById(vId);
      if (!vendor) continue;

      const products = await db.getProductsByVendor(vId);
      
      let sheetName = (vendor.name || 'Vendor').replace(/[*?:/\\\[\]]/g, '');
      if (sheetName.length > 30) {
        sheetName = sheetName.substring(0, 30);
      }
      
      const sheet = workbook.addWorksheet(sheetName);
      sheet.views = [{ showGridLines: true }];

      const titleFont = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
      const sectionFont = { name: 'Arial', size: 11, bold: true, color: { argb: '1F2937' } };
      const labelFont = { name: 'Arial', size: 10, bold: true, color: { argb: '4B5563' } };
      const valueFont = { name: 'Arial', size: 10 };
      const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };

      const fillPrimary = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
      const borderThin = {
        top: { style: 'thin', color: { argb: 'D1D5DB' } },
        left: { style: 'thin', color: { argb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
        right: { style: 'thin', color: { argb: 'D1D5DB' } }
      };

      // Title Block
      sheet.mergeCells('A1:D1');
      const titleRow = sheet.getRow(1);
      titleRow.getCell(1).value = `Vendor Details: ${vendor.name || ''}`;
      titleRow.getCell(1).font = titleFont;
      titleRow.getCell(1).fill = fillPrimary;
      titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      titleRow.height = 30;

      sheet.addRow([]);
      const r3 = sheet.addRow(['Basic Information']);
      r3.getCell(1).font = sectionFont;
      
      sheet.addRow(['Vendor ID', vendor.id || 'N/A', 'Vendor Name', vendor.name || 'N/A']);
      sheet.addRow(['Company Name', vendor.companyName || 'N/A', 'Vendor Type', vendor.vendorType || 'N/A']);
      sheet.addRow(['Status', vendor.status || 'N/A']);

      sheet.addRow([]);
      const r8 = sheet.addRow(['Contact Information']);
      r8.getCell(1).font = sectionFont;
      
      sheet.addRow(['Contact Person', vendor.contactPerson || 'N/A', 'Mobile Number', vendor.mobileNumber || 'N/A']);
      sheet.addRow(['Alt Mobile Number', vendor.alternativeMobileNumber || 'N/A', 'Email Address', vendor.email || 'N/A']);
      sheet.addRow(['Website', vendor.website || 'N/A']);

      sheet.addRow([]);
      const r13 = sheet.addRow(['Address Details']);
      r13.getCell(1).font = sectionFont;

      sheet.addRow(['Street Address', vendor.streetAddress || 'N/A', 'City', vendor.city || 'N/A']);
      sheet.addRow(['State', vendor.state || 'N/A', 'Country', vendor.country || 'N/A']);
      sheet.addRow(['PIN/ZIP Code', vendor.pinCode || 'N/A']);

      sheet.addRow([]);
      const r18 = sheet.addRow(['Business Details']);
      r18.getCell(1).font = sectionFont;

      sheet.addRow(['GSTIN', vendor.gstin || 'N/A', 'PAN', vendor.pan || 'N/A']);
      sheet.addRow(['Business Reg No', vendor.businessRegNo || 'N/A']);

      sheet.addRow([]);
      const r22 = sheet.addRow(['Remarks / Notes']);
      r22.getCell(1).font = sectionFont;
      sheet.addRow(['Remarks / Notes', vendor.remarks || 'N/A']);

      const labelRows = [4, 5, 6, 9, 10, 11, 14, 15, 16, 19, 20, 23];
      labelRows.forEach(rn => {
        const row = sheet.getRow(rn);
        [1, 3].forEach(colIdx => {
          const cell = row.getCell(colIdx);
          if (cell.value) {
            cell.font = labelFont;
          }
        });
        [2, 4].forEach(colIdx => {
          row.getCell(colIdx).font = valueFont;
        });
      });

      sheet.addRow([]);
      sheet.addRow([]);
      const prodTitleRow = sheet.addRow(['Products Directory']);
      prodTitleRow.getCell(1).font = sectionFont;

      const headerRow = sheet.addRow([
        'Product ID', 'Product Name', 'Category', 'Description', 'Brand', 'Assigned Utility', 'Status'
      ]);
      headerRow.height = 20;
      for (let i = 1; i <= 7; i++) {
        const cell = headerRow.getCell(i);
        cell.font = headerFont;
        cell.fill = fillPrimary;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = borderThin;
      }

      products.forEach(p => {
        const row = sheet.addRow([
          p.id || 'N/A',
          p.name || 'N/A',
          p.category || 'N/A',
          p.description || 'N/A',
          p.brand || 'N/A',
          p.utilityName || 'N/A',
          p.productStatus || 'N/A'
        ]);
        for (let i = 1; i <= 7; i++) {
          const cell = row.getCell(i);
          cell.font = valueFont;
          cell.border = borderThin;
        }
      });

      sheet.columns.forEach(column => {
        let maxLen = 12;
        column.eachCell({ includeEmpty: true }, cell => {
          if (cell.value) {
            const valStr = cell.value.toString();
            if (valStr.length > maxLen && !cell.address.includes('1')) {
              maxLen = valStr.length;
            }
          }
        });
        column.width = Math.min(maxLen + 3, 35);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="vendors_export.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('Failed to export vendors:', err);
    res.status(500).json({ error: 'Failed to generate Excel report.' });
  }
});

const PORT = process.env.PORT || 3000;
const os = require('os');
const networkInterfaces = os.networkInterfaces();
let wifiIp = 'localhost';
for (const name of Object.keys(networkInterfaces)) {
  for (const net of networkInterfaces[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      wifiIp = net.address;
    }
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local URL:   http://localhost:${PORT}`);
  console.log(`WiFi URL:    http://${wifiIp}:${PORT}`);
});
