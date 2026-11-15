import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLYPHS } from '../../src/components/ui/glyphs';
import { iconSVG } from '../../src/scripts/ui/html';

describe('glyphes Phosphor', () => {
  it('une icône est un tracé plein sur la grille de 256', () => {
    const svg = iconSVG('search');
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).not.toContain('stroke');
  });
  it('chaque glyphe n’est fait que de tracés', () => {
    for (const [name, body] of Object.entries(GLYPHS)) expect(body, name).toMatch(/^(<path d="[^"]+"\/>)+$/);
  });
  it('il ne reste plus de fichier Lucide', () => {
    expect(existsSync(new URL('../../src/components/ui/lucide.ts', import.meta.url))).toBe(false);
  });
});
