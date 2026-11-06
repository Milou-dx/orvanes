import type { APIRoute } from 'astro';
import * as files from '../../../server/files/files.js';
import { forEachPath, stringPaths } from '../../../server/files/bulk';
import { json } from '../../../server/core/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400); }

  const paths = stringPaths(body?.paths);
  if (!paths.length) return json({ error: 'Aucun élément à supprimer' }, 400);

  const { done, errors, status } = await forEachPath(paths, (p) => files.deleteEntry(p), (e) =>
    e?.code === 'EACCES' ? 'droits insuffisants pour supprimer' : e?.message ?? 'échec');
  return json({ deleted: done, errors }, status);
};
