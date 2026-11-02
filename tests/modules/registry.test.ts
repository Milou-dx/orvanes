import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRegistry, expandEnv, validateManifest } from '../../src/server/modules/registry.js';

const manifest = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: id.toUpperCase(), description: 'Module de test.', version: '1.0.0', logo: 'logo.svg',
  requires: { commands: [], modules: [] },
  tabs: [{ id, label: id, href: `/${id}`, pages: [`/${id}`], api: [`/api/${id}`] }],
  ...extra,
});

let root: string;
let data: string;
const add = (m: ReturnType<typeof manifest>, scripts: Record<string, string> = {}, dirName = m.id) => {
  const dir = join(root, 'modules', dirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'module.json'), JSON.stringify(m));
  for (const [name, body] of Object.entries(scripts)) writeFileSync(join(dir, name), body);
};
const state = () => JSON.parse(readFileSync(join(data, 'modules.json'), 'utf8')).installed;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'orvane-modules-'));
  data = join(root, 'data');
  mkdirSync(data);
});

describe('validateManifest', () => {
  it('accepte un manifeste complet', () => {
    expect(validateManifest(manifest('demo'), 'demo')).toEqual([]);
  });
  it('exige que l’id soit le nom du dossier', () => {
    expect(validateManifest(manifest('demo'), 'autre').join()).toMatch(/nom du dossier/);
  });
  it('section et parent : « systeme » seulement, parent = onglet précédent du module', () => {
    const tab = (id: string, extra = {}) => ({ id, label: id, href: `/${id}`, pages: [`/${id}`], ...extra });
    const ok = manifest('demo', { tabs: [tab('demo', { section: 'systeme' }), tab('sous', { parent: 'demo' })] });
    expect(validateManifest(ok, 'demo')).toEqual([]);
    const bad = manifest('demo', { tabs: [tab('demo', { section: 'ailleurs', parent: 'sous' }), tab('sous', { parent: 'inconnu' })] });
    expect(validateManifest(bad, 'demo').join()).toMatch(/section[\s\S]*parent[\s\S]*parent/);
  });
  it('refuse un logo hors du dossier et un onglet sans pages', () => {
    const errors = validateManifest(manifest('demo', { logo: '../x.svg', tabs: [{ id: 'demo', label: 'D', href: '/d' }] }), 'demo');
    expect(errors.join()).toMatch(/logo/);
    expect(errors.join()).toMatch(/pages/);
  });
});

