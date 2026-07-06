// Client-Side Simulated API Layer for Netlify Serverless Deployment
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import mqtt from 'mqtt';
import { socket } from './mock-socket';

// Default data seeded from data.json
import SEEDED_DATA from './data.json';

// Unique client ID for this browser tab/window to avoid echo loops
if (import.meta.env.VITE_USE_MOCK !== 'false') {

const SYNC_CLIENT_ID = 'client_' + Math.random().toString(36).substring(2, 15);
const SYNC_TOPIC = 'iitm/asset-management/sync/v1/GokulramBalaji';

let mqttClient = null;

// Initialise Database in LocalStorage
function getDb() {
  const local = localStorage.getItem('iitm_db');
  if (!local) {
    const defaultData = { ...SEEDED_DATA, lastUpdatedTime: Date.now() };
    localStorage.setItem('iitm_db', JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(local);
}

function writeDb(data) {
  const timestamp = Date.now();
  data.lastUpdatedTime = timestamp;
  localStorage.setItem('iitm_db', JSON.stringify(data));
  
  // Broadcast update to the local frontend app
  setTimeout(() => {
    socket.emit('data_updated');
    socket.emit('instruments', data.instruments || []);
    socket.emit('bookings');
  }, 50);

  // Publish update to the cloud broker for other users
  if (mqttClient && mqttClient.connected) {
    try {
      const payload = {
        senderId: SYNC_CLIENT_ID,
        timestamp: timestamp,
        data: data
      };
      mqttClient.publish(SYNC_TOPIC, JSON.stringify(payload), { qos: 1 });
    } catch (err) {
      console.error('Failed to publish sync message:', err);
    }
  }
}

// Setup real-time connection
try {
  mqttClient = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
    clientId: SYNC_CLIENT_ID,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 2000,
  });

  mqttClient.on('connect', () => {
    console.log('Real-time sync: connected to cloud broker.');
    mqttClient.subscribe(SYNC_TOPIC);
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      if (payload.senderId === SYNC_CLIENT_ID) return; // Ignore own message

      console.log('Real-time sync: received database update from another user.');
      const localDb = getDb();

      // Last-Write-Wins (LWW) conflict resolution
      if (!localDb.lastUpdatedTime || payload.timestamp > localDb.lastUpdatedTime) {
        const remoteDb = payload.data;
        remoteDb.lastUpdatedTime = payload.timestamp;
        localStorage.setItem('iitm_db', JSON.stringify(remoteDb));
        
        // Trigger React UI updates on other clients
        socket.emit('data_updated');
        socket.emit('instruments', remoteDb.instruments || []);
        socket.emit('bookings');
      }
    } catch (err) {
      console.error('Failed to parse sync message:', err);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('Real-time sync error:', err);
  });
} catch (err) {
  console.error('Failed to initialize real-time sync:', err);
}

// Seed admin user if it doesn't exist
const dbData = getDb();
if (!dbData.users || dbData.users.length === 0) {
  dbData.users = [
    {
      id: 'admin',
      name: 'Administrator',
      email: 'admin',
      phone: '1234567890',
      password: '$2b$10$0HtiZQ4LLGkgLGvv88voWOwpGUnkGw3MQtkchpmhuZ44KmCTpGrGW', // hashed admin password
      role: 'admin'
    }
  ];
  writeDb(dbData);
}

// Unique ID Generator
function generateId(prefix = '') {
  return prefix + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function getLoggedInUser() {
  const user = localStorage.getItem('iitm_user');
  return user ? JSON.parse(user) : null;
}

// Date helpers
const safeDateString = (dateVal, fallback = 'N/A') => {
  if (!dateVal) return fallback;
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
};

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

function getInstrumentsWithBookings(db) {
  const instruments = db.instruments || [];
  const bookings = db.bookings || [];
  const users = db.users || [];

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

async function handleInstrumentReturnTransition(db, instrumentId, returnedBookingId) {
  // Find approved future pre-bookings for this instrument (excluding the returned one)
  const approvedPre = db.bookings
    .filter(b => 
      String(b.instrumentId) === String(instrumentId) && 
      !b.returnedDate && 
      b.status === 'approved' && 
      b.id !== returnedBookingId
    )
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const inst = db.instruments.find(i => String(i.id) === String(instrumentId));
  if (!inst) return;

  if (approvedPre.length > 0) {
    inst.status = 'booked';
    inst.location = 'with_user';
  } else {
    // Check if there are any pending pre-bookings
    const pendingPre = db.bookings.filter(b => 
      String(b.instrumentId) === String(instrumentId) && 
      !b.returnedDate && 
      b.status === 'pending'
    );
    if (pendingPre.length > 0) {
      inst.status = 'requested';
      inst.location = 'warehouse';
    } else {
      inst.status = 'available';
      inst.location = 'warehouse';
    }
  }
}

// Dynamic XLSX Generation helpers in client
async function generateBookingExcel(targetBookings, instruments, users, isBulk) {
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

  if (isBulk && targetBookings.length > 0) {
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
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function generateVendorsExcel(vendorIds, db) {
  const workbook = new ExcelJS.Workbook();

  for (const vId of vendorIds) {
    const vendor = (db.vendors || []).find(v => String(v.id) === String(vId));
    if (!vendor) continue;

    const products = (db.products || []).filter(p => String(p.vendorId) === String(vId));
    
    let sheetName = (vendor.name || 'Vendor').replace(/[*?:/\\\\[\]]/g, '');
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
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Intercept Global fetch
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const urlStr = typeof url === 'string' ? url : url.url || '';
  
  if (!urlStr.startsWith('/api') && !urlStr.startsWith('/download') && !urlStr.includes('/api/')) {
    return originalFetch.apply(this, arguments);
  }

  // Parse method, query params, body
  const method = (options.method || 'GET').toUpperCase();
  const parsedUrl = new URL(urlStr, window.location.origin);
  const path = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  let body = {};
  if (options.body) {
    try {
      body = JSON.parse(options.body);
    } catch (_) {}
  }

  console.log(`[MOCK FETCH] ${method} ${path}`, { query, body });

  // Load state database
  const db = getDb();
  const user = getLoggedInUser();

  // Helper response builder
  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const errorResponse = (msg, status = 400) => {
    return jsonResponse({ error: msg }, status);
  };

  // Auth Guard check (mimics authenticateToken in backend)
  const isAuthRequired = path !== '/api/login' && path !== '/api/logout';
  if (isAuthRequired && !user) {
    return errorResponse('Authentication required.', 401);
  }

  // Admin Role check helper
  const requireAdmin = () => {
    if (!user || (user.role || '').toLowerCase() !== 'admin') {
      return errorResponse('Access denied. Admin role required.', 403);
    }
    return null;
  };

  try {
    // --- AUTHENTICATION ---
    if (path === '/api/login' && method === 'POST') {
      const { email, password } = body;
      const foundUser = db.users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
      if (!foundUser) {
        return errorResponse('Invalid credentials. User not found.', 401);
      }
      
      let passwordMatched = false;
      if (foundUser.password.startsWith('$2a$') || foundUser.password.startsWith('$2b$')) {
        passwordMatched = await bcrypt.compare(password, foundUser.password);
      } else {
        passwordMatched = (password === foundUser.password);
      }

      if (!passwordMatched) {
        return errorResponse('Invalid password.', 401);
      }

      return jsonResponse({
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role
      });
    }

    if (path === '/api/logout' && method === 'POST') {
      return jsonResponse({ ok: true });
    }

    // --- USERS MANAGEMENT ---
    if (path === '/api/users') {
      if (method === 'GET') {
        return jsonResponse(db.users);
      }
      if (method === 'POST') {
        const err = requireAdmin();
        if (err) return err;

        const { name, email, phone, password, role } = body;
        const exists = db.users.some(u => String(u.email).toLowerCase() === String(email).toLowerCase());
        if (exists) return errorResponse('A user with this email already exists.');

        const newUser = {
          id: generateId('USR'),
          name,
          email,
          phone,
          password: await bcrypt.hash(password, 10),
          role
        };
        db.users.push(newUser);
        writeDb(db);
        return jsonResponse(newUser);
      }
    }

    if (path.startsWith('/api/users/') && method === 'DELETE') {
      const err = requireAdmin();
      if (err) return err;

      const userId = path.split('/').pop();
      const targetUser = db.users.find(u => String(u.id) === String(userId));
      if (!targetUser) return errorResponse('User not found.', 404);

      if ((targetUser.email || '').toLowerCase() === 'admin') {
        return errorResponse('Cannot delete the primary admin account.');
      }

      db.users = db.users.filter(u => String(u.id) !== String(userId));
      writeDb(db);
      return jsonResponse({ ok: true });
    }

    // --- INSTRUMENTS / EQUIPMENT CRUD ---
    if (path === '/api/instruments') {
      if (method === 'GET') {
        const enriched = getInstrumentsWithBookings(db);
        return jsonResponse(enriched);
      }
      if (method === 'POST') {
        const err = requireAdmin();
        if (err) return err;

        const id = generateId('INST');
        const defaults = {
          productImages: [],
          productOverview: '',
          specifications: '',
          parametersMeasured: '',
          accuracy: '',
          measurementRange: '',
          resolution: '',
          applications: '',
          operatingProcedure: '',
          calibrationProcedure: '',
          safetyInstructions: '',
          userManualUrl: '',
          youtubeUrl: '',
          lastCalibrationDate: null,
          nextCalibrationDate: null,
          calibrationCertificateUrl: '',
          calibrationCycleDays: 365
        };
        const newInst = { id, status: 'available', location: 'warehouse', ...defaults, ...body };
        db.instruments.push(newInst);
        writeDb(db);
        return jsonResponse(newInst);
      }
    }

    if (path.startsWith('/api/instruments/')) {
      const id = path.split('/').pop();
      const instIndex = db.instruments.findIndex(i => String(i.id) === String(id));
      if (instIndex === -1) return errorResponse('Instrument not found.', 404);

      if (method === 'PUT') {
        const err = requireAdmin();
        if (err) return err;

        db.instruments[instIndex] = { ...db.instruments[instIndex], ...body };
        writeDb(db);
        return jsonResponse(db.instruments[instIndex]);
      }

      if (method === 'DELETE') {
        const err = requireAdmin();
        if (err) return err;

        db.instruments = db.instruments.filter(i => String(i.id) !== String(id));
        writeDb(db);
        return jsonResponse({ ok: true });
      }
    }

    // --- SINGLE AND BULK BOOKING API ---
    if (path === '/api/book' && method === 'POST') {
      const { instrumentId, days = 7, remarks, startDate: explicitStart, endDate: explicitEnd } = body;
      const instIndex = db.instruments.findIndex(i => String(i.id) === String(instrumentId));
      if (instIndex === -1) return errorResponse('Instrument not found.', 404);

      const activeAndFuture = db.bookings.filter(b => 
        String(b.instrumentId) === String(instrumentId) && 
        !b.returnedDate && 
        b.status !== 'denied'
      );

      let start, due;
      const isPreBooking = activeAndFuture.length > 0;

      if (explicitStart && explicitEnd) {
        start = new Date(explicitStart);
        due = new Date(explicitEnd);
      } else if (isPreBooking) {
        let maxDue = new Date();
        activeAndFuture.forEach(b => {
          const d = new Date(b.dueDate);
          if (d > maxDue) maxDue = d;
        });
        start = new Date(maxDue.getTime() + 1000);
        due = new Date(start.getTime() + days * 24 * 3600 * 1000);
      } else {
        start = new Date();
        due = new Date(start.getTime() + days * 24 * 3600 * 1000);
      }

      if (due <= start) return errorResponse('End date must be after start date.');

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
        return errorResponse('This instrument already has a pending/future pre-booking queue. Only one queued request is allowed.');
      }

      const overlap = activeAndFuture.find(b => {
        const bStart = new Date(b.startDate);
        const bDue = new Date(b.dueDate);
        return start < bDue && due > bStart;
      });
      if (overlap) {
        return errorResponse(`Requested booking dates overlap with an existing booking (${new Date(overlap.startDate).toLocaleDateString()} to ${new Date(overlap.dueDate).toLocaleDateString()}).`);
      }

      if ((user.role || '').toLowerCase() === 'admin') {
        // Direct admin booking - auto approve and generate download sheet url
        const fileName = `booking-${Date.now()}.xlsx`;
        const sheetUrl = `/download/${fileName}`;
        
        const bookingRow = {
          id: generateId('BKG'),
          userId: user.id,
          instrumentId,
          startDate: start.toISOString(),
          dueDate: due.toISOString(),
          remarks,
          status: 'approved',
          sheetUrl,
          returnedDate: null
        };
        db.bookings.push(bookingRow);
        
        const inst = db.instruments[instIndex];
        if (inst.status !== 'booked') {
          inst.status = 'booked';
          inst.location = 'with_user';
        }
        writeDb(db);
        
        // Push insights notification
        setTimeout(() => {
          socket.emit('insight', { toUserId: user.id, items: [{ instrumentId, instrumentName: inst.name, insight: inst.lastInsight || '' }] });
        }, 100);

        return jsonResponse({ ok: true, sheet: sheetUrl });
      } else {
        // Engineer booking -> creates request
        const bookingRow = {
          id: generateId('BKG'),
          userId: user.id,
          instrumentId,
          startDate: start.toISOString(),
          dueDate: due.toISOString(),
          remarks,
          status: 'pending',
          returnedDate: null
        };
        db.bookings.push(bookingRow);
        
        const inst = db.instruments[instIndex];
        if (inst.status === 'available') {
          inst.status = 'requested';
        }
        writeDb(db);
        return jsonResponse({ ok: true, pending: true, message: isPreBooking ? 'Pre-booking request sent to admin for approval.' : 'Booking request sent to admin for approval.' });
      }
    }

    if (path === '/api/book/bulk' && method === 'POST') {
      const { instrumentIds = [], days = 7, remarks, startDate: explicitStart, endDate: explicitEnd } = body;
      let start, due;
      if (explicitStart && explicitEnd) {
        start = new Date(explicitStart);
        due = new Date(explicitEnd);
      } else {
        start = new Date();
        due = new Date(start.getTime() + days * 24 * 3600 * 1000);
      }

      if (due <= start) return errorResponse('End date must be after start date.');

      // Validations
      for (const instId of instrumentIds) {
        const inst = db.instruments.find(i => String(i.id) === String(instId));
        if (!inst) continue;

        const activeAndFuture = db.bookings.filter(b => 
          String(b.instrumentId) === String(instId) && 
          !b.returnedDate && 
          b.status !== 'denied'
        );

        const now = new Date();
        const futureQueue = activeAndFuture.filter(b => b.status === 'pending' || new Date(b.startDate) > now);
        if (futureQueue.length > 0) {
          return errorResponse(`Instrument "${inst.name}" already has a pending/future pre-booking queue.`);
        }

        const overlap = activeAndFuture.find(b => {
          const bStart = new Date(b.startDate);
          const bDue = new Date(b.dueDate);
          return start < bDue && due > bStart;
        });
        if (overlap) {
          return errorResponse(`Requested dates overlap with an existing booking for "${inst.name}" (${new Date(overlap.startDate).toLocaleDateString()} to ${new Date(overlap.dueDate).toLocaleDateString()}).`);
        }
      }

      if ((user.role || '').toLowerCase() === 'admin') {
        const groupId = generateId('GRP');
        const fileName = `booking-bulk-${groupId}-&{Date.now()}.xlsx`;
        const sheetUrl = `/download/${fileName}`;
        const notificationItems = [];

        for (const instId of instrumentIds) {
          const inst = db.instruments.find(i => String(i.id) === String(instId));
          if (!inst) continue;

          db.bookings.push({
            id: generateId('BKG'),
            userId: user.id,
            instrumentId: instId,
            startDate: start.toISOString(),
            dueDate: due.toISOString(),
            remarks,
            status: 'approved',
            bulkGroupId: groupId,
            sheetUrl,
            returnedDate: null
          });

          if (inst.status !== 'booked') {
            inst.status = 'booked';
            inst.location = 'with_user';
          }
          notificationItems.push({ instrumentId: instId, instrumentName: inst.name, insight: inst.lastInsight || '' });
        }
        writeDb(db);

        setTimeout(() => {
          if (notificationItems.length) {
            socket.emit('insight', { toUserId: user.id, items: notificationItems });
          }
        }, 100);

        return jsonResponse({ ok: true, sheet: sheetUrl });
      } else {
        const groupId = generateId('GRP');
        let count = 0;
        for (const instId of instrumentIds) {
          const inst = db.instruments.find(i => String(i.id) === String(instId));
          if (!inst) continue;

          db.bookings.push({
            id: generateId('BKG'),
            userId: user.id,
            instrumentId: instId,
            startDate: start.toISOString(),
            dueDate: due.toISOString(),
            remarks,
            status: 'pending',
            bulkGroupId: groupId,
            returnedDate: null
          });

          if (inst.status === 'available') {
            inst.status = 'requested';
          }
          count++;
        }
        writeDb(db);
        return jsonResponse({ ok: true, pending: true, message: `Bulk booking request for ${count} instrument(s) submitted for admin approval.` });
      }
    }

    // --- BOOKING REQUESTS APPROVE/DENY (ADMIN ONLY) ---
    if (path === '/api/booking-requests' && method === 'GET') {
      const pending = db.bookings.filter(b => b.status === 'pending');
      const groups = {};
      pending.forEach(b => {
        const key = b.bulkGroupId || b.id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
      });

      const result = Object.entries(groups).map(([requestId, bookings]) => {
        const first = bookings[0];
        const requester = db.users.find(u => String(u.id) === String(first.userId)) || {};
        const isBulk = !!first.bulkGroupId;
        const instrumentList = bookings.map(b => {
          const inst = db.instruments.find(i => String(i.id) === String(b.instrumentId)) || {};
          return {
            bookingId: b.id,
            id: inst.id || b.instrumentId,
            name: inst.name || 'Unknown',
            model: inst.model || 'N/A',
            serial: inst.serial || 'N/A'
          };
        });
        return {
          requestId,
          type: isBulk ? 'bulk' : 'single',
          userId: first.userId,
          userName: requester.name || 'Unknown User',
          userEmail: requester.email || 'N/A',
          instruments: instrumentList,
          startDate: first.startDate,
          dueDate: first.dueDate,
          remarks: first.remarks,
          status: 'pending'
        };
      });

      return jsonResponse(result);
    }

    if (path.includes('/api/booking-requests/') && path.endsWith('/approve') && method === 'POST') {
      const err = requireAdmin();
      if (err) return err;

      const requestId = path.split('/')[3]; // /api/booking-requests/:id/approve
      const bulkBookings = db.bookings.filter(b => b.bulkGroupId === requestId && b.status === 'pending');

      if (bulkBookings.length > 0) {
        // Validate overlaps
        for (const b of bulkBookings) {
          const activeApproved = db.bookings.filter(x => 
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
            const inst = db.instruments.find(i => String(i.id) === String(b.instrumentId)) || {};
            return errorResponse(`Approval failed. Instrument "${inst.name}" has an overlapping approved booking.`);
          }
        }

        const fileName = `booking-bulk-${requestId}-${Date.now()}.xlsx`;
        const sheetUrl = `/download/${fileName}`;
        const notificationItems = [];

        bulkBookings.forEach(b => {
          b.status = 'approved';
          b.sheetUrl = sheetUrl;
          const inst = db.instruments.find(i => String(i.id) === String(b.instrumentId));
          if (inst) {
            inst.status = 'booked';
            inst.location = 'with_user';
            notificationItems.push({ instrumentId: b.instrumentId, instrumentName: inst.name, insight: inst.lastInsight || '' });
          }
        });
        writeDb(db);

        setTimeout(() => {
          socket.emit('insight', { toUserId: bulkBookings[0].userId, items: notificationItems });
        }, 100);

        return jsonResponse({ ok: true, sheet: sheetUrl });
      } else {
        // Single approval
        const booking = db.bookings.find(b => String(b.id) === String(requestId));
        if (!booking) return errorResponse('Booking request not found.', 404);
        if (booking.status !== 'pending') return errorResponse('Request is not pending.');

        const activeApproved = db.bookings.filter(x => 
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
          return errorResponse('Approval failed. Instrument has an overlapping approved booking.');
        }

        const fileName = `booking-${booking.id}-${Date.now()}.xlsx`;
        const sheetUrl = `/download/${fileName}`;
        booking.status = 'approved';
        booking.sheetUrl = sheetUrl;

        const inst = db.instruments.find(i => String(i.id) === String(booking.instrumentId));
        if (inst) {
          inst.status = 'booked';
          inst.location = 'with_user';
          setTimeout(() => {
            socket.emit('insight', { toUserId: booking.userId, items: [{ instrumentId: booking.instrumentId, instrumentName: inst.name, insight: inst.lastInsight || '' }] });
          }, 100);
        }
        writeDb(db);
        return jsonResponse({ ok: true, sheet: sheetUrl });
      }
    }

    if (path.includes('/api/booking-requests/') && path.endsWith('/deny') && method === 'POST') {
      const err = requireAdmin();
      if (err) return err;

      const requestId = path.split('/')[3];
      const bulkBookings = db.bookings.filter(b => b.bulkGroupId === requestId && b.status === 'pending');

      if (bulkBookings.length > 0) {
        bulkBookings.forEach(b => {
          b.status = 'denied';
          const inst = db.instruments.find(i => String(i.id) === String(b.instrumentId));
          if (inst) {
            inst.status = 'available';
            inst.location = 'warehouse';
          }
        });
        writeDb(db);
        return jsonResponse({ ok: true });
      } else {
        const booking = db.bookings.find(b => String(b.id) === String(requestId));
        if (!booking) return errorResponse('Booking request not found.', 404);
        booking.status = 'denied';
        const inst = db.instruments.find(i => String(i.id) === String(booking.instrumentId));
        if (inst) {
          inst.status = 'available';
          inst.location = 'warehouse';
        }
        writeDb(db);
        return jsonResponse({ ok: true });
      }
    }

    // --- RETURN OPERATIONS ---
    if (path === '/api/return' && method === 'POST') {
      const { instrumentId, remarks } = body;
      const booking = findCurrentApprovedBooking(db.bookings, instrumentId);
      if (!booking) return errorResponse('Active booking not found.', 404);

      if (user.role !== 'admin' && String(booking.userId) !== String(user.id)) {
        return errorResponse('You are not authorized to return this instrument.', 403);
      }

      const returnedDate = new Date().toISOString();
      booking.returnedDate = returnedDate;
      booking.dueDate = returnedDate;
      if (remarks) booking.returnRemarks = remarks;
      booking.returnedById = user.id;
      booking.returnedByName = user.name;

      await handleInstrumentReturnTransition(db, instrumentId, booking.id);
      writeDb(db);
      return jsonResponse({ ok: true });
    }

    if (path === '/api/return/bulk' && method === 'POST') {
      const { instrumentIds = [], remarks } = body;
      const returnedDate = new Date().toISOString();

      instrumentIds.forEach(instId => {
        const booking = findCurrentApprovedBooking(db.bookings, instId);
        if (!booking) return;

        if (user.role !== 'admin' && String(booking.userId) !== String(user.id)) return;

        booking.returnedDate = returnedDate;
        booking.dueDate = returnedDate;
        if (remarks) booking.returnRemarks = remarks;
        booking.returnedById = user.id;
        booking.returnedByName = user.name;

        handleInstrumentReturnTransition(db, instId, booking.id);

        // Save last insight/remarks to instrument
        if (remarks) {
          const inst = db.instruments.find(i => String(i.id) === String(instId));
          if (inst) inst.lastInsight = remarks;
        }
      });

      writeDb(db);
      return jsonResponse({ ok: true });
    }

    // --- INSIGHTS & CALIBRATION DUE ---
    if (path === '/api/calibration/due' && method === 'GET') {
      const days = 15;
      const now = new Date();
      const cutoff = new Date(now.getTime() + days * 24 * 3600 * 1000);
      const filtered = db.instruments.filter(i => i.nextCalibrationDate && new Date(i.nextCalibrationDate) >= now && new Date(i.nextCalibrationDate) <= cutoff);
      return jsonResponse(filtered);
    }

    if (path === '/api/instrument/insight' && method === 'POST') {
      const { instrumentId, insight } = body;
      const inst = db.instruments.find(i => String(i.id) === String(instrumentId));
      if (!inst) return errorResponse('Instrument not found.', 404);
      inst.lastInsight = insight;
      writeDb(db);
      return jsonResponse(inst);
    }

    if (path === '/api/bookings' && method === 'GET') {
      const result = db.bookings.map(b => {
        const inst = db.instruments.find(i => String(i.id) === String(b.instrumentId)) || {};
        const requester = db.users.find(u => String(u.id) === String(b.userId)) || {};
        return {
          ...b,
          userName: requester.name || 'Unknown User',
          instrumentName: inst.name || 'Unknown',
          instrumentModel: inst.model || 'N/A',
          instrumentSerial: inst.serial || 'N/A',
          instrumentImage: Array.isArray(inst.productImages) ? inst.productImages[0] : null
        };
      });
      // Sort: newest first
      result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      return jsonResponse(result);
    }

    if (path === '/api/calibrations' && method === 'GET') {
      const rows = db.instruments.map(i => {
        const next = i.nextCalibrationDate || null;
        const dueIn = next ? (new Date(next) - new Date()) : null;
        return { ...i, dueInMilliseconds: dueIn };
      });
      return jsonResponse(rows);
    }

    if (path === '/api/calibrate' && method === 'POST') {
      const { instrumentId, certificateUrl, cycleDays } = body;
      const instIndex = db.instruments.findIndex(i => String(i.id) === String(instrumentId));
      if (instIndex === -1) return errorResponse('Instrument not found.', 404);

      const now = new Date();
      const days = Number(cycleDays) || 365;
      const next = new Date(now.getTime() + days * 24 * 3600 * 1000);
      const update = {
        lastCalibrationDate: now.toISOString(),
        nextCalibrationDate: next.toISOString(),
        calibrationCycleDays: days
      };
      if (certificateUrl) update.calibrationCertificateUrl = certificateUrl;
      
      db.instruments[instIndex] = { ...db.instruments[instIndex], ...update };
      writeDb(db);
      return jsonResponse({ ok: true });
    }

    // --- BOOKING DELETION / CLEANING (ADMIN ONLY) ---
    if (path.startsWith('/api/bookings/') && method === 'DELETE') {
      const err = requireAdmin();
      if (err) return err;

      const subpath = path.replace('/api/bookings/', '');
      if (subpath.startsWith('group/')) {
        const groupId = subpath.replace('group/', '');
        db.bookings = db.bookings.filter(b => String(b.bulkGroupId) !== String(groupId));
      } else {
        const bookingId = subpath;
        db.bookings = db.bookings.filter(b => String(b.id) !== String(bookingId));
      }
      writeDb(db);
      return jsonResponse({ ok: true });
    }

    if (path === '/api/admin/clear-bookings' && method === 'POST') {
      const err = requireAdmin();
      if (err) return err;

      db.bookings = [];
      writeDb(db);
      return jsonResponse({ ok: true });
    }

    if (path === '/api/admin/extract-bookings' && method === 'GET') {
      const err = requireAdmin();
      if (err) return err;

      const { start, end } = query;
      const bookingsList = db.bookings.filter(b => {
        const date = new Date(b.startDate);
        return date >= new Date(start) && date <= new Date(end);
      });
      return jsonResponse(bookingsList);
    }

    // --- VENDORS, PRODUCTS AND UTILITIES ---
    if (path === '/api/vendors') {
      if (method === 'GET') {
        const q = (query.q || '').toLowerCase().trim();
        const utilityFilter = (query.utility || '').toLowerCase().trim();
        const vendorFilter = (query.vendor || '').trim();
        const productFilter = (query.product || '').trim();
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;

        const allVendors = db.vendors || [];
        const allProducts = db.products || [];

        const productsByVendor = {};
        allProducts.forEach(prod => {
          if (!productsByVendor[prod.vendorId]) productsByVendor[prod.vendorId] = [];
          productsByVendor[prod.vendorId].push(prod);
        });

        const filtered = allVendors.filter(v => {
          const vProds = productsByVendor[v.id] || [];
          if (vendorFilter && String(v.id) !== String(vendorFilter)) return false;
          if (productFilter) {
            const hasProd = vProds.some(p => String(p.id) === String(productFilter) || p.name.toLowerCase().includes(productFilter.toLowerCase()));
            if (!hasProd) return false;
          }
          if (utilityFilter) {
            const hasUtil = vProds.some(p => (p.utilityId || '').toLowerCase() === utilityFilter);
            if (!hasUtil) return false;
          }
          if (q) {
            const matchVendor = (v.name || '').toLowerCase().includes(q) || (v.companyName || '').toLowerCase().includes(q) || (v.contactPerson || '').toLowerCase().includes(q);
            const matchProduct = vProds.some(p => (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.utilityName || '').toLowerCase().includes(q));
            if (!matchVendor && !matchProduct) return false;
          }
          return true;
        });

        const total = filtered.length;
        const startIdx = (page - 1) * limit;
        const sliced = filtered.slice(startIdx, startIdx + limit);
        const mapped = sliced.map(v => ({
          ...v,
          products: productsByVendor[v.id] || [],
          productCount: (productsByVendor[v.id] || []).length
        }));

        return jsonResponse({
          vendors: mapped,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        });
      }

      if (method === 'POST') {
        const err = requireAdmin();
        if (err) return err;

        const id = 'VND' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const newVendor = { id, ...body };
        db.vendors = db.vendors || [];
        db.vendors.push(newVendor);
        writeDb(db);
        return jsonResponse(newVendor);
      }
    }

    if (path.startsWith('/api/vendors/')) {
      const sub = path.replace('/api/vendors/', '');
      const parts = sub.split('/');
      const vendorId = parts[0];

      if (parts.length === 1) {
        // Vendor profile operations
        const vendorIndex = (db.vendors || []).findIndex(v => String(v.id) === String(vendorId));
        if (vendorIndex === -1) return errorResponse('Vendor not found.', 404);

        if (method === 'GET') {
          const prods = (db.products || []).filter(p => String(p.vendorId) === String(vendorId));
          return jsonResponse({
            ...db.vendors[vendorIndex],
            products: prods,
            productCount: prods.length
          });
        }

        if (method === 'PUT') {
          const err = requireAdmin();
          if (err) return err;

          db.vendors[vendorIndex] = { ...db.vendors[vendorIndex], ...body };
          writeDb(db);
          return jsonResponse(db.vendors[vendorIndex]);
        }

        if (method === 'DELETE') {
          const err = requireAdmin();
          if (err) return err;

          db.vendors = (db.vendors || []).filter(v => String(v.id) !== String(vendorId));
          db.products = (db.products || []).filter(p => String(p.vendorId) !== String(vendorId));
          writeDb(db);
          return jsonResponse({ ok: true });
        }
      } else if (parts[1] === 'products') {
        // Vendor product operations
        db.products = db.products || [];
        if (method === 'POST') {
          const err = requireAdmin();
          if (err) return err;

          const pId = 'PRD' + Math.random().toString(36).substring(2, 7).toUpperCase();
          const newProduct = { id: pId, vendorId, ...body };
          db.products.push(newProduct);
          writeDb(db);
          return jsonResponse(newProduct);
        }

        const productId = parts[2];
        const prodIndex = db.products.findIndex(p => String(p.id) === String(productId) && String(p.vendorId) === String(vendorId));
        if (prodIndex === -1) return errorResponse('Product not found.', 404);

        if (method === 'PUT') {
          const err = requireAdmin();
          if (err) return err;

          db.products[prodIndex] = { ...db.products[prodIndex], ...body };
          writeDb(db);
          return jsonResponse(db.products[prodIndex]);
        }

        if (method === 'DELETE') {
          const err = requireAdmin();
          if (err) return err;

          db.products = db.products.filter(p => !(String(p.id) === String(productId) && String(p.vendorId) === String(vendorId)));
          writeDb(db);
          return jsonResponse({ ok: true });
        }
      }
    }

    if (path === '/api/utilities') {
      db.utilities = db.utilities || [];
      if (method === 'GET') {
        return jsonResponse(db.utilities);
      }
      if (method === 'POST') {
        const err = requireAdmin();
        if (err) return err;

        const { name } = body;
        const norm = name.toLowerCase().trim();
        const existing = db.utilities.find(u => u.id === norm);
        if (existing) return jsonResponse(existing);

        const newUtil = { id: norm, name: name.trim() };
        db.utilities.push(newUtil);
        writeDb(db);
        return jsonResponse(newUtil);
      }
    }

    // --- SPREADSHEET DYNAMIC EXPORTS ---
    if (path === '/api/vendors/export' && method === 'POST') {
      const { vendorIds } = body;
      if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
        return errorResponse('No vendors selected for export.');
      }

      const blob = await generateVendorsExcel(vendorIds, db);
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="vendors_export.xlsx"'
        }
      });
    }

    if (path.startsWith('/download/')) {
      const filename = path.replace('/download/', '');
      const bookingsList = db.bookings || [];
      const instrumentsList = db.instruments || [];
      const usersList = db.users || [];

      // Find if this is a bulk booking or single booking based on matching sheetUrl
      const targetBookings = bookingsList.filter(b => b.sheetUrl === '/download/' + filename || b.sheetUrl === path);
      const isBulk = targetBookings.length > 0 && targetBookings.some(b => b.bulkGroupId);

      const blob = await generateBookingExcel(targetBookings, instrumentsList, usersList, isBulk);
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Path not found in simulated API
    return errorResponse('Not Found', 404);

  } catch (err) {
    console.error('Simulated API Error:', err);
    return errorResponse('Internal Server Error: ' + err.message, 500);
  }
};


}