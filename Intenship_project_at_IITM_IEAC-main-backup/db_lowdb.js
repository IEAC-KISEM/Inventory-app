const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const { nanoid } = require('nanoid');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'IITM_IEAS_KISEM_SECURE_KEY_2026_!'; // Must be 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  try {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.substring(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (e) {
    console.error('Encryption failed', e);
    return text;
  }
}

function decrypt(text) {
  if (!text) return text;
  try {
    let textParts = text.split(':');
    if (textParts.length !== 2) return text;
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.substring(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}


const file = path.join(__dirname, 'data.json');
const adapter = new JSONFile(file);
// Provide default data to avoid lowdb missing default data error
const defaultData = { users: [], instruments: [], bookings: [], vendors: [], products: [], utilities: [] };
const db = new Low(adapter, defaultData);

async function init() {
  await db.read();
  db.data = db.data || { users: [], instruments: [], bookings: [], vendors: [], products: [], utilities: [] };
  
  if (!db.data.vendors) db.data.vendors = [];
  if (!db.data.products) db.data.products = [];
  if (!db.data.utilities) db.data.utilities = [];

  // Ensure default admin user exists
  if (!db.data.users || db.data.users.length === 0) {
    db.data.users = [
      {
        id: 'admin',
        name: encrypt('Administrator'),
        email: encrypt('admin'),
        phone: encrypt('1234567890'),
        password: 'VcydDPyQRH9@zU7',
        role: 'admin'
      }
    ];
  } else {
    // Migration: Update password of the primary admin user and encrypt unencrypted users
    let updated = false;
    for (const u of db.data.users) {
      if (u.name && !u.name.includes(':')) {
        u.name = encrypt(u.name);
        updated = true;
      }
      if (u.email && !u.email.includes(':')) {
        u.email = encrypt(u.email);
        updated = true;
      }
      if (u.phone && !u.phone.includes(':')) {
        u.phone = encrypt(u.phone);
        updated = true;
      }
    }
    const adminUser = db.data.users.find(u => String(decrypt(u.email)).toLowerCase() === 'admin');
    if (adminUser) {
      if (adminUser.password !== '$2b$10$oIAvTslehwcmWHATnLLKrOTAX3OA8JAZTOqD0ZePHc2htPkhTd2fW') {
        adminUser.password = '$2b$10$oIAvTslehwcmWHATnLLKrOTAX3OA8JAZTOqD0ZePHc2htPkhTd2fW';
        updated = true;
      }
    }
    if (updated) {
      await db.write();
    }
  }

  // Seed default utilities if empty
  if (db.data.utilities.length === 0) {
    const defaultUtils = [
      "Boiler", "Compressor", "Chiller", "Motor", "Pump",
      "HVAC", "Lighting", "Air Compressor", "Transformer", "Cooling Tower"
    ];
    db.data.utilities = defaultUtils.map(name => ({
      id: name.toLowerCase().trim(),
      name: name.trim()
    }));
  }

  // Seed default vendors and products if empty
  if (db.data.vendors.length === 0) {
    db.data.vendors = [
      {
        id: "VND-FLK01",
        name: "Fluke India Pvt Ltd",
        companyName: "Fluke Corporation",
        vendorType: "Manufacturer",
        status: "Active",
        contactPerson: "Rajesh Kumar",
        mobileNumber: "+919876543210",
        alternativeMobileNumber: "+918877665544",
        email: "rajesh@fluke.in",
        website: "www.fluke.com/en-in",
        streetAddress: "102 Industrial Tech Park, Phase 1",
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        pinCode: "600036",
        gstin: "33AAAAA1111A1Z1",
        pan: "AAAAA1111A",
        remarks: "Preferred manufacturer for high-end diagnostic and power quality analyzers."
      },
      {
        id: "VND-HIO02",
        name: "Hioki Instruments Distributor",
        companyName: "Hioki EE Corporation",
        vendorType: "Distributor",
        status: "Active",
        contactPerson: "Anita Patel",
        mobileNumber: "+919988776655",
        alternativeMobileNumber: "",
        email: "anita@hiokipapers.com",
        website: "www.hioki.com",
        streetAddress: "404 Trade Centre, MG Road",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pinCode: "400001",
        gstin: "27BBBBB2222B2Z2",
        pan: "BBBBB2222B",
        remarks: "Primary source for clamp meters and logger probes."
      }
    ];

    db.data.products = [
      {
        id: "PRD-FL001",
        vendorId: "VND-FLK01",
        name: "Power Quality Analyzer Probe",
        description: "Flexible current probe for Fluke 1775.",
        category: "Accessories",
        brand: "Fluke",
        modelNumber: "PM9081",
        unitOfMeasurement: "Units",
        productStatus: "Active",
        utilityId: "transformer",
        utilityName: "Transformer"
      },
      {
        id: "PRD-HI002",
        vendorId: "VND-HIO02",
        name: "Hioki Clamp Logger Sensor",
        description: "AC/DC Current sensor for power loggers.",
        category: "Sensors",
        brand: "Hioki",
        modelNumber: "CT7631",
        unitOfMeasurement: "Units",
        productStatus: "Active",
        utilityId: "motor",
        utilityName: "Motor"
      }
    ];
  }

  await db.write();
  await hashPasswordsInDb();
}

async function getInstruments() {
  await db.read();
  return db.data.instruments;
}

async function getInstrumentById(id) {
  await db.read();
  return db.data.instruments.find(i => String(i.id) === String(id));
}

async function insertInstrument(it) {
  await db.read();
  const id = nanoid(8);
  // default learning / documentation fields
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
    // calibration fields
    lastCalibrationDate: null,
    nextCalibrationDate: null,
    calibrationCertificateUrl: '',
    calibrationCycleDays: 365
  };
  const row = { id, status: 'available', location: 'warehouse', ...defaults, ...it };
  db.data.instruments.push(row);
  await db.write();
  return row;
}

async function updateInstrument(id, fields) {
  await db.read();
  const inst = db.data.instruments.find(i => String(i.id) === String(id));
  if (!inst) return null;
  Object.assign(inst, fields);
  await db.write();
  return inst;
}

async function deleteInstrument(id) {
  await db.read();
  db.data.instruments = db.data.instruments.filter(i => String(i.id) !== String(id));
  await db.write();
}

async function deleteBooking(id) {
  await db.read();
  db.data.bookings = db.data.bookings.filter(b => String(b.id) !== String(id));
  await db.write();
}

async function deleteBookingsByBulkGroupId(groupId) {
  await db.read();
  db.data.bookings = db.data.bookings.filter(b => String(b.bulkGroupId) !== String(groupId));
  await db.write();
}

async function getUsers() {
  await db.read();
  return db.data.users.map(u => ({
    ...u,
    name: decrypt(u.name),
    email: decrypt(u.email),
    phone: decrypt(u.phone)
  }));
}

async function insertBooking(b) {
  await db.read();
  const id = nanoid(8);
  const row = { id, returnedDate: null, ...b };
  db.data.bookings.push(row);
  await db.write();
  return row;
}

async function getBookings() {
  await db.read();
  return db.data.bookings;
}

async function findActiveBookingByInstrument(instrumentId) {
  await db.read();
  const now = new Date();
  const bookings = db.data.bookings
    .filter(b => String(b.instrumentId) === String(instrumentId) && !b.returnedDate && b.status === 'approved')
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const activeBookings = bookings.filter(b => {
    const start = new Date(b.startDate);
    const due = new Date(b.dueDate);
    return start <= now && due >= now;
  });

  if (activeBookings.length > 0) {
    return activeBookings[activeBookings.length - 1];
  }

  // If no booking covers now, return the most recent overdue booking not yet returned.
  const overdue = bookings.filter(b => new Date(b.dueDate) < now);
  if (overdue.length > 0) {
    return overdue[overdue.length - 1];
  }

  if (bookings.length > 0) {
    return bookings[0];
  }

  return null;
}

async function returnBooking(bookingId, returnedDate, remarks, returnedById, returnedByName) {
  await db.read();
  const b = db.data.bookings.find(x => String(x.id) === String(bookingId));
  if (!b) return null;
  b.returnedDate = returnedDate;
  b.dueDate = returnedDate;
  if (remarks) {
    b.returnRemarks = remarks;
  }
  if (returnedById) {
    b.returnedById = returnedById;
  }
  if (returnedByName) {
    b.returnedByName = returnedByName;
  }
  await db.write();
  return b;
}

async function setInstrumentInsight(instrumentId, insight) {
  await db.read();
  const inst = db.data.instruments.find(i=>String(i.id)===String(instrumentId));
  if(!inst) return null;
  inst.lastInsight = insight;
  await db.write();
  return inst;
}

async function getInstrumentByIdFull(id){
  await db.read();
  return db.data.instruments.find(i => String(i.id) === String(id));
}

async function getInstrumentsDueForCalibration(days=15){
  await db.read();
  const now = new Date();
  const cutoff = new Date(now.getTime() + days*24*3600*1000);
  return db.data.instruments.filter(i=> i.nextCalibrationDate && new Date(i.nextCalibrationDate) >= now && new Date(i.nextCalibrationDate) <= cutoff);
}

async function writeData() { await db.write(); }

async function setBookings(bookings) {
  await db.read();
  db.data.bookings = bookings;
  await db.write();
  return db.data.bookings;
}

async function hashPasswordsInDb() {
  await db.read();
  let updated = false;
  db.data.users = db.data.users || [];
  for (const user of db.data.users) {
    if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      user.password = await bcrypt.hash(user.password, 10);
      updated = true;
    }
  }
  if (updated) {
    await db.write();
    console.log('Successfully migrated passwords to secure bcrypt hashes.');
  }
}

