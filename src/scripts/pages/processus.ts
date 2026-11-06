import { mountTable } from '../ui/table';
import { esc, iconSVG } from '../ui/html';
import { openMenu as openUiMenu, closeMenu, isMenuOpen } from '../ui/menu';
import { registerCommands } from '../ui/commands';
import { confirmDialog, toast } from '../ui/dialog';
import { num as fmtNum } from '../../server/core/format';

type Proc = { pid: number; user: string; name: string; state: string; cpu: number; mem: number; command: string };
type Row = { key: string; name: string; pids: number[]; count: number; user: string; state: string; cpu: number; mem: number; command: string };

const STATE: Record<string, string> = { R: 'En cours', D: 'Attente E/S', Z: 'Zombie', T: 'Suspendu', t: 'Suspendu', I: 'Inactif', S: '' };
const stateLabel = (st: string) => STATE[(st ?? '')[0]] ?? '';
let panelUser = '';
const userLabel = (u: string) => (u === 'root' ? 'SYSTÈME' : u);
const isKernelThread = (p: Proc) => /^\[.*\]$/.test(String(p.command ?? '').trim());
const STATE_TONE: Record<string, string> = { R: 'good', D: 'warning', Z: 'bad', T: 'warning', t: 'warning' };
const stateHTML = (st: string) => { const l = stateLabel(st); return l ? `<span class="v-status v-status--${STATE_TONE[st[0]] ?? 'info'}">${l}</span>` : ''; };
const heat = (v: number, scale: number) => Math.max(0, Math.min(1, v / scale)).toFixed(2);

