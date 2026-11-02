import type { APIRoute } from 'astro';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import * as files from '../../../server/files/files.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const asked = url.searchParams.get('path');
  if (!asked) return new Response('Paramètre path manquant', { status: 400 });

  let target: string;
  try {
    target = files.resolvePath(asked);
  } catch (e: any) {
    return new Response(e?.message ?? 'Chemin invalide', { status: 400 });
  }

  try {
    const st = await stat(target);
    if (st.isDirectory()) return new Response('C’est un dossier, pas un fichier.', { status: 400 });

    const name = path.basename(target);
    return new Response(Readable.toWeb(createReadStream(target)) as any, {
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(st.size),
        'content-disposition': `attachment; filename="${encodeURIComponent(name)}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (e: any) {
    const code = e?.code === 'EACCES' ? 403 : e?.code === 'ENOENT' ? 404 : 500;
    return new Response(
      code === 403 ? 'Lecture refusée.' : code === 404 ? 'Fichier introuvable.' : 'Échec de la lecture.',
      { status: code },
    );
  }
};
