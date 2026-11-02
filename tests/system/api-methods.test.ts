import { describe, expect, it } from 'vitest';
import { allowedMethods, routeRegex } from '../../src/server/core/api-methods';

describe('routeRegex', () => {
  it('reconnaît routes simples, index et paramètres', () => {
    expect(routeRegex('/src/pages/api/firewall.ts').test('/api/firewall')).toBe(true);
    expect(routeRegex('/modules/tailscale/pages/api/tailscale/index.ts').test('/api/tailscale')).toBe(true);
    expect(routeRegex('/modules/mail/pages/api/mail/messages/[uid].ts').test('/api/mail/messages/12')).toBe(true);
    expect(routeRegex('/modules/mail/pages/api/mail/messages/[uid].ts').test('/api/mail/messages')).toBe(false);
    expect(routeRegex('/modules/tailscale/pages/api/tailscale/v2/[...path].ts').test('/api/tailscale/v2/a/b')).toBe(true);
  });

  it('reconnaît une API de module écrite en .js', () => {
    expect(routeRegex('/modules/demo/pages/api/demo/etat.js').test('/api/demo/etat')).toBe(true);
    expect(routeRegex('/modules/demo/pages/api/demo/index.js').test('/api/demo')).toBe(true);
  });
});

describe('allowedMethods', () => {
  it('liste les méthodes exportées, vide pour une route inconnue', async () => {
    expect(await allowedMethods('/api/github')).toEqual(['POST']);
    expect(await allowedMethods('/api/nope')).toEqual([]);
  });
});
