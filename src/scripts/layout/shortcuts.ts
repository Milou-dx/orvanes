import { formatKeys, getShortcuts, IS_MAC, matchKeys, registerCommands, registerShortcuts, type Shortcut } from '../ui/commands';
import { openModal } from '../ui/dialog';
import { esc } from '../ui/html';
import { isPaletteOpen, openPalette } from './palette';
import { focusSearch } from './search';
import { logout, setTheme, toggleNav } from './shell';

function typing(el: Element | null) {
  if (!el) return false;
  const h = el as HTMLElement;
  return h.tagName === 'INPUT' || h.tagName === 'TEXTAREA' || h.tagName === 'SELECT' || h.isContentEditable;
}
const exempt = (el: Element | null) => Boolean(el?.closest('.xterm, [data-no-shortcuts]'));
const isClaude = () => Boolean(document.getElementById('agent'));

export function openGlobalPalette(): void {
  if (!isPaletteOpen()) openPalette();
}

let helpOpen = false;
async function showShortcuts() {
  if (helpOpen) return;
  helpOpen = true;
  const { page, global } = getShortcuts();
  const row = (s: Shortcut) => `<div class="ui-keys__row"><span>${esc(s.title)}</span><span class="ui-keys__combo">${
    formatKeys(s.keys).map((k) => `<kbd class="kbd">${esc(k)}</kbd>`).join('')}</span></div>`;
  const group = (title: string, list: Shortcut[]) => (list.length ? `<div><p class="ui-keys__group">${esc(title)}</p>${list.map(row).join('')}</div>` : '');
  const body = document.createElement('div');
  body.className = 'ui-keys';
  body.innerHTML = group('Cette page', page) + group('Partout dans le panel', [
    ...global,
    { keys: 'Escape', title: 'Fermer une fenêtre ou un menu', run: () => {} },
  ]);
  await openModal({ title: 'Raccourcis clavier', body, confirmLabel: 'Fermer', cancelLabel: null });
  helpOpen = false;
}

registerShortcuts([
  { keys: 'Mod+K', title: 'Ouvrir la palette de commandes', allowInInputs: true, run: () => openPalette() },
  { keys: 'Mod+F', title: 'Rechercher dans la page (ou /)', allowInInputs: true, run: () => {} },
  { keys: '?', title: 'Afficher les raccourcis clavier', run: () => void showShortcuts() },
], 'global');

registerCommands([
  { id: 'theme-light', title: 'Thème clair', icon: 'sun', keywords: ['apparence', 'light'], run: () => setTheme('light') },
  { id: 'theme-dark', title: 'Thème sombre', icon: 'moon', keywords: ['apparence', 'dark', 'nuit'], run: () => setTheme('dark') },
  { id: 'theme-system', title: 'Thème du système', icon: 'theme', keywords: ['apparence', 'auto'], run: () => setTheme('system') },
  { id: 'nav-toggle', title: 'Réduire ou afficher le menu', icon: 'panelLeft', keywords: ['volet', 'barre latérale', 'sidebar'], run: () => toggleNav() },
  { id: 'shortcuts', title: 'Raccourcis clavier', icon: 'keyboard', shortcut: '?', keywords: ['aide', 'clavier'], run: () => void showShortcuts() },
], 'global');

document.addEventListener('astro:page-load', () => {
  if (document.querySelector('[data-logout]')) {
    registerCommands([{ id: 'logout', title: 'Se déconnecter', icon: 'logout', keywords: ['compte', 'quitter'], run: () => void logout() }], 'global');
  }
  if (IS_MAC) document.querySelectorAll<HTMLElement>('kbd[data-mod]').forEach((k) => { k.textContent = '⌘'; });
});

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.isComposing) return;
  const target = document.activeElement;
  if (exempt(target)) return;

  if (matchKeys(e, 'Mod+K')) {
    if (isClaude() && !isPaletteOpen()) return;
    e.preventDefault();
    if (!isPaletteOpen()) openPalette();
    return;
  }
  if (isPaletteOpen() || document.querySelector('.dlg-overlay')) return;

  if (!isClaude() && (matchKeys(e, 'Mod+F') || (matchKeys(e, '/') && !typing(target)))) {
    if (focusSearch()) e.preventDefault();
    return;
  }

  const { page, global } = getShortcuts();
  for (const s of [...page, ...global]) {
    if (s.keys === 'Mod+K' || s.keys === 'Mod+F' || s.keys === '/') continue;
    const withMod = /(^|\+)(mod|alt)\+/i.test(s.keys);
    if (typing(target) && !s.allowInInputs && !withMod) continue;
    if (isClaude() && !withMod) continue;
    if (matchKeys(e, s.keys)) { e.preventDefault(); s.run(e); return; }
  }
});
