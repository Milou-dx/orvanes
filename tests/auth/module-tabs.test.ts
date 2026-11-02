import { describe, expect, it } from 'vitest';
import * as core from '../../src/server/auth/auth-core.js';
import { adminSaveUser } from '../../src/server/auth/auth';

describe('droits sur un module désinstallé', () => {
  const user = core.newUser({ email: 'lea@test', tabs: ['processus', 'projets'] });
  core.saveUsers([user]);
  const stored = () => [...core.findUserById(user.id).tabs].sort();

  it('ne donnent rien tant que le module est désinstallé', () => {
    expect(core.allowedTabs(core.findUserById(user.id))).toEqual(['processus']);
  });

  it('sont conservés quand l’administrateur modifie le compte (la page ne les montre pas)', () => {
    adminSaveUser({ id: user.id, tabs: ['performance'] });
    expect(stored()).toEqual(['performance', 'projets']);
  });

  it('un onglet de module connu peut être attribué ; inconnu ou réservé, il est ignoré', () => {
    adminSaveUser({ id: user.id, tabs: ['projets', 'terminal', 'inconnu'] });
    expect(stored()).toEqual(['projets']);
  });
});
