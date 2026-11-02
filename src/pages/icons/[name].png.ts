import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { FAVICONS as LOGOS } from '../../components/ui/icons';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const logo = LOGOS[params.name ?? ''];
  if (!logo) return new Response('Not found', { status: 404 });
  const size = Math.min(512, Math.max(16, Number(url.searchParams.get('size')) || 32));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${logo}</svg>`;
  let img = sharp(Buffer.from(svg), { density: 600 }).resize(size, size);
  if (url.searchParams.get('bg') === 'white') img = img.flatten({ background: '#ffffff' });
  const png = await img.png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { 'content-type': 'image/png', 'cache-control': 'no-cache' },
  });
};
