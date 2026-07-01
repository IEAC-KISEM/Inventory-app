const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const { nanoid } = require('nanoid');
const fs = require('fs');

const file = path.join(__dirname, 'data.json');
const adapter = new JSONFile(file);
// Provide default data to avoid lowdb missing default data error
const defaultData = { users: [], instruments: [], bookings: [] };
const db = new Low(adapter, defaultData);

async function init() {
  await db.read();
  db.data = db.data || { users: [], instruments: [], bookings: [] };
  
  // Ensure default admin user exists
  if (!db.data.users || db.data.users.length === 0) {
    db.data.users = [
      {
        id: 'admin',
        name: 'Administrator',
        email: 'admin',
        phone: '1234567890',
        password: 'admin',
        role: 'admin'
      }
    ];
  }
  await db.write();
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

async function getUsers() {
  await db.read();
  return db.data.users;
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
  return db.data.bookings.find(b => b.instrumentId === instrumentId && !b.returnedDate && b.status !== 'pending' && b.status !== 'denied');
}

async function returnBooking(bookingId, returnedDate, remarks) {
  await db.read();
  const b = db.data.bookings.find(x => x.id === bookingId);
  if (!b) return null;
  b.returnedDate = returnedDate;
  b.remarks = remarks || b.remarks;
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

async function insertUser(u) {
  await db.read();
  const id = nanoid(8);
  const row = { id, ...u };
  db.data.users.push(row);
  await db.write();
  return row;
}

async function getUserByEmail(email) {
  await db.read();
  return db.data.users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
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
  deleteUser,
  writeData
};
