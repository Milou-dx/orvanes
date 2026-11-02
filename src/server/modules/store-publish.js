import { createHash, createPrivateKey, sign } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { validateManifest } from './registry.js';
import { compareVersions } from './store.js';

const run = promisify(execFile);

export function publishConfig() {
  const sources = process.env.ORVANE_MAGASIN_SOURCES || '';
  const pub = process.env.ORVANE_MAGASIN_PUBLIC || '';
  const key = process.env.ORVANE_MAGASIN_KEY || join(homedir(), '.config/orvane-magasin/cle-privee.pem');
  const enabled = Boolean(sources && pub && existsSync(join(sources, 'modules')) && existsSync(pub) && existsSync(key));
  return { sources, pub, key, enabled };
}

function readIndex(pub) {
  try { return JSON.parse(readFileSync(join(pub, 'index.json'), 'utf8')); } catch { return { format: 1, modules: [] }; }
}

export function listSources(cfg = publishConfig()) {
  if (!cfg.enabled) return [];
  const published = new Map(readIndex(cfg.pub).modules.map((m) => [m.id, m.version]));
  const dir = join(cfg.sources, 'modules');
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.')).flatMap((d) => {
    try {
      const m = JSON.parse(readFileSync(join(dir, d.name, 'module.json'), 'utf8'));
      return [{ id: m.id, name: m.name, version: m.version, published: published.get(m.id) ?? null, errors: validateManifest(m, d.name) }];
    } catch { return []; }
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

async function pack(dir, out) {
  await run('tar', ['--sort=name', '--owner=0', '--group=0', '--numeric-owner', '--mtime=@0',
    '--exclude=./tests', '--exclude=node_modules', '--exclude=.cache', '--exclude=.git',
    '--use-compress-program=gzip -n -9', '-cf', out, '-C', dir, '.']);
}

export async function publish(id, cfg = publishConfig()) {
  if (!cfg.enabled) throw new Error('Publication non configurée sur ce serveur (ORVANE_MAGASIN_SOURCES, ORVANE_MAGASIN_PUBLIC, clé privée).');
  const dir = join(cfg.sources, 'modules', String(id));
  let m;
  try { m = JSON.parse(await readFile(join(dir, 'module.json'), 'utf8')); } catch { throw new Error(`Intégration introuvable dans les sources : ${id}`); }
  const errors = validateManifest(m, String(id));
  if (errors.length) throw new Error(`Manifeste invalide : ${errors.join(' ; ')}`);
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) throw new Error('`version` doit être de la forme 1.2.3.');

  const tmp = await mkdtemp(join(tmpdir(), 'magasin-'));
  try {
    const file = join(tmp, 'paquet.tar.gz');
    await pack(dir, file);
    const bytes = await readFile(file);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const index = readIndex(cfg.pub);
    const prev = index.modules.find((e) => e.id === m.id);
    if (prev && prev.version === m.version) {
      if (prev.sha256 === sha256) return { id: m.id, version: m.version, sha256, changed: false };
      throw new Error(`La version ${m.version} de ${m.id} est déjà publiée avec un autre contenu : augmentez « version » dans module.json.`);
    }
    if (prev && compareVersions(m.version, prev.version) < 0) throw new Error(`Version ${m.version} plus ancienne que celle publiée (${prev.version}).`);

    const paquet = `paquets/${m.id}-${m.version}.tar.gz`;
    await mkdir(join(cfg.pub, 'paquets'), { recursive: true });
    await mkdir(join(cfg.pub, 'logos'), { recursive: true });
    await copyFile(file, join(cfg.pub, paquet));
    let logo = null;
    if (m.logo && /^[\w.-]+\.svg$/.test(m.logo) && existsSync(join(dir, m.logo))) {
      await copyFile(join(dir, m.logo), join(cfg.pub, 'logos', `${m.id}.svg`));
      logo = `logos/${m.id}.svg`;
    }
    const entry = { id: m.id, name: m.name, description: m.description ?? '', version: m.version, requires: m.requires ?? {}, paquet, sha256, taille: bytes.length, logo };
    index.format = 1;
    index.publie = new Date().toISOString();
    index.modules = [...index.modules.filter((e) => e.id !== m.id), entry].sort((a, b) => a.id.localeCompare(b.id));
    await writeSigned(cfg, index);
    return { id: m.id, version: m.version, sha256, changed: true };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function writeSigned(cfg, index) {
  const bytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`);
  const sig = sign(null, bytes, createPrivateKey(await readFile(cfg.key))).toString('base64');
  await writeFile(join(cfg.pub, '.index.json.tmp'), bytes);
  await writeFile(join(cfg.pub, '.index.json.sig.tmp'), `${sig}\n`);
  await rename(join(cfg.pub, '.index.json.tmp'), join(cfg.pub, 'index.json'));
  await rename(join(cfg.pub, '.index.json.sig.tmp'), join(cfg.pub, 'index.json.sig'));
}
