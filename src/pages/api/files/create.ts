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

  const dir = String(body?.dir ?? '').trim();
  const type = body?.type === 'directory' ? 'directory' : body?.type === 'file' ? 'file' : null;
  const name = files.safeBasename(body?.name);

  if (!dir) return json({ error: 'Dossier manquant' }, 400);
  if (!type) return json({ error: 'Type invalide' }, 400);
  if (!name) return json({ error: 'Nom invalide : il ne peut contenir ni « / » ni « \\ », ni valoir « . » ou « .. ».' }, 400);

  try {
    const target = dir === '/' ? `/${name}` : `${dir}/${name}`;
    await files.createEntry(target, type);
    return json({ ok: true, name });
  } catch (e: any) {
    const msg =
      e?.code === 'EEXIST' ? 'Un élément de ce nom existe déjà.'
      : e?.code === 'EACCES' ? 'Écriture refusée à cet endroit.'
      : e?.message ?? 'Création impossible';
    return json({ error: msg }, e?.code === 'EACCES' ? 403 : 400);
  }
};
