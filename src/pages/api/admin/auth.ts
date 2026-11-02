import type { APIRoute } from 'astro';
import * as a from '../../../server/auth/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, url }) => {
  if (locals.user?.role !== 'admin') return json({ error: 'Réservé aux administrateurs' }, 403);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400);
  }
  const id = String(body.id ?? '');
  const actor = locals.user.id === 'open' ? null : locals.user.id;
  try {
    switch (body.action) {
      case 'saveUser': return json({ ok: true, user: a.adminSaveUser(body) });
      case 'createLocal': return json({ ok: true, ...a.adminCreateLocal(body) });
      case 'setPassword': return json({ ok: true, ...a.adminSetPassword(id, body.password as string | undefined) });
      case 'delete': a.adminDelete(id, actor); return json({ ok: true });
      case 'revoke': a.adminRevoke(id); return json({ ok: true });
      case 'linkLinux': return json({ ok: true, user: a.adminLinkLinux(id, body.linuxUser, body.create === true) });
      case 'unlinkLinux': return json({ ok: true, user: a.adminUnlinkLinux(id) });
      case 'saveGoogle': a.adminSaveGoogle(body.clientId, body.clientSecret); return json({ ok: true });
      case 'testGoogle': return json(await a.adminTestGoogle(url.origin));
      case 'setEnabled': a.adminSetEnabled(body.enabled === true); return json({ ok: true });
      default: return json({ error: 'Action inconnue' }, 400);
    }
  } catch (e) {
    if (e instanceof a.AuthError) return json({ error: e.message }, e.status);
    return json({ error: 'L’opération a échoué. Consultez le journal du panel.' }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
