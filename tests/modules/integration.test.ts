import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectRoutes, patternFor } from '../../src/integrations/modules.mjs';

describe('routes des modules', () => {
  it.each([
    ['github.astro', '/github'],
    ['api/github.ts', '/api/github'],
    ['api/github/[id].ts', '/api/github/[id]'],
    ['index.astro', '/'],
    ['outils/index.astro', '/outils'],
  ])('%s → %s', (file, pattern) => {
    expect(patternFor(file)).toBe(pattern);
  });
});

describe('collisions de routes', () => {
  const manifest = (id: string) => ({
    id, name: id, description: 'Test.', version: '1', logo: 'logo.svg',
    tabs: [{ id, label: id, href: `/${id}`, pages: [`/${id}`] }],
  });
  const tree = (files: Record<string, string>) => {
    const root = mkdtempSync(join(tmpdir(), 'orvane-routes-'));
    for (const [f, body] of Object.entries(files)) {
      mkdirSync(dirname(join(root, f)), { recursive: true });
      writeFileSync(join(root, f), body);
    }
    return root;
  };
  const mod = (id: string) => ({ [`modules/${id}/module.json`]: JSON.stringify(manifest(id)) });

  it('injecte les pages des modules', () => {
    const root = tree({ ...mod('a'), 'modules/a/pages/a.astro': '', 'modules/a/pages/api/a/[id].ts': '', 'src/pages/index.astro': '' });
    expect(collectRoutes(root).map((r) => r.pattern).sort()).toEqual(['/a', '/api/a/[id]']);
  });

  it('refuse une route de module qui reprend une route du cœur', () => {
    const root = tree({ ...mod('a'), 'modules/a/pages/parametres.astro': '', 'src/pages/parametres.astro': '' });
    expect(() => collectRoutes(root)).toThrow(/\/parametres.*cœur.*« a »/);
  });

  it('refuse deux segments dynamiques équivalents ([id] et [nom])', () => {
    const root = tree({ ...mod('a'), ...mod('b'), 'modules/a/pages/api/x/[id].ts': '', 'modules/b/pages/api/x/[nom].ts': '' });
    expect(() => collectRoutes(root)).toThrow(/« a ».*« b »/);
  });

  it('refuse un segment dynamique de module équivalent à celui du cœur', () => {
    const root = tree({ ...mod('a'), 'modules/a/pages/api/files/[...p].ts': '', 'src/pages/api/files/[...chemin].ts': '' });
    expect(() => collectRoutes(root)).toThrow(/cœur/);
  });
});
