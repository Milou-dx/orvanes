import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { openSession } from '../../../server/auth/auth';
import { userFromCookie } from '../../../server/auth/auth-core.js';

export const prerender = false;

export const SITES = new Set(String(process.env.PANEL_RELAY_SITES ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const PANEL = String(process.env.PANEL_PUBLIC_URL ?? '').split(',')[0].trim().replace(/\/+$/, '');
const codes = new Map<string, { userId: string; site: string; exp: number }>();

const isActive = (u: any) => u?.status === 'active';

export const GET: APIRoute = ({ request, url, cookies, redirect }) => {
  const user = userFromCookie(request.headers.get('cookie'));
  const site = url.hostname;

  if (SITES.has(site)) {
    if (url.searchParams.has('verifier')) {
      return isActive(user) ? new Response(null, { status: 204 }) : redirect('/api/auth/relais');
    }
    const code = url.searchParams.get('code') ?? '';
    const entry = codes.get(code);
    codes.delete(code);
    if (entry && entry.exp > Date.now() && entry.site === site) {
      openSession(cookies, request, entry.userId);
      return redirect('/');
    }
    return redirect(`${PANEL}/api/auth/relais?site=${site}`);
  }

  const target = url.searchParams.get('site') ?? '';
  if (!SITES.has(target)) return new Response('Site inconnu', { status: 400 });
  if (!user) return redirect(`/connexion?suite=${encodeURIComponent(url.pathname + url.search)}`);
  if (!isActive(user)) return redirect('/connexion?etat=attente');

  const now = Date.now();
  for (const [k, v] of codes) if (v.exp <= now) codes.delete(k);
  const code = randomBytes(24).toString('base64url');
  codes.set(code, { userId: user.id, site: target, exp: now + 60_000 });
  return redirect(`https://${target}/api/auth/relais?code=${code}`);
};