async function insertUser(u) {
  await db.read();
  const id = nanoid(8);
  const hashedPassword = await bcrypt.hash(u.password, 10);
  const row = {
    id,
    name: encrypt(u.name),
    email: encrypt(u.email),
    phone: encrypt(u.phone),
    password: hashedPassword,
    role: u.role
  };
  db.data.users.push(row);
  await db.write();
  return { ...row, name: u.name, email: u.email, phone: u.phone };
}

async function getUserByEmail(email) {
  const users = await getUsers();
  return users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
}

async function getBookingById(id) {
  await db.read();
  return db.data.bookings.find(b => String(b.id) === String(id));
}

async function updateBooking(id, fields) {
  await db.read();
  const b = db.data.bookings.find(x => String(x.id) === String(id));
  if (!b) return null;
  Object.assign(b, fields);
  await db.write();
  return b;
}

async function getBookingsByBulkGroupId(groupId) {
  await db.read();
  return db.data.bookings.filter(b => b.bulkGroupId === groupId);
}

async function deleteUser(id) {
  await db.read();
  db.data.users = db.data.users.filter(u => String(u.id) !== String(id));
  await db.write();
}

async function updateUser(id, fields) {
  await db.read();
  const u = db.data.users.find(x => String(x.id) === String(id));
  if (!u) return null;
  
  const encryptedFields = { ...fields };
  if (fields.name !== undefined) encryptedFields.name = encrypt(fields.name);
  if (fields.email !== undefined) encryptedFields.email = encrypt(fields.email);
  if (fields.phone !== undefined) encryptedFields.phone = encrypt(fields.phone);
  
  Object.assign(u, encryptedFields);
  await db.write();
  
  return {
    ...u,
    name: fields.name !== undefined ? fields.name : decrypt(u.name),
    email: fields.email !== undefined ? fields.email : decrypt(u.email),
    phone: fields.phone !== undefined ? fields.phone : decrypt(u.phone)
  };
}

