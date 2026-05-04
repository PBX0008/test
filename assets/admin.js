(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const status = $('adminConnectionStatus');
  const tbody = $('adminUsersBody');
  const count = $('adminUserCount');
  const keyInput = $('adminApiKey');
  const config = () => window.NCLEX_ACCESS?.cfg?.() || window.NCLEX_REPO_CONFIG?.admin || {};
  const storageKey = window.NCLEX_ACCESS?.KEYS?.adminApiKey || 'nclex-admin-api-key-v1';
  const PROGRESS_PREFIX = 'nclex-progress-';

  function endpoint() {
    const c = config();
    if (c.usersEndpoint) return c.usersEndpoint;
    const base = String(c.apiUrl || '').replace(/\/$/, '');
    return base ? `${base}/users` : '';
  }

  function authHeaders() {
    const key = keyInput?.value || sessionStorage.getItem(storageKey) || config().apiKey || '';
    return key ? { Authorization: `Bearer ${key}` } : {};
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function storageGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  function fmtTime(seconds) {
    const value = Math.max(Number(seconds || 0), 0);
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
  }

  async function loadCatalogMap() {
    const map = new Map();
    try {
      const response = await fetch('data/tests.json', { cache: 'no-store' });
      if (!response.ok) return map;
      const raw = await response.json();
      const items = Array.isArray(raw) ? raw : (raw.tests || []);
      for (const item of items) {
        if (!item?.id) continue;
        map.set(item.id, {
          title: item.title || item.id,
          total: Number(item.questions || 0),
          file: item.file || ''
        });
      }
    } catch {}
    return map;
  }

  function localProgressRows(catalogMap) {
    const rows = [];
    try {
      Object.keys(localStorage).forEach((key) => {
        if (!key.startsWith(PROGRESS_PREFIX)) return;
        const testId = key.slice(PROGRESS_PREFIX.length);
        const progress = storageGet(key, null);
        const test = catalogMap.get(testId) || { title: testId, total: 0, file: '' };
        const completed = Array.isArray(progress?.completed) ? progress.completed.filter(Boolean).length : 0;
        const answered = Array.isArray(progress?.answers) ? progress.answers.filter((answer) => Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined).length : completed;
        const total = Math.max(Number(test.total || 0), progress?.completed?.length || 0, progress?.answers?.length || 0);
        const correct = Number(progress?.correctCount || 0);
        rows.push({
          testId,
          title: test.title,
          file: test.file,
          completed,
          answered,
          total,
          correct,
          incorrect: Math.max(answered - correct, 0),
          percent: total ? Math.round((answered / total) * 100) : 0,
          finished: Boolean(progress?.finished),
          seconds: Number(progress?.seconds || 0),
          savedAt: progress?.savedAt || progress?.finishedAt || progress?.startedAt || null
        });
      });
    } catch {}
    return rows.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
  }

  function detectDevice() {
    return window.NCLEX_ACCESS?.getDeviceInfo?.() || {};
  }

  function normalizeUsers(raw) {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.users)) return raw.users;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  }

  function progressSummary(rows) {
    if (!Array.isArray(rows) || !rows.length) return 'No saved progress yet';
    const answered = rows.reduce((sum, item) => sum + Number(item.answered || item.completed || 0), 0);
    const total = rows.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const finished = rows.filter((item) => item.finished).length;
    return `${answered}${total ? ` / ${total}` : ''} answered • ${finished} finished`;
  }

  function remoteProgressText(progress) {
    const rows = Array.isArray(progress) ? progress : [];
    if (!rows.length) return 'No synced progress';
    const completed = rows.reduce((sum, item) => sum + Number(item.completed || item.answers || item.answered || 0), 0);
    const finished = rows.filter((item) => item.finished).length;
    return `${completed} answered • ${finished} finished tests`;
  }

  function renderUsers(users) {
    count.textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7">No progress is saved in this browser yet.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map((user) => {
      const loc = user.location || {};
      const device = user.device || {};
      const active = user.active !== false;
      const locationText = loc.latitude && loc.longitude ? `${loc.latitude}, ${loc.longitude}<br><small>±${loc.accuracy || '?'} m</small>` : 'Not required';
      const progress = user.progressRows ? progressSummary(user.progressRows) : remoteProgressText(user.progress);
      return `<tr>
        <td><strong>${escapeHtml(user.userId || 'This browser')}</strong><br><small>${escapeHtml(user.note || '')}</small></td>
        <td><span class="status-pill ${active ? '' : 'inactive'}">${active ? 'Active' : 'Inactive'}</span></td>
        <td>${locationText}</td>
        <td>${escapeHtml(device.browser || user.browser || '—')}</td>
        <td>${escapeHtml([device.type, device.os, device.platform].filter(Boolean).join(' • ') || '—')}<br><small>${escapeHtml(device.screen || '')}</small></td>
        <td>${escapeHtml(progress)}</td>
        <td>${escapeHtml(fmtDate(user.timestamp || user.lastSeen || user.updatedAt))}</td>
      </tr>`;
    }).join('');
  }

  function renderProgressDetails(rows) {
    const existing = document.getElementById('localProgressDetails');
    if (existing) existing.remove();
    const tableWrap = document.querySelector('.admin-table-wrap');
    if (!tableWrap) return;
    const section = document.createElement('section');
    section.id = 'localProgressDetails';
    section.className = 'admin-card';
    section.innerHTML = `
      <h2>Local browser progress details</h2>
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>Question file</th><th>Answered</th><th>Correct</th><th>Incorrect</th><th>Time</th><th>Status</th><th>Last saved</th></tr></thead>
          <tbody>${rows.length ? rows.map((row) => `<tr>
            <td><strong>${escapeHtml(row.title)}</strong><br><small>${escapeHtml(row.file || row.testId)}</small></td>
            <td>${row.answered} / ${row.total || '—'} <small>(${row.percent}%)</small></td>
            <td>${row.correct}</td>
            <td>${row.incorrect}</td>
            <td>${escapeHtml(fmtTime(row.seconds))}</td>
            <td>${row.finished ? 'Finished' : 'In progress'}</td>
            <td>${escapeHtml(fmtDate(row.savedAt))}</td>
          </tr>`).join('') : '<tr><td colspan="7">No saved test progress found in this browser.</td></tr>'}</tbody>
        </table>
      </div>`;
    tableWrap.closest('.admin-card')?.after(section);
  }

  async function renderLocalPreview(message = '') {
    const catalogMap = await loadCatalogMap();
    const rows = localProgressRows(catalogMap);
    const profile = window.NCLEX_ACCESS?.getProfile?.();
    const user = {
      userId: profile?.userId || 'This browser',
      note: 'GitHub Pages local tracking',
      active: true,
      location: null,
      device: detectDevice(),
      progressRows: rows,
      timestamp: new Date().toISOString()
    };
    status.textContent = message || 'GitHub Pages mode: showing progress saved in this browser only.';
    renderUsers([user]);
    renderProgressDetails(rows);
  }

  async function refresh() {
    const url = endpoint();
    if (!url || config().enabled === false) {
      await renderLocalPreview('GitHub Pages mode: no backend is configured, so admin.html shows progress saved in this browser only.');
      return;
    }
    status.textContent = 'Loading remote admin data…';
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', ...authHeaders() }, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const users = normalizeUsers(await response.json());
      status.textContent = `Connected to ${url}`;
      renderUsers(users);
    } catch (error) {
      await renderLocalPreview(`Unable to load remote users: ${error.message}. Showing local browser progress instead.`);
    }
  }

  $('saveAdminKeyBtn')?.addEventListener('click', () => {
    sessionStorage.setItem(storageKey, keyInput.value || '');
    status.textContent = 'Admin key saved for this browser session.';
  });
  $('refreshAdminBtn')?.addEventListener('click', refresh);
  if (keyInput) keyInput.value = sessionStorage.getItem(storageKey) || '';
  refresh();
})();
