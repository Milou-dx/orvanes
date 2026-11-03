import type { APIRoute } from 'astro';
import { AuthError, openSession, passwordLogin } from '../../../server/auth/auth';
import { firstAllowedPage } from '../../../server/auth/auth-core.js';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400);
  }
  try {
    const ip = request.headers.get('x-forwarded-for') ?? '';
    const { user } = passwordLogin(String(body.identifier ?? ''), String(body.password ?? ''), ip);
    if (user.status !== 'active') return json({ ok: true, state: 'pending' });
    openSession(cookies, request, user.id);
    return json({ ok: true, state: 'ok', next: nextPage(String(body.suite ?? ''), user) });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Connexion impossible. Réessayez ou consultez le journal du panel.' }, 500);
  }
};

export function nextPage(suite: string, user: any): string {
  if (/^\/(?![/\\])[^\\\u0000-\u001f]*$/.test(suite) && !suite.startsWith('/connexion') && suite.length < 300) return suite;
  return firstAllowedPage(user) ?? '/';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
