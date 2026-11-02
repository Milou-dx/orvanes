import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

let lastCpuTotals = null;
let lastCpuCoreTotals = null;
let lastDiskSample = null;
let lastNetSample = null;

const WHOLE_DISK_RE = /^(?:sd[a-z]+|vd[a-z]+|xvd[a-z]+|nvme\d+n\d+|mmcblk\d+)$/;

function cpuTimes(fields) {
  const [user, nice, system, idle, iowait, irq, softirq, steal] = fields.trim().split(/\s+/).map(Number);
  const idleAll = idle + (iowait || 0);
  return { idle: idleAll, total: user + nice + system + idleAll + (irq || 0) + (softirq || 0) + (steal || 0) };
}

function busyPercent(prev, now) {
  const deltaTotal = now.total - prev.total;
  return deltaTotal > 0 ? Math.max(0, Math.min(100, (1 - (now.idle - prev.idle) / deltaTotal) * 100)) : null;
}

export function getCpuPercent() {
  const now = cpuTimes(fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].replace(/^cpu\s+/, ''));
  const percent = lastCpuTotals ? busyPercent(lastCpuTotals, now) : null;
  lastCpuTotals = now;
  return percent;
}

export function getCpuPerCorePercent() {
  const now = [];
  for (const line of fs.readFileSync('/proc/stat', 'utf8').split('\n')) {
    const m = line.match(/^cpu(\d+)\s+(.*)/);
    if (m) now[Number(m[1])] = cpuTimes(m[2]);
  }
  const percents = now.map((core, i) => {
    const prev = lastCpuCoreTotals?.[i];
    return prev && core ? busyPercent(prev, core) : null;
  });
  lastCpuCoreTotals = now;
  return percents;
}

export function getMemory() {
  const raw = fs.readFileSync('/proc/meminfo', 'utf8');
  const map = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^(\w+):\s+(\d+)\s*kB/);
    if (m) map[m[1]] = Number(m[2]) * 1024;
  }
  const total = map.MemTotal || 0;
  const available = map.MemAvailable || 0;
  const used = total - available;
  const swapTotal = map.SwapTotal || 0;
  const swapFree = map.SwapFree || 0;
  return {
    totalBytes: total,
    usedBytes: used,
    availableBytes: available,
    swapTotalBytes: swapTotal,
    swapUsedBytes: swapTotal - swapFree,
  };
}

const SKIP_MOUNT_RE = /^\/(?:boot|snap|efi)(?:\/|$)/;
const SKIP_FSTYPES = new Set(['squashfs', 'iso9660', 'udf']);

export function parseMounts(raw) {
  const byDevice = new Map();
  for (const line of raw.split('\n')) {
    const [device, rawPath, fstype] = line.split(' ');
    if (!device?.startsWith('/dev/') || device.startsWith('/dev/loop')) continue;
    if (SKIP_FSTYPES.has(fstype)) continue;
    const path = rawPath.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
    if (SKIP_MOUNT_RE.test(path)) continue;
    const prev = byDevice.get(device);
    if (!prev || path.length < prev.length) byDevice.set(device, path);
  }
  const paths = [...new Set(byDevice.values())];
  return paths.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
}

export function diskLabel(path) {
  return path === '/' ? 'Disque système' : path;
}

export async function getDisks() {
  let mounts = ['/'];
  try {
    const found = parseMounts(await fsp.readFile('/proc/self/mounts', 'utf8'));
    if (found.length) mounts = found.includes('/') ? found : ['/', ...found];
  } catch {
  }
  const out = [];
  for (const path of mounts) {
    try {
      const stat = await fsp.statfs(path);
      const totalBytes = stat.blocks * stat.bsize;
      if (!totalBytes) continue;
      const freeBytes = stat.bavail * stat.bsize;
      out.push({ path, label: diskLabel(path), totalBytes, freeBytes, usedBytes: totalBytes - freeBytes });
    } catch {
    }
  }
  return out;
}

