import type { APIRoute } from 'astro';
import * as proc from '../../../server/system/processes.js';
import { safe } from '../../../server/core/safe';

export const prerender = false;

export const GET: APIRoute = async () => {
  const processes = await safe(() => proc.listProcesses(), [] as any[]);
  return new Response(JSON.stringify({ processes }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
