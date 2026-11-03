import { esc } from '../ui/html';

/** Échappe `text` et entoure chaque occurrence de `q` (insensible à la casse) de <mark>. Le surlignage se fait sur le texte brut, segment par segment : « amp » ne casse jamais « &amp; ». */
export function highlightLine(text: string, q: string): string {
  if (!q) return esc(text);
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (!m[0]) continue;
    out += esc(text.slice(last, m.index)) + `<mark>${esc(m[0])}</mark>`;
    last = m.index! + m[0].length;
  }
  return out + esc(text.slice(last));
}
