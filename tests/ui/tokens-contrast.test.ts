import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

const pairs = new Map<string, [string, string]>();
for (const m of css.matchAll(/(--[\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/g)) pairs.set(m[1], [m[2], m[3]]);
for (const m of css.matchAll(/(--island[\w-]*):\s*(#[0-9a-f]{6})\s*;/g)) pairs.set(m[1], [m[2], m[2]]);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(text: string, on: string, mode: 0 | 1) {
  const a = pairs.get(text), b = pairs.get(on);
  if (!a || !b) throw new Error(`jeton absent de tokens.css : ${a ? on : text}`);
  const [hi, lo] = [luminance(a[mode]), luminance(b[mode])].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Ratios WCAG 2.2 de themes/contrast.toml (mistraOS) : 7 pour le texte lu, 4,5 pour le texte secondaire et les états.
const RULES: [text: string, on: string[], min: number][] = [
  ['--m-text', ['--m-surface', '--m-sidebar', '--m-card', '--m-popover'], 7],
  ['--m-text-dim', ['--m-surface', '--m-sidebar', '--m-card', '--m-popover'], 4.5],
  ['--m-accent-text', ['--m-accent'], 7],
  ['--m-accent', ['--m-surface', '--m-card'], 4.5],
  ['--success', ['--m-surface', '--m-card', '--m-popover'], 4.5],
  ['--warning', ['--m-surface', '--m-card', '--m-popover'], 4.5],
  ['--danger', ['--m-surface', '--m-card', '--m-popover'], 4.5],
  ['--island-text', ['--island', '--island-highlight'], 7],
  ['--island-text-dim', ['--island', '--island-highlight'], 4.5],
];

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOf = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
// Fonds teintés : color-mix(in srgb, <point d'état> <part> %, carte), comme tokens.css les compose.
const SUBTLE: [text: string, dot: string, share: number][] = [
  ['--success', '--status-online', 14], ['--warning', '--status-warning', 16], ['--danger', '--status-error', 12],
];
for (const [text, dot, share] of SUBTLE) {
  const mixed = ([0, 1] as const).map((mode) => {
    const [a, b] = [channels(pairs.get(dot)![mode]), channels(pairs.get('--m-card')![mode])];
    return hexOf(a.map((v, i) => (v * share + b[i] * (100 - share)) / 100));
  });
  pairs.set(`${text}-subtle`, [mixed[0], mixed[1]]);
  RULES.push([text, [`${text}-subtle`], 4.5]);
}

describe('contraste des jetons', () => {
  for (const [mode, name] of [[0, 'clair'], [1, 'sombre']] as const) {
    for (const [text, grounds, min] of RULES) {
      for (const on of grounds) {
        it(`${name} : ${text} sur ${on} atteint ${min}:1`, () => expect(ratio(text, on, mode)).toBeGreaterThanOrEqual(min));
      }
    }
  }
});
