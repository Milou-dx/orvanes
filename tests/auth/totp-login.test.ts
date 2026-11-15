import { describe, expect, it } from 'vitest';
import * as core from '../../src/server/auth/auth-core.js';
import { passwordLogin } from '../../src/server/auth/auth';
import { codeAt, newSecret } from '../../src/server/auth/totp.js';

describe('connexion avec double authentification', () => {
  const secret = newSecret();
  core.saveUsers([...core.listUsers(), core.newUser({ email: 'totp@test', name: 'T', role: 'admin', password: core.hashPassword('motdepasse-1'), totp: { secret, lastStep: -1 } })]);
  const code = codeAt(secret, Math.floor(Date.now() / 30_000));

  it('sans code : pas de session, code demandé', () => {
    expect(passwordLogin('totp@test', 'motdepasse-1', 'a')).toEqual({ user: null, totpRequired: true });
  });
  it('mauvais mot de passe : le code n’est jamais demandé', () => {
    expect(() => passwordLogin('totp@test', 'faux', 'b')).toThrow(/incorrect/);
  });
  it('accepte le code une fois, refuse son rejeu', () => {
    expect(passwordLogin('totp@test', 'motdepasse-1', 'c', code).user?.email).toBe('totp@test');
    expect(() => passwordLogin('totp@test', 'motdepasse-1', 'c', code)).toThrow(/Code de vérification/);
  });
  it('le bon mot de passe sans code compte comme un essai : la 6e demande est refusée', () => {
    for (let i = 0; i < 5; i++) passwordLogin('totp@test', 'motdepasse-1', 'd');
    expect(() => passwordLogin('totp@test', 'motdepasse-1', 'd')).toThrow(expect.objectContaining({ status: 429 }));
  });
  it('changer d’adresse ne permet pas de confirmer le mot de passe sans code : la 21e demande est refusée', () => {
    core.saveUsers([...core.listUsers(), core.newUser({ email: 'totp2@test', name: 'T', role: 'admin', password: core.hashPassword('motdepasse-2'), totp: { secret: newSecret(), lastStep: -1 } })]);
    for (let i = 0; i < 20; i++) passwordLogin('totp2@test', 'motdepasse-2', `ip-${i}`);
    expect(() => passwordLogin('totp2@test', 'motdepasse-2', 'ip-20')).toThrow(expect.objectContaining({ status: 429 }));
  });
});
