import { navigate } from 'astro:transitions/client';
import { getCommands, formatKeys, type Command } from '../ui/commands';
import { esc, iconSVG } from '../ui/html';

type Item = { id: string; title: string; group: string; hint?: string; glyph: string; keywords: string; shortcut?: string; run: () => void | Promise<void> };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function score(query: string, text: string): number {
  if (!query) return 1;
  const q = norm(query).trim(), t = norm(text);
  if (!q) return 1;
  const i = t.indexOf(q);
  if (i === 0) return 100 - t.length / 100;
  if (i > 0) return (/[\s'’\-/]/.test(t[i - 1]) ? 80 : 60) - i / 100;
  let pos = 0, gaps = 0;
  for (const ch of q.replace(/\s+/g, '')) {
    const next = t.indexOf(ch, pos);
    if (next < 0) return 0;
    gaps += next - pos;
    pos = next + 1;
  }
  return Math.max(1, 40 - gaps);
}

function highlight(title: string, query: string) {
  const q = norm(query).trim();
  const i = q ? norm(title).indexOf(q) : -1;
  if (i < 0) return esc(title);
  return `${esc(title.slice(0, i))}<mark>${esc(title.slice(i, i + q.length))}</mark>${esc(title.slice(i + q.length))}`;
}

function pages(): Item[] {
  return [...document.querySelectorAll<HTMLAnchorElement>('#nav-pane a.navlink[href]')].map((a) => {
    const title = a.querySelector('.navlink__label')?.textContent?.trim() ?? a.title;
    const section = a.closest('.navsec')?.querySelector('.navsec__head span')?.textContent?.trim() ?? '';
    return {
      id: `page:${a.getAttribute('href')}`, title, group: 'Pages', hint: section,
      glyph: a.querySelector('.navlink__glyph')?.innerHTML ?? iconSVG('file'),
      keywords: `${section} ${a.getAttribute('href')}`,
      run: () => navigate(a.getAttribute('href')!),
    };
  });
}

function fromCommand(c: Command, group: string): Item {
  return {
    id: `cmd:${c.id}`, title: c.title, group: c.group ?? group, hint: c.hint, shortcut: c.shortcut,
    glyph: iconSVG(c.icon ?? 'zap'), keywords: (c.keywords ?? []).join(' '), run: c.run,
  };
}

let open = false;

export function openPalette() {
  if (open) return;
  open = true;
  const previous = document.activeElement as HTMLElement | null;
  const { page, global } = getCommands();
  const all: Item[] = [...page.map((c) => fromCommand(c, 'Cette page')), ...pages(), ...global.map((c) => fromCommand(c, 'Actions'))];

  const overlay = document.createElement('div');
  overlay.className = 'cmdk-overlay';
  overlay.innerHTML = `
    <div class="cmdk" role="dialog" aria-modal="true" aria-label="Palette de commandes">
      <div class="cmdk__field">
        ${iconSVG('search', 16)}
        <input class="cmdk__input" type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list"
               aria-autocomplete="list" autocomplete="off" spellcheck="false"
               placeholder="Rechercher une page ou une action…" aria-label="Rechercher une page ou une action" />
        <kbd class="kbd">Échap</kbd>
      </div>
      <div class="cmdk__list" id="cmdk-list" role="listbox" aria-label="Résultats"></div>
      <div class="cmdk__foot" aria-hidden="true">
        <span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> naviguer</span>
        <span><kbd class="kbd">Entrée</kbd> ouvrir</span>
        <span><kbd class="kbd">?</kbd> raccourcis clavier</span>
      </div>
    </div>`;
  const input = overlay.querySelector<HTMLInputElement>('.cmdk__input')!;
  const list = overlay.querySelector<HTMLElement>('.cmdk__list')!;
  let shown: Item[] = [];
  let active = 0;

  function paint() {
    const q = input.value;
    shown = all
      .map((it) => ({ it, s: Math.max(score(q, it.title), score(q, `${it.title} ${it.keywords}`) * 0.8) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => (q ? b.s - a.s : 0))
      .map((x) => x.it);
    const groups = [...new Set(shown.map((it) => it.group))];
    shown = groups.flatMap((g) => shown.filter((it) => it.group === g));
    active = Math.min(active, Math.max(0, shown.length - 1));
    if (!shown.length) {
      list.innerHTML = `<p class="cmdk__empty">Aucun résultat pour « ${esc(q.trim())} »</p>`;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    let html = '';
    let n = 0;
    groups.forEach((g, gi) => {
      html += `<div role="group" aria-labelledby="cmdk-g${gi}"><p class="cmdk__group" id="cmdk-g${gi}" role="presentation">${esc(g)}</p>`;
      for (const it of shown.filter((x) => x.group === g)) {
        const i = n++;
        const keys = it.shortcut ? `<span class="keys-combo">${formatKeys(it.shortcut).map((k) => `<kbd class="kbd">${esc(k)}</kbd>`).join('')}</span>` : '';
        html += `<div class="cmdk__item" role="option" id="cmdk-o${i}" data-i="${i}" aria-selected="${i === active}">`
          + `<span class="cmdk__glyph" aria-hidden="true">${it.glyph}</span>`
          + `<span class="cmdk__label">${highlight(it.title, q)}</span>`
          + (it.hint ? `<span class="cmdk__hint">${esc(it.hint)}</span>` : '') + keys + `</div>`;
      }
      html += '</div>';
    });
    list.innerHTML = html;
    input.setAttribute('aria-activedescendant', `cmdk-o${active}`);
  }
  function move(to: number) {
    if (!shown.length) return;
    active = (to + shown.length) % shown.length;
    list.querySelectorAll('[role="option"]').forEach((el) => el.setAttribute('aria-selected', String(Number((el as HTMLElement).dataset.i) === active)));
    input.setAttribute('aria-activedescendant', `cmdk-o${active}`);
    list.querySelector(`#cmdk-o${active}`)?.scrollIntoView({ block: 'nearest' });
  }
  function close(restore = true) {
    if (!open) return;
    open = false;
    overlay.remove();
    document.removeEventListener('astro:before-swap', onSwap);
    if (restore) previous?.focus?.({ preventScroll: true });
  }
  function run(i: number) {
    const it = shown[i];
    if (!it) return;
    close(!it.id.startsWith('page:'));
    void it.run();
  }
  const onSwap = () => close(false);

  input.addEventListener('input', () => { active = 0; paint(); });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(active - 1); }
    else if (e.key === 'PageDown') { e.preventDefault(); move(Math.min(active + 5, shown.length - 1)); }
    else if (e.key === 'PageUp') { e.preventDefault(); move(Math.max(active - 5, 0)); }
    else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); run(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); input.focus(); }
  });
  list.addEventListener('mousemove', (e) => {
    const o = (e.target as Element).closest<HTMLElement>('[role="option"]');
    if (o && Number(o.dataset.i) !== active) move(Number(o.dataset.i));
  });
  list.addEventListener('click', (e) => {
    const o = (e.target as Element).closest<HTMLElement>('[role="option"]');
    if (o) run(Number(o.dataset.i));
  });
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) { e.preventDefault(); close(); } });
  document.addEventListener('astro:before-swap', onSwap);

  document.body.append(overlay);
  paint();
  input.focus();
}

export const isPaletteOpen = () => open;

document.addEventListener('click', (e) => {
  if ((e.target as Element | null)?.closest('[data-cmdk-open]')) openPalette();
});
