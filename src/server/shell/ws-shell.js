import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import * as ssh from './ssh-shell.js';

const WS_PATH = '/api/shell/ws';

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

async function handleConnection(ws, req) {
  const url = new URL(req.url ?? WS_PATH, 'http://localhost');
  const cols = Number(url.searchParams.get('cols') ?? 120);
  const rows = Number(url.searchParams.get('rows') ?? 34);
  const id = randomUUID();

  try {
    await ssh.open(id, {
      cols: Number.isFinite(cols) ? cols : 120,
      rows: Number.isFinite(rows) ? rows : 34,
      onData: (chunk) => send(ws, { type: 'output', data: chunk.toString('utf8') }),
      onClose: (reason) => {
        send(ws, { type: 'closed', reason });
        ws.close();
      },
    });
    send(ws, { type: 'ready' });
  } catch (err) {
    send(ws, { type: 'error', message: err?.message ?? 'Connexion SSH impossible' });
    ws.close();
    return;
  }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch {
      return;
    }
    if (msg.type === 'input') {
      try { ssh.write(id, msg.data); } catch {}
    } else if (msg.type === 'resize') {
      ssh.resize(id, msg.cols, msg.rows);
    }
  });

  ws.on('close', () => ssh.closeSession(id));
  ws.on('error', () => ssh.closeSession(id));
}

export function attachShellWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws, req) => {
    handleConnection(ws, req).catch(() => ws.close());
  });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '', 'http://localhost');
    if (pathname !== WS_PATH) return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });
}
