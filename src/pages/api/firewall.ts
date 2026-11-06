import type { APIRoute } from 'astro';
import * as fw from '../../server/network/firewall';
import { jsonNoStore as json } from '../../server/core/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const rules = await fw.list();
    return json({ rules, deny: fw.denyPosition(rules), dirty: await fw.isDirty() });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Lecture du pare-feu impossible' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400);
  }

  if (body?.op === 'persist') {
    try {
      await fw.persist();
      return json({ ok: true });
    } catch (e: any) {
      return json({ error: e?.message ?? 'Enregistrement impossible' }, 500);
    }
  }

  if (body?.op === 'delete') {
    try {
      await fw.remove(Number(body.num));
      return json({ ok: true, dirty: await fw.isDirty() });
    } catch (e: any) {
      return json({ error: e?.message ?? 'Suppression impossible' }, 400);
    }
  }

  try {
    const res = await fw.addAllow({
      protocol: body?.protocol,
      port: String(body?.port ?? '').trim(),
      source: body?.source ?? null,
      comment: body?.comment ?? null,
    });
    return json({ ok: true, ...res, dirty: await fw.isDirty() });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Ajout impossible' }, 400);
  }
};
