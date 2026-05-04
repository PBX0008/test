// Minimal optional backend example for NCLEX RN Admin Controller.
// Run with: ADMIN_API_KEY=change-me PORT=8787 node server/admin-backend-example.js
// Configure repo-config.js admin.apiUrl to http://localhost:8787 for local testing.
// For production, host behind HTTPS and use a real database/auth provider.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8787);
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const DATA_FILE = path.join(__dirname, 'admin-users.json');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}

function writeUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function authorized(req) {
  if (!ADMIN_API_KEY) return true;
  return req.headers.authorization === `Bearer ${ADMIN_API_KEY}`;
}

function collectJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (!authorized(req)) return send(res, 401, { error: 'Unauthorized' });

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/users') {
    const users = Object.values(readUsers()).sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    return send(res, 200, { users });
  }

  if (req.method === 'POST' && (url.pathname === '/heartbeat' || url.pathname === '/progress')) {
    try {
      const payload = await collectJson(req);
      if (!payload.userId) return send(res, 400, { error: 'Missing userId' });
      const users = readUsers();
      users[payload.userId] = {
        ...(users[payload.userId] || {}),
        ...payload,
        active: payload.eventType !== 'inactive',
        lastSeen: new Date().toISOString(),
        timestamp: payload.timestamp || new Date().toISOString()
      };
      writeUsers(users);
      return send(res, 200, { ok: true });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => console.log(`NCLEX admin backend example listening on http://localhost:${PORT}`));
