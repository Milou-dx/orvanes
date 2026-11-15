import { describe, expect, it } from 'vitest';
import { pickScheme } from '../../src/scripts/ui/html';

describe('couleur d’un jeton pour un canvas', () => {
  it('prend la valeur sombre d’un light-dark() en thème sombre', () => expect(pickScheme('light-dark(#5856d6, #7d7aff)', true)).toBe('#7d7aff'));
  it('prend la valeur claire en thème clair', () => expect(pickScheme('light-dark(#5856d6, #7d7aff)', false)).toBe('#5856d6'));
  it('garde les virgules d’une couleur en fonction', () => expect(pickScheme('light-dark(rgb(15, 15, 15), rgb(0, 0, 0))', true)).toBe('rgb(0, 0, 0)'));
  it('laisse une couleur simple telle quelle', () => expect(pickScheme('#117dbb', true)).toBe('#117dbb'));
});
