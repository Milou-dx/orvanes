import { navigate } from 'astro:transitions/client';
import type { IconName } from '../../components/ui/lucide';
import { getCommands, formatKeys, type Command } from '../ui/commands';
import { esc, iconSVG } from '../ui/html';
import { pushSearch } from './search';

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

/** Ce que la saisie cherche hors des pages et des actions : le champ de la page, puis les processus. */
export function searchItems(query: string, ctx: { target: boolean; processus: boolean }): { id: string; title: string; icon: IconName; run: () => void }[] {
  const q = query.trim();
  if (!q) return [];
  return [
    ...(ctx.target ? [{ id: 'search:page', title: `Filtrer cette page : « ${q} »`, icon: 'filter' as const, run: () => pushSearch(q) }] : []),
    ...(ctx.processus ? [{ id: 'search:processus', title: `Chercher le processus « ${q} »`, icon: 'search' as const, run: () => void navigate(`/processus?q=${encodeURIComponent(q)}`) }] : []),
  ];
}

// Marge gardée entre la palette et le bord de la fenêtre (--space-4).
const EDGE = 16;

// Score à partir duquel la saisie est dans le titre (score() : 60 et plus), pas seulement ses lettres.
const NAMED = 60;

let open = false;
let finishClose: (() => void) | null = null;

