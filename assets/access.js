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

  function canUseApp() {
    return true;
  }

  async function ensureAppAccess() {
    document.body.classList.remove('access-locked');
    document.getElementById('accessGateOverlay')?.remove();
    return true;
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
