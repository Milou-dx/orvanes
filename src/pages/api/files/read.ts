import type { APIRoute } from 'astro';
import { stat, open } from 'node:fs/promises';
import * as files from '../../../server/files/files.js';

export const prerender = false;

const MAX_BYTES = 512 * 1024;

function looksBinary(buf: Buffer): boolean {
  const n = Math.min(buf.length, 4096);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

export const GET: APIRoute = async ({ url }) => {
  const asked = url.searchParams.get('path');
  if (!asked) return json({ error: 'Paramètre path manquant' }, 400);

  let target: string;
  try {
    target = files.resolvePath(asked);
  } catch (e: any) {
    return json({ error: e?.message ?? 'Chemin invalide' }, 400);
  }

  try {
    const st = await stat(target);
    if (st.isDirectory()) return json({ isDir: true, path: target });

    const truncated = st.size > MAX_BYTES;
    const from = truncated ? st.size - MAX_BYTES : 0;
    const len = Math.min(st.size, MAX_BYTES);

    const fh = await open(target, 'r');
    let buf: Buffer;
    try {
      if (st.size === 0) {
        const chunk = Buffer.alloc(MAX_BYTES);
        let n = 0;
        for (;;) {
          const { bytesRead } = await fh.read(chunk, n, MAX_BYTES - n, null);
          if (bytesRead === 0 || (n += bytesRead) >= MAX_BYTES) break;
        }
        buf = chunk.subarray(0, n);
      } else {
        buf = Buffer.alloc(len);
        await fh.read(buf, 0, len, from);
      }
    } finally {
      await fh.close();
    }

    if (looksBinary(buf)) {
      return json({ binary: true, size: st.size, path: target });
    }

    return json({
      path: target,
      size: st.size,
      truncated,
      content: buf.toString('utf8'),
    });
  } catch (e: any) {
    const code = e?.code === 'EACCES' ? 403 : e?.code === 'ENOENT' ? 404 : 500;
    const msg =
      code === 403 ? 'Le panel n’a pas les droits de lecture sur ce fichier.'
      : code === 404 ? 'Fichier introuvable.'
      : e?.message ?? 'Lecture impossible';
    return json({ error: msg }, code);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