describe('registre', () => {
  it('sans modules.json, aucun module n’est installé ; un manifeste invalide est ignoré', () => {
    add(manifest('demo'));
    add(manifest('autre'), {}, 'casse');
    const r = createRegistry({ root, dataDir: data });
    expect(r.listModules().map((m) => m.id)).toEqual(['demo']);
    expect(r.isInstalled('demo')).toBe(false);
    expect(r.installedTabs()).toEqual([]);
  });

  it('installe : lance install.sh avec l’environnement du module et enregistre l’état', async () => {
    add(manifest('demo', { scripts: { install: 'install.sh' } }), { 'install.sh': 'echo "$MODULE_ID $PANEL_DATA_DIR"; touch "$MODULE_DIR/fait"' });
    const r = createRegistry({ root, dataDir: data });
    const res = await r.install('demo');
    expect(res).toEqual({ ok: true, output: `demo ${data}` });
    expect(existsSync(join(root, 'modules/demo/fait'))).toBe(true);
    expect(state()).toEqual(['demo']);
    expect(r.isInstalled('demo')).toBe(true);
    expect(r.installedTabs()[0]).toMatchObject({ id: 'demo', module: 'demo', pages: ['/demo'] });
    expect(r.moduleForPath('/api/demo/x')?.id).toBe('demo');
    expect(r.moduleForPath('/demonstration')).toBeNull();
  });

  it('un script en échec laisse le module non installé et renvoie sa sortie', async () => {
    add(manifest('demo', { scripts: { install: 'install.sh' } }), { 'install.sh': 'echo "git absent" >&2; exit 3' });
    const r = createRegistry({ root, dataDir: data });
    expect(await r.install('demo')).toEqual({ ok: false, output: 'git absent' });
    expect(r.isInstalled('demo')).toBe(false);
  });

  it('un script trop long est arrêté', async () => {
    add(manifest('demo', { scripts: { install: 'install.sh' } }), { 'install.sh': 'sleep 5' });
    const r = createRegistry({ root, dataDir: data, scriptTimeoutMs: 200 });
    const res = await r.install('demo');
    expect(res.ok).toBe(false);
    expect(res.output).toMatch(/Arrêté/);
  });

  it('une seule opération à la fois par module : la seconde demande est refusée', async () => {
    add(manifest('demo', { scripts: { install: 'install.sh' } }), { 'install.sh': 'echo x >> "$MODULE_DIR/passages"; sleep 0.3' });
    const r = createRegistry({ root, dataDir: data });
    const [a, b] = await Promise.all([r.install('demo'), r.install('demo')]);
    expect(a.ok).toBe(true);
    expect(b).toEqual({ ok: false, output: expect.stringMatching(/opération en cours/i) });
    expect(readFileSync(join(root, 'modules/demo/passages'), 'utf8')).toBe('x\n');
    expect((await r.install('demo')).output).toBe('Déjà installé.');
  });

  it('un délai dépassé arrête aussi les processus lancés par le script', async () => {
    add(manifest('demo', { scripts: { install: 'install.sh' } }), { 'install.sh': 'sleep 30 >/dev/null 2>&1 & echo $! > "$MODULE_DIR/pid"; wait' });
    const r = createRegistry({ root, dataDir: data, scriptTimeoutMs: 300 });
    expect((await r.install('demo')).ok).toBe(false);
    const pid = Number(readFileSync(join(root, 'modules/demo/pid'), 'utf8'));
    const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
    for (let i = 0; i < 20 && alive(); i++) await new Promise((ok) => setTimeout(ok, 50));
    const survived = alive();
    if (survived) process.kill(pid, 'SIGKILL');
    expect(survived).toBe(false);
  });

  it('vérifie les commandes et les modules requis', async () => {
    add(manifest('base'));
    add(manifest('demo', { requires: { commands: ['bash', 'commande-qui-nexiste-pas'], modules: ['base'] } }));
    const r = createRegistry({ root, dataDir: data });
    expect((await r.install('demo')).output).toBe('Prérequis manquants : commande commande-qui-nexiste-pas, module base.');
    expect(r.isInstalled('demo')).toBe(false);
  });

  it('refuse de désinstaller un module dont un autre dépend', async () => {
    add(manifest('base'));
    add(manifest('demo', { requires: { commands: [], modules: ['base'] } }));
    const r = createRegistry({ root, dataDir: data });
    await r.install('base');
    expect((await r.install('demo')).ok).toBe(true);
    const res = await r.uninstall('base');
    expect(res).toEqual({ ok: false, output: 'Requis par : DEMO. Désinstallez-les d’abord.' });
    expect((await r.uninstall('demo')).ok).toBe(true);
    expect((await r.uninstall('base')).ok).toBe(true);
    expect(state()).toEqual([]);
  });

  it('désinstalle sans toucher aux données, puis avec purge', async () => {
    add(manifest('demo', { data: ['data/demo', '.cache/demo'], scripts: { uninstall: 'uninstall.sh' } }), { 'uninstall.sh': 'echo bye' });
    mkdirSync(join(data, 'demo'));
    mkdirSync(join(root, '.cache/demo'), { recursive: true });
    const r = createRegistry({ root, dataDir: data });
    await r.install('demo');
    expect(await r.uninstall('demo')).toEqual({ ok: true, output: 'bye' });
    expect(existsSync(join(data, 'demo'))).toBe(true);
    await r.install('demo');
    const res = await r.uninstall('demo', { purge: true });
    expect(res.ok).toBe(true);
    expect(existsSync(join(data, 'demo'))).toBe(false);
    expect(existsSync(join(root, '.cache/demo'))).toBe(false);
    expect(existsSync(data)).toBe(true);
  });

  it.each(['../dehors', 'data/../../dehors', '/etc', 'data', '.', '.env', 'modules', 'node_modules', 'src', '.cache', '.cache/../.env'])('refuse de purger %s', async (p) => {
    add(manifest('demo', { data: [p] }));
    const r = createRegistry({ root, dataDir: data });
    await r.install('demo');
    const res = await r.uninstall('demo', { purge: true });
    expect(res.ok).toBe(false);
    expect(res.output).toMatch(/hors du panel/);
    expect(r.isInstalled('demo')).toBe(true);
  });

  it('ne suit pas un dossier intermédiaire en lien symbolique', async () => {
    const dehors = mkdtempSync(join(tmpdir(), 'orvane-dehors-'));
    writeFileSync(join(dehors, 'precieux'), 'à garder');
    symlinkSync(dehors, join(data, 'lien'));
    add(manifest('demo', { data: ['data/lien/precieux'] }));
    const r = createRegistry({ root, dataDir: data });
    await r.install('demo');
    const res = await r.uninstall('demo', { purge: true });
    expect(existsSync(join(dehors, 'precieux'))).toBe(true);
    expect(res.output).toMatch(/ignoré/);
  });

  it('un lien symbolique est supprimé comme lien, sa cible reste', async () => {
    const dehors = mkdtempSync(join(tmpdir(), 'orvane-dehors-'));
    writeFileSync(join(dehors, 'precieux'), 'à garder');
    symlinkSync(dehors, join(data, 'lien'));
    add(manifest('demo', { data: ['data/lien'] }));
    const r = createRegistry({ root, dataDir: data });
    await r.install('demo');
    expect((await r.uninstall('demo', { purge: true })).ok).toBe(true);
    expect(existsSync(join(data, 'lien'))).toBe(false);
    expect(readFileSync(join(dehors, 'precieux'), 'utf8')).toBe('à garder');
  });

  it('ne sert que le logo déclaré', () => {
    add(manifest('demo'));
    const r = createRegistry({ root, dataDir: data });
    expect(r.logoFile('demo', 'logo.svg')).toBe(join(root, 'modules/demo/logo.svg'));
    expect(r.logoFile('demo', 'module.json')).toBeNull();
    expect(r.logoFile('inconnu', 'logo.svg')).toBeNull();
  });
});

