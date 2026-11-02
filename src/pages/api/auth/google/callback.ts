import type { APIRoute } from 'astro';
import { GOOGLE_COOKIE, PENDING_COOKIE, type GoogleFlow, googleFinish, googleLogin, openSession } from '../../../../server/auth/auth';
import { recordSuccess } from '../../../../server/auth/auth-core.js';
import { nextPage } from '../login';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
  const raw = cookies.get(GOOGLE_COOKIE)?.value;
  cookies.delete(GOOGLE_COOKIE, { path: '/api/auth/google' });
  let flow: GoogleFlow;
  try {
    flow = JSON.parse(Buffer.from(raw ?? '', 'base64url').toString('utf8'));
  } catch {
    return redirect('/connexion?erreur=google');
  }
  if (url.searchParams.get('error')) return redirect('/connexion?erreur=refus');
  try {
    const profile = await googleFinish(flow, url.searchParams.get('state') ?? '', url.searchParams.get('code') ?? '');
    const { user, outcome } = googleLogin(profile);
    if (outcome === 'blocked') return redirect('/connexion?erreur=bloque');
    if (outcome === 'pending') {
      cookies.set(PENDING_COOKIE, Buffer.from(JSON.stringify({ name: profile.name, email: profile.email, picture: profile.picture })).toString('base64url'), {
        httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', path: '/connexion', maxAge: 900,
      });
      return redirect('/connexion?etat=attente');
    }
    recordSuccess(`gs:${request.headers.get('x-forwarded-for') ?? ''}`);
    openSession(cookies, request, user.id);
    return redirect(nextPage(String(flow.suite ?? ''), user));
  } catch {
    return redirect('/connexion?erreur=google');
  }
};
