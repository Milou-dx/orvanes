import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

/**
 * @typedef {{ id: string, label: string, href: string, icon?: string, pages: string[], api?: string[], adminOnly?: boolean, sensitive?: boolean, exact?: boolean, section?: 'systeme', parent?: string }} ModuleTab
 * @typedef {{ id: string, name: string, description: string, version: string, logo: string,
 *   requires?: { commands?: string[], modules?: string[] }, tabs: ModuleTab[], server?: string,
 *   scripts?: { install?: string, uninstall?: string }, data?: string[],
 *   env?: { name: string, default?: string, description?: string }[],
 *   logs?: { id: string, label: string, unit?: string, user?: boolean, file?: string }[],
 *   protectedUnits?: { unit: string, reason?: string }[] }} Module
 */

const ID = /^[a-z][a-z0-9-]*$/;
const FILE = /^[\w-][\w.-]*\.svg$/;
const COMMAND = /^[\w.+-]+$/;
const SCRIPT_TIMEOUT_MS = 10 * 60 * 1000;

export function validateManifest(m, dir) {
  const errors = [];
  const str = (v) => typeof v === 'string' && v.trim() !== '';
  const strList = (v) => Array.isArray(v) && v.every(str);
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['le manifeste doit être un objet JSON'];
  if (!str(m.id) || !ID.test(m.id)) errors.push('« id » : minuscules, chiffres et tirets, commence par une lettre');
  else if (m.id !== dir) errors.push(`« id » (${m.id}) doit être le nom du dossier (${dir})`);
  for (const k of ['name', 'description', 'version']) if (!str(m[k])) errors.push(`« ${k} » manquant`);
  if (!str(m.logo) || !FILE.test(m.logo)) errors.push('« logo » : nom d’un fichier .svg du dossier du module');
  const req = m.requires ?? {};
  if (typeof req !== 'object' || Array.isArray(req)) errors.push('« requires » doit être un objet');
  else {
    if (req.commands !== undefined && !(strList(req.commands) && req.commands.every((c) => COMMAND.test(c)))) errors.push('« requires.commands » : liste de noms de commandes');
    if (req.modules !== undefined && !(strList(req.modules) && req.modules.every((x) => ID.test(x)))) errors.push('« requires.modules » : liste d’identifiants de modules');
  }
  if (!Array.isArray(m.tabs) || m.tabs.length === 0) errors.push('« tabs » : au moins un onglet');
  else m.tabs.forEach((t, i) => {
    const at = `« tabs[${i}] »`;
    if (!t || typeof t !== 'object') return errors.push(`${at} doit être un objet`);
    if (!str(t.id) || !ID.test(t.id)) errors.push(`${at}.id invalide`);
    if (!str(t.label)) errors.push(`${at}.label manquant`);
    if (!str(t.href) || !t.href.startsWith('/')) errors.push(`${at}.href doit commencer par /`);
    if (!strList(t.pages) || !t.pages.every((p) => p.startsWith('/'))) errors.push(`${at}.pages : liste de chemins commençant par /`);
    if (t.api !== undefined && !(strList(t.api) && t.api.every((p) => p.startsWith('/api/')))) errors.push(`${at}.api : liste de chemins commençant par /api/`);
    if (t.section !== undefined && t.section !== 'systeme') errors.push(`${at}.section : seule valeur admise « systeme »`);
    if (t.parent !== undefined && !(i > 0 && m.tabs.slice(0, i).some((x) => x?.id === t.parent))) errors.push(`${at}.parent : identifiant d’un onglet précédent du module`);
  });
  if (m.server !== undefined && !(str(m.server) && /^[\w-][\w./-]*\.(m?js|ts)$/.test(m.server) && !m.server.includes('..'))) errors.push('« server » : chemin relatif d’un fichier .js ou .ts du module');
  if (m.scripts !== undefined) {
    if (typeof m.scripts !== 'object' || Array.isArray(m.scripts)) errors.push('« scripts » doit être un objet');
    else for (const k of ['install', 'uninstall']) if (m.scripts[k] !== undefined && !str(m.scripts[k])) errors.push(`« scripts.${k} » invalide`);
  }
  if (m.data !== undefined && !strList(m.data)) errors.push('« data » : liste de chemins relatifs');
  if (m.env !== undefined && !(Array.isArray(m.env) && m.env.every((e) => e && str(e.name)))) errors.push('« env » : liste d’objets { name, default, description }');
  if (m.logs !== undefined && !(Array.isArray(m.logs) && m.logs.every((l) => l && str(l.id) && ID.test(l.id) && str(l.label)
    && (str(l.unit) !== str(l.file)) && (l.user === undefined || typeof l.user === 'boolean')))) {
    errors.push('« logs » : liste d’objets { id, label, unit | file, user? }');
  }
  if (m.protectedUnits !== undefined && !(Array.isArray(m.protectedUnits) && m.protectedUnits.every((u) => u && str(u.unit)
    && (u.reason === undefined || str(u.reason))))) {
    errors.push('« protectedUnits » : liste d’objets { unit, reason? }');
  }
  return errors;
}

