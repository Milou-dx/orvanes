import { mountTable } from '../ui/table';
import { esc, iconSVG } from '../ui/html';
import { confirmDialog, toast } from '../ui/dialog';
import { registerCommands } from '../ui/commands';

type Row = { name: string; description: string; active: string; sub: string; enabled: string; pid: number | null; state: string };
const VERB: Record<string, string> = { start: 'Démarrer', stop: 'Arrêter', restart: 'Redémarrer' };
const ICON: Record<string, 'play' | 'stop' | 'restart'> = { start: 'play', stop: 'stop', restart: 'restart' };
const FILTER_KEY = 'svc-state';
const PENDING = 'svc-toast';

const bootLabel = (e: string) => (e === 'enabled' || e === 'enabled-runtime' ? 'Oui' : e === 'disabled' ? 'Non' : e === 'unknown' ? '-' : e);

const TONE: Record<string, string> = { running: 'good', warning: 'warning', error: 'bad' };
const statusHTML = (state: string, label: string) =>
  `<span class="v-status${TONE[state] ? ` v-status--${TONE[state]}` : ''}">${esc(label)}</span>`;

const actBtn = (r: Row, action: string) =>
  `<button type="button" class="v-btn v-btn--sm v-btn--outline${action === 'stop' ? ' v-btn--danger' : ''} svc-act svc-act--${action}" data-unit="${esc(r.name)}" data-action="${action}" aria-label="${VERB[action]} ${esc(r.name)}" title="${VERB[action]}"><span class="svc-act__i">${iconSVG(ICON[action], 16)}</span><span class="svc-act__t">${VERB[action]}</span></button>`;

document.addEventListener('astro:page-load', () => {
  const dataEl = document.getElementById('svc-data');
  if (!dataEl) return;
  try {
    const m = sessionStorage.getItem(PENDING);
    if (m) { sessionStorage.removeItem(PENDING); toast(m, 'success'); }
  } catch {}
  const { rows, protectedUnits } = JSON.parse(dataEl.textContent || '{}') as { rows: Row[]; protectedUnits: string[] };
  const locked = new Set(protectedUnits);

  const table = mountTable('svc', {
    rowKey: 'name',
    noun: ['service', 'services'],
    empty: { icon: 'server', title: 'Aucun service', text: 'systemd ne signale aucun service.' },
    emptyFiltered: { icon: 'search', title: 'Aucun service ne correspond', text: 'Changez le filtre d’état ou la recherche.' },
    sort: { key: 'name' },
    filterKeys: ['name', 'description'],
    caption: 'Services systemd',
    columns: [
      { key: 'name', label: 'Nom', sortable: true, mono: true },
      { key: 'description', label: 'Description', muted: true, hideBelow: 'lg' },
      { key: 'state', label: 'État', sortable: true, nowrap: true,
        value: (r: Row) => r.active,
        render: (r: Row) => ({ html: statusHTML(r.state, r.active === 'active' ? 'Actif' : r.active === 'failed' ? 'Échec' : r.active === 'inactive' ? 'Inactif' : r.active) }) },
      { key: 'enabled', label: 'Au démarrage', sortable: true, hideBelow: 'lg', nowrap: true, render: (r: Row) => bootLabel(r.enabled) },
      { key: 'pid', label: 'PID', type: 'number', align: 'right', sortable: true, mono: true, muted: true, hideBelow: 'lg', render: (r: Row) => r.pid ?? '-' },
      { key: 'actions', label: 'Actions', actions: true, hideLabel: true,
        render: (r: Row) => {
          if (locked.has(r.name)) return { html: '<span class="v-badge" title="Service protégé : l’arrêter couperait l’accès">Protégé : non arrêtable</span>' };
          const acts = r.active === 'active' ? ['restart', 'stop'] : ['start'];
          return { html: `<span class="dt__actions">${acts.map((a) => actBtn(r, a)).join('')}</span>` };
        } },
    ],
  });

  const group = document.getElementById('svc-states')!;
  let current = 'all';
  try { current = sessionStorage.getItem(FILTER_KEY) || 'all'; } catch {}
  const match = (r: Row, st: string) => st === 'all' || (st === 'stopped' ? r.state === 'stopped' : r.state === st);
  const apply = () => {
    for (const b of group.querySelectorAll<HTMLButtonElement>('[data-state]')) {
      b.setAttribute('aria-pressed', String(b.dataset.state === current));
      const n = b.querySelector('[data-n]');
      if (n) n.textContent = String(rows.filter((r) => match(r, b.dataset.state!)).length);
    }
    table.setRows(rows.filter((r) => match(r, current)));
  };
  const pick = (st: string) => () => { current = st; try { sessionStorage.setItem(FILTER_KEY, st); } catch {} apply(); };
  group.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-state]');
    if (b) pick(b.dataset.state!)();
  });
  apply();

  const onClick = async (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-unit]');
    if (!btn || btn.disabled) return;
    const unit = btn.dataset.unit!;
    const action = btn.dataset.action!;
    const verb = VERB[action] ?? action;
    if (action !== 'start' && !(await confirmDialog({
      title: `${verb} le service « ${unit} » ?`,
      message: action === 'stop' ? 'Les applications qui en dépendent s’arrêteront.' : undefined,
      confirmLabel: verb, danger: true,
    }))) return;

    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    const done = () => { btn.removeAttribute('aria-busy'); btn.disabled = false; };
    try {
      const res = await fetch('/api/service', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ unit, action }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { toast(out.error ?? 'Échec', 'error'); done(); return; }
      const msg = `Demande envoyée : ${verb.toLowerCase()} « ${unit} ».`;
      const row = btn.closest('#svc') ? rows.find((x) => x.name === unit) : undefined;
      if (row) {
        // Mise à jour en place : systemctl a rendu la main, l'état attendu est atteint.
        row.active = action === 'stop' ? 'inactive' : 'active';
        row.state = action === 'stop' ? 'stopped' : 'running';
        apply(); toast(msg, 'success');
      } else {
        // Carte « services importants » rendue côté serveur : rechargement, toast affiché après.
        try { sessionStorage.setItem(PENDING, msg); } catch {}
        location.reload();
      }
    } catch {
      toast('Le panel n’a pas pu joindre le service.', 'error');
      done();
    }
  };
  document.getElementById('svc-root')!.addEventListener('click', onClick);

  registerCommands([
    { id: 'svc-all', title: 'Services : tout afficher', icon: 'list', run: pick('all') },
    { id: 'svc-running', title: 'Services : en cours', icon: 'play', run: pick('running') },
    { id: 'svc-stopped', title: 'Services : arrêtés', icon: 'stop', run: pick('stopped') },
    { id: 'svc-error', title: 'Services : en échec', icon: 'circleAlert', keywords: ['failed', 'erreur'], run: pick('error') },
    { id: 'svc-reload', title: 'Services : actualiser la liste', icon: 'refresh', run: () => location.reload() },
  ]);
});
