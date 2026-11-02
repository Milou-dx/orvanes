import type { APIRoute } from 'astro';
import { writeFile, stat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import * as files from '../../../server/files/files.js';

export const prerender = false;

const MAX_BYTES = 512 * 1024 * 1024;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Formulaire invalide : envoi multipart attendu.' }, 400);
  }

  const dest = String(form.get('path') ?? '').trim();
  if (!dest) return json({ error: 'Dossier de destination manquant' }, 400);

  let dir: string;
  try {
    dir = files.resolvePath(dest);
  } catch (e: any) {
    return json({ error: e?.message ?? 'Chemin invalide' }, 400);
  }

  try {
    const st = await stat(dir);
    if (!st.isDirectory()) return json({ error: 'La destination n’est pas un dossier.' }, 400);
    await access(dir, constants.W_OK);
  } catch (e: any) {
    return json({
      error: e?.code === 'EACCES'
        ? 'Écriture refusée : le panel n’a pas les droits sur ce dossier.'
        : 'Dossier de destination introuvable.',
    }, e?.code === 'EACCES' ? 403 : 404);
  }

  const uploaded = form.getAll('file').filter((f): f is File => f instanceof File);
  if (!uploaded.length) return json({ error: 'Aucun fichier reçu' }, 400);

  const written: string[] = [];
  const errors: string[] = [];

  for (const f of uploaded) {
    const name = files.safeBasename(f.name);
    if (!name) { errors.push(`${f.name} : nom de fichier refusé`); continue; }
    if (f.size > MAX_BYTES) {
      errors.push(`${name} : ${Math.round(f.size / 1048576)} Mo dépasse la limite de 512 Mo`);
      continue;
    }

    const target = path.join(dir, name);
    try {
      await access(target, constants.F_OK);
      errors.push(`${name} : un fichier de ce nom existe déjà`);
      continue;
    } catch {}

    try {
      await writeFile(target, Buffer.from(await f.arrayBuffer()), { flag: 'wx' });
      written.push(name);
    } catch (e: any) {
      errors.push(`${name} : ${e?.code === 'EACCES' ? 'écriture refusée' : (e?.message ?? 'échec')}`);
    }
  }

  return json({ written, errors }, errors.length && !written.length ? 400 : 200);
};