document.addEventListener('astro:page-load', () => {
  const rootEl = document.getElementById('pm-root');
  if (!rootEl || !document.getElementById('pm')) return;
  const cores = Number(rootEl.dataset.cores) || 1;
  panelUser = rootEl.dataset.user ?? '';

  const endBtn = document.getElementById('pm-end') as HTMLButtonElement;
  const groupBtn = document.getElementById('pm-group') as HTMLButtonElement;
  const userSel = document.getElementById('pm-user') as HTMLSelectElement;
  const refreshBtn = document.getElementById('pm-refresh') as HTMLButtonElement;
  const detail = document.getElementById('pm-detail-body')!;
  const staleEl = document.getElementById('pm-stale')!;
  const tableEl = document.getElementById('pm')!;

  const st = { procs: [] as Proc[], grouped: false, userFilter: '', selected: null as string | null, loaded: false };

  function accountOf(u: string) { return u === 'root' ? 'system' : u === panelUser ? 'user' : 'other'; }

  function buildRows(): Row[] {
    const list = st.procs.filter((p) => !st.userFilter || accountOf(p.user) === st.userFilter);
    if (!st.grouped) {
      return list.map((p) => ({ key: String(p.pid), name: p.name, pids: [p.pid], count: 1, user: p.user, state: p.state, cpu: (p.cpu || 0) / cores, mem: p.mem || 0, command: p.command }));
    }
    const groups = new Map<string, Row>();
    for (const p of list) {
      const g = groups.get(p.name);
      if (!g) {
        groups.set(p.name, { key: `g:${p.name}`, name: p.name, pids: [p.pid], count: 1, user: p.user, state: p.state, cpu: (p.cpu || 0) / cores, mem: p.mem || 0, command: p.command });
      } else {
        g.pids.push(p.pid); g.count++; g.cpu += (p.cpu || 0) / cores; g.mem += p.mem || 0;
        if (g.user !== p.user) g.user = 'plusieurs';
        if (!g.state.startsWith('R') && p.state.startsWith('R')) g.state = p.state;
      }
    }
    return [...groups.values()];
  }

  const table = mountTable('pm', {
    columns: [
      { key: 'name', label: 'Nom', sortable: true, nowrap: true,
        render: (r: Row) => ({ html: `<span title="${esc(r.command)}">${esc(r.name)}</span>${r.count > 1 ? ` <span class="pm-n">(${r.count})</span>` : ''}` }) },
      { key: 'state', label: 'Statut', sortable: true, nowrap: true, hideBelow: 'lg', render: (r: Row) => ({ html: stateHTML(r.state) }) },
      { key: 'cpu', label: 'Processeur', type: 'number', align: 'right', sortable: true,
        render: (r: Row) => ({ html: `<span data-h="${heat(r.cpu, 25)}">${esc(fmtNum(r.cpu, 1))} %</span>` }) },
      { key: 'mem', label: 'Mémoire', type: 'number', align: 'right', sortable: true,
        render: (r: Row) => ({ html: `<span data-h="${heat(r.mem, 25)}">${esc(fmtNum(r.mem, 1))} %</span>` }) },
      { key: 'pid', label: 'PID', type: 'number', align: 'right', sortable: true, muted: true, hideBelow: 'lg',
        value: (r: Row) => Math.min(...r.pids), render: (r: Row) => (r.count > 1 ? `×${r.count}` : String(r.pids[0])) },
      { key: 'user', label: 'Utilisateur', sortable: true, muted: true, hideBelow: 'lg',
        render: (r: Row) => userLabel(r.user) },
      { key: 'actions', label: 'Actions', actions: true, hideLabel: true,
        render: (r: Row) => ({ html: `<button type="button" class="v-btn v-btn--ghost v-btn--icon pm-more" aria-haspopup="menu" aria-expanded="false" aria-label="Actions pour ${esc(r.name)}" title="Actions pour ${esc(r.name)}" data-key="${esc(r.key)}">${iconSVG('more', 16)}</button>` }) },
    ],
    rowKey: 'key',
    sort: { key: 'cpu', dir: 'desc' },
    noun: ['processus', 'processus'],
    filterKeys: ['name', 'pid', 'user', 'command'],
    empty: { icon: 'cpu', title: 'Aucun processus', text: 'La liste est vide pour ce filtre.' },
    rowClass: (r: Row) => (r.key === st.selected ? 'pm-sel' : undefined),
    onRowClick: (r: Row) => select(r.key),
    caption: 'Processus en cours d’exécution',
  });
  table.setLoading(true, 10);

  const tbody = tableEl.querySelector('tbody')!;
  function paintHeat() {
    tbody.querySelectorAll<HTMLElement>('td > [data-h]').forEach((s) => {
      const td = s.parentElement!;
      td.style.setProperty('--h', s.dataset.h!);
      td.classList.add('pm-heat');
    });
  }
  new MutationObserver(paintHeat).observe(tbody, { childList: true });

  const rowByKey = (k: string | null) => (k ? buildRows().find((r) => r.key === k) : undefined);

  function paintSelection() {
    tbody.querySelectorAll<HTMLElement>('tr[data-key]').forEach((tr) => tr.classList.toggle('pm-sel', tr.dataset.key === st.selected));
    endBtn.disabled = !rowByKey(st.selected);
  }

  // Gabarit construit une seule fois par sélection ; les valeurs sont mises à jour en place (le focus reste sur les boutons).
  const IDLE = '<div class="v-empty"><p class="v-empty__title">Aucun processus sélectionné</p><p class="v-empty__text">Clic droit ou touche Menu sur une ligne pour les actions.</p></div>';
  let detailKey: string | null = null;
  const val = (v: string, mono = false) => (v ? (mono ? `<span class="v-mono">${esc(v)}</span>` : esc(v)) : '<span class="v-muted">Non renseigné</span>');
  const fields = (r: Row): Record<string, string> => ({
    pid: val(r.pids.slice(0, 12).join(', ') + (r.pids.length > 12 ? '…' : ''), true),
    user: val(r.user === 'plusieurs' ? 'Plusieurs comptes' : userLabel(r.user)),
    state: stateHTML(r.state) || val('En veille'),
    cpu: val(`${fmtNum(r.cpu, 1)} %`),
    mem: val(`${fmtNum(r.mem, 1)} %`),
    cmd: val(r.command, true),
  });
  const LABELS: [string, string][] = [['pid', 'PID'], ['user', 'Utilisateur'], ['state', 'Statut'], ['cpu', 'Processeur'], ['mem', 'Mémoire'], ['cmd', 'Commande']];
  const act = (label: string, a: string, danger = false) => `<button type="button" class="v-btn v-btn--sm v-btn--outline${danger ? ' v-btn--danger' : ''}" data-act="${a}">${esc(label)}</button>`;
  function paintDetail() {
    const r = rowByKey(st.selected);
    if (!r) { if (detailKey !== null || !detail.firstElementChild) detail.innerHTML = IDLE; detailKey = null; return; }
    if (detailKey !== r.key) {
      detailKey = r.key;
      const f = fields(r);
      detail.innerHTML = `
      <div class="pm-d__id"><span class="v-avatar" aria-hidden="true">${esc((r.name[0] ?? '?').toUpperCase())}</span>
        <div class="v-who"><span class="v-who__name pm-d__name">${esc(r.name)}</span><span class="v-who__sub">${r.count > 1 ? `${r.count} processus` : 'Processus'}</span></div></div>
      <ul class="v-list">
        ${LABELS.map(([k, l]) => `<li><span class="v-label">${l}</span><span class="pm-d__v" data-f="${k}">${f[k]}</span></li>`).join('')}
      </ul>
      <div class="pm-d__actions">
        ${act('Fin de tâche', 'end', true)}${act('Forcer la fermeture', 'kill', true)}${act('Copier le PID', 'pid')}${act('Copier la commande', 'cmd')}
      </div>`;
      return;
    }
    const f = fields(r);
    detail.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => { const h = f[el.dataset.f!]!; if (el.innerHTML !== h) el.innerHTML = h; });
  }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 1200px)');
  function select(key: string | null) {
    st.selected = key; paintSelection(); paintDetail();
    // Petit écran : le détail est sous la table, hors de vue.
    if (key && narrow.matches) detail.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); toast(`${what} copié.`, 'success'); }
    catch { toast('Copie impossible dans ce navigateur.', 'error'); }
  }

  async function endTask(r: Row, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM') {
    const label = r.count > 1 ? `${r.name} (${r.count} processus)` : `${r.pids[0]} (${r.name})`;
    const force = signal === 'SIGKILL';
    const ok = await confirmDialog({
      title: `${force ? 'Forcer la fermeture de' : 'Terminer'} ${label} ?`,
      message: 'Cette action est immédiate et sans confirmation du programme.',
      confirmLabel: force ? 'Forcer la fermeture' : 'Terminer',
      danger: true,
    });
    if (!ok) return;
    let failed = 0, lastError = '';
    for (const pid of r.pids) {
      try {
        const res = await fetch('/api/process', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pid, signal }) });
        if (!res.ok) { failed++; lastError = (await res.json().catch(() => ({}))).error ?? 'Échec'; }
      } catch { failed++; lastError = 'Le panel n’a pas pu joindre le service.'; }
    }
    if (failed) toast(r.pids.length > 1 ? `${failed} sur ${r.pids.length} ont échoué : ${lastError}` : lastError, 'error');
    else toast('Signal envoyé.', 'success');
    if (st.selected === r.key) select(null);
    await refresh();
  }

  function runAction(act: string, r: Row) {
    if (act === 'end') endTask(r, 'SIGTERM');
    else if (act === 'kill') endTask(r, 'SIGKILL');
    else if (act === 'pid') copy(r.pids.join(' '), 'PID');
    else if (act === 'cmd') copy(r.command, 'Commande');
  }

  const ITEMS: { act: string; label: string; danger?: boolean }[] = [
    { act: 'end', label: 'Fin de tâche', danger: true },
    { act: 'kill', label: 'Forcer la fermeture', danger: true },
    { act: 'pid', label: 'Copier le PID' },
    { act: 'cmd', label: 'Copier la ligne de commande' },
  ];
  function openMenu(r: Row, x: number, y: number, from: HTMLElement) {
    select(r.key);
    const anchored = from.classList.contains('pm-more');
    openUiMenu({
      label: 'Actions du processus',
      items: ITEMS.map((it) => ({ label: it.label, danger: it.danger, run: () => runAction(it.act, r) })),
      ...(anchored ? { anchor: from } : { x, y }),
      returnFocus: from,
    });
  }

  tbody.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.pm-more');
    if (!b) return;
    const r = rowByKey(b.dataset.key ?? null);
    if (!r) return;
    const rect = b.getBoundingClientRect();
    openMenu(r, rect.right, rect.bottom + 4, b);
  });
  tbody.addEventListener('contextmenu', (e) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-key]');
    const r = rowByKey(tr?.dataset.key ?? null);
    if (!tr || !r) return;
    e.preventDefault();
    openMenu(r, e.clientX, e.clientY, tr);
  });
  tbody.addEventListener('keydown', (e) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-key]');
    if (!tr || e.target !== tr) return;
    const r = rowByKey(tr.dataset.key ?? null);
    if (!r) return;
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const rect = tr.getBoundingClientRect();
      openMenu(r, rect.left + 24, rect.bottom, tr);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const sib = (e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling) as HTMLElement | null;
      sib?.focus();
    }
  });
  detail.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    const r = rowByKey(st.selected);
    if (b && r) runAction(b.dataset.act!, r);
  });

  // Pas de réordonnancement sous le pointeur ni pendant un menu ouvert : on évite de cliquer sur la mauvaise ligne.
  let hover = false;
  const frozen = () => hover || isMenuOpen();
  tbody.addEventListener('pointerenter', () => { hover = true; });
  tbody.addEventListener('pointerleave', () => { hover = false; });

  function redraw() {
    const focusKey = (document.activeElement as HTMLElement | null)?.closest?.('tr[data-key]') && tbody.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).closest<HTMLElement>('tr')!.dataset.key : null;
    const moreKey = document.activeElement?.classList.contains('pm-more') ? (document.activeElement as HTMLElement).dataset.key : null;
    table.setRows(buildRows());
    if (st.selected && !rowByKey(st.selected)) st.selected = null;
    paintSelection(); paintDetail();
    if (moreKey) tbody.querySelector<HTMLElement>(`.pm-more[data-key="${CSS.escape(moreKey)}"]`)?.focus();
    else if (focusKey) tbody.querySelector<HTMLElement>(`tr[data-key="${CSS.escape(focusKey)}"]`)?.focus();
  }
  groupBtn.addEventListener('click', () => {
    st.grouped = !st.grouped;
    groupBtn.setAttribute('aria-pressed', String(st.grouped));
    st.selected = null;
    redraw();
  });
  userSel.addEventListener('change', () => { st.userFilter = userSel.value; redraw(); });
  refreshBtn.addEventListener('click', () => refresh());
  endBtn.addEventListener('click', () => { const r = rowByKey(st.selected); if (r) endTask(r); });

  const onKey = (e: KeyboardEvent) => {
    const a = document.activeElement as HTMLElement | null;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.closest('[role="dialog"]'))) return;
    if (e.key === 'Delete') { const r = rowByKey(st.selected); if (r) { e.preventDefault(); endTask(r); } }
    else if (e.key === 'Escape' && !isMenuOpen() && st.selected) select(null);
  };
  document.addEventListener('keydown', onKey);

  const sumCpu = document.getElementById('pm-cpu')!, sumMem = document.getElementById('pm-mem')!, sumCount = document.getElementById('pm-count')!;
  const cpuBar = document.getElementById('pm-cpu-bar')!, memBar = document.getElementById('pm-mem-bar')!;
  const runEl = document.getElementById('pm-run')!, topEl = document.getElementById('pm-top')!, topNote = document.getElementById('pm-top-note')!;
  const lb = document.getElementById('pm-lb')!, byTabs = document.getElementById('pm-top-by')!;
  let by: 'cpu' | 'mem' = 'cpu';

  // Classement : noms regroupés, barre relative au premier.
  function renderTop() {
    const g = new Map<string, { cpu: number; mem: number; n: number; command: string }>();
    for (const p of st.procs) {
      const e = g.get(p.name) ?? { cpu: 0, mem: 0, n: 0, command: p.command };
      e.cpu += (p.cpu || 0) / cores; e.mem += p.mem || 0; e.n++; g.set(p.name, e);
    }
    const rank = (k: 'cpu' | 'mem') => [...g].sort((a, b) => b[1][k] - a[1][k]);
    const list = rank(by).slice(0, 5);
    const max = list[0]?.[1][by] || 1;
    lb.innerHTML = list.length ? list.map(([name, e], i) =>
      `<li style="--v:${Math.max(2, (e[by] / max) * 100).toFixed(0)}%" title="${esc(e.command)}"><span class="pm-rk">${i + 1}</span><span class="v-who"><span class="v-who__name">${esc(name)}</span>${e.n > 1 ? `<span class="v-who__sub">${e.n} processus</span>` : ''}</span><span class="v-num pm-lb__v">${esc(fmtNum(e[by], 1))} %</span></li>`).join('')
      : '<li class="v-muted">Aucune donnée.</li>';
    const [tn, te] = rank('cpu')[0] ?? ['-', { cpu: 0 }];
    topEl.textContent = tn; topEl.title = tn;
    topNote.textContent = tn === '-' ? 'en processeur' : `${fmtNum(te.cpu, 1)} % du processeur`;
  }
  byTabs.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-by]');
    if (!b) return;
    by = b.dataset.by === 'mem' ? 'mem' : 'cpu';
    byTabs.querySelectorAll<HTMLElement>('[data-by]').forEach((t) => t.setAttribute('aria-pressed', String(t === b)));
    renderTop();
  });
  async function refresh() {
    try {
      const res = await fetch('/api/processes/list', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      st.procs = ((data.processes ?? []) as Proc[]).filter((p) => !isKernelThread(p));
      st.loaded = true;
      staleEl.hidden = true;
      const cpuTot = Math.min(100, st.procs.reduce((s, p) => s + (p.cpu || 0), 0) / cores);
      const memTot = Math.min(100, st.procs.reduce((s, p) => s + (p.mem || 0), 0));
      sumCpu.textContent = `${fmtNum(cpuTot, 0)} %`;
      sumMem.textContent = `${fmtNum(memTot, 0)} %`;
      cpuBar.style.width = `${cpuTot}%`; memBar.style.width = `${memTot}%`;
      sumCount.textContent = String(st.procs.length);
      runEl.textContent = `dont ${st.procs.filter((p) => p.state.startsWith('R')).length} en cours`;
      renderTop();
      if (frozen()) { paintSelection(); paintDetail(); }
      else redraw();
    } catch (err) {
      if (!st.loaded) table.setError({ title: 'Impossible de lire les processus', detail: String(err), text: 'Nouvelle tentative toutes les 2 secondes.' });
      else staleEl.hidden = false;
    }
  }

  let timer: number | null = null;
  const schedule = () => { timer = window.setTimeout(async () => { await refresh(); if (timer !== null) schedule(); }, 2000); };
  const onVis = () => {
    if (document.visibilityState === 'visible' && timer === null) { refresh().then(schedule); }
    else if (document.visibilityState !== 'visible' && timer !== null) { clearTimeout(timer); timer = null; }
  };
  document.addEventListener('visibilitychange', onVis);
  refresh().then(schedule);

  registerCommands([
    { id: 'pm-refresh', title: 'Actualiser les processus', icon: 'refresh', run: () => refresh() },
    { id: 'pm-group', title: 'Grouper ou dissocier les processus par nom', icon: 'layers', keywords: ['regrouper'], run: () => groupBtn.click() },
    { id: 'pm-end', title: 'Fin de tâche du processus sélectionné', icon: 'dismiss', keywords: ['tuer', 'kill', 'fermer'], shortcut: 'Delete',
      run: () => { const r = rowByKey(st.selected); if (r) endTask(r); else toast('Sélectionnez d’abord un processus.', 'info'); } },
    { id: 'pm-sort-cpu', title: 'Trier par processeur', icon: 'cpu', run: () => table.sortBy('cpu', 'desc') },
    { id: 'pm-sort-mem', title: 'Trier par mémoire', icon: 'memory', run: () => table.sortBy('mem', 'desc') },
  ]);

  document.addEventListener('astro:before-swap', () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('keydown', onKey);
    closeMenu();
  }, { once: true });
});
