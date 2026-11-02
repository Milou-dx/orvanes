import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import * as core from './auth-core.js';
import { provisionAccount, suggestName } from './linux-accounts';

interface PublicUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'blocked';
  tabs: string[];
  hasPassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  sessions: number;
  linuxUser: string | null;
  linuxSuggestion: string;
}

export class AuthError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const publicUser = (u: any): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name || u.email,
  picture: u.picture ?? '',
  role: u.role,
  status: u.status,
  tabs: core.allowedTabs(u),
  hasPassword: Boolean(u.password),
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt ?? null,
  sessions: core.sessionCount(u.id),
  linuxUser: typeof u.linuxUser === 'string' ? u.linuxUser : null,
  linuxSuggestion: suggestName(u.email),
});

export function openSession(cookies: AstroCookies, request: Request, userId: string) {
  const ip = request.headers.get('x-forwarded-for') ?? '';
  const { token, maxAge } = core.createSession(userId, { ip, ua: request.headers.get('user-agent') ?? '' });
  cookies.set(core.COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
    secure: request.headers.get('x-forwarded-proto') === 'https' || new URL(request.url).protocol === 'https:',
  });
}

export function closeSession(cookies: AstroCookies) {
  core.destroySession(cookies.get(core.COOKIE)?.value ?? '');
  cookies.delete(core.COOKIE, { path: '/' });
}

function touch(user: any, patch: Record<string, unknown> = {}) {
  const users = core.listUsers().map((u: any) => (u.id === user.id ? { ...u, ...patch, lastLoginAt: new Date().toISOString() } : u));
  core.saveUsers(users);
}

export function passwordLogin(identifier: string, password: string, ip: string): { user: any } {
  const id = core.normalizeEmail(identifier);
  const key = `pw:${ip}:${id}`;
  const wait = core.throttled(key);
  if (wait) throw new AuthError(`Trop d'essais. Réessayez dans ${wait} s.`, 429);

  const user = core.findUserByEmail(id);
  const ok = core.verifyPassword(password, user?.password);
  if (!user || !ok) {
    core.recordFailure(key);
    throw new AuthError('Identifiant ou mot de passe incorrect.', 401);
  }
  core.recordSuccess(key);
  if (user.status === 'blocked') throw new AuthError('Ce compte est bloqué.', 403);
  touch(user);
  return { user: core.findUserById(user.id) };
}

const GOOGLE_CALLBACK = '/api/auth/google/callback';
export const GOOGLE_COOKIE = 'panel_oauth';
export const PENDING_COOKIE = 'panel_pending';

export interface GoogleFlow {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  suite: string;
}

export const googleConfigured = () => {
  const g = core.getSettings().google;
  return Boolean(g.clientId && g.clientSecret);
};

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function googleBegin(origin: string, suite: string): { target: string; flow: GoogleFlow } {
  if (!googleConfigured()) throw new AuthError('La connexion Google n’est pas encore configurée.', 503);
  const flow: GoogleFlow = {
    state: randomBytes(24).toString('base64url'),
    nonce: randomBytes(24).toString('base64url'),
    verifier: randomBytes(48).toString('base64url'),
    redirectUri: origin + GOOGLE_CALLBACK,
    suite,
  };
  const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  target.search = new URLSearchParams({
    client_id: core.getSettings().google.clientId,
    redirect_uri: flow.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: createHash('sha256').update(flow.verifier).digest('base64url'),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return { target: target.toString(), flow };
}

async function googleToken(data: Record<string, string>): Promise<any> {
  const g = core.getSettings().google;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: g.clientId, client_secret: g.clientSecret, ...data }).toString(),
    signal: AbortSignal.timeout(10_000),
  });
  return res.json().catch(() => ({}));
}

