import type { APIRoute } from 'astro';
import * as files from '../../../server/files/files.js';
import { forEachPath, stringPaths } from '../../../server/files/bulk';
import { json } from '../../../server/core/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400); }

  const paths = stringPaths(body?.paths);
  const destDir = String(body?.destDir ?? '').trim();
  if (!paths.length) return json({ error: 'Aucun élément à copier' }, 400);
  if (!destDir) return json({ error: 'Destination manquante' }, 400);

  const { done, errors, status } = await forEachPath(paths, (p) => files.copyEntry(p, destDir), (e) =>
    e?.code === 'EEXIST' ? 'existe déjà à destination' : e?.code === 'EACCES' ? 'droits insuffisants pour copier' : e?.message ?? 'échec');
  return json({ copied: done, errors }, status);
};
