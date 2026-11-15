import { describe, expect, it } from 'vitest';
import * as core from '../../src/server/auth/auth-core.js';
import { AuthError, passwordLogin } from '../../src/server/auth/auth';
import { clientIp } from '../../src/server/core/client-ip.js';

// Même chaîne que serve.mjs puis /api/auth/login : clientIp() fixe l'IP, passwordLogin() la compte.
function status(identifier: string, password: string, forwarded: string, trusted: string[]) {
  try {
    passwordLogin(identifier, password, clientIp('127.0.0.1', forwarded, trusted));
    return 200;
  } catch (err) {
    return (err as AuthError).status;
  }
}
const spray = (identifier: string, trusted: string[]) =>
  Array.from({ length: 25 }, (_, i) => status(identifier, 'faux', `10.0.0.${i + 1}`, trusted));

describe('blocage des essais de connexion', () => {
  core.saveUsers([...core.listUsers(), core.newUser({ email: 'vrai@test', name: 'V', role: 'admin', password: core.hashPassword('motdepasse-1') })]);

  it('X-Forwarded-For changeant depuis la machine, sans proxy déclaré : bloqué', () => {
    expect(spray('ghost', [])).toContain(429);
  });
  it('proxy déclaré, une IP nouvelle à chaque essai : bloqué au plus tard au 21e', () => {
    expect(spray('ghost-2', ['127.0.0.1']).slice(0, 21)).toContain(429);
  });
  it('un autre client bloqué par IP n’empêche pas le vrai utilisateur', () => {
    const attacker = Array.from({ length: 6 }, () => status('vrai@test', 'faux', '203.0.113.9', ['127.0.0.1']));
    expect(attacker.at(-1)).toBe(429);
    expect(status('vrai@test', 'motdepasse-1', '198.51.100.7', ['127.0.0.1'])).toBe(200);
  });
});
