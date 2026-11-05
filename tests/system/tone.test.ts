import { describe, expect, it } from 'vitest';
import { tone } from '../../src/server/core/format';

describe('tone', () => {
  it('donne toujours la même couleur pour un nom, et varie selon le nom', () => {
    expect(tone('Diamilou')).toBe(tone('Diamilou'));
    expect(new Set(['Ana', 'Bob', 'Chloé', 'Dan', 'Eve', 'Fred', 'Gus'].map(tone)).size).toBeGreaterThan(1);
  });
});
