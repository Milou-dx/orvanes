import { describe, expect, it } from 'vitest';
import { allowedTabs, assignableTabs, tabs } from '../../src/server/auth/auth-core.js';

describe('onglets réservés aux administrateurs', () => {
  it.each(['terminal', 'fichiers', 'services', 'modules', 'acces'])('%s est adminOnly et non attribuable', (id) => {
    expect(tabs().find((t) => t.id === id)?.adminOnly).toBe(true);
    expect(assignableTabs()).not.toContain(id);
  });

  it('un onglet réservé encore stocké chez un utilisateur est ignoré', () => {
    const user = { role: 'user', tabs: ['accueil', 'terminal', 'fichiers', 'services', 'performance', 'inconnu'] };
    expect(allowedTabs(user)).toEqual(['accueil', 'performance']);
  });

  it('un administrateur garde tous les onglets', () => {
    expect(allowedTabs({ role: 'admin', tabs: [] })).toEqual(tabs().map((t) => t.id));
  });
});
