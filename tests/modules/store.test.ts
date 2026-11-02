import { generateKeyPairSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkArchive, compareVersions, downloadModule, fetchCatalog, StoreError, verifyIndex } from '../../src/server/modules/store.js';
import { publish } from '../../src/server/modules/store-publish.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'magasin-test-'));

function setup(version = '1.0.0') {
  const sources = tmp(), pub = tmp(), keys = tmp();
  const dir = join(sources, 'modules', 'demo');
  mkdirSync(join(dir, 'pages'), { recursive: true });
  mkdirSync(join(dir, 'tests'), { recursive: true });
  writeFileSync(join(dir, 'module.json'), JSON.stringify({ id: 'demo', name: 'Démo', description: 'Essai', version, logo: 'logo.svg', tabs: [{ id: 'demo', label: 'Démo', href: '/demo', pages: ['/demo'] }] }));
  writeFileSync(join(dir, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  writeFileSync(join(dir, 'pages', 'demo.astro'), '<p>demo</p>');
  writeFileSync(join(dir, 'tests', 'x.test.ts'), '');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  writeFileSync(join(keys, 'k.pem'), privateKey.export({ type: 'pkcs8', format: 'pem' }));
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const cfg = { sources, pub, key: join(keys, 'k.pem'), enabled: true };
  const fetchImpl = async (url: string) => {
    const f = join(pub, url.replace('https://magasin.test/', ''));
    return existsSync(f) ? new Response(readFileSync(f)) : new Response('absent', { status: 404 });
  };
  return { sources, pub, dir, cfg, pem, fetchImpl };
}

describe('Magasin', () => {
  it('publie, signe, puis installe une intégration (sans ses tests)', async () => {
    const s = setup();
    expect((await publish('demo', s.cfg)).changed).toBe(true);
    expect((await publish('demo', s.cfg)).changed).toBe(false);
    const catalog = await fetchCatalog({ url: 'https://magasin.test', fetchImpl: s.fetchImpl as any, publicKey: s.pem, fresh: true });
    expect(catalog.modules.map((m: any) => [m.id, m.version, m.logo])).toEqual([['demo', '1.0.0', 'logos/demo.svg']]);
    const modulesDir = tmp();
    await downloadModule('demo', { modulesDir, workDir: tmp(), url: 'https://magasin.test', fetchImpl: s.fetchImpl as any, catalog });
    expect(JSON.parse(readFileSync(join(modulesDir, 'demo', 'module.json'), 'utf8')).version).toBe('1.0.0');
    expect(existsSync(join(modulesDir, 'demo', 'pages', 'demo.astro'))).toBe(true);
    expect(existsSync(join(modulesDir, 'demo', 'tests'))).toBe(false);
  });

  it('refuse un index modifié, une autre clé, et un paquet dont l’empreinte diffère', async () => {
    const s = setup();
    await publish('demo', s.cfg);
    const bytes = readFileSync(join(s.pub, 'index.json'));
    const sig = readFileSync(join(s.pub, 'index.json.sig'), 'utf8');
    expect(() => verifyIndex(Buffer.from(bytes.toString().replace('Essai', 'Piégé')), sig, s.pem)).toThrow(StoreError);
    expect(() => verifyIndex(bytes, sig)).toThrow(/signature/);
    const catalog = verifyIndex(bytes, sig, s.pem);
    writeFileSync(join(s.pub, catalog.modules[0].paquet), 'autre contenu');
    await expect(downloadModule('demo', { modulesDir: tmp(), workDir: tmp(), url: 'https://magasin.test', fetchImpl: s.fetchImpl as any, catalog })).rejects.toThrow(/empreinte/);
  });

  it('refuse de republier une version avec un autre contenu', async () => {
    const s = setup();
    await publish('demo', s.cfg);
    writeFileSync(join(s.dir, 'pages', 'demo.astro'), '<p>changé</p>');
    await expect(publish('demo', s.cfg)).rejects.toThrow(/augmentez/);
  });

  it('refuse une archive avec un lien ou un chemin qui sort du dossier', async () => {
    const d = tmp();
    mkdirSync(join(d, 'src'));
    writeFileSync(join(d, 'src', 'a.txt'), 'a');
    symlinkSync('/etc/passwd', join(d, 'src', 'lien'));
    execFileSync('tar', ['-czf', join(d, 'lien.tgz'), '-C', join(d, 'src'), '.']);
    await expect(checkArchive(join(d, 'lien.tgz'))).rejects.toThrow(/lien|spécial/);
    execFileSync('tar', ['-czf', join(d, 'sortie.tgz'), '-C', d, '-P', '--transform=s,^src/a.txt,../a.txt,', 'src/a.txt']);
    await expect(checkArchive(join(d, 'sortie.tgz'))).rejects.toThrow(/interdit/);
  });

  it('compare les versions', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});
