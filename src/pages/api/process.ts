import type { APIRoute } from 'astro';
import * as processes from '../../server/system/processes.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let pid = NaN;
  let signal: string = 'SIGTERM';
  try {
    const body = await request.json();
    pid = Number(body?.pid);
    if (body?.signal === 'SIGKILL') signal = 'SIGKILL';
  } catch {
    return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400);
  }
  if (!Number.isInteger(pid) || pid <= 0) return json({ error: 'PID invalide' }, 400);

  if (pid === 1) return json({ error: 'Le processus init ne peut pas être tué.' }, 403);
  if (pid === process.pid) return json({ error: 'C’est le panel lui-même.' }, 403);

  try {
    await processes.killProcess(pid, signal);
    return json({ ok: true, pid });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Échec' }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
