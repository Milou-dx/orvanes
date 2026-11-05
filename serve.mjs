process.env.ASTRO_NODE_AUTOSTART = 'disabled';
loadEnv(new URL('./.env', import.meta.url));

import http from 'node:http';
import { loadEnv } from './src/server/core/env.js';
import { existsSync, mkdirSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import zlib, { brotliCompressSync, gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { delimiter, dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Le Node téléchargé par install.sh n'est pas dans le PATH du service : les modules doivent le trouver.
process.env.PATH = `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`;
const DIST = realpathSync(process.env.ORVANE_DIST ?? fileURLToPath(new URL('./dist/', import.meta.url)));
const { handler } = await import(pathToFileURL(join(DIST, 'server/entry.mjs')).href);
const { attachShellWebSocket } = await import('./src/server/shell/ws-shell.js');
const { closeUnclaimedUpgrade, handleHookRequest } = await import('./src/server/modules/request-hooks.js');
const { clientIp } = await import('./src/server/core/client-ip.js');
const { allowUpgrade, isEnabled: isAuthEnabled } = await import('./src/server/auth/auth-core.js');
const modules = (await import('./src/server/modules/registry.js')).default;

const HOST = process.env.PANEL_HOST || '127.0.0.1';
const PORT = Number(process.env.PANEL_PORT || 4321);

const LOOPBACK = /^(127\.\d+\.\d+\.\d+|::1|localhost)$/;
if (!LOOPBACK.test(HOST) && !isAuthEnabled() && process.env.PANEL_ALLOW_OPEN !== '1') {
  console.error(`Refus de démarrer : le panel écouterait sur ${HOST} sans protection par mot de passe.`);
  console.error('Créez un administrateur avec `node scripts/admin.mjs`, ou écoutez sur 127.0.0.1 (PANEL_HOST).');
  process.exit(1);
}
try {
  mkdirSync(fileURLToPath(new URL('./.cache/', import.meta.url)), { recursive: true });
  writeFileSync(fileURLToPath(new URL(`./.cache/serving-${PORT}`, import.meta.url)), `${process.pid} ${DIST}\n`);
} catch {}

const ASSETS_DIR = join(DIST, 'client/_astro');
const ASSET_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
};
const assetCache = new Map();

async function serveAsset(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const { pathname } = new URL(req.url ?? '', 'http://localhost');
  if (!pathname.startsWith('/_astro/')) return false;
  const name = pathname.slice('/_astro/'.length);
  const type = ASSET_TYPES[extname(name)];
  if (!type || !/^[\w@-][\w.@-]*$/.test(name)) return false;

  let entry = assetCache.get(name);
  if (!entry) {
    let raw;
    try { raw = await readFile(join(ASSETS_DIR, name)); } catch { return false; }
    const text = /^(text|image\/svg)/.test(type) && raw.length > 512;
    entry = {
      type,
      raw,
      br: text ? brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }) : null,
      gz: text ? gzipSync(raw, { level: 9 }) : null,
    };
    assetCache.set(name, entry);
  }

  const accept = String(req.headers['accept-encoding'] ?? '');
  const [body, encoding] = entry.br && /\bbr\b/.test(accept) ? [entry.br, 'br']
    : entry.gz && /\bgzip\b/.test(accept) ? [entry.gz, 'gzip']
    : [entry.raw, null];
  res.writeHead(200, {
    'content-type': entry.type,
    'content-length': body.length,
    'cache-control': 'public, max-age=31536000, immutable',
    ...(encoding ? { 'content-encoding': encoding } : {}),
    ...(entry.br ? { vary: 'Accept-Encoding' } : {}),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}

const hooks = [];
const server = http.createServer((req, res) => {
  req.headers['x-forwarded-for'] = clientIp(req.socket.remoteAddress, req.headers['x-forwarded-for']);
  if (handleHookRequest(hooks, (id) => modules.isInstalled(id), req, res)) return;
  serveAsset(req, res).then(
    (served) => { if (!served) handler(req, res); },
    () => { if (!res.headersSent) handler(req, res); },
  );
});
function guarded(srv) {
  const wrap = (fn) => (req, socket, head) => {
    let sameOrigin = true;
    if (req.headers.origin) {
      try { sameOrigin = new URL(req.headers.origin).host === req.headers.host; } catch { sameOrigin = false; }
    }
    if (!sameOrigin || !allowUpgrade(req)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    fn(req, socket, head);
  };
  return new Proxy(srv, {
    get(target, prop) {
      if (prop === 'on' || prop === 'addListener' || prop === 'once') {
        return (event, fn) => target[prop](event, event === 'upgrade' ? wrap(fn) : fn);
      }
      const v = target[prop];
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}
attachShellWebSocket(guarded(server));
for (const m of modules.listModules().filter((x) => x.server)) {
  try {
    const hook = await import(pathToFileURL(join(modules.modulesDir, m.id, m.server)).href);
    await hook.attach?.({ server, guarded, isInstalled: () => modules.isInstalled(m.id) });
    hooks.push({ id: m.id, hook });
  } catch (err) {
    console.error(`Module ${m.id} : hook serveur non chargé :`, err);
  }
}
const hookBusy = () => hooks.some(({ id, hook }) => {
  try { return Boolean(hook.busy?.()); } catch (err) { console.error(`Module ${id} : busy() en échec :`, err); return false; }
});
const detachHooks = () => {
  for (const { id, hook } of hooks) {
    try { hook.detach?.(); } catch (err) { console.error(`Module ${id} : detach() en échec :`, err); }
  }
};
server.on('upgrade', closeUnclaimedUpgrade(modules));

const RESTART_FLAG = fileURLToPath(new URL('./.cache/restart-requested', import.meta.url));
if (!process.env.PANEL_PORT || process.env.PANEL_PORT === '4321') {
  setInterval(() => {
    if (!existsSync(RESTART_FLAG) || hookBusy()) return;
    try { unlinkSync(RESTART_FLAG); } catch {}
    detachHooks();
    console.log('Redémarrage demandé et aucun module occupé : arrêt pour charger la nouvelle version.');
    server.close();
    setTimeout(() => process.exit(0), 300);
  }, 2000).unref();
}

server.listen(PORT, HOST, () => {
  console.log(`Panel prêt sur http://${HOST}:${PORT} (WebSocket terminal : /api/shell/ws)`);
});