export async function googleFinish(flow: GoogleFlow, state: string, code: string): Promise<{ email: string; name: string; picture: string }> {
  if (!state || !code || !same(state, flow.state)) throw new AuthError('Retour Google invalide.', 400);
  const json = await googleToken({
    code,
    code_verifier: flow.verifier,
    redirect_uri: flow.redirectUri,
    grant_type: 'authorization_code',
  });
  if (json.error || !json.id_token) throw new AuthError('Google a refusé la connexion.', 502);

  const claims = JSON.parse(Buffer.from(String(json.id_token).split('.')[1] ?? '', 'base64url').toString('utf8'));
  const g = core.getSettings().google;
  if (
    claims.aud !== g.clientId ||
    !/^(https:\/\/)?accounts\.google\.com$/.test(String(claims.iss)) ||
    claims.email_verified !== true ||
    !same(String(claims.nonce ?? ''), flow.nonce) ||
    Number(claims.exp ?? 0) * 1000 < Date.now()
  ) {
    throw new AuthError('Jeton Google refusé.', 403);
  }
  return { email: core.normalizeEmail(claims.email), name: String(claims.name ?? ''), picture: String(claims.picture ?? '') };
}

export function googleLogin(profile: { email: string; name: string; picture: string }): { user: any; outcome: 'active' | 'pending' | 'blocked' } {
  let user = core.findUserByEmail(profile.email);
  if (!user) {
    user = core.newUser({ email: profile.email, name: profile.name, picture: profile.picture, status: 'pending', tabs: [] });
    core.saveUsers([...core.listUsers(), user]);
    return { user, outcome: 'pending' };
  }
  if (user.status === 'blocked') return { user, outcome: 'blocked' };
  touch(user, { name: user.name || profile.name, picture: profile.picture || user.picture });
  user = core.findUserById(user.id);
  return { user, outcome: user.status === 'active' ? 'active' : 'pending' };
}

function cleanTabs(tabs: unknown): string[] {
  const storable = core.storableTabs();
  return Array.isArray(tabs) ? [...new Set(tabs.map(String))].filter((t) => storable.includes(t)) : [];
}

function keepHiddenTabs(requested: string[], current: string[] = []): string[] {
  const assignable = core.assignableTabs();
  return [...new Set([...requested, ...cleanTabs(current).filter((t) => !assignable.includes(t))])];
}

const cleanText = (value: unknown, max: number) => String(value ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);

function activeAdmins(users: any[], except?: string) {
  return users.filter((u) => u.role === 'admin' && u.status === 'active' && u.id !== except);
}

function findTarget(users: any[], id: string) {
  const target = users.find((u) => u.id === id);
  if (!target) throw new AuthError('Utilisateur inconnu.', 404);
  return target;
}

function chosenPassword(value: unknown): string {
  const clear = cleanText(value, 100) || core.generatePassword();
  if (clear.length < 8) throw new AuthError('Le mot de passe doit faire au moins 8 caractères.');
  return clear;
}

export function adminOverview() {
  const users = core.listUsers().map(publicUser);
  const s = core.getSettings();
  return {
    users,
    enabled: s.enabled,
    google: { configured: googleConfigured(), clientId: s.google.clientId, hasSecret: Boolean(s.google.clientSecret) },
    sessionDays: s.sessionDays,
  };
}

export function adminSaveUser(input: Record<string, unknown>) {
  const users = core.listUsers();
  const target = findTarget(users, String(input.id ?? ''));

  const next = { ...target };
  if (input.name !== undefined) next.name = cleanText(input.name, 80);
  if (input.tabs !== undefined) next.tabs = keepHiddenTabs(cleanTabs(input.tabs), target.tabs);
  if (core.BOOTSTRAP_ADMINS.includes(target.email)) {
    next.role = 'admin';
    next.status = 'active';
  } else {
    if (input.role === 'admin' || input.role === 'user') next.role = input.role;
    if (input.status === 'active' || input.status === 'pending' || input.status === 'blocked') next.status = input.status;
  }
  if (target.role === 'admin' && (next.role !== 'admin' || next.status !== 'active') && activeAdmins(users, target.id).length === 0) {
    throw new AuthError('Il doit rester au moins un administrateur actif.', 409);
  }
  core.saveUsers(users.map((u: any) => (u.id === target.id ? next : u)));
  if (next.status !== 'active') core.destroyUserSessions(target.id);
  return publicUser(next);
}

