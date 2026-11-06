import type { APIRoute } from 'astro';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { jsonNoStore as json } from '../../server/core/http';

export const prerender = false;

const DATA_DIR = process.env.PANEL_DATA_DIR ?? resolve('data');
export const FEEDBACK_FILE = join(DATA_DIR, 'feedback.jsonl');

const clip = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export const POST: APIRoute = async ({ request, locals }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'JSON attendu.' }, 400); }
  const text = clip(body?.text, 2000);
  if (!text) return json({ error: 'Commentaire vide.' }, 400);
  const user = (locals as any).user;
  const kind = ['bug', 'idee', 'autre'].includes(body?.kind) ? body.kind : 'autre';
  const entry = {
    at: new Date().toISOString(), kind,
    user: user?.email || user?.name || null,
    page: clip(body?.page, 200), title: clip(body?.title, 200), selection: clip(body?.selection, 500), text,
  };
  try {
    mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    appendFileSync(FEEDBACK_FILE, JSON.stringify(entry) + '\n', { mode: 0o600 });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Enregistrement impossible' }, 500);
  }
  const issue = entry.kind === 'bug' ? await openIssue(entry) : null;
  // Sans jeton (toute instance autre que la nôtre), proposer à l'utilisateur d'ouvrir l'issue lui-même.
  const report = entry.kind === 'bug' && !process.env.ORVANE_GITHUB_TOKEN
    ? `https://github.com/Milou-dx/orvanes/issues/new?${new URLSearchParams({ title: `Bug : ${entry.text.split('\n')[0].slice(0, 80)}`, body: `${entry.text}\n\nPage : ${entry.page}` })}`
    : null;
  return json({ ok: true, issue, ...(report ? { report } : {}) });
};

/** Ouvre une issue GitHub pour un bug si ORVANE_GITHUB_TOKEN et ORVANE_GITHUB_REPO (owner/repo) sont définis. */
async function openIssue(e: { text: string; page: string; title: string; selection: string; user: string | null; at: string }) {
  const token = process.env.ORVANE_GITHUB_TOKEN, repo = process.env.ORVANE_GITHUB_REPO;
  if (!token || !repo) return null;
  const body = [e.text, '', `Page : ${e.page || '?'}${e.title ? ` (${e.title})` : ''}`,
    e.selection ? `Sélection : ${e.selection}` : '', `Signalé par : ${e.user ?? 'inconnu'}, ${e.at}`].filter(Boolean).join('\n');
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'user-agent': 'orvane' },
      body: JSON.stringify({ title: `Bug : ${e.text.split('\n')[0].slice(0, 80)}`, body, labels: ['bug'] }),
      signal: AbortSignal.timeout(8000),
    });
    // L'entrée est déjà enregistrée localement : un échec GitHub ne fait pas échouer le signalement.
    return r.ok ? ((await r.json()) as { html_url: string }).html_url : null;
  } catch { return null; }
}
