import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { logoFile } from '../../../server/modules/registry.js';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const file = params.id && params.file ? logoFile(params.id, params.file) : null;
  const body = file ? await readFile(file).catch(() => null) : null;
  if (!body) return new Response('Introuvable', { status: 404 });
  return new Response(body, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=3600',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
};
