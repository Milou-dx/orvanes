import { navigate } from 'astro:transitions/client';
import { MOBILE } from './shell';

const SEARCH_KEY = () => `panel-search:${location.pathname}`;
function searchTarget() { return document.querySelector<HTMLInputElement>('[data-search-target]'); }
function pushSearch(v: string) {
  const t = searchTarget();
  if (!t || t.value === v) return;
  t.value = v;
  t.dispatchEvent(new Event('input', { bubbles: true }));
}
function ownSearch() {
  const t = searchTarget();
  return t && t.type !== 'hidden' && !t.hidden ? t : null;
}

export function focusSearch(): boolean {
  const top = document.querySelector<HTMLInputElement>('#tsearch-input');
  const box = top && top.offsetParent !== null ? top : ownSearch();
  if (!box || box.offsetParent === null) return false;
  box.focus();
  box.select();
  return true;
}

document.addEventListener('input', (e) => {
  const box = (e.target as Element | null)?.closest<HTMLInputElement>('#tsearch-input');
  if (!box) return;
  try { sessionStorage.setItem(SEARCH_KEY(), box.value); } catch {}
  pushSearch(box.value);
});
document.addEventListener('submit', (e) => {
  const form = (e.target as Element | null)?.closest('[data-tsearch]');
  if (!form) return;
  e.preventDefault();
  const v = (form.querySelector('input') as HTMLInputElement).value.trim();
  if (searchTarget()) { pushSearch(v); return; }
  if (v) navigate(`/processus?q=${encodeURIComponent(v)}`);
});
document.addEventListener('astro:page-load', () => {
  const box = document.querySelector<HTMLInputElement>('#tsearch-input');
  if (!box) return;
  const t = searchTarget();
  const form = box.closest<HTMLElement>('[data-tsearch]');
  const own = Boolean(ownSearch());
  if (form) form.hidden = own || (!t && form.dataset.processus === undefined);
  let v = new URL(location.href).searchParams.get('q') ?? '';
  if (!v && !own) { try { v = sessionStorage.getItem(SEARCH_KEY()) ?? ''; } catch {} }
  box.value = v;
  box.placeholder = MOBILE.matches ? 'Rechercher' : (t?.placeholder || 'Chercher un processus ou un PID');
  if (v) setTimeout(() => pushSearch(v), 0);
});
