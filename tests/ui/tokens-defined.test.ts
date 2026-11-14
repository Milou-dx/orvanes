import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const root = new URL('../../src/', import.meta.url).pathname;
const files = (readdirSync(root, { recursive: true }) as string[]).filter((f) => /\.(astro|css|ts)$/.test(f) && !f.endsWith('lucide.ts'));
const read = (list: string[]) => list.map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
const source = read(files);
// Un composant peut nommer son jeton dans une chaîne (`style={`background: var(${color})`}`).
const components = read(files.filter((f) => f.startsWith('components/')));

it('tout jeton lu sans valeur de repli est défini quelque part', () => {
  const defined = new Set([...source.matchAll(/(--[a-z][\w-]*)\s*:/g), ...source.matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)].map((m) => m[1]));
  const used = new Set([...source.matchAll(/var\((--[a-z][\w-]*)\)/g), ...components.matchAll(/['"`](--[a-z][\w-]*)['"`]/g)].map((m) => m[1]));
  expect([...used].filter((name) => !defined.has(name)).sort()).toEqual([]);
});
