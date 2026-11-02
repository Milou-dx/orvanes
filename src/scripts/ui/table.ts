import { emptyStateHTML, errorStateHTML, esc, iconSVG, type StateOptions } from './html';

type Align = 'left' | 'right' | 'center';
type SortDir = 'asc' | 'desc';
type CellContent = string | number | null | undefined | Node | { html: string };

export interface Column<R = any> {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'number' | 'date';
  align?: Align;
  mono?: boolean;
  muted?: boolean;
  nowrap?: boolean;
  actions?: boolean;
  width?: string;
  hideBelow?: 'sm' | 'md' | 'lg';
  hideLabel?: boolean;
  render?: (row: R) => CellContent;
  value?: (row: R) => string | number | null | undefined;
}

export interface TableOptions<R = any> {
  columns: Column<R>[];
  rows?: R[];
  rowKey?: keyof R | ((row: R) => string);
  empty?: StateOptions;
  emptyFiltered?: StateOptions;
  noun?: [string, string];
  sort?: { key: string; dir?: SortDir };
  onRowClick?: (row: R, event: Event) => void;
  rowClass?: (row: R) => string | undefined;
  filterKeys?: string[];
  caption?: string;
}

export interface TableController<R = any> {
  readonly id: string;
  readonly el: HTMLElement;
  setRows(rows: R[]): void;
  setLoading(on?: boolean, count?: number): void;
  setError(state: (Partial<StateOptions> & { detail?: string }) | null): void;
  setFilter(query: string): void;
  sortBy(key: string, dir?: SortDir): void;
  setDensity(density: 'comfortable' | 'compact'): void;
  destroy(): void;
}

type Entry<R> = { data?: R; tr: HTMLTableRowElement; text: string; values: Map<string, string | number> };

const registry = new Map<string, TableController>();
const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const storeKey = (kind: string, id: string) => `dt-${kind}:${location.pathname}:${id}`;
function load(kind: string, id: string) { try { return sessionStorage.getItem(storeKey(kind, id)); } catch { return null; } }
function save(kind: string, id: string, v: string | null) {
  try { if (v) sessionStorage.setItem(storeKey(kind, id), v); else sessionStorage.removeItem(storeKey(kind, id)); } catch {}
}

function toSortable(raw: unknown, type: Column['type']): string | number {
  if (raw === null || raw === undefined || raw === '') return type === 'text' || !type ? '' : Number.NEGATIVE_INFINITY;
  if (type === 'number') {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
  }
  if (type === 'date') {
    const n = typeof raw === 'number' ? raw : Date.parse(String(raw));
    return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
  }
  return String(raw);
}

function fill(td: HTMLElement, content: CellContent) {
  if (content instanceof Node) td.replaceChildren(content);
  else if (content && typeof content === 'object' && 'html' in content) td.innerHTML = content.html;
  else td.textContent = content === null || content === undefined ? '' : String(content);
}

export function cellClass(c: Column) {
  return [
    c.align && c.align !== 'left' && `al-${c.align}`, c.mono && 'is-mono', c.muted && 'is-muted',
    c.nowrap && 'is-nowrap', c.actions && 'is-actions', c.hideBelow && `hide-${c.hideBelow}`,
  ].filter(Boolean).join(' ');
}

function headHTML(c: Column) {
  const cls = cellClass(c);
  const label = c.hideLabel ? `<span class="visually-hidden">${esc(c.label)}</span>` : esc(c.label);
  const inner = c.sortable && !c.actions
    ? `<button type="button" class="dt__sort" data-sort="${esc(c.key)}">${label}${iconSVG('arrowUp', 16).replace('class="icon"', 'class="icon dt__arrow"')}</button>`
    : label;
  return `<th scope="col" data-key="${esc(c.key)}" data-type="${c.type ?? 'text'}"${c.sortable ? ' data-sortable' : ''}${cls ? ` class="${cls}"` : ''}${c.width ? ` style="width:${esc(c.width)}"` : ''}>${inner}</th>`;
}