async function getVendors() {
  await db.read();
  return db.data.vendors || [];
}

async function getVendorById(id) {
  await db.read();
  return (db.data.vendors || []).find(v => String(v.id) === String(id));
}

async function insertVendor(v) {
  await db.read();
  const id = 'VND' + nanoid(5).toUpperCase();
  const row = { id, ...v };
  db.data.vendors = db.data.vendors || [];
  db.data.vendors.push(row);
  await db.write();
  return row;
}

async function updateVendor(id, fields) {
  await db.read();
  const vendor = (db.data.vendors || []).find(v => String(v.id) === String(id));
  if (!vendor) return null;
  Object.assign(vendor, fields);
  await db.write();
  return vendor;
}

async function deleteVendor(id) {
  await db.read();
  db.data.vendors = (db.data.vendors || []).filter(v => String(v.id) !== String(id));
  db.data.products = (db.data.products || []).filter(p => String(p.vendorId) !== String(id));
  await db.write();
}

async function getProducts() {
  await db.read();
  return db.data.products || [];
}

async function getProductsByVendor(vendorId) {
  await db.read();
  return (db.data.products || []).filter(p => String(p.vendorId) === String(vendorId));
}

async function getProductById(id) {
  await db.read();
  return (db.data.products || []).find(p => String(p.id) === String(id));
}

async function insertProduct(p) {
  await db.read();
  const id = 'PRD' + nanoid(5).toUpperCase();
  const row = { id, ...p };
  db.data.products = db.data.products || [];
  db.data.products.push(row);
  await db.write();
  return row;
}

async function updateProduct(id, fields) {
  await db.read();
  const prod = (db.data.products || []).find(p => String(p.id) === String(id));
  if (!prod) return null;
  Object.assign(prod, fields);
  await db.write();
  return prod;
}

async function deleteProduct(id) {
  await db.read();
  db.data.products = (db.data.products || []).filter(p => String(p.id) !== String(id));
  await db.write();
}

async function getUtilities() {
  await db.read();
  return db.data.utilities || [];
}

async function insertUtility(name) {
  await db.read();
  db.data.utilities = db.data.utilities || [];
  const norm = name.toLowerCase().trim();
  const existing = db.data.utilities.find(u => u.id === norm);
  if (existing) {
    return existing;
  }
  const row = { id: norm, name: name.trim() };
  db.data.utilities.push(row);
  await db.write();
  return row;
}

module.exports = {
  init,
  getInstruments,
  getInstrumentById,
  insertInstrument,
  updateInstrument,
  deleteInstrument,
  getUsers,
  insertUser,
  getUserByEmail,
  insertBooking,
  getBookings,
  getBookingById,
  updateBooking,
  findActiveBookingByInstrument,
  returnBooking,
  setInstrumentInsight,
  getInstrumentByIdFull,
  getBookingsByBulkGroupId,
  deleteBooking,
  deleteBookingsByBulkGroupId,
  deleteUser,
  updateUser,
  hashPasswordsInDb,
  writeData,
  setBookings,
  getVendors,
  getVendorById,
  insertVendor,
  updateVendor,
  deleteVendor,
  getProducts,
  getProductsByVendor,
  getProductById,
  insertProduct,
  updateProduct,
  deleteProduct,
  getUtilities,
  insertUtility
};
