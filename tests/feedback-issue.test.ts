import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PANEL_DATA_DIR = mkdtempSync(join(tmpdir(), 'fb-'));
const { POST } = await import('../src/pages/api/feedback');
const call = (b: object) => POST({ request: new Request('http://x', { method: 'POST', body: JSON.stringify(b) }), locals: { user: { email: 'a@b.c' } } } as any);

afterEach(() => { vi.unstubAllGlobals(); delete process.env.ORVANE_GITHUB_TOKEN; delete process.env.ORVANE_GITHUB_REPO; });

describe('feedback -> issue GitHub', () => {
  it('ouvre une issue pour un bug quand le token est configuré', async () => {
    process.env.ORVANE_GITHUB_TOKEN = 't'; process.env.ORVANE_GITHUB_REPO = 'o/r';
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify({ html_url: 'https://github.com/o/r/issues/1' }), { status: 201 }));
    vi.stubGlobal('fetch', f);
    const res = await (await call({ kind: 'bug', text: 'Bouton cassé', page: '/aide' })).json();
    expect(res.issue).toBe('https://github.com/o/r/issues/1');
    expect(f.mock.calls[0][0]).toBe('https://api.github.com/repos/o/r/issues');
  });
  it('ne contacte pas GitHub pour une idée ni sans config, et survit à un échec', async () => {
    const f = vi.fn(async () => new Response('', { status: 500 }));
    vi.stubGlobal('fetch', f);
    expect((await (await call({ kind: 'bug', text: 'x' })).json()).issue).toBeNull();
    process.env.ORVANE_GITHUB_TOKEN = 't'; process.env.ORVANE_GITHUB_REPO = 'o/r';
    expect((await (await call({ kind: 'idee', text: 'x' })).json()).issue).toBeNull();
    expect(f).not.toHaveBeenCalled();
    const r = await (await call({ kind: 'bug', text: 'x' })).json();
    expect(r).toEqual({ ok: true, issue: null });
  });
});
