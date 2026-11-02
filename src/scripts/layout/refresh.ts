import { navigate } from 'astro:transitions/client';
import { isNavigating } from './transitions';

const OCCUPE = [
  '.panel:not([hidden])',
  '#bk-job:not([hidden])',
  '[data-busy]',
  'body.nav-open',
  '.menu:not([hidden])', '[role="menu"]:not([hidden])',
  'dialog[open]',
  '.dlg-overlay',
  '.cmdk-overlay',
].join(', ');

function saisieEnCours() {
  const a = document.activeElement as HTMLElement | null;
  if (!a) return false;
  const t = a.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || a.isContentEditable;
}

function selectionEnCours() {
  const sel = window.getSelection();
  return !!sel && !sel.isCollapsed && sel.toString().trim() !== '';
}

function raison(): string | null {
  if (document.visibilityState !== 'visible') return 'En pause · onglet inactif';
  if (saisieEnCours()) return 'En pause · saisie en cours';
  if (document.activeElement?.matches(':focus-visible')) return 'En pause · navigation au clavier';
  if (document.querySelector(OCCUPE)) return 'En pause · action en cours';
  if (selectionEnCours()) return 'En pause · texte sélectionné';
  return null;
}

function demarrer() {
  const periode = Number(document.body.dataset.refresh || 0);
  clearInterval((window as any).__refreshTimer);
  if (!periode) return;

  const etat = document.getElementById('refresh-state');
  const txt = etat?.querySelector('.refresh__txt');
  const repos = etat?.dataset.idle ?? '';

  const peindre = () => {
    const r = raison();
    etat?.classList.toggle('refresh--paused', r !== null);
    if (txt) txt.textContent = r ?? repos;
  };
  peindre();
  document.removeEventListener('visibilitychange', (window as any).__refreshPaint);
  (window as any).__refreshPaint = peindre;
  document.addEventListener('visibilitychange', peindre);

  (window as any).__refreshTimer = setInterval(() => {
    peindre();
    if (raison() !== null || isNavigating()) return;
    const url = location.pathname + location.search;
    (window as any).__keepScroll = { url, pos: null };
    navigate(url, { history: 'replace' });
  }, periode);
}

type Pos = { win: number; content: number; inner: [string, number, number][] };
function relever(): Pos {
  const inner: [string, number, number][] = [];
  document.querySelectorAll<HTMLElement>('.content [id]').forEach((el) => {
    if (el.scrollTop || el.scrollLeft) inner.push([el.id, el.scrollTop, el.scrollLeft]);
  });
  return { win: window.scrollY, content: document.querySelector('.content')?.scrollTop ?? 0, inner };
}
function appliquer(p: Pos) {
  const content = document.querySelector('.content');
  if (content && Math.abs(content.scrollTop - p.content) > 1) content.scrollTop = p.content;
  if (Math.abs(window.scrollY - p.win) > 1) window.scrollTo(0, p.win);
  for (const [id, top, left] of p.inner) {
    const el = document.getElementById(id);
    if (el) { el.scrollTop = top; el.scrollLeft = left; }
  }
}
document.addEventListener('astro:before-swap', (e: any) => {
  const keep = (window as any).__keepScroll;
  if (!keep || keep.url !== location.pathname + location.search) { (window as any).__lastSig = null; return; }
  const sig = e.newDocument?.body?.innerHTML ?? null;
  const last = (window as any).__lastSig;
  if (sig !== null && last && last.url === keep.url && last.sig === sig) {
    e.swap = () => {};
    keep.pos = null;
    return;
  }
  (window as any).__lastSig = sig === null ? null : { url: keep.url, sig };
  keep.pos = relever();
});
document.addEventListener('astro:after-swap', () => {
  const keep = (window as any).__keepScroll;
  if (!keep?.pos || keep.url !== location.pathname + location.search) { (window as any).__keepScroll = null; return; }
  appliquer(keep.pos);
});
document.addEventListener('astro:page-load', () => {
  const keep = (window as any).__keepScroll;
  (window as any).__keepScroll = null;
  if (!keep?.pos || keep.url !== location.pathname + location.search) return;
  appliquer(keep.pos);
  requestAnimationFrame(() => { appliquer(keep.pos); setTimeout(() => appliquer(keep.pos), 120); });
});

document.addEventListener('astro:page-load', demarrer);