export function openPalette() {
  if (open) return;
  finishClose?.();
  open = true;
  const previous = document.activeElement as HTMLElement | null;
  const island = document.querySelector<HTMLElement>('.island');
  const still = !island || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true);
  const ctx = { target: Boolean(document.querySelector('[data-search-target]')), processus: island?.dataset.processus !== undefined };
  const { page, global } = getCommands();
  const all: Item[] = [...page.map((c) => fromCommand(c, 'Cette page')), ...pages(), ...global.map((c) => fromCommand(c, 'Actions'))];

  const overlay = document.createElement('div');
  overlay.className = 'cmdk-overlay';
  overlay.innerHTML = `
    <div class="cmdk on-island${still ? ' cmdk--still' : ''}" role="dialog" aria-modal="true" aria-label="Palette de commandes">
      <div class="cmdk__inner">
        <div class="cmdk__field">
          ${iconSVG('search', 16)}
          <input class="cmdk__input" type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list"
                 aria-autocomplete="list" autocomplete="off" spellcheck="false"
                 placeholder="Rechercher une page ou une action…" aria-label="Rechercher une page ou une action" />
          <kbd class="kbd">Échap</kbd>
        </div>
        <div class="cmdk__scroll">
          <div class="cmdk__fill" aria-hidden="true"></div>
          <div class="cmdk__list" id="cmdk-list" role="listbox" aria-label="Résultats"></div>
        </div>
        <div class="cmdk__foot" aria-hidden="true">
          <span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> naviguer</span>
          <span><kbd class="kbd">Entrée</kbd> ouvrir</span>
          <span><kbd class="kbd">?</kbd> raccourcis clavier</span>
        </div>
      </div>
    </div>`;
  const card = overlay.querySelector<HTMLElement>('.cmdk')!;
  const inner = overlay.querySelector<HTMLElement>('.cmdk__inner')!;
  const input = overlay.querySelector<HTMLInputElement>('.cmdk__input')!;
  const list = overlay.querySelector<HTMLElement>('.cmdk__list')!;
  const fill = overlay.querySelector<HTMLElement>('.cmdk__fill')!;
  let shown: Item[] = [];
  let active = 0;

  // La forme est celle de l'îlot : posée sur lui, elle prend ensuite la taille de son contenu.
  function rest() {
    if (!island) return;
    const r = island.getBoundingClientRect();
    Object.assign(card.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: `${r.height / 2}px` });
  }
  function grow() {
    const r = island?.getBoundingClientRect();
    const width = inner.offsetWidth;
    const centre = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const edge = Math.min(EDGE, (window.innerWidth - width) / 2);
    const left = Math.max(edge, Math.min(centre - width / 2, window.innerWidth - width - edge));
    Object.assign(card.style, { left: `${left}px`, top: r ? `${r.top}px` : '', width: `${width}px`, height: `${inner.offsetHeight}px`, borderRadius: '' });
  }
  // Un seul fond va à la ligne active ; il apparaît sur place après un nouveau tri au lieu de traverser la liste.
  function paintFill(travel: boolean) {
    const row = list.querySelector<HTMLElement>(`#cmdk-o${active}`);
    fill.style.transitionProperty = travel ? '' : 'opacity';
    fill.style.opacity = row ? '1' : '0';
    if (row) { fill.style.transform = `translateY(${row.offsetTop}px)`; fill.style.height = `${row.offsetHeight}px`; }
  }

  function paint() {
    const q = input.value;
    const found: Item[] = searchItems(q, ctx).map((s) => ({ id: s.id, title: s.title, group: 'Recherche', glyph: iconSVG(s.icon), keywords: '', run: s.run }));
    const scored = all
      .map((it) => ({ it, s: Math.max(score(q, it.title), score(q, `${it.title} ${it.keywords}`) * 0.8) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => (q ? b.s - a.s : 0));
    // Ce qui porte la saisie dans son nom passe devant la recherche, les rapprochements lettre à lettre derrière.
    const named = scored.filter((x) => x.s >= NAMED).map((x) => x.it);
    shown = [...named, ...found, ...scored.filter((x) => x.s < NAMED).map((x) => x.it)];
    const groups = [...new Set(shown.map((it) => it.group))];
    shown = groups.flatMap((g) => shown.filter((it) => it.group === g));
    active = Math.min(active, Math.max(0, shown.length - 1));
    if (!shown.length) {
      list.innerHTML = `<p class="cmdk__empty">Aucun résultat pour « ${esc(q.trim())} »</p>`;
      input.removeAttribute('aria-activedescendant');
    } else {
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
    paintFill(false);
    if (card.classList.contains('cmdk--open')) grow();
  }
  function move(to: number) {
    if (!shown.length) return;
    active = (to + shown.length) % shown.length;
    list.querySelectorAll('[role="option"]').forEach((el) => el.setAttribute('aria-selected', String(Number((el as HTMLElement).dataset.i) === active)));
    input.setAttribute('aria-activedescendant', `cmdk-o${active}`);
    list.querySelector(`#cmdk-o${active}`)?.scrollIntoView?.({ block: 'nearest' });
    paintFill(true);
  }
  function close(restore = true, animate = !still) {
    if (!open) return;
    open = false;
    document.removeEventListener('astro:before-swap', onSwap);
    window.removeEventListener('resize', grow);
    const finish = () => {
      if (finishClose !== finish) return;
      finishClose = null;
      overlay.remove();
      island?.classList.remove('island--away');
    };
    finishClose = finish;
    if (restore) previous?.focus?.({ preventScroll: true });
    if (!animate) { finish(); return; }
    // Le contenu s'efface tout de suite, la forme revient à l'îlot, qui ne reparaît qu'à la fin.
    overlay.style.pointerEvents = 'none';
    card.classList.remove('cmdk--open');
    rest();
    card.addEventListener('transitionend', (e) => { if (e.target === card && e.propertyName === 'height') finish(); });
    setTimeout(finish, 700);
  }
  function run(i: number) {
    const it = shown[i];
    if (!it) return;
    const leaves = it.id.startsWith('page:') || it.id === 'search:processus';
    close(!leaves, !still && !leaves);
    void it.run();
  }
  const onSwap = () => close(false, false);

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
  window.addEventListener('resize', grow);

  // Dans .window : les jetons de l'îlot y sont définis, y compris sur l'onglet Claude.
  (document.querySelector('.window') ?? document.body).append(overlay);
  paint();
  rest();
  island?.classList.add('island--away');
  void card.offsetWidth;
  card.classList.add('cmdk--open');
  grow();
  input.focus({ preventScroll: true });
}

export const isPaletteOpen = () => open;

document.addEventListener('click', (e) => {
  if ((e.target as Element | null)?.closest('[data-cmdk-open]')) openPalette();
});
