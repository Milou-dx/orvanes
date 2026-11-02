import type { APIRoute } from 'astro';
import * as services from '../../server/system/services.js';

export const prerender = false;

const ALLOWED_ACTIONS = new Set(['start', 'stop', 'restart']);

export const POST: APIRoute = async ({ request }) => {
  let unit = '', action = '';
  try {
    const body = await request.json();
    unit = String(body?.unit ?? '').replace(/\.service$/, '');
    action = String(body?.action ?? '');
  } catch {
    return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400);
  }

  if (!unit) return json({ error: 'Unité manquante' }, 400);
  if (!ALLOWED_ACTIONS.has(action)) return json({ error: 'Action non autorisée' }, 400);

  const prot = services.protectedUnits().find((p) => p.unit === unit);
  if (prot) {
    return json({ error: prot.reason || `L’unité « ${unit} » est protégée : l’arrêter couperait l’accès à la machine ou au panel.` }, 403);
  }

  try {
    await services.runServiceAction(unit, action);
    return json({ ok: true, unit, action });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Échec de l’action' }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
