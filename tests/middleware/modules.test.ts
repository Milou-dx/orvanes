import { describe, expect, it } from 'vitest';
import { onRequest } from '../../src/middleware';
import { ctxFor, next } from './ctx';

const run = (raw: string, pattern: string) => (onRequest as any)(ctxFor(raw, pattern), next) as Promise<Response>;

describe('middleware : module non installé', () => {
  it.each([
    ['/claude', '/claude'],
    ['/%63laude', '/claude'],
    ['//github', '/github'],
    ['/github/', '/github'],
  ])('%s → page 404', async (raw, pattern) => {
    expect((await run(raw, pattern)).status).toBe(404);
  });

  it.each([
    ['/api/%61gent/conversations', '/api/agent/conversations'],
    ['//api//agent/conversations', '/api/agent/conversations'],
    ['/api/agent/conversations/%2561bc', '/api/agent/conversations/[id]'],
  ])('%s → 404 JSON', async (raw, pattern) => {
    const res = await run(raw, pattern);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Module non installé : Claude' });
  });

  it('une page du cœur passe', async () => {
    expect((await run('/parametres', '/parametres')).status).toBe(200);
  });
});
