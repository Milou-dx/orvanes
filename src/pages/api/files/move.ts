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
  if (!paths.length) return json({ error: 'Aucun élément à déplacer' }, 400);
  if (!destDir) return json({ error: 'Destination manquante' }, 400);

  const { done, errors, status } = await forEachPath(paths, (p) => files.moveEntry(p, destDir), (e) =>
    e?.code === 'EEXIST' ? 'existe déjà à destination' : e?.code === 'EACCES' ? 'droits insuffisants pour déplacer' : e?.message ?? 'échec');
  return json({ moved: done, errors }, status);
};
