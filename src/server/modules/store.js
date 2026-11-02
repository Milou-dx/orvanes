import { createHash, createPublicKey, verify } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { STORE_PUBLIC_KEY } from './store-key.js';
import { validateManifest } from './registry.js';

const run = promisify(execFile);
export const STORE_URL = (process.env.ORVANE_MAGASIN_URL || 'https://magasin.orvanes.tech').replace(/\/+$/, '');
const MAX_INDEX = 1024 * 1024;
const MAX_PACKAGE = 64 * 1024 * 1024;
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const VERSION = /^\d+\.\d+\.\d+$/;

export class StoreError extends Error {}

export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

export function verifyIndex(bytes, signatureB64, publicKeyPem = STORE_PUBLIC_KEY) {
  let ok = false;
  try { ok = verify(null, bytes, createPublicKey(publicKeyPem), Buffer.from(String(signatureB64).trim(), 'base64')); } catch {}
  if (!ok) throw new StoreError('Catalogue du Magasin refusé : signature invalide.');
  let index;
  try { index = JSON.parse(bytes.toString('utf8')); } catch { throw new StoreError('Catalogue du Magasin illisible.'); }
  if (index?.format !== 1 || !Array.isArray(index.modules)) throw new StoreError('Catalogue du Magasin : format inconnu.');
  for (const m of index.modules) {
    if (!ID.test(m?.id ?? '') || !VERSION.test(m?.version ?? '') || !/^[a-f0-9]{64}$/.test(m?.sha256 ?? '')
      || !/^paquets\/[a-z0-9-]+-\d+\.\d+\.\d+\.tar\.gz$/.test(m?.paquet ?? '')) {
      throw new StoreError(`Catalogue du Magasin : entrée invalide (${m?.id ?? '?'}).`);
    }
  }
  return index;
}

async function get(url, max, fetchImpl) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
  if (!res.ok) throw new StoreError(`Magasin injoignable (${res.status} sur ${url}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > max) throw new StoreError(`Réponse trop grande du Magasin (${url}).`);
  return buf;
}

let cache = null;
export async function fetchCatalog({ url = STORE_URL, fetchImpl = fetch, fresh = false, publicKey = STORE_PUBLIC_KEY } = {}) {
  if (!fresh && cache && cache.url === url && Date.now() - cache.at < 60_000) return cache.index;
  try {
    const [bytes, sig] = await Promise.all([get(`${url}/index.json`, MAX_INDEX, fetchImpl), get(`${url}/index.json.sig`, 4096, fetchImpl)]);
    const index = verifyIndex(bytes, sig.toString('utf8'), publicKey);
    cache = { url, at: Date.now(), index };
    return index;
  } catch (e) {
    if (e instanceof StoreError) throw e;
    throw new StoreError(`Magasin injoignable : ${e?.message ?? e}`);
  }
}
export const forgetCatalog = () => { cache = null; };

export async function checkArchive(file) {
  const { stdout } = await run('tar', ['-tvzf', file], { maxBuffer: 16 * 1024 * 1024 });
  const entries = stdout.split('\n').filter(Boolean);
  if (!entries.length) throw new StoreError('Paquet vide.');
  const names = (await run('tar', ['-tzf', file], { maxBuffer: 16 * 1024 * 1024 })).stdout.split('\n').filter(Boolean);
  for (const line of entries) {
    if (!/^[-d]/.test(line)) throw new StoreError(`Paquet refusé : entrée non autorisée (lien ou fichier spécial) : ${line.slice(0, 120)}`);
  }
  for (const n of names) {
    if (n.startsWith('/') || n.split('/').includes('..')) throw new StoreError(`Paquet refusé : chemin interdit : ${n}`);
  }
  return names;
}

/**
 * @param {string} id
 * @param {{ modulesDir: string, workDir: string, url?: string, fetchImpl?: typeof fetch, catalog?: any }} opts
 */
export async function downloadModule(id, { modulesDir, workDir, url = STORE_URL, fetchImpl = fetch, catalog }) {
  const index = catalog ?? await fetchCatalog({ url, fetchImpl });
  const entry = index.modules.find((m) => m.id === id);
  if (!entry) throw new StoreError(`Intégration absente du Magasin : ${id}`);
  const bytes = await get(`${url}/${entry.paquet}`, MAX_PACKAGE, fetchImpl);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== entry.sha256) throw new StoreError(`Paquet refusé : empreinte différente de celle du catalogue (${id}).`);

  await mkdir(workDir, { recursive: true });
  const tmp = await mkdtemp(join(workDir, `${id}-`));
  try {
    const file = join(tmp, 'paquet.tar.gz');
    await writeFile(file, bytes);
    await checkArchive(file);
    const out = join(tmp, id);
    await mkdir(out);
    await run('tar', ['-xzf', file, '-C', out, '--no-same-owner', '--no-same-permissions']);
    let manifest;
    try { manifest = JSON.parse(await readFile(join(out, 'module.json'), 'utf8')); } catch { throw new StoreError(`Paquet sans module.json valide (${id}).`); }
    const errors = validateManifest(manifest, id);
    if (errors.length) throw new StoreError(`Manifeste invalide (${id}) : ${errors.join(' ; ')}`);
    if (manifest.version !== entry.version) throw new StoreError(`Paquet incohérent : version ${manifest.version}, catalogue ${entry.version}.`);

    await mkdir(modulesDir, { recursive: true });
    const target = join(modulesDir, id);
    const old = join(tmp, 'ancien');
    if (existsSync(target)) await rename(target, old);
    try { await rename(out, target); } catch (e) { if (existsSync(old)) await rename(old, target); throw e; }
    return entry;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
