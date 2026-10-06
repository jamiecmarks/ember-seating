/**
 * Ember seating: Google Apps Script backend.
 *
 * Setup (see README.md):
 *  1. Create a Google Sheet, then Extensions → Apps Script, and paste this file in.
 *  2. Project Settings → Script properties → add ADMIN_PASSWORD = <your password>.
 *  3. Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone.
 *  4. Copy the web app URL into config.js (API_URL).
 *
 * Staff picks are never returned to anyone without the admin password.
 * Resubmitting under the same name replaces that person's earlier picks.
 */

const MAX_PICKS = 3;
const PICKS_SHEET = 'Picks';
const ATT_SHEET = 'Attendance';
const PICKS_HEADERS = ['Name', 'Pick 1', 'Pick 2', 'Pick 3', 'Updated'];
const ATT_HEADERS = ['Name', 'Attendance'];

function doGet() {
  return json_({ ok: true, message: 'Ember seating API is running.' });
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = handle_(req);
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return json_(out);
}

function handle_(req) {
  switch (req.action) {
    case 'submit': return submit_(req);
    case 'admin': return admin_(req);
    case 'saveAttendance': return saveAttendance_(req);
    case 'clear': return clear_(req);
    default: throw new Error('Unknown action.');
  }
}

// ---------------- Staff actions ----------------

function submit_(req) {
  const name = cleanName_(req.name);
  const picks =Array.isArray(req.picks) ? req.picks.map(String) : [];
  if (!picks.length || picks.length > MAX_PICKS) throw new Error('Pick between 1 and ' + MAX_PICKS + ' desks.');
  if (new Set(picks).size !== picks.length) throw new Error('Each pick must be a different desk.');
  picks.forEach(function (p) { if (!/^[A-Za-z0-9-]{1,8}$/.test(p)) throw new Error('Invalid desk ID.'); });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_(PICKS_SHEET, PICKS_HEADERS);
    const row = findRow_(sh, name);
    const values = [name];
    for (let i = 0; i < MAX_PICKS; i++) values.push(picks[i] || '');
    values.push(new Date().toISOString());
    if (row) sh.getRange(row, 1, 1, values.length).setValues([values]);
    else sh.appendRow(values);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

// ---------------- Admin actions ----------------

function admin_(req) {
  checkAdmin_(req.password);
  const sh = sheet_(PICKS_SHEET, PICKS_HEADERS);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, PICKS_HEADERS.length).getValues() : [];
  const picks = rows.filter(function (r) { return r[0]; }).map(function (r) {
    return { name: String(r[0]), picks: r.slice(1, 1 + MAX_PICKS).map(String).filter(String), updatedAt: String(r[1 + MAX_PICKS]) };
  });

  const at = sheet_(ATT_SHEET, ATT_HEADERS);
  const attRows = at.getLastRow() > 1 ? at.getRange(2, 1, at.getLastRow() - 1, 2).getValues() : [];
  const attendance = {};
  attRows.forEach(function (r) { if (r[0] !== '') attendance[String(r[0])] = Number(r[1]) || 0; });

  return { ok: true, picks: picks, attendance: attendance };
}

function saveAttendance_(req) {
  checkAdmin_(req.password);
  const att = req.attendance || {};
  const rows = Object.keys(att).map(function (k) { return [k, Number(att[k]) || 0]; });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_(ATT_SHEET, ATT_HEADERS);
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
    if (rows.length) sh.getRange(2, 1, rows.length, 2).setValues(rows);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function clear_(req) {
  checkAdmin_(req.password);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    [sheet_(PICKS_SHEET, PICKS_HEADERS), sheet_(ATT_SHEET, ATT_HEADERS)].forEach(function (sh) {
      if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    });
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

// ---------------- Helpers ----------------

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, name) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const names = sh.getRange(2, 1, last - 1, 1).getValues();
  const key = name.toLowerCase();
  for (let i = 0; i < names.length; i++) {
    if (String(names[i][0]).trim().toLowerCase() === key) return i + 2;
  }
  return 0;
}

function cleanName_(name) {
  const n = String(name || '').trim();
  if (!n || n.length > 80) throw new Error('Choose your name.');
  return n;
}

function checkAdmin_(password) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!expected) throw new Error('Admin password not set. Add ADMIN_PASSWORD in Apps Script → Project Settings → Script properties.');
  if (String(password || '') !== expected) throw new Error('Wrong password.');
}
