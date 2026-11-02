import { describe, expect, it } from 'vitest';
import { resolvePath, safeBasename } from '../../src/server/files/files.js';
import { allowError } from '../../src/server/network/firewall-check';

describe('noms saisis dans Fichiers', () => {
  it('refuse un nom à plusieurs segments au lieu de le tronquer', () => {
    expect(safeBasename('x/y')).toBeNull();
    expect(safeBasename('..')).toBeNull();
    expect(safeBasename('  rapport.txt ')).toBe('rapport.txt');
  });
  it('refuse un chemin avec octet nul', () => {
    expect(() => resolvePath('/tmp/\0')).toThrow('Chemin invalide');
  });
});

describe('règle de pare-feu', () => {
  it.each([
    ['', null, 'Indiquez'],
    ['abc', null, 'Port invalide'],
    ['70000', null, 'hors plage'],
    ['8080', '1.2.3', 'Source invalide'],
  ])('%s depuis %s : refusée', (port, source, msg) => {
    expect(allowError('tcp', port, source)).toContain(msg);
  });
  it('accepte une plage et un réseau', () => {
    expect(allowError('udp', '8000:8100', '10.0.0.0/24')).toBeNull();
  });
});
