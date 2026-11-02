import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ctxFor, next } from './ctx';

beforeAll(() => writeFileSync(join(process.env.PANEL_DATA_DIR!, 'auth.json'), JSON.stringify({ enabled: true })));
const run = async (raw: string, pattern: string) => {
  const { onRequest } = await import('../../src/middleware');
  return (onRequest as any)(ctxFor(raw, pattern), next) as Promise<Response>;
};

describe('middleware : contrôle d’accès sur le chemin décodé, comme le routeur', () => {
  it.each(['/%63onnexion', '//connexion'])('%s est la page de connexion, publique', async (raw) => {
    expect((await run(raw, '/connexion')).status).toBe(200);
  });

  it.each([
    ['/_astro/%252e%252e/fichiers', '/404'],
    ['/icons/%252e%252e/acces', '/404'],
  ])('%s demande une connexion', async (raw, pattern) => {
    const res = await run(raw, pattern);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/^\/connexion\?suite=/);
  });

  it('API protégée derrière un préfixe public encodé → 401', async () => {
    expect((await run('/api/auth/%252e%252e/files/list', '/404')).status).toBe(401);
  });
});
