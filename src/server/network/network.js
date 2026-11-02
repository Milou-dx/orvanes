import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const KNOWN_PORTS = {
  22: 'SSH',
  80: 'HTTP',
  443: 'HTTPS',
  [Number(process.env.PANEL_PORT || 4321)]: 'Panel',
};

export async function listListeningPorts() {
  const { stdout } = await execFileAsync('/usr/bin/ss', ['-tulnp']);
  const rows = [];
  for (const line of stdout.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const cols = line.trim().split(/\s+/);
    const [proto, , , , localAddr] = cols;
    const portMatch = localAddr?.match(/:(\d+)$/);
    if (!portMatch) continue;
    const port = Number(portMatch[1]);
    const procMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
    rows.push({
      protocol: proto,
      port,
      address: localAddr,
      process: procMatch ? procMatch[1] : null,
      pid: procMatch ? Number(procMatch[2]) : null,
      knownAs: KNOWN_PORTS[port] || null,
    });
  }
  const seen = new Set();
  return rows.filter((r) => {
    const key = `${r.protocol}:${r.port}:${r.pid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseEstablished(stdout) {
  const rows = [];
  for (const line of stdout.split('\n')) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5) continue;
    const [proto, , , local, peer] = cols;
    const procMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
    rows.push({
      protocol: proto,
      local,
      peer,
      process: procMatch ? procMatch[1] : null,
      pid: procMatch ? Number(procMatch[2]) : null,
    });
  }
  return rows;
}

export async function listEstablished() {
  const { stdout } = await execFileAsync('/usr/bin/ss', ['-tunpH', 'state', 'established']);
  return parseEstablished(stdout);
}

export function parseRoutes(stdout) {
  return stdout.split('\n').filter((l) => l.trim()).map((line) => {
    const f = line.trim().split(/\s+/);
    const after = (k) => { const i = f.indexOf(k); return i >= 0 ? f[i + 1] ?? null : null; };
    return { dest: f[0], via: after('via'), dev: after('dev'), down: f.includes('linkdown') };
  });
}

export async function listRoutes() {
  const { stdout } = await execFileAsync('/usr/sbin/ip', ['route', 'show']);
  return parseRoutes(stdout);
}
