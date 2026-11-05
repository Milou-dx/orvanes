import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POST as write } from '../../src/pages/api/files/write';
import { GET as download } from '../../src/pages/api/files/download';

const dir = mkdtempSync(path.join(tmpdir(), 'fx-'));
const file = path.join(dir, 'a.txt');
const admin = { user: { role: 'admin' } };
const call = (body: unknown, locals: any = admin) =>
  (write as any)({ request: new Request('http://t/api/files/write', { method: 'POST', body: JSON.stringify(body) }), locals }) as Promise<Response>;

describe('POST /api/files/write', () => {
  it('enregistre et renvoie le nouveau mtime', async () => {
    writeFileSync(file, 'avant');
    const res = await call({ path: file, content: 'après', mtime: statSync(file).mtime.toISOString() });
    expect(res.status).toBe(200);
    expect(readFileSync(file, 'utf8')).toBe('après');
  });

  it('refuse d’écraser un fichier modifié ailleurs, sauf force', async () => {
    writeFileSync(file, 'v1');
    const res = await call({ path: file, content: 'mien', mtime: '2000-01-01T00:00:00.000Z' });
    expect(res.status).toBe(409);
    expect(readFileSync(file, 'utf8')).toBe('v1');
    expect((await call({ path: file, content: 'mien', mtime: '2000-01-01T00:00:00.000Z', force: true })).status).toBe(200);
    expect(readFileSync(file, 'utf8')).toBe('mien');
  });

  it('refuse un non-admin et un dossier', async () => {
    expect((await call({ path: file, content: 'x' }, { user: { role: 'user' } })).status).toBe(403);
    expect((await call({ path: dir, content: 'x' })).status).toBe(400);
    expect(readFileSync(file, 'utf8')).toBe('mien');
  });
});

describe('GET /api/files/download', () => {
  const get = (q: string, headers: Record<string, string> = {}) =>
    (download as any)({ url: new URL(`http://t/api/files/download?${q}`), request: new Request('http://t/', { headers }) }) as Promise<Response>;

  it('sert une plage d’octets (vidéo, aperçu hexadécimal)', async () => {
    writeFileSync(file, '0123456789');
    const res = await get(`path=${encodeURIComponent(file)}&inline=1`, { range: 'bytes=2-4' });
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 2-4/10');
    expect(await res.text()).toBe('234');
    expect((await get(`path=${encodeURIComponent(file)}`, { range: 'bytes=50-' })).status).toBe(416);
  });

  it('en ligne : type sûr seulement, jamais de HTML rendu', async () => {
    const html = path.join(dir, 'x.html');
    writeFileSync(html, '<script>alert(1)</script>');
    const res = await get(`path=${encodeURIComponent(html)}&inline=1`);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
    const svg = path.join(dir, 'x.svg');
    writeFileSync(svg, '<svg/>');
    expect((await get(`path=${encodeURIComponent(svg)}&inline=1`)).headers.get('content-type')).toBe('image/svg+xml');
  });
});
