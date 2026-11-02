import { spawn } from 'node:child_process';
import { existsSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import registry from './registry.js';
import { compareVersions, downloadModule, fetchCatalog } from './store.js';

const root = registry.root;
const cacheDir = join(root, '.cache');
const pidFile = join(cacheDir, 'magasin-rebuild.pid');
const rebuildLog = join(cacheDir, 'magasin-rebuild.log');

export function rebuilding() {
  try {
    const pid = Number(readFileSync(pidFile, 'utf8'));
    process.kill(pid, 0);
    return true;
  } catch { return false; }
}

function rebuild() {
  if (rebuilding()) return;
  const out = openSync(rebuildLog, 'w');
  const child = spawn('bash', [join(root, 'scripts/release.sh'), '--restart'], {
    cwd: root, detached: true, stdio: ['ignore', out, out], env: { ...process.env, ORVANE_SKIP_CHECK: '1' },
  });
  writeFileSync(pidFile, String(child.pid));
  child.unref();
}

const BUSY = { ok: false, output: 'Reconstruction du panel en cours : réessayez dans une minute.' };
const done = (output) => ({ ok: true, output: `${output}\nLe panel se reconstruit et redémarre : rechargez la page dans une minute.` });

export async function installFromStore(id) {
  if (rebuilding()) return BUSY;
  const target = join(registry.modulesDir, id);
  const fresh = !existsSync(target);
  const entry = await downloadModule(id, { modulesDir: registry.modulesDir, workDir: join(cacheDir, 'magasin') });
  registry.reload();
  const res = await registry.install(id);
  if (!res.ok) {
    if (fresh) await rm(target, { recursive: true, force: true });
    registry.reload();
    return res;
  }
  rebuild();
  return done(`${entry.name ?? id} ${entry.version} installé.\n${res.output ?? ''}`.trim());
}

export async function updateFromStore(id) {
  if (rebuilding()) return BUSY;
  if (!registry.isInstalled(id)) return { ok: false, output: 'Intégration non installée.' };
  const entry = await downloadModule(id, { modulesDir: registry.modulesDir, workDir: join(cacheDir, 'magasin') });
  registry.reload();
  const res = await registry.install(id, { again: true });
  rebuild();
  return res.ok ? done(`${entry.name ?? id} mis à jour en ${entry.version}.`) : res;
}

export async function uninstallFromStore(id, { purge = false } = {}) {
  if (rebuilding()) return BUSY;
  const res = await registry.uninstall(id, { purge });
  if (!res.ok) return res;
  await rm(join(registry.modulesDir, id), { recursive: true, force: true });
  registry.reload();
  rebuild();
  return done(res.output || 'Intégration désinstallée.');
}

export async function storeState() {
  let catalog = null, error = null;
  try { catalog = await fetchCatalog(); } catch (e) { error = e?.message ?? String(e); }
  const remote = new Map((catalog?.modules ?? []).map((m) => [m.id, m]));
  const installed = registry.listModules().filter((m) => registry.isInstalled(m.id)).map((m) => {
    const r = remote.get(m.id);
    return { id: m.id, name: m.name, description: m.description ?? '', version: m.version, data: m.data ?? [], update: r && compareVersions(r.version, m.version) > 0 ? r.version : null };
  });
  const available = [...remote.values()].filter((r) => !registry.isInstalled(r.id));
  return { installed, available, error, rebuilding: rebuilding() };
}
