import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/';

export function resolvePath(userPath) {
  if (String(userPath ?? '').includes('\0')) throw new Error('Chemin invalide');
  const target = path.resolve(ROOT, '.' + path.posix.normalize('/' + (userPath || '/')));
  if (!target.startsWith(ROOT)) throw new Error('Chemin invalide');
  return target;
}

export async function listDir(userPath) {
  const abs = resolvePath(userPath);
  const entries = await fs.readdir(abs, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(abs, entry.name);
    let stat;
    try {
      stat = await fs.lstat(full);
    } catch {
      continue;
    }
    let isDir = entry.isDirectory();
    if (!isDir && stat.isSymbolicLink()) {
      try { isDir = (await fs.stat(full)).isDirectory(); } catch {}
    }
    out.push({
      name: entry.name,
      isDir,
      isSymlink: stat.isSymbolicLink(),
      sizeBytes: stat.size,
      mode: (stat.mode & 0o777).toString(8),
      mtime: stat.mtime.toISOString(),
    });
  }
  out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  return out;
}

export async function createEntry(userPath, type) {
  const abs = resolvePath(userPath);
  if (type === 'directory') await fs.mkdir(abs, { recursive: false });
  else await fs.writeFile(abs, '', { flag: 'wx' });
}

export async function renameEntry(fromPath, toPath) {
  await moveAcrossDevices(resolvePath(fromPath), resolvePath(toPath));
}

export async function moveEntry(fromPath, toDir) {
  const fromAbs = resolvePath(fromPath);
  const toAbs = path.join(resolvePath(toDir), path.basename(fromAbs));
  if (toAbs === fromAbs) return;
  await moveAcrossDevices(fromAbs, toAbs);
}

export async function copyEntry(fromPath, toDir) {
  const fromAbs = resolvePath(fromPath);
  const toAbs = path.join(resolvePath(toDir), path.basename(fromAbs));
  if (toAbs === fromAbs) throw new Error('Source et destination identiques');
  await fs.cp(fromAbs, toAbs, { recursive: true, errorOnExist: true, force: false });
}

async function moveAcrossDevices(fromAbs, toAbs) {
  try {
    await fs.rename(fromAbs, toAbs);
  } catch (e) {
    if (e?.code !== 'EXDEV') throw e;
    await fs.cp(fromAbs, toAbs, { recursive: true, errorOnExist: true, force: false });
    await fs.rm(fromAbs, { recursive: true });
  }
}

export async function deleteEntry(userPath) {
  const abs = resolvePath(userPath);
  if (abs === ROOT) throw new Error('Impossible de supprimer la racine');
  await fs.rm(abs, { recursive: true });
}


export function safeBasename(name) {
  const base = String(name || '').trim();
  if (!base || base === '.' || base === '..') return null;
  if (base.includes('/') || base.includes('\\') || base.includes('\0')) return null;
  return base;
}
