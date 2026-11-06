import type { APIRoute } from 'astro';
import path from 'node:path';
import * as files from '../../../server/files/files.js';
import { json } from '../../../server/core/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400); }

  const from = String(body?.path ?? '').trim();
  const name = files.safeBasename(body?.name);
  if (!from) return json({ error: 'Chemin manquant' }, 400);
  if (!name) return json({ error: 'Nom invalide : il ne peut contenir ni « / » ni « \\ », ni valoir « . » ou « .. ».' }, 400);

  try {
    const dir = path.posix.dirname(files.resolvePath(from));
    const to = dir === '/' ? `/${name}` : `${dir}/${name}`;
    await files.renameEntry(from, to);
    return json({ ok: true, name });
  } catch (e: any) {
    const msg =
      e?.code === 'EEXIST' ? 'Un élément de ce nom existe déjà.'
      : e?.code === 'EACCES' ? 'Renommage refusé.'
      : e?.code === 'ENOENT' ? 'Élément introuvable.'
      : e?.message ?? 'Renommage impossible';
    return json({ error: msg }, e?.code === 'EACCES' ? 403 : e?.code === 'ENOENT' ? 404 : 400);
  }
};
