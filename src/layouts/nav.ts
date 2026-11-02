import { allowedTabs } from '../server/auth/auth-core.js';
import { getModule, installedTabs } from '../server/modules/registry.js';
import { LUCIDE, type IconName } from '../components/ui/lucide';

export const SECTIONS = [
  { id: 'apercu', label: 'Vue d’ensemble' },
  { id: 'systeme', label: 'Système' },
  { id: 'modules', label: 'Intégrations' },
  { id: 'parametres', label: 'Paramètres' },
] as const;
export type SectionId = (typeof SECTIONS)[number]['id'];

export type NavItem = {
  href: string; label: string; tab: string; sec: SectionId;
  icon?: IconName; module?: string;
  badge?: number; badgeId?: string;
  parent?: string;
};

const CORE_NAV: NavItem[] = [
  { href: '/',            tab: 'accueil',     label: 'Vue d’ensemble', icon: 'house',     sec: 'apercu' },
  { href: '/performance', tab: 'performance', label: 'Performances',   icon: 'gauge',     sec: 'apercu' },
  { href: '/processus',   tab: 'processus',   label: 'Processus',      icon: 'clipboardList', sec: 'apercu' },
  { href: '/services',    tab: 'services',    label: 'Services',       icon: 'server',    sec: 'systeme' },
  { href: '/fichiers',    tab: 'fichiers',    label: 'Fichiers',       icon: 'folder',    sec: 'systeme' },
  { href: '/terminal',    tab: 'terminal',    label: 'Terminal',       icon: 'terminal',  sec: 'systeme' },
  { href: '/logs',        tab: 'logs',        label: 'Journaux',       icon: 'logs',      sec: 'systeme' },
  { href: '/reseau',      tab: 'reseau',      label: 'Réseau',         icon: 'network',   sec: 'systeme' },
  { href: '/modules',     tab: 'modules',     label: 'Magasin',        icon: 'store',     sec: 'parametres' },
  { href: '/acces',       tab: 'acces',       label: 'Utilisateurs',   icon: 'users',     sec: 'parametres' },
  { href: '/parametres',  tab: 'parametres',  label: 'Paramètres',     icon: 'settings',  sec: 'parametres' },
];

const SYSTEM_FIRST = new Set(['projets']);

const NAV_BADGES = import.meta.glob<{ badge?: () => number | Promise<number> }>('/modules/*/server/nav.ts', { eager: true });
const moduleBadge = async (id: string) => {
  try { return Number(await NAV_BADGES[`/modules/${id}/server/nav.ts`]?.badge?.()) || 0; } catch { return 0; }
};

export async function buildNav(visible: Set<string> | null): Promise<NavItem[]> {
  const byName = (id: string) => getModule(id)?.name ?? id;
  const modules: NavItem[] = installedTabs()
    .filter((t) => getModule(t.module))
    .sort((a, b) => byName(a.module).localeCompare(byName(b.module), 'fr', { sensitivity: 'base' }))
    .map((t) => ({
      href: t.href, tab: t.id, label: t.label, sec: t.section === 'systeme' ? 'systeme' as const : 'modules' as const,
      ...(t.icon && t.icon in LUCIDE ? { icon: t.icon as IconName } : { module: t.module }),
      ...(t.parent ? { parent: t.parent } : {}),
      ...(NAV_BADGES[`/modules/${t.module}/server/nav.ts`] ? { badgeId: t.module } : {}),
    }));
  const first = modules.filter((n) => SYSTEM_FIRST.has(n.tab));
  const items = [...CORE_NAV.slice(0, 3), ...first, ...CORE_NAV.slice(3), ...modules.filter((n) => !SYSTEM_FIRST.has(n.tab))]
    .filter((n) => !visible || visible.has(n.tab));
  for (const n of items) if (n.parent && !items.some((x) => x.tab === n.parent)) delete n.parent;
  for (const n of items) if (n.badgeId) n.badge = await moduleBadge(n.badgeId);
  return items;
}

export const visibleTabs = (authOn: boolean, user: unknown) => (authOn ? new Set<string>(allowedTabs(user)) : null);

export function tabAllowed(locals: { authEnabled?: boolean; user?: unknown }): (tab: string) => boolean {
  const v = visibleTabs(Boolean(locals.authEnabled), locals.user);
  return (tab) => !v || v.has(tab);
}

export function currentItem(items: NavItem[], path: string): NavItem | undefined {
  const hit = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
  return items.filter((n) => hit(n.href)).sort((a, b) => b.href.length - a.href.length)[0];
}
