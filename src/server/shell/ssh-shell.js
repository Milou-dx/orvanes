import { readFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { Client } from 'ssh2';

const HOST = process.env.PANEL_SSH_HOST ?? '127.0.0.1';
const PORT = Number(process.env.PANEL_SSH_PORT ?? 22);
const USERNAME = process.env.PANEL_SSH_USER || userInfo().username;
const KEY_PATH = process.env.PANEL_SSH_KEY || join(homedir(), '.ssh', 'orvane_terminal_ed25519');

const IDLE_MS = 30 * 60_000;
const MAX_SESSIONS = 4;

/** @type {Map<string, { id: string, client: import('ssh2').Client, channel: import('ssh2').ClientChannel, lastUsed: number, closed: boolean }>} */
const sessions = new Map();

function sweep() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.closed || now - s.lastUsed > IDLE_MS) closeSession(id);
  }
}

export function closeSession(id) {
  const s = sessions.get(id);
  if (!s) return;
  s.closed = true;
  try { s.channel.end(); } catch {}
  try { s.client.end(); } catch {}
  sessions.delete(id);
}

/**
 * @param {string} id
 * @param {{ cols: number, rows: number, onData: (chunk: Buffer) => void, onClose: (reason: string) => void }} opts
 */
export function open(id, opts) {
  sweep();
  if (sessions.size >= MAX_SESSIONS) {
    return Promise.reject(new Error(`Limite de ${MAX_SESSIONS} sessions atteinte. Fermez-en une avant d'en ouvrir une autre.`));
  }

  let privateKey;
  try {
    privateKey = readFileSync(KEY_PATH);
  } catch {
    return Promise.reject(new Error(`Clé SSH du panel introuvable (${KEY_PATH}). Relancez install.sh pour la créer, ou indiquez-la dans PANEL_SSH_KEY.`));
  }

  return new Promise((resolve, reject) => {
    const client = new Client();

    client.on('ready', () => {
      const ptyOpts = { term: 'xterm-256color', cols: opts.cols, rows: opts.rows };
      const start = (cb) => (opts.command ? client.exec(opts.command, { pty: ptyOpts }, cb) : client.shell(ptyOpts, cb));
      start((err, channel) => {
        if (err) {
          client.end();
          reject(err);
          return;
        }

        const session = { id, client, channel, lastUsed: Date.now(), closed: false };
        sessions.set(id, session);

        channel.on('data', (chunk) => {
          session.lastUsed = Date.now();
          opts.onData(chunk);
        });
        channel.stderr.on('data', (chunk) => opts.onData(chunk));
        channel.on('close', () => {
          session.closed = true;
          sessions.delete(id);
          opts.onClose('le serveur SSH a fermé la session');
          client.end();
        });

        resolve(session);
      });
    });

    client.on('error', (err) => reject(err));

    client.connect({
      host: HOST,
      port: PORT,
      username: USERNAME,
      privateKey,
      readyTimeout: 10_000,
    });
  });
}

function get(id) {
  const s = sessions.get(id) ?? null;
  if (s) s.lastUsed = Date.now();
  return s;
}

export function write(id, data) {
  const s = get(id);
  if (!s || s.closed) throw new Error('Session introuvable ou close');
  s.channel.write(data);
}

export function resize(id, cols, rows) {
  const s = get(id);
  if (!s || s.closed) return;
  try { s.channel.setWindow(Math.max(5, rows), Math.max(20, cols), 0, 0); } catch {}
}
