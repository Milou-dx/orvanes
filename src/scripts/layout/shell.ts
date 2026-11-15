import { openMenu } from '../ui/menu';
import { openFeedback } from './feedback';

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
function paintChoices() {
  const theme = themeChoice();
  document.querySelectorAll<HTMLElement>('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme)));
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  location.href = '/connexion';
}

document.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  const theme = target?.closest<HTMLElement>('[data-theme-set]');
  if (theme) { setTheme(theme.dataset.themeSet as 'light' | 'dark' | 'system'); return; }
  if (target?.closest('[data-logout]')) { void logout(); return; }
  const account = target?.closest<HTMLElement>('[data-account-menu]');
  if (!account) return;
  const current = themeChoice();
  const pick = (v: 'light' | 'dark' | 'system', label: string, icon: 'sun' | 'moon' | 'monitor') =>
    ({ label, icon, checked: current === v, run: () => setTheme(v) });
  openMenu({
    anchor: account, label: 'Compte', island: true, items: [
      { head: { name: account.dataset.name ?? '', sub: account.dataset.email || undefined } },
      'sep',
      { label: 'Thème', choices: [pick('light', 'Clair', 'sun'), pick('dark', 'Sombre', 'moon'), pick('system', 'Système', 'monitor')] },
      ...(account.dataset.admin !== undefined ? [{ label: 'Paramètres', icon: 'settings' as const, run: () => { location.href = '/parametres'; } }] : []),
      { label: 'Sécurité', icon: 'shield', run: () => { location.href = '/securite'; } },
      'sep',
      { label: 'Obtenir de l’aide', icon: 'help', run: () => { location.href = '/aide'; } },
      { label: 'Envoyer un commentaire', icon: 'message', run: () => void openFeedback() },
      'sep',
      { label: 'Se déconnecter', icon: 'logout', danger: true, run: () => void logout() },
    ],
  });
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyPrefs(); paintChoices(); });
document.addEventListener('astro:page-load', paintChoices);
