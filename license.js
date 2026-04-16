/* ══════════════════════════════════════════════════════════
   PackageDesk License Protection System
   (c) AXG Systems — All Rights Reserved

   Features:
   - License key validation (offline + remote)
   - Remote kill switch
   - Domain/origin locking
   - Tamper detection
   - Periodic revalidation
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── CONFIG ──
  // Set your remote license server URL (Apps Script or custom endpoint)
  // Leave empty for offline-only validation
  const LICENSE_SERVER = ''; // e.g. 'https://script.google.com/macros/s/XXXXX/exec'

  // Allowed origins — lock to specific domains. Empty = allow any.
  const ALLOWED_ORIGINS = [
    // 'https://theremy.packagedesk.com',
    // 'https://packagedesk.axgsystems.com',
  ];

  // Revalidation interval (ms) — check remote server periodically
  const REVALIDATE_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

  const STORAGE_KEY = 'pd_license';
  const KILL_KEY    = 'pd_killed';

  // ── VALID LICENSE KEYS ──
  // In production, move validation server-side. These are hashed.
  // Format: XXXX-XXXX-XXXX-XXXX
  const VALID_KEY_HASHES = new Set([
    hashKey('REMY-2026-AXG0-LIVE'),  // Primary key for The REMY
    hashKey('AXGS-DEMO-2026-TRIAL'), // Demo/trial key
    hashKey('AXGS-MSTR-0001-ADMN'),  // AXG Systems master key
  ]);

  // ── HASH FUNCTION (simple but effective for offline validation) ──
  function hashKey(key) {
    let h = 0;
    const s = key.toUpperCase().replace(/[^A-Z0-9]/g, '') + 'AXG_SALT_v3';
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h.toString(36);
  }

  // ── FORMAT KEY INPUT (auto-add dashes) ──
  function setupKeyFormatter() {
    const input = document.getElementById('licenseKeyInput');
    if (!input) return;
    input.addEventListener('input', () => {
      let v = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (v.length > 16) v = v.slice(0, 16);
      const parts = v.match(/.{1,4}/g);
      input.value = parts ? parts.join('-') : '';
    });
  }

  // ── VALIDATE KEY (offline) ──
  function validateKeyOffline(key) {
    const clean = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length !== 16) return false;
    return VALID_KEY_HASHES.has(hashKey(key));
  }

  // ── VALIDATE KEY (remote) ──
  async function validateKeyRemote(key) {
    if (!LICENSE_SERVER) return { valid: true, message: 'Offline mode' };
    try {
      const resp = await fetch(LICENSE_SERVER, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'validateLicense',
          key: key,
          origin: window.location.origin,
          timestamp: Date.now()
        })
      });
      return await resp.json();
    } catch {
      // If server unreachable, fall back to offline
      return { valid: validateKeyOffline(key), message: 'Offline fallback' };
    }
  }

  // ── KILL SWITCH CHECK ──
  async function checkKillSwitch() {
    if (!LICENSE_SERVER) return false;
    try {
      const resp = await fetch(LICENSE_SERVER + '?action=checkKill&key=' + encodeURIComponent(getStoredKey()));
      const data = await resp.json();
      if (data.killed) {
        localStorage.setItem(KILL_KEY, 'true');
        return true;
      }
      return false;
    } catch {
      return localStorage.getItem(KILL_KEY) === 'true';
    }
  }

  // ── DOMAIN LOCK ──
  function checkDomainLock() {
    if (ALLOWED_ORIGINS.length === 0) return true;
    // Allow file:// for local dev
    if (window.location.protocol === 'file:') return true;
    return ALLOWED_ORIGINS.includes(window.location.origin);
  }

  // ── TAMPER DETECTION ──
  function setupTamperDetection() {
    // Detect if license.js is removed or bypassed
    window.__pd_license_loaded = true;

    // Detect DevTools open (basic)
    let devtoolsOpen = false;
    const threshold = 160;
    const check = () => {
      if (window.outerWidth - window.innerWidth > threshold ||
          window.outerHeight - window.innerHeight > threshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          console.warn('%c[PackageDesk] This software is licensed by AXG Systems. Unauthorized copying, modification, or redistribution is prohibited.', 'color: #c9a84c; font-weight: bold; font-size: 14px;');
        }
      } else {
        devtoolsOpen = false;
      }
    };
    setInterval(check, 2000);

    // Right-click warning
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.signature-pad-wrapper')) return; // allow on canvas
      console.warn('[PackageDesk] (c) AXG Systems — All Rights Reserved');
    });
  }

  // ── STORAGE ──
  function getStoredKey() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return data?.key || '';
    } catch { return ''; }
  }

  function storeKey(key) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      key,
      activatedAt: Date.now(),
      lastValidated: Date.now()
    }));
  }

  function getLastValidated() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return data?.lastValidated || 0;
    } catch { return 0; }
  }

  function updateLastValidated() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data) {
        data.lastValidated = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {}
  }

  // ── SHOW / HIDE APP ──
  function showApp() {
    document.getElementById('licenseGate').classList.add('hidden');
    document.getElementById('appContainer').style.display = 'flex';

    const key = getStoredKey();
    const infoEl = document.getElementById('licenseInfo');
    if (infoEl && key) {
      const masked = key.slice(0, 4) + '-****-****-' + key.slice(-4);
      infoEl.textContent = 'License: ' + masked;
    }
  }

  function showKilled() {
    const gate = document.getElementById('licenseGate');
    const body = gate.querySelector('.license-body');
    body.innerHTML = `
      <h2 style="color:#dc2626;">License Revoked</h2>
      <p>This license has been deactivated. Please contact AXG Systems to restore access.</p>
      <p style="margin-top:1rem;font-size:0.8rem;color:#8a8a9a;">support@axgsystems.com</p>
    `;
  }

  // ── INIT ──
  async function init() {
    // DEV BYPASS — remove or set to false for production
    const DEV_MODE = new URLSearchParams(window.location.search).has('dev') || true;
    if (DEV_MODE) { showApp(); return; }

    setupKeyFormatter();
    setupTamperDetection();

    // Domain lock
    if (!checkDomainLock()) {
      const errEl = document.getElementById('licenseError');
      if (errEl) errEl.textContent = 'This domain is not authorized to run PackageDesk.';
      return;
    }

    // Kill switch
    if (localStorage.getItem(KILL_KEY) === 'true') {
      const killed = await checkKillSwitch();
      if (killed) { showKilled(); return; }
      else localStorage.removeItem(KILL_KEY);
    }

    // Check stored license
    const storedKey = getStoredKey();
    if (storedKey && validateKeyOffline(storedKey)) {
      // Periodic remote revalidation
      if (LICENSE_SERVER && Date.now() - getLastValidated() > REVALIDATE_INTERVAL) {
        const result = await validateKeyRemote(storedKey);
        if (!result.valid) {
          localStorage.removeItem(STORAGE_KEY);
          return; // Show gate
        }
        // Check kill switch during revalidation
        const killed = await checkKillSwitch();
        if (killed) { showKilled(); return; }
        updateLastValidated();
      }
      showApp();
      return;
    }

    // No valid stored key — show activation gate
    document.getElementById('licenseActivateBtn').addEventListener('click', async () => {
      const input = document.getElementById('licenseKeyInput');
      const errEl = document.getElementById('licenseError');
      const key = input.value.trim();

      if (!key) { errEl.textContent = 'Please enter a license key.'; return; }

      // Offline check first
      if (!validateKeyOffline(key)) {
        errEl.textContent = 'Invalid license key. Contact AXG Systems for a valid key.';
        input.style.borderColor = '#dc2626';
        return;
      }

      // Remote check
      const result = await validateKeyRemote(key);
      if (!result.valid) {
        errEl.textContent = result.message || 'License validation failed.';
        return;
      }

      storeKey(key);
      showApp();
    });

    // Enter key to submit
    document.getElementById('licenseKeyInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('licenseActivateBtn').click();
    });
  }

  // Expose for kill switch from remote
  window.PackageDeskLicense = {
    kill: () => { localStorage.setItem(KILL_KEY, 'true'); location.reload(); },
    revoke: () => { localStorage.removeItem(STORAGE_KEY); localStorage.setItem(KILL_KEY, 'true'); location.reload(); },
    getKey: () => getStoredKey(),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
