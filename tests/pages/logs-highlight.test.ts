import { describe, expect, it } from 'vitest';
import { highlightLine } from '../../src/scripts/pages/logs';

describe('highlightLine', () => {
  it('échappe sans recherche', () => {
    expect(highlightLine('a & b <lt>', '')).toBe('a &amp; b &lt;lt&gt;');
  });
  it('ne coupe pas les entités : « amp » et « lt » ne touchent que le texte brut', () => {
    expect(highlightLine('a & b <lt>', 'amp')).toBe('a &amp; b &lt;lt&gt;');
    expect(highlightLine('a & b <lt>', 'lt')).toBe('a &amp; b &lt;<mark>lt</mark>&gt;');
  });
  it('surligne les caractères spéciaux littéralement', () => {
    expect(highlightLine('x & y', '&')).toBe('x <mark>&amp;</mark> y');
    expect(highlightLine('a.b ab', 'a.b')).toBe('<mark>a.b</mark> ab');
  });
  it('conserve la casse d’origine', () => {
    expect(highlightLine('Error: ERROR', 'error')).toBe('<mark>Error</mark>: <mark>ERROR</mark>');
  });
});
