import type { APIRoute } from 'astro';
import * as files from '../../../server/files/files.js';

export const prerender = false;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ url }) => {
  const asked = url.searchParams.get('path') ?? '/';

  let cwd: string;
  try {
    cwd = files.resolvePath(asked);
  } catch (e: any) {
    return json({ error: e?.message ?? 'Chemin invalide' }, 400);
  }

  try {
    const entries = await files.listDir(cwd);
    const dirs = entries.filter((e: any) => e.isDir).sort((a: any, b: any) => a.name.localeCompare(b.name, 'fr'));
    const regular = entries.filter((e: any) => !e.isDir).sort((a: any, b: any) => a.name.localeCompare(b.name, 'fr'));
    const parent = cwd !== '/' ? cwd.split('/').slice(0, -1).join('/') || '/' : null;
    return json({ cwd, parent, dirs, files: regular });
  } catch (e: any) {
    const code = e?.code === 'EACCES' ? 403 : e?.code === 'ENOENT' ? 404 : 500;
    const msg =
      code === 403 ? 'Accès refusé à ce dossier.'
      : code === 404 ? 'Dossier introuvable.'
      : e?.message ?? 'Lecture impossible';
    return json({ error: msg }, code);
  }
};