describe('journaux et unités protégées des modules', () => {
  const extra = {
    logs: [{ id: 'jeu', label: 'Jeu', unit: '${DEMO_UNIT:-jeu}.service' }, { id: 'f', label: 'Fichier', file: '${DEMO_DIR:-/srv/test}/latest.log' }],
    protectedUnits: [{ unit: '${DEMO_UNIT:-jeu}', reason: 'Passez par la page du module.' }],
  };
  it('valide la forme : une unité OU un fichier par source', () => {
    expect(validateManifest(manifest('demo', extra), 'demo')).toEqual([]);
    expect(validateManifest(manifest('demo', { logs: [{ id: 'x', label: 'X', unit: 'a', file: '/b' }] }), 'demo').join()).toMatch(/logs/);
    expect(validateManifest(manifest('demo', { protectedUnits: [{ reason: 'r' }] }), 'demo').join()).toMatch(/protectedUnits/);
  });
  it('ne déclare que les modules installés, variables développées', async () => {
    add(manifest('demo', extra));
    const reg = createRegistry({ root, dataDir: data });
    expect(reg.logSources()).toEqual([]);
    expect(reg.protectedUnits()).toEqual([]);
    expect((await reg.install('demo')).ok).toBe(true);
    expect(reg.logSources()).toEqual([
      { id: 'demo-jeu', label: 'Jeu', module: 'demo', kind: 'journal', unit: 'jeu.service', user: false },
      { id: 'demo-f', label: 'Fichier', module: 'demo', kind: 'file', path: '/srv/test/latest.log' },
    ]);
    expect(reg.protectedUnits()).toEqual([{ unit: 'jeu', reason: 'Passez par la page du module.', module: 'demo' }]);
  });
  it('expandEnv : variable, défaut, dossier personnel', () => {
    expect(expandEnv('${A}/x', { A: '/a' })).toBe('/a/x');
    expect(expandEnv('${A:-/d}/x', {})).toBe('/d/x');
    expect(expandEnv('${A:-~/m}/x', {})).toMatch(/^\/.+\/m\/x$/);
  });
});
