import { describe, expect, it } from 'vitest';
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
  it('X-Forwarded-For changeant depuis la machine, sans proxy déclaré : bloqué', () => {
    expect(spray('ghost', [])).toContain(429);
  });
});