export function adminCreateLocal(input: Record<string, unknown>) {
  const email = core.normalizeEmail(cleanText(input.email, 120));
  if (email.length < 3) throw new AuthError('Donnez un identifiant ou une adresse e-mail.');
  if (core.findUserByEmail(email)) throw new AuthError('Cet identifiant existe déjà.', 409);
  const clear = chosenPassword(input.password);
  const user = core.newUser({
    email,
    name: cleanText(input.name, 80) || email.split('@')[0],
    role: input.role === 'admin' ? 'admin' : 'user',
    tabs: cleanTabs(input.tabs),
    password: core.hashPassword(clear),
  });
  core.saveUsers([...core.listUsers(), user]);
  return { user: publicUser(user), password: clear };
}

export function adminSetPassword(id: string, password?: string) {
  const users = core.listUsers();
  findTarget(users, id);
  const clear = chosenPassword(password);
  core.saveUsers(users.map((u: any) => (u.id === id ? { ...u, password: core.hashPassword(clear) } : u)));
  core.destroyUserSessions(id);
  return { password: clear };
}

export function adminDelete(id: string, actorId: string | null) {
  const users = core.listUsers();
  const target = findTarget(users, id);
  if (id === actorId) throw new AuthError('Vous ne pouvez pas supprimer votre propre compte.', 409);
  if (core.BOOTSTRAP_ADMINS.includes(target.email)) throw new AuthError('Ce compte administrateur est permanent.', 409);
  if (target.role === 'admin' && activeAdmins(users, id).length === 0) throw new AuthError('Il doit rester au moins un administrateur actif.', 409);
  core.destroyUserSessions(id);
  core.saveUsers(users.filter((u: any) => u.id !== id));
}

export function adminLinkLinux(id: string, name: unknown, create: boolean) {
  const users = core.listUsers();
  const target = findTarget(users, id);
  if (target.role === 'admin') throw new AuthError('Les administrateurs utilisent Claude sous le compte du panel : pas de compte Linux à lier.', 409);
  const linuxUser = String(name ?? '').trim();
  if (users.some((u: any) => u.id !== id && u.linuxUser === linuxUser)) throw new AuthError(`Le compte « ${linuxUser} » est déjà lié à un autre utilisateur.`, 409);
  try {
    provisionAccount(linuxUser, create);
  } catch (err) {
    console.error('[acces] compte Linux', linuxUser, (err as Error).message);
    throw new AuthError((err as Error).message.split('\n')[0] || 'Préparation du compte Linux impossible.', 400);
  }
  const next = { ...target, linuxUser };
  core.saveUsers(core.listUsers().map((u: any) => (u.id === id ? next : u)));
  return publicUser(next);
}

export function adminUnlinkLinux(id: string) {
  const users = core.listUsers();
  const target = findTarget(users, id);
  const { linuxUser: _, ...next } = target;
  core.saveUsers(users.map((u: any) => (u.id === id ? next : u)));
  return publicUser(next);
}

export function adminRevoke(id: string) {
  core.destroyUserSessions(id);
}

export function adminSaveGoogle(clientId: unknown, clientSecret: unknown) {
  const current = core.getSettings().google;
  const id = cleanText(clientId, 200);
  const secret = cleanText(clientSecret, 200);
  core.saveSettings({ google: { clientId: id, clientSecret: secret || (id === current.clientId ? current.clientSecret : '') } });
}

export async function adminTestGoogle(origin: string) {
  if (!googleConfigured()) throw new AuthError('Enregistrez d’abord l’identifiant et le secret.', 409);
  const json = await googleToken({ code: 'test', redirect_uri: origin + GOOGLE_CALLBACK, grant_type: 'authorization_code' });
  if (json.error === 'invalid_client') throw new AuthError('Google refuse cet identifiant ou ce code secret. Vérifiez qu’il s’agit d’un ID client de type « Application Web ».', 502);
  return { ok: true as const, message: `Identifiant et secret acceptés par Google. Adresse de redirection à déclarer : ${origin + GOOGLE_CALLBACK}` };
}

export function adminSetEnabled(enabled: boolean) {
  if (enabled) {
    const users = core.listUsers();
    const rescue = users.some((u: any) => u.role === 'admin' && u.status === 'active' && u.password);
    if (!rescue) {
      throw new AuthError('Avant d’activer la protection, donnez un mot de passe à au moins un administrateur : c’est votre compte de secours si Google ne répond plus.', 409);
    }
  }
  core.saveSettings({ enabled });
}
