import { esc, iconSVG } from './html';
import type { IconName } from '../../components/ui/lucide';

type MenuItem = { label: string; icon?: IconName; hint?: string; danger?: boolean; disabled?: boolean; checked?: boolean; run: () => void };
/** head : en-tête de compte (shadcn nav-user) ; choices : rangée de choix exclusifs (radio) sous un libellé. */
type MenuEntry = MenuItem | 'sep' | { head: { name: string; sub?: string } } | { label: string; choices: MenuItem[] };

export interface OpenMenuOptions {
  items: MenuEntry[];
  anchor?: HTMLElement | null;
  x?: number;
  y?: number;
  label?: string;
  /** Le menu prend la largeur de l'ancre (pied de la barre latérale). */
  matchWidth?: boolean;
  returnFocus?: HTMLElement | null;
  onClose?: () => void;
}

interface Open { el: HTMLElement; anchor: HTMLElement | null; back: HTMLElement | null; onClose?: () => void; off: () => void }
let current: Open | null = null;

export function isMenuOpen() { return !!current; }

export function closeMenu(restoreFocus = false) {
  const c = current;
  if (!c) return;
  current = null;
  c.off();
  c.el.remove();
  c.anchor?.setAttribute('aria-expanded', 'false');
  c.onClose?.();
  if (restoreFocus) (c.back ?? c.anchor)?.focus();
}

export function openMenu(o: OpenMenuOptions): () => void {
  const toggleOff = !!o.anchor && current?.anchor === o.anchor;
  closeMenu();
  if (toggleOff) return () => {};
  const actions: MenuItem[] = [];
  const el = document.createElement('div');
  el.className = 'ui-menu';
  el.setAttribute('role', 'menu');
  if (o.label) el.setAttribute('aria-label', o.label);
  const item = (it: MenuItem, cls = 'ui-menu__item') => {
    actions.push(it);
    const radio = it.checked !== undefined;
    return `<button type="button" role="${radio ? 'menuitemradio' : 'menuitem'}" tabindex="-1" class="${cls}${it.danger ? ' is-danger' : ''}" data-i="${actions.length - 1}"`
      + (radio ? ` aria-checked="${it.checked}"` : '') + (it.disabled ? ' disabled' : '') + '>'
      + (it.icon ? iconSVG(it.icon, 16) : '')
      + `<span class="ui-menu__label">${esc(it.label)}</span>`
      + (it.hint ? `<kbd class="ui-menu__hint">${esc(it.hint)}</kbd>` : '') + '</button>';
  };
  el.innerHTML = o.items.map((it) => {
    if (it === 'sep') return '<hr class="ui-menu__sep" role="separator">';
    if ('head' in it) return `<div class="ui-menu__head" role="presentation"><span class="ui-menu__avatar" aria-hidden="true">${esc(it.head.name.trim().slice(0, 1).toUpperCase() || '?')}</span>`
      + `<span class="ui-menu__who"><span class="ui-menu__name">${esc(it.head.name)}</span>${it.head.sub ? `<span class="ui-menu__sub">${esc(it.head.sub)}</span>` : ''}</span></div>`;
    if ('choices' in it) return `<div class="ui-menu__choices" role="group" aria-label="${esc(it.label)}"><span class="ui-menu__label">${esc(it.label)}</span>`
      + `<span class="ui-menu__seg">${it.choices.map((c) => item(c, 'ui-menu__item ui-menu__choice')).join('')}</span></div>`;
    return item(it);
  }).join('');
  if (o.matchWidth && o.anchor) el.style.width = `${o.anchor.getBoundingClientRect().width}px`;
  document.body.append(el);

  const m = 8, w = el.offsetWidth, h = el.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left: number, top: number;
  if (o.anchor) {
    const r = o.anchor.getBoundingClientRect();
    left = r.right - w;
    top = r.bottom + 4 + h > vh - m ? r.top - h - 4 : r.bottom + 4;
  } else { left = o.x ?? 0; top = o.y ?? 0; }
  el.style.left = `${Math.max(m, Math.min(left, vw - w - m))}px`;
  el.style.top = `${Math.max(m, Math.min(top, vh - h - m))}px`;
  o.anchor?.setAttribute('aria-expanded', 'true');

  const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('.ui-menu__item:not(:disabled)')];
  const onDown = (e: Event) => {
    const t = e.target as Node;
    if (!el.contains(t) && !(o.anchor && o.anchor.contains(t))) closeMenu();
  };
  const onKey = (e: KeyboardEvent) => {
    const list = buttons();
    if (!list.length) return;
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    let next: HTMLButtonElement | undefined;
    if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && list[at]?.classList.contains('ui-menu__choice'))) next = list[(at + 1) % list.length];
    else if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && list[at]?.classList.contains('ui-menu__choice'))) next = list[(at - 1 + list.length) % list.length];
    else if (e.key === 'Home') next = list[0];
    else if (e.key === 'End') next = list[list.length - 1];
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true); return; }
    else if (e.key === 'Tab') { closeMenu(); return; }
    else return;
    e.preventDefault(); e.stopPropagation();
    next?.focus();
  };
  const onClose = () => closeMenu();
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('scroll', onClose, true);
  window.addEventListener('resize', onClose);
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-i]');
    if (!b || b.disabled) return;
    const picked = actions[Number(b.dataset.i)];
    closeMenu(true);
    picked.run();
  });
  current = {
    el, anchor: o.anchor ?? null, back: o.returnFocus ?? null, onClose: o.onClose,
    off: () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    },
  };
  buttons()[0]?.focus();
  return () => { if (current?.el === el) closeMenu(); };
}