function scaffold(host: HTMLElement, id: string, caption?: string): HTMLElement {
  if (host.matches('[data-dt]')) return host;
  const existing = host.querySelector<HTMLElement>('[data-dt]');
  if (existing) return existing;
  host.innerHTML = `<div class="dt" data-dt="${esc(id)}"><div class="dt__scroll"><table class="tbl" id="${esc(id)}-table">`
    + (caption ? `<caption class="visually-hidden">${esc(caption)}</caption>` : '')
    + `<thead><tr></tr></thead><tbody></tbody></table></div><p class="dt__foot" data-table-count="${esc(id)}" aria-live="polite"></p></div>`;
  return host.firstElementChild as HTMLElement;
}

function create<R>(root: HTMLElement, id: string, opts: Partial<TableOptions<R>> & { server?: boolean }): TableController<R> {
  registry.get(id)?.destroy();
  const ac = new AbortController();
  const table = root.querySelector('table') as HTMLTableElement;
  const thead = table.tHead!;
  const tbody = table.tBodies[0] ?? table.createTBody();
  const colCount = () => thead.rows[0]?.cells.length || 1;

  const columns: Column<R>[] = opts.columns?.length ? opts.columns : [...thead.querySelectorAll<HTMLElement>('th')].map((th) => ({
    key: th.dataset.key ?? '', label: th.textContent?.trim() ?? '',
    type: (th.dataset.type as Column['type']) ?? 'text', sortable: th.hasAttribute('data-sortable'),
    actions: th.classList.contains('is-actions'),
  }));
  if (opts.columns?.length) thead.rows[0].innerHTML = columns.map(headHTML).join('');
  if (opts.caption && !table.caption) {
    const cap = table.createCaption();
    cap.className = 'visually-hidden';
    cap.textContent = opts.caption;
  }

  const noun = opts.noun ?? (root.dataset.noun ? root.dataset.noun.split('|') as [string, string] : undefined);
  const empty: StateOptions = opts.empty ?? {
    title: root.dataset.emptyTitle ?? 'Aucun élément', text: root.dataset.emptyText || undefined,
    icon: (root.dataset.emptyIcon as StateOptions['icon']) || 'inbox',
  };
  const filterKeys = opts.filterKeys;

  let entries: Entry<R>[] = [];
  let query = '';
  let sort: { key: string; dir: SortDir } | null = null;
  let loading = false;
  let error: (Partial<StateOptions> & { detail?: string }) | null = null;

  function keyOf(row: R): string | undefined {
    if (!opts.rowKey) return undefined;
    return typeof opts.rowKey === 'function' ? opts.rowKey(row) : String((row as any)[opts.rowKey]);
  }
  function fromData(row: R): Entry<R> {
    const tr = document.createElement('tr');
    const k = keyOf(row);
    if (k !== undefined) tr.dataset.key = k;
    const extra = opts.rowClass?.(row);
    if (extra) tr.className = extra;
    if (opts.onRowClick) { tr.classList.add('is-clickable'); tr.tabIndex = 0; }
    const values = new Map<string, string | number>();
    const text: string[] = [];
    for (const c of columns) {
      const td = document.createElement('td');
      const cls = cellClass(c);
      if (cls) td.className = cls;
      const raw = (row as any)[c.key];
      fill(td, c.render ? c.render(row) : raw);
      tr.append(td);
      if (c.actions) continue;
      const v = c.value ? c.value(row) : (raw ?? td.textContent);
      values.set(c.key, toSortable(v, c.type));
      if (!filterKeys || filterKeys.includes(c.key)) text.push(String(v ?? ''), td.textContent ?? '');
    }
    return { data: row, tr, text: norm(text.join(' ')), values };
  }
  function fromDom(tr: HTMLTableRowElement): Entry<R> {
    const values = new Map<string, string | number>();
    columns.forEach((c, i) => {
      const td = tr.cells[i] as HTMLElement | undefined;
      if (!td || c.actions) return;
      values.set(c.key, toSortable(td.dataset.value ?? td.textContent?.trim(), c.type));
    });
    return { tr, text: norm(tr.dataset.filter ?? tr.textContent ?? ''), values };
  }

  function stateRow(html: string) {
    const tr = document.createElement('tr');
    tr.className = 'dt__state';
    const td = document.createElement('td');
    td.colSpan = colCount();
    td.innerHTML = html;
    tr.append(td);
    return tr;
  }
  function skeletonRows(n: number) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const tr = document.createElement('tr');
      tr.className = 'dt__skel';
      tr.setAttribute('aria-hidden', 'true');
      for (let j = 0; j < colCount(); j++) {
        const td = document.createElement('td');
        td.innerHTML = `<span class="skeleton" style="width:${40 + ((i * 7 + j * 13) % 45)}%"></span>`;
        tr.append(td);
      }
      frag.append(tr);
    }
    return frag;
  }
  function visible() {
    if (!query) return entries;
    const terms = norm(query).split(/\s+/).filter(Boolean);
    return entries.filter((e) => terms.every((t) => e.text.includes(t)));
  }
  function ordered(list: Entry<R>[]) {
    if (!sort) return list;
    const { key, dir } = sort;
    const f = dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const x = a.values.get(key) ?? '', y = b.values.get(key) ?? '';
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y));
      return r * f;
    });
  }
  function paintHead() {
    thead.querySelectorAll<HTMLElement>('th').forEach((th) => {
      if (sort && th.dataset.key === sort.key) th.setAttribute('aria-sort', sort.dir === 'asc' ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    });
  }
  function paintCount(shown: number) {
    const total = entries.length;
    const text = loading ? 'Chargement…' : error ? '' : noun
      ? (query ? `${shown} sur ${total} ${total > 1 ? noun[1] : noun[0]}` : `${total} ${total > 1 ? noun[1] : noun[0]}`)
      : (query ? `${shown} sur ${total}` : `${total}`);
    document.querySelectorAll<HTMLElement>(`[data-table-count="${CSS.escape(id)}"]`).forEach((el) => { el.textContent = text; });
  }
  function labelCells() {
    const heads = [...(thead.rows[0]?.cells ?? [])].map((th) => (th.classList.contains('is-actions') ? '' : th.textContent?.trim() ?? ''));
    for (const tr of tbody.rows) {
      if (tr.classList.contains('dt__state') || tr.classList.contains('dt__skel')) continue;
      let i = 0;
      for (const td of tr.cells) {
        if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] ?? '');
        i += td.colSpan || 1;
      }
    }
  }
  function render() {
    table.toggleAttribute('aria-busy', loading);
    if (loading) { tbody.replaceChildren(skeletonRows(Number(root.dataset.skeleton) || 5)); paintCount(0); return; }
    if (error) { tbody.replaceChildren(stateRow(errorStateHTML(error))); paintCount(0); return; }
    const list = ordered(visible());
    if (!entries.length) tbody.replaceChildren(stateRow(emptyStateHTML(empty)));
    else if (!list.length) tbody.replaceChildren(stateRow(emptyStateHTML(opts.emptyFiltered ?? {
      icon: 'search', title: `Aucun résultat pour « ${query.trim()} »`, text: 'Vérifiez l’orthographe ou élargissez la recherche.',
    })));
    else { tbody.replaceChildren(...list.map((e) => e.tr)); labelCells(); }
    paintHead();
    paintCount(list.length);
  }

  thead.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-sort]');
    if (!b) return;
    const key = b.dataset.sort!;
    ctrl.sortBy(key, sort?.key === key && sort.dir === 'asc' ? 'desc' : 'asc');
  }, { signal: ac.signal });
  if (opts.onRowClick) {
    const hit = (e: Event) => {
      const tr = (e.target as Element).closest('tr');
      if (!tr || (e.target as Element).closest('a, button, input, select, textarea, label')) return;
      const entry = entries.find((x) => x.tr === tr);
      if (entry?.data) opts.onRowClick!(entry.data, e);
    };
    tbody.addEventListener('click', hit, { signal: ac.signal });
    tbody.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).matches('tr')) { e.preventDefault(); hit(e); }
    }, { signal: ac.signal });
  }

  const ctrl: TableController<R> = {
    id, el: root,
    setRows(rows) { entries = rows.map(fromData); loading = false; error = null; render(); },
    setLoading(on = true, count) { if (count) root.dataset.skeleton = String(count); loading = on; if (on) error = null; render(); },
    setError(state) { error = state; loading = false; render(); },
    setFilter(q) { query = q ?? ''; save('filter', id, query.trim() || null); render(); },
    sortBy(key, dir = 'asc') { sort = { key, dir }; save('sort', id, `${key}:${dir}`); render(); },
    setDensity(d) { root.classList.toggle('dt--compact', d === 'compact'); },
    destroy() { ac.abort(); registry.delete(id); },
  };

  const savedSort = load('sort', id)?.split(':');
  const initial = savedSort?.length === 2 ? { key: savedSort[0], dir: savedSort[1] as SortDir }
    : opts.sort ? { key: opts.sort.key, dir: opts.sort.dir ?? 'asc' }
    : root.dataset.sortKey ? { key: root.dataset.sortKey, dir: (root.dataset.sortDir as SortDir) ?? 'asc' } : null;
  if (initial && columns.some((c) => c.key === initial.key)) sort = initial;
  const input = document.querySelector<HTMLInputElement>(`[data-table-filter="${CSS.escape(id)}"]`);
  query = input?.value || load('filter', id) || '';
  if (input && !input.value && query) input.value = query;

  if (opts.server) {
    entries = [...tbody.rows].filter((tr) => !tr.classList.contains('dt__state') && !tr.classList.contains('dt__skel')).map(fromDom);
    loading = root.hasAttribute('data-loading');
  } else if (opts.rows) entries = opts.rows.map(fromData);
  else loading = true;
  render();
  root.dataset.dtMounted = '';
  registry.set(id, ctrl);
  return ctrl;
}

