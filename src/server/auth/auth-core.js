
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { installedTabs, listModules } from '../modules/registry.js';

const DATA_DIR = process.env.PANEL_DATA_DIR ?? resolve('data');
const FILES = {
  auth: join(DATA_DIR, 'auth.json'),
  users: join(DATA_DIR, 'users.json'),
  sessions: join(DATA_DIR, 'sessions.json'),
};

export const COOKIE = 'orvane_session';
export const BOOTSTRAP_ADMINS = String(process.env.PANEL_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const CORE_TABS = [
  { id: 'accueil', label: 'Vue d’ensemble', pages: ['/'], exact: true, api: ['/api/system'], sensitive: false },
  { id: 'processus', label: 'Processus', pages: ['/processus'], api: ['/api/process', '/api/processes'], sensitive: true },
  { id: 'performance', label: 'Performances', pages: ['/performance'], api: ['/api/system'], sensitive: false },
  { id: 'services', label: 'Services', pages: ['/services'], api: ['/api/service'], sensitive: true, adminOnly: true },
  { id: 'reseau', label: 'Réseau', pages: ['/reseau'], api: ['/api/firewall'], sensitive: true },
  { id: 'fichiers', label: 'Fichiers', pages: ['/fichiers'], api: ['/api/files'], sensitive: true, adminOnly: true },
  { id: 'logs', label: 'Journaux', pages: ['/logs'], api: [], sensitive: false },
  { id: 'terminal', label: 'Terminal', pages: ['/terminal'], api: ['/api/shell'], sensitive: true, adminOnly: true },
  { id: 'modules', label: 'Magasin', pages: ['/modules'], api: ['/api/modules'], sensitive: true, adminOnly: true },
  { id: 'acces', label: 'Utilisateurs', pages: ['/acces'], api: ['/api/admin'], sensitive: true, adminOnly: true },
  { id: 'parametres', label: 'Paramètres', pages: ['/parametres'], api: [], sensitive: false, adminOnly: true },
];

export const tabs = () => [...CORE_TABS, ...installedTabs().filter((t) => !CORE_TABS.some((c) => c.id === t.id))];

export const assignableTabs = () => tabs().filter((t) => !t.adminOnly).map((t) => t.id);

export const storableTabs = () => [...new Set([...assignableTabs(), ...listModules().flatMap((m) => m.tabs)
  .filter((t) => !t.adminOnly && !CORE_TABS.some((c) => c.id === t.id)).map((t) => t.id)])];

const PUBLIC_PREFIXES = ['/connexion', '/portail', '/api/auth', '/_astro', '/icons', '/modules-assets', '/favicon.ico'];
// Ouvertes à tout compte actif, quels que soient ses onglets.
const MEMBER_PATHS = ['/aide', '/api/feedback'];
const isPublicPath = (pathname) => PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const matches = (pathname, base, exact = false) => pathname === base || (!exact && pathname.startsWith(`${base}/`));

function tabsForPath(pathname) {
  return tabs().filter((t) => t.pages.some((p) => matches(pathname, p, t.exact)) || t.api.some((a) => matches(pathname, a))).map((t) => t.id);
}

const cache = new Map();

function read(file, fallback) {
  const hit = cache.get(file);
  if (hit && Date.now() - hit.at < 1000) return hit.value;
  let value;
  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    value = fallback;
  }
  cache.set(file, { at: Date.now(), value });
  return value;
}

function write(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(tmp, file);
  cache.set(file, { at: Date.now(), value });
}

const DEFAULT_SETTINGS = { enabled: false, google: { clientId: '', clientSecret: '' }, sessionDays: 14 };

export function getSettings() {
  const s = read(FILES.auth, null);
  if (s === null && existsSync(FILES.auth)) return { ...DEFAULT_SETTINGS, enabled: true };
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), google: { ...DEFAULT_SETTINGS.google, ...(s?.google ?? {}) } };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  write(FILES.auth, next);
  return next;
}

export const isEnabled = () => getSettings().enabled === true;

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

function baseUser(fields) {
  return {
    id: randomUUID(),
    email: '',
    name: '',
    picture: '',
    role: 'user',
    status: 'active',
    tabs: [],
    password: null,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    ...fields,
  };
}

