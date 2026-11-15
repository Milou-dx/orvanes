// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { dockScale } from '../../src/scripts/layout/dock';

// Valeurs de mistraOS : dock.toml magnification = 1.6, theme.toml [dock] reach = 2.5 icônes.
describe('agrandissement du Dock', () => {
  it('une tuile sous le pointeur prend l’agrandissement entier', () => expect(dockScale(0, 1.6, 2.5)).toBeCloseTo(1.6));
  it('à la portée et au-delà, la tuile garde sa taille', () => {
    expect(dockScale(2.5, 1.6, 2.5)).toBe(1);
    expect(dockScale(7, 1.6, 2.5)).toBe(1);
  });
  it('sans pointeur, aucune tuile ne grandit', () => expect(dockScale(null, 1.6, 2.5)).toBe(1));
  it('la taille décroît avec la distance, des deux côtés', () => {
    expect(dockScale(1, 1.6, 2.5)).toBeLessThan(dockScale(0.5, 1.6, 2.5));
    expect(dockScale(-1, 1.6, 2.5)).toBeCloseTo(dockScale(1, 1.6, 2.5));
    expect(dockScale(1, 1.6, 2.5)).toBeGreaterThan(1);
  });
});
