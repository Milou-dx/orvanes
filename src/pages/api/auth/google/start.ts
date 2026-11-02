import type { APIRoute } from 'astro';
import { GOOGLE_COOKIE, googleBegin } from '../../../../server/auth/auth';
import { recordFailure, throttled } from '../../../../server/auth/auth-core.js';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
  const key = `gs:${request.headers.get('x-forwarded-for') ?? ''}`;
  if (throttled(key)) return redirect('/connexion?erreur=trop');
  recordFailure(key);
  try {
    const { target, flow } = googleBegin(url.origin, url.searchParams.get('suite') ?? '');
    cookies.set(GOOGLE_COOKIE, Buffer.from(JSON.stringify(flow)).toString('base64url'), {
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      path: '/api/auth/google',
      maxAge: 600,
    });
    return redirect(target);
  } catch {
    return redirect('/connexion?erreur=google');
  }
};
