import { describe, expect, it } from 'vitest';
import { clientIp } from '../../src/server/core/client-ip.js';

describe('clientIp', () => {
  it('ignore X-Forwarded-For venant d’un client direct', () => {
    expect(clientIp('203.0.113.9', '9.9.9.9', [])).toBe('203.0.113.9');
    expect(clientIp('::ffff:203.0.113.9', '9.9.9.9', [])).toBe('203.0.113.9');
  });
  it('derrière un proxy, ne garde que la valeur ajoutée par le proxy', () => {
    expect(clientIp('127.0.0.1', '9.9.9.9, 198.51.100.7', [])).toBe('198.51.100.7');
    expect(clientIp('100.64.0.1', '9.9.9.9, 198.51.100.7', ['100.64.0.1'])).toBe('198.51.100.7');
  });
  it('sans en-tête, renvoie le pair', () => expect(clientIp('127.0.0.1', undefined, [])).toBe('127.0.0.1'));
});