export function getDiskIoRates() {
  const raw = fs.readFileSync('/proc/diskstats', 'utf8');
  const now = Date.now();
  const devices = {};
  for (const line of raw.split('\n')) {
    const f = line.trim().split(/\s+/);
    if (f.length < 14) continue;
    const name = f[2];
    if (!WHOLE_DISK_RE.test(name)) continue;
    devices[name] = { readSectors: Number(f[5]), writeSectors: Number(f[9]) };
  }

  let readBytesPerSec = 0;
  let writeBytesPerSec = 0;
  if (lastDiskSample) {
    const deltaSec = (now - lastDiskSample.at) / 1000;
    if (deltaSec > 0) {
      for (const name of Object.keys(devices)) {
        const prev = lastDiskSample.devices[name];
        if (!prev) continue;
        readBytesPerSec += Math.max(0, ((devices[name].readSectors - prev.readSectors) * 512) / deltaSec);
        writeBytesPerSec += Math.max(0, ((devices[name].writeSectors - prev.writeSectors) * 512) / deltaSec);
      }
    }
  }
  lastDiskSample = { at: now, devices };
  return { readBytesPerSec, writeBytesPerSec };
}

export function getLoadAverage() {
  return os.loadavg();
}

export function getUptimeSeconds() {
  return Number(fs.readFileSync('/proc/uptime', 'utf8').split(' ')[0]);
}

export function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] || []) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return null;
}

export async function getOsInfo() {
  let prettyName = os.type();
  try {
    const raw = await fsp.readFile('/etc/os-release', 'utf8');
    const m = raw.match(/^PRETTY_NAME="(.+)"$/m);
    if (m) prettyName = m[1];
  } catch {
  }
  return {
    hostname: os.hostname(),
    osName: prettyName,
    kernel: os.release(),
    arch: os.arch(),
  };
}

export function getNetTraffic() {
  const raw = fs.readFileSync('/proc/net/dev', 'utf8');
  const now = Date.now();
  const ifaces = {};
  for (const line of raw.split('\n').slice(2)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [name, rest] = trimmed.split(':');
    if (!rest) continue;
    const fields = rest.trim().split(/\s+/).map(Number);
    ifaces[name.trim()] = { rx: fields[0], tx: fields[8] };
  }

  let rates = {};
  if (lastNetSample) {
    const deltaSec = (now - lastNetSample.at) / 1000;
    if (deltaSec > 0) {
      for (const name of Object.keys(ifaces)) {
        const prev = lastNetSample.ifaces[name];
        if (!prev) continue;
        rates[name] = {
          rxBytesPerSec: Math.max(0, (ifaces[name].rx - prev.rx) / deltaSec),
          txBytesPerSec: Math.max(0, (ifaces[name].tx - prev.tx) / deltaSec),
        };
      }
    }
  }
  lastNetSample = { at: now, ifaces };
  return { totals: ifaces, rates };
}

export async function getNetworkInterfaces() {
  const ifaces = os.networkInterfaces();
  const out = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    const v4 = (addrs || []).find((a) => a.family === 'IPv4');
    const mac = (addrs || []).find((a) => a.mac && a.mac !== '00:00:00:00:00:00')?.mac || null;
    const sysNet = (f) => { try { return fs.readFileSync(`/sys/class/net/${name}/${f}`, 'utf8').trim(); } catch { return null; } };
    const mtu = Number(sysNet('mtu')) || null;
    out.push({
      name,
      ip: v4?.address || null,
      netmask: v4?.netmask || null,
      mac,
      internal: (addrs || []).every((a) => a.internal),
      state: sysNet('operstate'),
      mtu,
    });
  }
  return out;
}

export async function getGatewayAndDns() {
  let gateway = null;
  let dns = [];
  try {
    const { stdout } = await execFileAsync('/usr/sbin/ip', ['route', 'show', 'default']);
    const m = stdout.match(/default via (\S+)/);
    if (m) gateway = m[1];
  } catch {
  }
  try {
    const raw = await fsp.readFile('/etc/resolv.conf', 'utf8');
    dns = [...raw.matchAll(/^nameserver\s+(\S+)/gm)].map((m) => m[1]);
  } catch {
  }
  return { gateway, dns };
}
