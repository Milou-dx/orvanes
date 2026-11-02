import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { FAVICONS as LOGOS } from '../components/ui/icons';

export const prerender = false;

export const GET: APIRoute = async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${LOGOS.panel}</svg>`;
  const png = await sharp(Buffer.from(svg), { density: 600 }).resize(48, 48).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { 'content-type': 'image/png', 'cache-control': 'no-cache' },
  });
};
