import type { APIRoute } from 'astro';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import * as files from '../../../server/files/files.js';

export const prerender = false;

// Types affichés tels quels par Coup d'œil. Tout le reste part en octet-stream : jamais de HTML rendu sur l'origine du panel.
const INLINE_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  pdf: 'application/pdf',
};

export const GET: APIRoute = async ({ url, request }) => {
  const asked = url.searchParams.get('path');
  if (!asked) return new Response('Paramètre path manquant', { status: 400 });
  const inline = url.searchParams.get('inline') === '1';

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
    const type = (inline && INLINE_MIME[path.extname(name).slice(1).toLowerCase()]) || 'application/octet-stream';
    const headers: Record<string, string> = {
      'content-type': type,
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'no-store',
      'accept-ranges': 'bytes',
      'x-content-type-options': 'nosniff',
    };
    // Un SVG ouvert directement reste inerte (aucun script) ; le lecteur PDF de Chrome refuse le mode sandbox.
    if (type !== 'application/pdf') headers['content-security-policy'] = "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; media-src 'self'";

    // Requêtes partielles : Safari ne lit une vidéo qu'avec elles, et l'aperçu hexadécimal ne lit que le début.
    const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
    if (m && (m[1] || m[2])) {
      const start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (start > end || start >= st.size) {
        return new Response(null, { status: 416, headers: { 'content-range': `bytes */${st.size}` } });
      }
      return new Response(Readable.toWeb(createReadStream(target, { start, end })) as any, {
        status: 206,
        headers: { ...headers, 'content-length': String(end - start + 1), 'content-range': `bytes ${start}-${end}/${st.size}` },
      });
    }

    return new Response(Readable.toWeb(createReadStream(target)) as any, {
      headers: { ...headers, 'content-length': String(st.size) },
    });
  } catch (e: any) {
    const code = e?.code === 'EACCES' ? 403 : e?.code === 'ENOENT' ? 404 : 500;
    return new Response(
      code === 403 ? 'Lecture refusée.' : code === 404 ? 'Fichier introuvable.' : 'Échec de la lecture.',
      { status: code },
    );
  }
};
