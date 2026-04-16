/**
 * ══════════════════════════════════════════════════════════
 * PackageDesk — Google Sheets Backend
 * The REMY Apartments (A LIVEBe Community)
 * Powered by AXG Systems
 * ══════════════════════════════════════════════════════════
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet with two tabs: "Packages" and "Residents"
 * 2. In "Packages" row 1, add headers:
 *    ID | Check-In | Resident | Apartment | Carrier | Size | Tracking | Notes | Logged By | Status | Pickup Time | Signature Method | Typed Name
 * 3. In "Residents" row 1, add headers:
 *    ID | Name | Apartment | Email | Phone
 * 4. Open Extensions > Apps Script, paste this file
 * 5. Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the web app URL into your app.js SHEETS_API_URL
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'logPackage':
        return logPackage(body.package);
      case 'logPickup':
        return logPickup(body.package);
      case 'addResident':
        return addResident(body.resident);
      case 'sendNotification':
        return sendNotification(body);
      case 'getResidents':
        return getResidents();
      case 'validateLicense':
        return validateLicense(body);
      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getResidents') return getResidents();
  if (action === 'getPackages') return getPackages();
  if (action === 'checkKill') return checkKillSwitch(e.parameter.key);
  return jsonResponse({ status: 'PackageDesk API is running' });
}

// ══════════════════════════════════════════════
//  LICENSE VALIDATION & KILL SWITCH
// ══════════════════════════════════════════════
// Add a "Licenses" tab to your Sheet with columns: Key | Status | Origin | Notes
// Status values: "active", "revoked", "killed"

const VALID_KEYS = [
  'REMY-2026-AXG0-LIVE',
  'AXGS-DEMO-2026-TRIAL',
  'AXGS-MSTR-0001-ADMN',
];

function validateLicense(body) {
  const key = (body.key || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const origin = body.origin || '';

  // Check hardcoded keys
  if (VALID_KEYS.includes(key)) {
    logLicenseCheck(key, origin, 'valid');
    return jsonResponse({ valid: true, message: 'License activated' });
  }

  // Check Licenses sheet for dynamic keys
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Licenses');
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toUpperCase() === key) {
          const status = String(data[i][1]).toLowerCase();
          if (status === 'active') {
            logLicenseCheck(key, origin, 'valid');
            return jsonResponse({ valid: true, message: 'License activated' });
          }
          if (status === 'killed' || status === 'revoked') {
            logLicenseCheck(key, origin, 'killed');
            return jsonResponse({ valid: false, killed: true, message: 'License has been revoked' });
          }
        }
      }
    }
  } catch (err) {}

  logLicenseCheck(key, origin, 'invalid');
  return jsonResponse({ valid: false, message: 'Invalid license key' });
}

function checkKillSwitch(key) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Licenses');
    if (!sheet) return jsonResponse({ killed: false });
    const data = sheet.getDataRange().getValues();
    const clean = (key || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).toUpperCase() === clean) {
        const status = String(data[i][1]).toLowerCase();
        return jsonResponse({ killed: status === 'killed' || status === 'revoked' });
      }
    }
  } catch (err) {}
  return jsonResponse({ killed: false });
}

function logLicenseCheck(key, origin, result) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('License Log');
    if (!sheet) return;
    sheet.appendRow([new Date().toISOString(), key, origin, result]);
  } catch (err) {}
}

// ── Log a new package ──
function logPackage(pkg) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Packages');
  sheet.appendRow([
    pkg.id,
    pkg.checkinTime,
    pkg.residentName,
    pkg.apartment,
    pkg.carrier,
    pkg.size,
    pkg.tracking || '',
    pkg.notes || '',
    pkg.loggedBy,
    'Pending',
    '',
    '',
    ''
  ]);
  return jsonResponse({ success: true, action: 'logPackage' });
}

// ── Update package to picked up ──
function logPickup(pkg) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Packages');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(pkg.id)) {
      sheet.getRange(i + 1, 10).setValue('Picked Up');
      sheet.getRange(i + 1, 11).setValue(pkg.pickupTime);
      sheet.getRange(i + 1, 12).setValue(pkg.signatureMethod || '');
      sheet.getRange(i + 1, 13).setValue(pkg.typedSignature || '');
      break;
    }
  }
  return jsonResponse({ success: true, action: 'logPickup' });
}

// ── Add a resident ──
function addResident(res) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Residents');
  sheet.appendRow([
    res.id,
    res.name,
    res.apartment,
    res.email || '',
    res.phone || ''
  ]);
  return jsonResponse({ success: true, action: 'addResident' });
}

// ── Get all residents ──
function getResidents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Residents');
  const data = sheet.getDataRange().getValues();
  const residents = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    residents.push({
      id: data[i][0],
      name: data[i][1],
      apartment: String(data[i][2]),
      email: data[i][3] || null,
      phone: data[i][4] || null
    });
  }
  return jsonResponse({ residents });
}

// ── Get all packages ──
function getPackages() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Packages');
  const data = sheet.getDataRange().getValues();
  const packages = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    packages.push({
      id: data[i][0],
      checkinTime: data[i][1],
      residentName: data[i][2],
      apartment: String(data[i][3]),
      carrier: data[i][4],
      size: data[i][5],
      tracking: data[i][6] || null,
      notes: data[i][7] || null,
      loggedBy: data[i][8],
      status: data[i][9] === 'Picked Up' ? 'picked_up' : 'pending',
      pickupTime: data[i][10] || null,
      signatureMethod: data[i][11] || null,
      typedSignature: data[i][12] || null
    });
  }
  return jsonResponse({ packages });
}

// ── Send email notification (PLFR 6) ──
function sendNotification(data) {
  if (!data.email) return jsonResponse({ success: false, reason: 'No email' });

  const subject = `Package at Front Desk — The REMY Apartments`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #0f1526; color: #e8ecf4; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1a2240 0%, #0f1526 100%); padding: 24px; border-bottom: 1px solid rgba(201,168,76,0.25);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #c9a84c, #a08630); border-radius: 8px; text-align: center; line-height: 40px; font-family: Georgia, serif; font-size: 20px; font-weight: bold; color: #0a0e1a;">R</div>
          <div>
            <div style="font-size: 18px; font-weight: 700;">The REMY</div>
            <div style="font-size: 11px; color: #8892a8; text-transform: uppercase; letter-spacing: 1px;">A <span style="color: #c9a84c; font-weight: 700;">LIVEBe</span> Community</div>
          </div>
        </div>
      </div>
      <div style="padding: 28px 24px;">
        <h2 style="margin: 0 0 8px; font-size: 22px; color: #e8ecf4;">You have a package!</h2>
        <p style="color: #8892a8; margin: 0 0 20px; font-size: 14px;">A delivery is waiting for you at the front desk.</p>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px;">
          <table style="width: 100%; font-size: 14px; color: #e8ecf4;">
            <tr><td style="padding: 6px 0; color: #8892a8;">Package ID</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">#${data.packageId}</td></tr>
            <tr><td style="padding: 6px 0; color: #8892a8;">Resident</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.residentName}</td></tr>
            <tr><td style="padding: 6px 0; color: #8892a8;">Apartment</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.apartment}</td></tr>
            <tr><td style="padding: 6px 0; color: #8892a8;">Carrier</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.carrier}</td></tr>
            <tr><td style="padding: 6px 0; color: #8892a8;">Size</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.size}</td></tr>
          </table>
        </div>
        <p style="color: #8892a8; font-size: 13px; margin-top: 20px;">Please pick up your package at your earliest convenience. Bring a valid photo ID.</p>
      </div>
      <div style="padding: 16px 24px; border-top: 1px solid rgba(201,168,76,0.2); text-align: center;">
        <div style="font-size: 10px; color: #5a6478; text-transform: uppercase; letter-spacing: 1px;">Powered & Designed by</div>
        <div style="font-size: 14px; font-weight: 800; letter-spacing: 3px; background: linear-gradient(135deg, #e0c76a, #c9a84c, #a08630); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">AXG SYSTEMS</div>
      </div>
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: data.email,
      subject: subject,
      htmlBody: html
    });
    return jsonResponse({ success: true, action: 'sendNotification' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
