import type { APIRoute } from 'astro';
import { AuthError, totpConfirm, totpDisable, totpStart } from '../../../server/auth/auth';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user || user.id === 'open') return json({ error: 'Connexion requise.' }, 401);
  let b: { action?: unknown; code?: unknown };
  try { b = (await request.json()) ?? {}; } catch { return json({ error: 'JSON attendu.' }, 400); }
  try {
    switch (b.action) {
      case 'start': return json({ ok: true, ...totpStart(user.id) });
      case 'confirm': totpConfirm(user.id, String(b.code ?? '')); return json({ ok: true });
      case 'disable': totpDisable(user.id, String(b.code ?? '')); return json({ ok: true });
      default: return json({ error: 'Action inconnue.' }, 400);
    }
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'Opération impossible.' }, 500);
  }
};
