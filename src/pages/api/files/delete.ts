import type { APIRoute } from 'astro';
import * as files from '../../../server/files/files.js';

export const prerender = false;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400); }

  const paths: string[] = Array.isArray(body?.paths) ? body.paths.filter((p: any) => typeof p === 'string') : [];
  if (!paths.length) return json({ error: 'Aucun élément à supprimer' }, 400);

  const deleted: string[] = [];
  const errors: string[] = [];
  for (const p of paths) {
    try {
      await files.deleteEntry(p);
      deleted.push(p);
    } catch (e: any) {
      const name = p.split('/').pop() || p;
      errors.push(`${name} : ${e?.code === 'EACCES' ? 'suppression refusée' : (e?.message ?? 'échec')}`);
    }
  }
  return json({ deleted, errors }, errors.length && !deleted.length ? 400 : 200);
};