export function listUsers() {
  const users = [...read(FILES.users, [])];
  for (const email of BOOTSTRAP_ADMINS) {
    if (!users.some((u) => u.email === email)) users.push(baseUser({ id: `admin:${email}`, email, name: email.split('@')[0], role: 'admin' }));
  }
  return users.map((u) => (BOOTSTRAP_ADMINS.includes(u.email) ? { ...u, role: 'admin', status: 'active' } : u));
}

export function saveUsers(users) {
  write(FILES.users, users.filter((u) => !(u.id.startsWith('admin:') && !u.password && !u.lastLoginAt)));
}

export const findUserByEmail = (email) => listUsers().find((u) => u.email === normalizeEmail(email));
export const findUserById = (id) => listUsers().find((u) => u.id === id);

export function newUser(fields) {
  return baseUser({ ...fields, email: normalizeEmail(fields.email) });
}

export function allowedTabs(user) {
  if (!user) return [];
  if (user.role === 'admin') return tabs().map((t) => t.id);
  const assignable = assignableTabs();
  return (user.tabs ?? []).filter((id) => assignable.includes(id));
}

export function firstAllowedPage(user) {
  const ids = allowedTabs(user);
  const tab = tabs().find((t) => ids.includes(t.id));
  return tab ? tab.pages[0] : null;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') {
    scryptSync(String(password), 'x'.repeat(32), 64);
    return false;
  }
  const [, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash ?? '', 'hex');
  const actual = scryptSync(String(password), salt ?? '', 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const generatePassword = () => randomBytes(12).toString('base64url');

const digest = (token) => createHash('sha256').update(token).digest('hex');

function activeSessions() {
  const now = Date.now();
  return read(FILES.sessions, []).filter((s) => s.expiresAt > now);
}

export function createSession(userId, meta = {}) {
  const token = randomBytes(32).toString('base64url');
  const days = getSettings().sessionDays;
  write(FILES.sessions, [
    ...activeSessions(),
    { h: digest(token), userId, createdAt: Date.now(), expiresAt: Date.now() + days * 86_400_000, ip: meta.ip ?? '', ua: String(meta.ua ?? '').slice(0, 160) },
  ]);
  return { token, maxAge: days * 86_400 };
}

export function destroySession(token) {
  if (!token) return;
  const h = digest(token);
  write(FILES.sessions, activeSessions().filter((s) => s.h !== h));
}

export function destroyUserSessions(userId) {
  write(FILES.sessions, activeSessions().filter((s) => s.userId !== userId));
}

export function sessionCount(userId) {
  return activeSessions().filter((s) => s.userId === userId).length;
}

export function tokenFromCookie(header) {
  for (const part of String(header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

export function userFromCookie(header) {
  const token = tokenFromCookie(header);
  if (!token) return null;
  const h = digest(token);
  const session = activeSessions().find((s) => s.h === h);
  return session ? findUserById(session.userId) ?? null : null;
}

export function decide(pathname, user) {
  if (!isEnabled()) return 'allow';
  if (isPublicPath(pathname)) return 'allow';
  if (!user) return 'login';
  if (user.status !== 'active') return 'pending';
  if (user.role === 'admin') return 'allow';
  if (MEMBER_PATHS.includes(pathname)) return 'allow';
  const tabs = tabsForPath(pathname);
  if (tabs.length === 0) return 'forbidden';
  const mine = allowedTabs(user);
  return tabs.some((t) => mine.includes(t)) ? 'allow' : 'forbidden';
}

export function allowUpgrade(req) {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  return decide(pathname, userFromCookie(req.headers.cookie)) === 'allow';
}

const attempts = new Map();

export function throttled(key) {
  const a = attempts.get(key);
  return a && a.until > Date.now() ? Math.ceil((a.until - Date.now()) / 1000) : 0;
}

export function recordFailure(key) {
  const a = attempts.get(key) ?? { count: 0, until: 0 };
  a.count += 1;
  if (a.count >= 5) a.until = Date.now() + Math.min(900_000, 30_000 * 2 ** (a.count - 5));
  attempts.set(key, a);
}

export const recordSuccess = (key) => attempts.delete(key);