export function mountTable<R = any>(target: string | HTMLElement, options: TableOptions<R>): TableController<R> {
  const host = typeof target === 'string'
    ? document.querySelector<HTMLElement>(`[data-dt="${CSS.escape(target)}"]`) ?? document.getElementById(target)
    : target;
  if (!host) throw new Error(`mountTable : element introuvable (${String(target)})`);
  const id = host.dataset.dt || (typeof target === 'string' ? target : host.id) || `dt-${registry.size + 1}`;
  return create<R>(scaffold(host, id, options.caption), id, options);
}

export function getTable<R = any>(id: string): TableController<R> | undefined {
  return registry.get(id) as TableController<R> | undefined;
}

function enhanceAll() {
  for (const id of [...registry.keys()]) if (!document.contains(registry.get(id)!.el)) registry.get(id)!.destroy();
  document.querySelectorAll<HTMLElement>('[data-dt]:not([data-dt-mounted]):not([data-dt-client])').forEach((el) => {
    create(el, el.dataset.dt!, { server: true });
  });
}
if (typeof document !== 'undefined' && !(window as any).__uiTable) {
  (window as any).__uiTable = true;
  document.addEventListener('astro:page-load', enhanceAll);
  document.addEventListener('input', (e) => {
    const input = (e.target as Element | null)?.closest<HTMLInputElement>('[data-table-filter]');
    if (input) registry.get(input.dataset.tableFilter!)?.setFilter(input.value);
  });
}