export function expandEnv(value, env = process.env) {
  return value.replace(/\$\{(\w+)(?::-([^}]*))?\}/g, (_, k, d) => env[k] || (d ?? '')).replace(/^~(?=\/|$)/, homedir());
}

const inside = (base, target) => {
  const rel = relative(base, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
};

const matches = (pathname, base, exact = false) => pathname === base || (!exact && pathname.startsWith(`${base}/`));

const MAX_OUTPUT = 4 * 1024 * 1024;
const KILL_GRACE_MS = 3000;

function runScript(file, args, env, timeout) {
  return new Promise((done) => {
    const child = spawn('bash', [file, ...args], { env: { ...process.env, ...env }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = { stdout: '', stderr: '' };
    for (const k of /** @type {const} */ (['stdout', 'stderr'])) {
      child[k].setEncoding('utf8');
      child[k].on('data', (c) => { if (out[k].length < MAX_OUTPUT) out[k] += c; });
    }
    const killGroup = (sig) => { try { process.kill(-child.pid, sig); } catch {} };
    let expired = false;
    let grace;
    const timer = setTimeout(() => {
      expired = true;
      killGroup('SIGTERM');
      grace = setTimeout(() => killGroup('SIGKILL'), KILL_GRACE_MS);
      grace.unref();
    }, timeout);
    child.on('error', (err) => { clearTimeout(timer); done({ ok: false, output: err.message }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const output = `${out.stdout}${out.stderr}`.trim();
      done({ ok: code === 0 && !expired, output: expired ? `${output}\nArrêté après ${Math.round(timeout / 1000)} s.`.trim() : output });
    });
  });
}

export function createRegistry({ root = resolve('.'), dataDir = process.env.PANEL_DATA_DIR ?? resolve('data'), scriptTimeoutMs = SCRIPT_TIMEOUT_MS } = {}) {
  const modulesDir = join(root, 'modules');
  const stateFile = join(dataDir, 'modules.json');
  /** @type {{ at: number, modules: Module[], installed: string[] } | null} */
  let cache = null;

  function load() {
    if (cache && Date.now() - cache.at < 1000) return cache;
    /** @type {Module[]} */
    const modules = [];
    /** @type {string[]} */
    let dirs = [];
    try { dirs = readdirSync(modulesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort(); } catch {}
    for (const dir of dirs) {
      let m;
      try { m = JSON.parse(readFileSync(join(modulesDir, dir, 'module.json'), 'utf8')); } catch { continue; }
      if (validateManifest(m, dir).length === 0) modules.push(m);
    }
    /** @type {string[]} */
    let installed = [];
    try { installed = JSON.parse(readFileSync(stateFile, 'utf8')).installed ?? []; } catch {}
    cache = { at: Date.now(), modules, installed: installed.filter((id) => modules.some((m) => m.id === id)) };
    return cache;
  }

  function saveInstalled(ids) {
    mkdirSync(dirname(stateFile), { recursive: true });
    const tmp = `${stateFile}.tmp`;
    writeFileSync(tmp, `${JSON.stringify({ installed: [...new Set(ids)].sort() }, null, 2)}\n`);
    renameSync(tmp, stateFile);
    cache = null;
  }

  const reload = () => { cache = null; };
  const listModules = () => load().modules;
  const getModule = (id) => listModules().find((m) => m.id === id) ?? null;
  const isInstalled = (id) => load().installed.includes(id);
  const moduleDir = (id) => join(modulesDir, id);

  const moduleForPath = (pathname) => listModules().find((m) => m.tabs.some((t) =>
    t.pages.some((p) => matches(pathname, p, t.exact)) || (t.api ?? []).some((a) => matches(pathname, a)))) ?? null;

  /** @returns {(ModuleTab & { api: string[], sensitive: boolean, module: string })[]} */
  const installedTabs = () => listModules().filter((m) => isInstalled(m.id)).flatMap((m) =>
    m.tabs.map((t) => ({ api: [], sensitive: false, ...t, module: m.id })));

  const logSources = () => listModules().filter((m) => isInstalled(m.id)).flatMap((m) => (m.logs ?? []).map((l) => ({
    id: `${m.id}-${l.id}`, label: expandEnv(l.label), module: m.id,
    ...(l.unit ? { kind: 'journal', unit: expandEnv(l.unit), user: l.user === true } : { kind: 'file', path: expandEnv(l.file ?? '') }),
  })));

  const protectedUnits = () => listModules().filter((m) => isInstalled(m.id)).flatMap((m) =>
    (m.protectedUnits ?? []).map((u) => ({ unit: expandEnv(u.unit).replace(/\.service$/, ''), reason: u.reason ?? '', module: m.id })));

  /** @param {Module} m */
  async function missing(m) {
    /** @type {string[]} */
    const out = [];
    for (const cmd of m.requires?.commands ?? []) {
      const { ok } = await runScript('-c', ['command -v "$1" >/dev/null', '_', cmd], {}, 5000);
      if (!ok) out.push(`commande ${cmd}`);
    }
    for (const dep of m.requires?.modules ?? []) if (!isInstalled(dep)) out.push(`module ${dep}`);
    return out;
  }

  const scriptEnv = (m) => ({ MODULE_ID: m.id, MODULE_DIR: moduleDir(m.id), PANEL_ROOT: root, PANEL_DATA_DIR: dataDir });

  async function runHook(m, kind) {
    const name = m.scripts?.[kind];
    if (!name) return { ok: true, output: '' };
    const file = resolve(moduleDir(m.id), name);
    if (!inside(moduleDir(m.id), file) || !existsSync(file)) return { ok: false, output: `Script introuvable : ${name}` };
    return runScript(file, [], scriptEnv(m), scriptTimeoutMs);
  }

  const running = new Map();

  function exclusive(id, op) {
    if (running.has(id)) return Promise.resolve({ ok: false, output: 'Opération en cours sur ce module : réessayez quand elle sera terminée.' });
    const p = op().finally(() => running.delete(id));
    running.set(id, p);
    return p;
  }

  const install = (id, opts) => exclusive(id, () => doInstall(id, opts));
  async function doInstall(id, { again = false } = {}) {
    const m = getModule(id);
    if (!m) return { ok: false, output: `Module inconnu : ${id}` };
    if (isInstalled(id) && !again) return { ok: true, output: 'Déjà installé.' };
    const lacking = await missing(m);
    if (lacking.length) return { ok: false, output: `Prérequis manquants : ${lacking.join(', ')}.` };
    const res = await runHook(m, 'install');
    if (res.ok) saveInstalled([...load().installed, id]);
    return res;
  }

  const uninstall = (id, opts) => exclusive(id, () => doUninstall(id, opts));
  async function doUninstall(id, { purge = false } = {}) {
    const m = getModule(id);
    if (!m) return { ok: false, output: `Module inconnu : ${id}` };
    if (!isInstalled(id)) return { ok: true, output: 'Déjà désinstallé.' };
    const dependents = listModules().filter((o) => o.id !== id && isInstalled(o.id) && (o.requires?.modules ?? []).includes(id));
    if (dependents.length) return { ok: false, output: `Requis par : ${dependents.map((o) => o.name).join(', ')}. Désinstallez-les d’abord.` };
    const targets = [];
    if (purge) {
      for (const p of m.data ?? []) {
        const t = dataTarget(p);
        if (!t) return { ok: false, output: `Chemin de données refusé (hors du panel : data/… ou .cache/… seulement) : ${p}` };
        targets.push(t);
      }
    }
    const res = await runHook(m, 'uninstall');
    if (!res.ok) return res;
    saveInstalled(load().installed.filter((x) => x !== id));
    const ignored = targets.filter((t) => !purgeTarget(t)).map((t) => t.path);
    const removed = targets.map((t) => t.path).filter((p) => !ignored.includes(p));
    return { ok: true, output: [
      res.output,
      removed.length ? `Données supprimées : ${removed.join(', ')}.` : '',
      ignored.length ? `Chemin ignoré (sort de sa base par un lien symbolique) : ${ignored.join(', ')}.` : '',
    ].filter(Boolean).join('\n') };
  }

  function dataTarget(p) {
    if (isAbsolute(p)) return null;
    const m = /^(data|\.cache)\/(.+)$/.exec(p);
    if (!m) return null;
    const base = m[1] === 'data' ? dataDir : join(root, '.cache');
    const target = resolve(base, m[2]);
    return inside(base, target) ? { path: p, base, target } : null;
  }

  function purgeTarget({ base, target }) {
    let realBase, parent;
    try {
      realBase = realpathSync(base);
      parent = realpathSync(dirname(target));
    } catch {
      return true;
    }
    if (parent !== realBase && !inside(realBase, parent)) return false;
    const final = join(parent, basename(target));
    let st;
    try { st = lstatSync(final); } catch { return true; }
    if (st.isSymbolicLink() || !st.isDirectory()) unlinkSync(final);
    else rmSync(final, { recursive: true, force: true });
    return true;
  }

  function logoFile(id, file) {
    const m = getModule(id);
    return m && m.logo === file ? join(moduleDir(id), m.logo) : null;
  }

  return { root, modulesDir, reload, listModules, getModule, isInstalled, moduleForPath, installedTabs, logSources, protectedUnits, missing, install, uninstall, logoFile };
}

const registry = createRegistry();
export const { reload, listModules, getModule, isInstalled, moduleForPath, installedTabs, logSources, protectedUnits, missing, install, uninstall, logoFile } = registry;
export default registry;
