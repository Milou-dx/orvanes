import { describe, expect, it } from 'vitest';
import { codeAt, newSecret, verifyCode } from '../../src/server/auth/totp.js';

// Vecteur RFC 6238 : secret ASCII « 12345678901234567890 », T=59 s, 8 chiffres 94287082, soit 287082 sur 6.
const RFC = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('totp', () => {
  it('respecte le vecteur RFC 6238', () => expect(codeAt(RFC, 1)).toBe('287082'));
  it('accepte le code courant et ±1 pas, refuse le reste', () => {
    const now = 3_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyCode(RFC, codeAt(RFC, step), -1, now)).toBe(step);
    expect(verifyCode(RFC, codeAt(RFC, step - 1), -1, now)).toBe(step - 1);
    expect(verifyCode(RFC, codeAt(RFC, step + 5), -1, now)).toBeNull();
    expect(verifyCode(RFC, 'abc', -1, now)).toBeNull();
  });
  it('refuse le rejeu d’un code déjà utilisé', () => {
    const now = 3_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyCode(RFC, codeAt(RFC, step), step, now)).toBeNull();
  });
  it('génère un secret base32 de 32 caractères', () => expect(newSecret()).toMatch(/^[A-Z2-7]{32}$/));
});
