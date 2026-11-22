import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const production = process.env.NODE_ENV === 'production';
const dist = join(root, 'dist');
const rooms = new Map();
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };

const vite = production ? null : await (await import('vite')).createServer({
  configFile: false,
  plugins: [(await import('@vitejs/plugin-react')).default()],
  server: { middlewareMode: true, hmr: false },
  appType: 'spa',
});

const server = createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'healthy', time: new Date().toISOString() }));
    return;
  }
  if (!production) return vite.middlewares(req, res, () => { res.statusCode = 404; res.end('Not found'); });
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const safePath = normalize(pathname).replace(/^([/\\]*\.\.[/\\])+/, '');
    let file = join(dist, safePath === '/' ? 'index.html' : safePath);
    try { if (!(await stat(file)).isFile()) file = join(file, 'index.html'); }
    catch { file = join(dist, 'index.html'); }
    const info = await stat(file);
    res.writeHead(200, {
      'Content-Type': contentTypes[extname(file)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500); res.end('Could not serve the app.');
  }
});

const isAllowedOrigin = (originHost, reqHost) => {
  if (!originHost) return true;
  if (originHost === reqHost) return true;
  return (
    originHost.endsWith('github.io') ||
    originHost.endsWith('pages.dev') ||
    originHost.endsWith('onrender.com') ||
    originHost.includes('hareramkushwaha.com.np') ||
    originHost.endsWith('.np') ||
    originHost.includes('localhost') ||
    originHost.includes('127.0.0.1')
  );
};

const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  const origin = req.headers.origin;
  let originHost;
  try { originHost = origin ? new URL(origin).host : null; } catch { originHost = 'invalid'; }
  if (url.pathname !== '/signal' || !isAllowedOrigin(originHost, req.headers.host)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
});

const send = (ws, payload) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload)); };
const cleanRoom = (id) => {
  const room = rooms.get(id);
  if (room && !room.host && !room.guest) {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.cleanupTimer = setTimeout(() => {
      const current = rooms.get(id);
      if (current && !current.host && !current.guest) rooms.delete(id);
    }, 10 * 60 * 1000);
    room.cleanupTimer.unref();
  }
};

wss.on('connection', (ws) => {
  ws.roomId = null; ws.slot = null; ws.displayName = 'Your connection';
  ws.on('error', (error) => console.error('Signaling socket error:', error.message));
  ws.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (!message || typeof message.type !== 'string') return;
    if (message.type === 'join' && !ws.roomId) {
      const roomId = String(message.room || '').toUpperCase();
      if (!/^[A-Z0-9]{6,16}$/.test(roomId)) { send(ws, { type: 'error', message: 'Invalid room link. Ask the caller for a new invite.' }); return; }
      let room = rooms.get(roomId);
      if (!room) { room = { host: null, guest: null, cleanupTimer: null }; rooms.set(roomId, room); }
      if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = null; }
      const slot = !room.host ? 'host' : !room.guest ? 'guest' : null;
      if (!slot) { send(ws, { type: 'error', message: 'This call room is full. Ask the caller to create a new room.' }); return; }
      ws.roomId = roomId; ws.slot = slot; ws.displayName = String(message.name || 'Your connection').slice(0, 48); room[slot] = ws;
      send(ws, { type: 'joined', role: slot, peerName: slot === 'guest' ? room.host.displayName : null });
      if (slot === 'host') send(ws, { type: 'waiting' });
      else { send(room.host, { type: 'peer-joined', name: ws.displayName }); send(ws, { type: 'peer-joined', name: room.host.displayName }); }
      return;
    }
    if (!ws.roomId) return;
    const room = rooms.get(ws.roomId);
    const peer = room?.[ws.slot === 'host' ? 'guest' : 'host'];
    if (!peer || !['offer', 'answer', 'ice', 'depth-request', 'depth-response', 'chat', 'reaction'].includes(message.type)) return;
    send(peer, {
      type: message.type,
      description: message.description,
      candidate: message.candidate,
      allowed: message.allowed === true,
      revoked: message.revoked === true,
      name: String(message.name || ws.displayName).slice(0, 48),
      text: typeof message.text === 'string' ? message.text.slice(0, 500) : undefined,
      emoji: typeof message.emoji === 'string' ? message.emoji.slice(0, 10) : undefined,
      timestamp: Date.now()
    });
  });
  ws.on('close', () => {
    if (!ws.roomId) return;
    const room = rooms.get(ws.roomId);
    if (room && room[ws.slot] === ws) room[ws.slot] = null;
    const peer = room?.[ws.slot === 'host' ? 'guest' : 'host'];
    if (peer) send(peer, { type: 'peer-left' });
    cleanRoom(ws.roomId);
  });
});

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (production ? '0.0.0.0' : '127.0.0.1');
server.listen(port, host, () => console.log(`Saantvana ${production ? 'production' : 'development'} server listening on ${host}:${port}`));
