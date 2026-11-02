import type { IconName } from '../../components/ui/lucide';

export interface Command {
  id: string;
  title: string;
  group?: string;
  keywords?: string[];
  icon?: IconName;
  hint?: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}
export interface Shortcut {
  keys: string;
  title: string;
  group?: string;
  allowInInputs?: boolean;
  run: (e: KeyboardEvent) => void;
}
type Scope = 'page' | 'global';

const commands: Record<Scope, Command[]> = { page: [], global: [] };
const shortcuts: Record<Scope, Shortcut[]> = { page: [], global: [] };

export function registerCommands(list: Command[], scope: Scope = 'page'): () => void {
  const ids = new Set(list.map((c) => c.id));
  commands[scope] = [...commands[scope].filter((c) => !ids.has(c.id)), ...list];
  return () => { commands[scope] = commands[scope].filter((c) => !list.includes(c)); };
}
export function registerShortcuts(list: Shortcut[], scope: Scope = 'page'): () => void {
  const keys = new Set(list.map((s) => normalize(s.keys)));
  shortcuts[scope] = [...shortcuts[scope].filter((s) => !keys.has(normalize(s.keys))), ...list];
  return () => { shortcuts[scope] = shortcuts[scope].filter((s) => !list.includes(s)); };
}
export function getCommands() { return { page: [...commands.page], global: [...commands.global] }; }
export function getShortcuts(): { page: Shortcut[]; global: Shortcut[] } {
  const fromCmd = (c: Command): Shortcut => ({ keys: c.shortcut!, title: c.title, group: c.group, run: () => void c.run() });
  const merge = (list: Shortcut[], cmds: Command[]) => {
    const seen = new Set(list.map((s) => normalize(s.keys)));
    return [...list, ...cmds.filter((c) => c.shortcut && !seen.has(normalize(c.shortcut))).map(fromCmd)];
  };
  return { page: merge(shortcuts.page, commands.page), global: merge(shortcuts.global, commands.global) };
}

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function normalize(keys: string) { return keys.split('+').map((k) => k.trim().toLowerCase()).sort().join('+'); }

export function matchKeys(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.split('+').map((k) => k.trim());
  const key = parts.pop()!;
  const mods = new Set(parts.map((p) => p.toLowerCase()));
  const mod = IS_MAC ? e.metaKey : e.ctrlKey;
  if (mods.has('mod') !== mod) return false;
  if (mods.has('alt') !== e.altKey) return false;
  if (mods.has('shift') && !e.shiftKey) return false;
  if (!mods.has('shift') && e.shiftKey && /^[a-z0-9]$/i.test(key)) return false;
  if (!mods.has('mod') && (IS_MAC ? e.ctrlKey : e.metaKey)) return false;
  return e.key.toLowerCase() === key.toLowerCase();
}

export function formatKeys(keys: string): string[] {
  const names: Record<string, string> = {
    mod: IS_MAC ? '⌘' : 'Ctrl', shift: 'Maj', alt: IS_MAC ? '⌥' : 'Alt', enter: 'Entrée', escape: 'Échap',
    arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
  };
  return keys.split('+').map((k) => names[k.trim().toLowerCase()] ?? (k.trim().length === 1 ? k.trim().toUpperCase() : k.trim()));
}

if (typeof document !== 'undefined' && !(window as any).__uiCommands) {
  (window as any).__uiCommands = true;
  document.addEventListener('astro:before-swap', () => { commands.page = []; shortcuts.page = []; });
}
