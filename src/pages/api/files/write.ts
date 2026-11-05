import type { APIRoute } from 'astro';
import { stat, writeFile } from 'node:fs/promises';
import * as files from '../../../server/files/files.js';

export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// Enregistre un fichier texte ouvert dans Coup d'œil. Réservé aux admins par le middleware (écriture sur /api/files/*).
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return json({ error: 'Modification des fichiers réservée aux administrateurs' }, 403);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400); }
  if (typeof body?.content !== 'string') return json({ error: 'Contenu manquant' }, 400);
  if (Buffer.byteLength(body.content) > MAX_BYTES) return json({ error: 'Fichier trop gros pour l’éditeur (5 Mo au plus).' }, 413);

  let target: string;
  try {
    target = files.resolvePath(String(body?.path ?? ''));
  } catch (e: any) {
    return json({ error: e?.message ?? 'Chemin invalide' }, 400);
  }

  try {
    const before = await stat(target);
    if (!before.isFile()) return json({ error: 'Vous ne pouvez modifier qu’un fichier, pas un dossier.' }, 400);
    // Quelqu'un (ou un service) a écrit le fichier depuis son ouverture : ne pas écraser sans accord.
    if (body.mtime && !body.force && before.mtime.toISOString() !== body.mtime) {
      return json({ error: 'Quelqu’un a modifié ce fichier depuis que vous l’avez ouvert.', conflict: true }, 409);
    }
    // Écriture en place : garde le propriétaire, les droits et les liens du fichier.
    await writeFile(target, body.content, 'utf8');
    const after = await stat(target);
    return json({ ok: true, size: after.size, mtime: after.mtime.toISOString() });
  } catch (e: any) {
    const code = e?.code === 'EACCES' || e?.code === 'EPERM' ? 403 : e?.code === 'ENOENT' ? 404 : 500;
    const msg = code === 403 ? 'Écriture refusée sur ce fichier.' : code === 404 ? 'Fichier introuvable.' : e?.message ?? 'Enregistrement impossible';
    return json({ error: msg }, code);
  }
};
