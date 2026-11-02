import type { APIRoute } from 'astro';
import { PENDING_COOKIE, closeSession } from '../../../server/auth/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  closeSession(cookies);
  cookies.delete(PENDING_COOKIE, { path: '/connexion' });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
