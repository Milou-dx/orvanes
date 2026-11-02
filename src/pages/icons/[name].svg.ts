import type { APIRoute } from 'astro';
import { FAVICONS as LOGOS } from '../../components/ui/icons';

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const logo = LOGOS[params.name ?? ''];
  if (!logo) return new Response('Not found', { status: 404 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${logo}</svg>`;
  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-cache' },
  });
};
