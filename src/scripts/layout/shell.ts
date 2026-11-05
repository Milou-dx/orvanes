import { openMenu } from '../ui/menu';
import { openFeedback } from './feedback';

export const MOBILE = window.matchMedia('(max-width: 640px)');
const NARROW = window.matchMedia('(max-width: 1000px)');

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}
const applyPrefs = () => (window as any).__applyPanelPrefs?.();

function themeChoice(): 'light' | 'dark' | 'system' {
  let t: string | null = null;
  try { t = localStorage.getItem('panel-theme'); } catch {}
  return t === 'light' || t === 'dark' ? t : 'system';
}
export function setTheme(v: 'light' | 'dark' | 'system') {
  store('panel-theme', v === 'system' ? null : v);
  applyPrefs();
  paintChoices();
}
function navChoice(): 'compact' | 'expanded' | 'auto' {
  const n = document.documentElement.dataset.nav;
  return n === 'compact' || n === 'expanded' ? n : 'auto';
}
function setNav(v: 'compact' | 'expanded' | 'auto') {
  store('panel-nav', v === 'auto' ? null : v);
  applyPrefs();
  paintChoices();
  paintNavButton();
}
function paintChoices() {
  const theme = themeChoice(), nav = navChoice();
  document.querySelectorAll<HTMLElement>('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme)));
  document.querySelectorAll<HTMLElement>('[data-nav-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.navSet === nav)));
}

function navIsCompact() {
  const forced = document.documentElement.dataset.nav;
  if (forced) return forced === 'compact';
  return NARROW.matches;
}
function paintNavButton() {
  const open = MOBILE.matches ? document.body.classList.contains('nav-open') : !navIsCompact();
  document.querySelectorAll<HTMLElement>('[data-nav-toggle]').forEach((b) => b.setAttribute('aria-expanded', String(open)));
}
function setDrawer(open: boolean) {
  document.body.classList.toggle('nav-open', open);
  document.querySelectorAll('.topbar, .content').forEach((el) => el.toggleAttribute('inert', open));
  paintNavButton();
  if (open) (document.querySelector<HTMLElement>('#nav-pane .navlink--on') ?? document.querySelector<HTMLElement>('#nav-pane .navlink'))?.focus();
  else if (document.getElementById('nav-pane')?.contains(document.activeElement)) document.querySelector<HTMLElement>('.topbar__menu')?.focus();
}
export function toggleNav() {
  if (MOBILE.matches) { setDrawer(!document.body.classList.contains('nav-open')); return; }
  const next = navIsCompact() ? 'expanded' : 'compact';
  store('panel-nav', next);
  document.documentElement.dataset.nav = next;
  paintNavButton();
  paintChoices();
}

function collapsedSections() {
  return new Set((document.documentElement.dataset.navsec ?? '').split(' ').filter(Boolean));
}
function paintSections() {
  const closed = collapsedSections();
  document.querySelectorAll<HTMLElement>('[data-navsec]').forEach((b) => {
    const current = Boolean(b.closest('.navsec')?.classList.contains('navsec--current'));
    b.setAttribute('aria-expanded', String(!closed.has(b.dataset.navsec!) || current));
    if (current) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
  });
}
function toggleSection(id: string) {
  const closed = collapsedSections();
  if (closed.has(id)) closed.delete(id); else closed.add(id);
  const value = [...closed].join(' ');
  store('panel-navsec', value || null);
  applyPrefs();
  paintSections();
}

function toggleSub(id: string) {
  let raw: string | null = null;
  try { raw = localStorage.getItem('panel-navsub'); } catch {}
  const closed = new Set((raw ?? '').split(' ').filter(Boolean));
  if (closed.has(id)) closed.delete(id); else closed.add(id);
  store('panel-navsub', [...closed].join(' ') || null);
  applyPrefs();
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  location.href = '/connexion';
}

document.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  const theme = target?.closest<HTMLElement>('[data-theme-set]');
  if (theme) { setTheme(theme.dataset.themeSet as 'light' | 'dark' | 'system'); return; }
  const nav = target?.closest<HTMLElement>('[data-nav-set]');
  if (nav) { setNav(nav.dataset.navSet as 'compact' | 'expanded' | 'auto'); return; }
  if (target?.closest('[data-logout]')) { void logout(); return; }
  const account = target?.closest<HTMLElement>('[data-account-menu]');
  if (account) {
    const theme = themeChoice();
    const pick = (v: 'light' | 'dark' | 'system', label: string, icon: 'sun' | 'moon' | 'monitor') =>
      ({ label, icon, checked: theme === v, run: () => setTheme(v) });
    openMenu({
      anchor: account, label: 'Compte', matchWidth: true, items: [
        { head: { name: account.dataset.name ?? '', sub: account.dataset.email || undefined } },
        'sep',
        { label: 'Thème', choices: [pick('light', 'Clair', 'sun'), pick('dark', 'Sombre', 'moon'), pick('system', 'Système', 'monitor')] },
        ...(account.dataset.admin !== undefined ? [{ label: 'Paramètres', icon: 'settings' as const, run: () => { location.href = '/parametres'; } }] : []),
        'sep',
        { label: 'Obtenir de l’aide', icon: 'help', run: () => { location.href = '/aide'; } },
        { label: 'Envoyer un commentaire', icon: 'message', run: () => void openFeedback() },
        'sep',
        { label: 'Se déconnecter', icon: 'logout', danger: true, run: () => void logout() },
      ],
    });
    return;
  }
  const sec = target?.closest<HTMLElement>('[data-navsec]');
  if (sec) { if (!sec.hasAttribute('aria-disabled')) toggleSection(sec.dataset.navsec!); return; }
  const sub = target?.closest<HTMLElement>('[data-navsub]');
  if (sub) { toggleSub(sub.dataset.navsub!); return; }
  if (target?.closest('[data-nav-toggle]')) { toggleNav(); return; }
  if (target?.closest('[data-nav-close]')) setDrawer(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
    setDrawer(false);
    document.querySelector<HTMLElement>('.topbar__menu')?.focus();
  }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyPrefs(); paintChoices(); });
MOBILE.addEventListener('change', () => setDrawer(false));
NARROW.addEventListener('change', paintNavButton);

document.addEventListener('astro:page-load', () => { paintChoices(); paintNavButton(); paintSections(); });
