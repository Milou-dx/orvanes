import { afterEach, describe, expect, it } from 'vitest';
import { clientIp } from '../../src/server/core/client-ip.js';

describe('clientIp', () => {
  afterEach(() => { delete process.env.PANEL_TRUSTED_PROXIES; });

  it('ignore X-Forwarded-For venant d’un client direct', () => {
    expect(clientIp('203.0.113.9', '9.9.9.9', [])).toBe('203.0.113.9');
    expect(clientIp('::ffff:203.0.113.9', '9.9.9.9', [])).toBe('203.0.113.9');
  });
  it('ignore X-Forwarded-For venant de la machine quand aucun proxy n’est déclaré', () => {
    expect(clientIp('127.0.0.1', '10.0.0.1')).toBe('127.0.0.1');
    expect(clientIp('::1', '10.0.0.1')).toBe('::1');
  });
  it('derrière un proxy déclaré, ne garde que la valeur ajoutée par le proxy', () => {
    process.env.PANEL_TRUSTED_PROXIES = '127.0.0.1';
    expect(clientIp('127.0.0.1', '9.9.9.9, 198.51.100.7')).toBe('198.51.100.7');
    expect(clientIp('100.64.0.1', '9.9.9.9, 198.51.100.7', ['100.64.0.1'])).toBe('198.51.100.7');
  });
  it('sans en-tête, renvoie le pair', () => expect(clientIp('127.0.0.1', undefined, ['127.0.0.1'])).toBe('127.0.0.1'));
});
