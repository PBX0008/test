(() => {
  'use strict';

  const KEYS = {
    profile: 'nclex-user-profile-v1',
    lastLocation: 'nclex-user-location-v1',
    device: 'nclex-device-info-v1',
    adminApiKey: 'nclex-admin-api-key-v1'
  };

  const cfg = () => {
    const root = window.NCLEX_REPO_CONFIG || {};
    return {
      enabled: false,
      apiUrl: '',
      usersEndpoint: '',
      heartbeatEndpoint: '',
      progressEndpoint: '',
      requireLocation: false,
      offlineDays: 3,
      heartbeatSeconds: 60,
      appId: 'nclex-rn-repository',
      ...(root.admin || {})
    };
  };

  function storageGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  }

  function detectBrowser() {
    const ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'Microsoft Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/CriOS\//.test(ua) || /Chrome\//.test(ua)) return 'Chrome';
    if (/FxiOS\//.test(ua) || /Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua) && !/Chrome|CriOS|Chromium/.test(ua)) return 'Safari';
    return 'Unknown browser';
  }

  function detectDevice() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const tablet = /iPad|Tablet/i.test(ua);
    let os = 'Unknown OS';
    if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS/iPadOS';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    return {
      browser: detectBrowser(),
      os,
      type: tablet ? 'Tablet' : mobile ? 'Mobile' : 'Desktop',
      platform,
      userAgent: ua,
      language: navigator.language || '',
      screen: `${screen.width}x${screen.height}`,
      viewport: `${innerWidth}x${innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    };
  }

  function getDeviceInfo() {
    const info = detectDevice();
    storageSet(KEYS.device, info);
    return info;
  }

  function getProfile() {
    return storageGet(KEYS.profile, null);
  }

  function getLastLocation() {
    return storageGet(KEYS.lastLocation, null);
  }

  const AUTH_VALIDITY_MS = 45 * 24 * 60 * 60 * 1000;
  const IST_OFFSET_MINUTES = 5 * 60 + 30;
  const PASSWORD_TIME_ADD_MINUTES = 4 * 60 + 14;

  function namePrefix(name) {
    return String(name || '')
      .normalize('NFKD')
      .replace(/[^a-z]/gi, '')
      .slice(0, 3)
      .toUpperCase();
  }

  function passwordForMoment(name, momentMs = Date.now()) {
    const prefix = namePrefix(name);
    if (prefix.length !== 3) return '';
    const adjusted = new Date(momentMs + (IST_OFFSET_MINUTES + PASSWORD_TIME_ADD_MINUTES) * 60 * 1000);
    const hours = String(adjusted.getUTCHours()).padStart(2, '0');
    const minutes = String(adjusted.getUTCMinutes()).padStart(2, '0');
    return `${prefix}${hours}${minutes}`;
  }

  function validPasswordCandidates(name, nowMs = Date.now()) {
    // A small time window prevents a correct password becoming invalid while it is being typed.
    return new Set([-2, -1, 0, 1, 2].map((offset) => passwordForMoment(name, nowMs + offset * 60 * 1000)));
  }

  function isActiveProfile(profile) {
    if (!profile || typeof profile !== 'object') return false;
    const expiresAt = Number(profile.expiresAt || 0);
    const authenticatedAt = Number(profile.authenticatedAt || 0);
    if (!profile.name || !expiresAt || !authenticatedAt) return false;
    if (Date.now() < authenticatedAt - 5 * 60 * 1000) return false;
    return Date.now() < expiresAt;
  }

  function canUseApp() {
    return isActiveProfile(getProfile());
  }

  function removeAccessGate() {
    document.body.classList.remove('access-locked');
    document.getElementById('accessGateOverlay')?.remove();
  }

  function createAccessGate(resolve) {
    document.getElementById('accessGateOverlay')?.remove();
    document.body.classList.add('access-locked');

    const saved = getProfile();
    const overlay = document.createElement('div');
    overlay.id = 'accessGateOverlay';
    overlay.className = 'access-gate-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'accessGateTitle');
    overlay.innerHTML = `
      <form class="access-gate-card" id="accessGateForm" autocomplete="off">
        <div class="access-gate-icon" aria-hidden="true"><span class="material-symbols-outlined">lock_person</span></div>
        <p class="access-gate-kicker">DEVICE ACTIVATION</p>
        <h1 id="accessGateTitle">Unlock NCLEX RN</h1>
        <p class="access-gate-copy">Enter the learner's name and the time-based password. Successful activation remains valid on this browser or installed app for 45 days.</p>
        <label class="access-field" for="accessName">
          <span>Full name</span>
          <input id="accessName" name="name" type="text" maxlength="80" autocomplete="name" autocapitalize="words" spellcheck="false" required />
        </label>
        <label class="access-field" for="accessPassword">
          <span>Password</span>
          <input id="accessPassword" name="password" type="password" maxlength="7" inputmode="text" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" required />
        </label>
        <div class="access-password-rule">
          <span class="material-symbols-outlined" aria-hidden="true">schedule</span>
          <span>First 3 name letters in capitals + 24-hour IST after adding 4 hours 14 minutes. Example: Seema → SEE2105 when the adjusted time is 21:05.</span>
        </div>
        <p class="access-error" id="accessError" role="alert" aria-live="polite"></p>
        <button class="access-submit" type="submit">
          <span class="material-symbols-outlined" aria-hidden="true">verified_user</span>
          <span>Activate for 45 days</span>
        </button>
        <p class="access-local-note"><span class="material-symbols-outlined" aria-hidden="true">devices</span>Activation is stored only on this device and browser.</p>
      </form>`;

    document.body.appendChild(overlay);
    const form = overlay.querySelector('#accessGateForm');
    const nameInput = overlay.querySelector('#accessName');
    const passwordInput = overlay.querySelector('#accessPassword');
    const error = overlay.querySelector('#accessError');
    const submit = overlay.querySelector('.access-submit');

    if (saved?.name) nameInput.value = String(saved.name);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      error.textContent = '';
      const name = nameInput.value.trim().replace(/\s+/g, ' ');
      const prefix = namePrefix(name);
      const entered = passwordInput.value.replace(/\s+/g, '').toUpperCase();

      if (prefix.length !== 3) {
        error.textContent = 'Enter a name containing at least three English letters.';
        nameInput.focus();
        return;
      }

      if (!validPasswordCandidates(name).has(entered)) {
        error.textContent = 'The name or password is incorrect. Recalculate it using the current IST time.';
        passwordInput.select();
        return;
      }

      const now = Date.now();
      submit.disabled = true;
      const savedSuccessfully = storageSet(KEYS.profile, {
        version: 2,
        name,
        prefix,
        authenticatedAt: now,
        expiresAt: now + AUTH_VALIDITY_MS
      });
      if (!savedSuccessfully) {
        submit.disabled = false;
        error.textContent = 'Activation could not be saved. Allow site storage and try again.';
        return;
      }
      removeAccessGate();
      resolve(true);
    });

    requestAnimationFrame(() => (nameInput.value ? passwordInput : nameInput).focus());
  }

  async function ensureAppAccess() {
    if (canUseApp()) {
      removeAccessGate();
      return true;
    }
    return new Promise((resolve) => createAccessGate(resolve));
  }

  function progressSnapshot() {
    const items = [];
    try {
      Object.keys(localStorage).forEach((key) => {
        if (!key.startsWith('nclex-progress-')) return;
        const progress = storageGet(key, null);
        const completed = Array.isArray(progress?.completed) ? progress.completed.filter(Boolean).length : 0;
        const answers = Array.isArray(progress?.answers) ? progress.answers.filter((answer) => Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined).length : 0;
        items.push({
          testId: key.replace('nclex-progress-', ''),
          completed,
          answers,
          correctCount: Number(progress?.correctCount || 0),
          seconds: Number(progress?.seconds || 0),
          finished: Boolean(progress?.finished),
          startedAt: progress?.startedAt || null,
          finishedAt: progress?.finishedAt || null,
          savedAt: progress?.savedAt || null
        });
      });
    } catch {}
    return items;
  }

  function apiBase() {
    return String(cfg().apiUrl || '').replace(/\/$/, '');
  }

  function endpoint(kind) {
    const config = cfg();
    const explicit = config[`${kind}Endpoint`];
    if (explicit) return explicit;
    const base = apiBase();
    if (!base) return '';
    if (kind === 'users') return `${base}/users`;
    if (kind === 'progress') return `${base}/progress`;
    return `${base}/heartbeat`;
  }

  function publicPayload(eventType = 'heartbeat', extra = {}) {
    return {
      appId: cfg().appId,
      eventType,
      userId: null,
      timestamp: new Date().toISOString(),
      active: !document.hidden,
      location: null,
      device: getDeviceInfo(),
      progress: progressSnapshot(),
      ...extra
    };
  }

  async function postAdmin(kind, payload) {
    const url = endpoint(kind);
    if (!url || cfg().enabled === false) return { skipped: true };
    const headers = { 'Content-Type': 'application/json' };
    if (cfg().apiKey) headers.Authorization = `Bearer ${cfg().apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true
    });
    if (!response.ok) throw new Error(`Admin sync failed (${response.status})`);
    return response.json().catch(() => ({ ok: true }));
  }

  let lastProgressSync = 0;
  async function syncClientEvent(eventType = 'heartbeat', extra = {}) {
    try {
      const now = Date.now();
      if (eventType === 'progress_saved' && now - lastProgressSync < 12000) return;
      if (eventType === 'progress_saved') lastProgressSync = now;
      const kind = eventType === 'progress_saved' ? 'progress' : 'heartbeat';
      await postAdmin(kind, publicPayload(eventType, extra));
    } catch (error) {
      console.info('Admin sync unavailable:', error);
    }
  }

  let heartbeatTimer = null;
  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (cfg().enabled === false) return;
    syncClientEvent('heartbeat');
    const seconds = Math.max(Number(cfg().heartbeatSeconds || 60), 20);
    heartbeatTimer = setInterval(() => syncClientEvent('heartbeat'), seconds * 1000);
  }

  function initWelcomeAccess() {
    const launch = document.querySelector('.launch-button');
    if (launch) {
      launch.classList.remove('is-disabled');
      launch.removeAttribute('aria-disabled');
    }
    document.getElementById('welcomeAccessForm')?.remove();
    document.querySelector('.welcome-access-card')?.remove();
  }

  window.NCLEX_ACCESS = {
    KEYS,
    cfg,
    getProfile,
    getLastLocation,
    getDeviceInfo,
    progressSnapshot,
    canUseApp,
    ensureAppAccess,
    initWelcomeAccess,
    syncClientEvent,
    startHeartbeat,
    endpoints: { endpoint }
  };
})();
