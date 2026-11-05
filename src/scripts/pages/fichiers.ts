import { confirmDialog, toast } from '../ui/dialog';
import { IS_MAC, registerCommands, registerShortcuts } from '../ui/commands';
import { buttonHTML, emptyStateHTML, errorStateHTML, esc, iconSVG } from '../ui/html';
import { openMenu as openUiMenu, closeMenu } from '../ui/menu';
import type { IconName } from '../../components/ui/lucide';
import { bytes as fmtBytes, dateTime as fmtDate } from '../../server/core/format';

type Entry = { name: string; isDir: boolean; isSymlink?: boolean; sizeBytes: number; mode: string; mtime: string; path: string };
type SortKey = 'name' | 'mtime' | 'type' | 'size';
type View = 'icons' | 'list';
type Kind = 'dir' | 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'code' | 'text';
type MenuItem = { label: string; icon?: IconName; hint?: string; act: () => void; danger?: boolean } | 'sep';

const KINDS: Record<string, Kind> = {};
for (const [kind, list] of Object.entries({
  image: 'png jpg jpeg gif webp svg avif bmp ico',
  video: 'mp4 m4v webm ogv mov mkv',
  audio: 'mp3 wav ogg oga opus m4a aac flac',
  pdf: 'pdf',
  archive: 'zip tar gz tgz bz2 xz 7z rar zst deb rpm jar iso',
  code: 'js mjs cjs ts tsx jsx json py sh bash zsh rb go rs c h cpp hpp java kt php css scss html htm xml yml yaml toml ini conf cfg sql astro vue svelte lua service',
})) for (const x of list.split(' ')) KINDS[x] = kind as Kind;
const KIND_ICON: Record<Kind, IconName> = { dir: 'folder', image: 'image', video: 'film', audio: 'music', pdf: 'fileText', archive: 'archive', code: 'fileCode', text: 'file' };
const KIND_LABEL: Record<Kind, string> = { dir: 'Dossier', image: 'Image', video: 'Vidéo', audio: 'Audio', pdf: 'Document', archive: 'Archive', code: 'Code source', text: 'Document' };
const THUMB_MAX = 20 * 1024 * 1024;
const PAGE = 500;

const joinPath = (dir: string, name: string) => (dir === '/' ? `/${name}` : `${dir}/${name}`);
const ext = (name: string) => (name.includes('.') && !name.startsWith('.') ? name.split('.').pop()!.toLowerCase() : '');
const kindOf = (e: Entry): Kind => (e.isDir ? 'dir' : KINDS[ext(e.name)] ?? 'text');
const typeLabel = (e: Entry) => (e.isDir ? 'Dossier' : `${KIND_LABEL[kindOf(e)]}${ext(e.name) ? ` ${ext(e.name).toUpperCase()}` : ''}`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const inlineUrl = (path: string) => `/api/files/download?inline=1&path=${encodeURIComponent(path)}`;
const narrow = () => window.matchMedia('(max-width: 40rem)').matches;
const isTyping = (el: Element | null) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable);
const hintKey = (k: string) => (IS_MAC ? `⌘${k}` : `Ctrl+${k}`);

/** Grande icône façon Finder : dossier, vignette d'image ou page avec l'extension. */
function bigIconHTML(e: Entry, thumb = true): string {
  const k = kindOf(e);
  if (k === 'dir') return `<span class="fx-ic">${iconSVG('folder', 64)}</span>`;
  if (thumb && k === 'image' && e.sizeBytes < THUMB_MAX) return `<img loading="lazy" decoding="async" alt="" src="${esc(inlineUrl(e.path))}">`;
  return `<span class="fx-doc">${iconSVG(KIND_ICON[k], 20)}<span class="fx-doc__x">${esc(ext(e.name) || 'doc')}</span></span>`;
}

function hexdump(b: Uint8Array): string {
  const out: string[] = [];
  for (let i = 0; i < b.length; i += 16) {
    const row = b.subarray(i, i + 16);
    const hex = Array.from(row, (x) => x.toString(16).padStart(2, '0')).join(' ').padEnd(47);
    const asc = Array.from(row, (x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : '.')).join('');
    out.push(`${i.toString(16).padStart(8, '0')}  ${hex}  ${asc}`);
  }
  return out.join('\n');
}

document.addEventListener('astro:page-load', () => {
  const root = document.getElementById('fx');
  if (!root) return;

  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const admin = root.dataset.admin === '1';
  const listEl = $('fx-list');
  const tbody = $('fx-tbody') as HTMLTableSectionElement;
  const tableEl = $('fx-table');
  const gridEl = $('fx-grid');
  const stateEl = $('fx-state');
  const statusEl = $('fx-status');
  const moreBtn = $('fx-more') as HTMLButtonElement;
  const clipEl = $('fx-clip');
  const crumbs = $('fx-crumbs');
  const places = Array.from(root.querySelectorAll<HTMLButtonElement>('.fx-place'));
  const cmdbar = $('fx-cmdbar');
  const fileInput = $<HTMLInputElement>('fx-file-input');
  const filter = $<HTMLInputElement>('fx-filter');
  const upBox = $('fx-upload');
  const upFill = $('fx-upload-fill');
  const upMsg = $('fx-upload-msg');
  const dropVeil = $('fx-drop');
  const qlEl = $('fx-ql');
  const qlWin = qlEl.querySelector<HTMLElement>('.fx-ql__win')!;
  const qlTitle = $('fx-ql-title');
  const qlMeta = $('fx-ql-meta');
  const qlActions = $('fx-ql-actions');
  const qlBody = $('fx-ql-body');
  // Hors de .content : sinon son contexte d'empilement glisse la fenêtre sous la barre de navigation du panel.
  document.body.append(qlEl);

  const stored = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
  const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

  const state = {
    cwd: root.dataset.cwd || '/',
    parent: null as string | null,
    entries: [] as Entry[],
    selected: new Set<string>(),
    anchor: null as string | null,
    cursor: null as string | null,
    clipboard: null as { mode: 'copy' | 'cut'; paths: string[] } | null,
    sortKey: 'name' as SortKey,
    sortDir: 1,
    limit: PAGE,
    query: '',
    loading: true,
    creating: false,
    view: (stored('fx-view') === 'list' ? 'list' : 'icons') as View,
    showHidden: stored('fx-hidden') === '1',
    free: '',
  };
  const ql = { open: false, editing: false, dirty: false, text: '', mtime: '', token: 0 };
  let loadToken = 0;
  const cleanups: Array<() => void> = [];
  const on = (t: EventTarget, ev: string, fn: (e: any) => void, opts?: boolean | AddEventListenerOptions) => {
    t.addEventListener(ev, fn, opts);
    cleanups.push(() => t.removeEventListener(ev, fn, opts));
  };
  on(moreBtn, 'click', () => { state.limit += PAGE; renderItems(); });

  const collator = new Intl.Collator('fr', { numeric: true });
  const byName = (a: Entry, b: Entry) => collator.compare(a.name, b.name);
  const hiddenCount = () => (state.showHidden ? 0 : state.entries.filter((e) => e.name.startsWith('.')).length);
  function visible(): Entry[] {
    const q = state.query.trim().toLowerCase();
    let list = state.showHidden ? [...state.entries] : state.entries.filter((e) => !e.name.startsWith('.'));
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
    const dir = state.sortDir;
    const cmp = (a: Entry, b: Entry) => {
      switch (state.sortKey) {
        case 'size': return dir * (a.sizeBytes - b.sizeBytes) || byName(a, b);
        case 'mtime': return dir * (a.mtime < b.mtime ? -1 : a.mtime > b.mtime ? 1 : 0);
        case 'type': return dir * collator.compare(typeLabel(a), typeLabel(b)) || byName(a, b);
        default: return dir * byName(a, b);
      }
    };
    return [...list.filter((e) => e.isDir).sort(cmp), ...list.filter((e) => !e.isDir).sort(cmp)];
  }
  const selectedEntries = () => state.entries.filter((e) => state.selected.has(e.path));
  const selPaths = () => [...state.selected];
  const itemEl = (path: string) => listEl.querySelector<HTMLElement>(`.fx-item[data-path="${CSS.escape(path)}"]`);
  const isCut = (p: string) => state.clipboard?.mode === 'cut' && state.clipboard.paths.includes(p);

  function rowHTML(e: Entry): string {
    const sel = state.selected.has(e.path);
    return `<tr class="fx-item fx-k-${kindOf(e)}${sel ? ' is-selected' : ''}${isCut(e.path) ? ' is-cut' : ''}" role="row" aria-selected="${sel}" data-path="${esc(e.path)}" data-dir="${e.isDir}" draggable="${admin}">
      <td><span class="fx-name"><span class="fx-ic">${iconSVG(KIND_ICON[kindOf(e)], 16)}</span><span class="fx-label">${esc(e.name)}</span>${e.isSymlink ? '<span class="fx-link" title="Lien symbolique">↗</span>' : ''}</span></td>
      <td class="fx-hide-sm">${esc(fmtDate(e.mtime))}</td>
      <td class="al-right">${e.isDir ? '-' : esc(fmtBytes(e.sizeBytes))}</td>
      <td class="fx-hide-md">${esc(typeLabel(e))}</td>
      <td class="is-mono fx-hide-md">${esc(e.mode)}</td>
    </tr>`;
  }
  function tileHTML(e: Entry): string {
    const sel = state.selected.has(e.path);
    return `<div class="fx-item fx-tile fx-k-${kindOf(e)}${sel ? ' is-selected' : ''}${isCut(e.path) ? ' is-cut' : ''}" role="option" aria-selected="${sel}" data-path="${esc(e.path)}" data-dir="${e.isDir}" draggable="${admin}" title="${esc(e.name)}">
      <span class="fx-tile__ic">${bigIconHTML(e)}</span><span class="fx-tile__n fx-label">${esc(e.name)}</span></div>`;
  }

  function renderItems() {
    const items = visible();
    const list = state.view === 'list';
    // Un dossier de dizaines de milliers d'éléments (/tmp) figeait la page : on n'en insère qu'une tranche.
    const html = items.slice(0, state.limit).map(list ? rowHTML : tileHTML).join('');
    moreBtn.hidden = items.length <= state.limit;
    moreBtn.textContent = `Afficher la suite (${items.length - state.limit} de plus)`;
    tbody.innerHTML = list ? html : '';
    gridEl.innerHTML = list ? '' : html;
    const empty = !state.loading && !items.length && !state.creating;
    tableEl.hidden = !list || empty;
    gridEl.hidden = list || empty;
    if (empty) {
      stateEl.hidden = false;
      stateEl.innerHTML = state.query
        ? emptyStateHTML({ icon: 'search', title: 'Aucun résultat', text: `Aucun élément ne correspond à « ${state.query} » dans ce dossier.`, compact: true })
        : emptyStateHTML({ icon: 'folder', title: 'Ce dossier est vide', text: admin ? 'Glissez des fichiers ici ou utilisez Nouveau et Téléverser.' : hiddenCount() ? 'Il ne contient que des fichiers cachés.' : undefined, compact: true });
    } else if (!state.loading) {
      stateEl.hidden = true;
      stateEl.innerHTML = '';
    }
    paint();
    paintHeaders();
  }

  function renderSkeleton() {
    stateEl.hidden = true;
    const list = state.view === 'list';
    tableEl.hidden = !list;
    gridEl.hidden = list;
    const sk = (w: string, h = '0.875rem') => `<span class="skeleton" style="--w:${w};--h:${h};--r:var(--radius-sm)"></span>`;
    if (list) {
      tbody.innerHTML = Array.from({ length: 10 }, (_, i) =>
        `<tr><td>${sk(`${40 + ((i * 17) % 35)}%`)}</td><td class="fx-hide-sm">${sk('70%')}</td><td>${sk('50%')}</td><td class="fx-hide-md">${sk('60%')}</td><td class="fx-hide-md"></td></tr>`).join('');
    } else {
      gridEl.innerHTML = Array.from({ length: 12 }, () => `<div class="fx-tile"><span class="fx-tile__ic">${sk('3rem', '3.5rem')}</span>${sk('4rem', '0.75rem')}</div>`).join('');
    }
  }

  function renderError(message: string) {
    tableEl.hidden = true;
    gridEl.hidden = true;
    stateEl.hidden = false;
    stateEl.innerHTML = errorStateHTML({ title: 'Dossier inaccessible', text: message, compact: true })
      + `<div class="fx-retry">${buttonHTML('Réessayer', { size: 'sm', data: { act: 'refresh' } })}${buttonHTML('Aller à la racine', { size: 'sm', data: { path: '/' } })}</div>`;
  }

  function paint() {
    for (const el of listEl.querySelectorAll<HTMLElement>('.fx-item[data-path]')) {
      const p = el.dataset.path!;
      const sel = state.selected.has(p);
      el.classList.toggle('is-selected', sel);
      el.classList.toggle('is-cut', isCut(p));
      el.setAttribute('aria-selected', String(sel));
    }
    const items = visible();
    const nSel = state.selected.size;
    const hidden = hiddenCount();
    statusEl.textContent = state.loading ? 'Chargement…'
      : [
        nSel ? `${nSel} sur ${plural(items.length, 'élément')} ${nSel > 1 ? 'sélectionnés' : 'sélectionné'}` : plural(items.length, 'élément'),
        hidden && !state.query ? `${hidden} ${hidden > 1 ? 'masqués' : 'masqué'}` : '',
        state.free ? `${state.free} disponibles` : '',
      ].filter(Boolean).join(', ');
    clipEl.textContent = state.clipboard
      ? `· ${plural(state.clipboard.paths.length, 'élément')} ${state.clipboard.mode === 'cut' ? 'à déplacer' : state.clipboard.paths.length > 1 ? 'copiés' : 'copié'}`
      : '';
    setCmd('quicklook', nSel >= 1);
  }
  function setCmd(act: string, enabled: boolean) {
    cmdbar.querySelectorAll<HTMLButtonElement>(`[data-act="${act}"]`).forEach((b) => { b.disabled = !enabled; });
  }

  function paintHeaders() {
    for (const th of root!.querySelectorAll<HTMLElement>('th[data-sort]')) {
      const active = th.dataset.sort === state.sortKey;
      th.setAttribute('aria-sort', active ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none');
      const arrow = th.querySelector('.fx-arrow');
      if (arrow) arrow.innerHTML = active ? iconSVG(state.sortDir === 1 ? 'chevronUp' : 'chevronDown', 14) : '';
    }
    for (const v of ['icons', 'list'] as View[]) cmdbar.querySelector(`[data-act="view-${v}"]`)?.setAttribute('aria-pressed', String(state.view === v));
  }

  function paintNav() {
    const segs = state.cwd.split('/').filter(Boolean);
    let acc = '';
    crumbs.innerHTML = `<a href="/fichiers?path=%2F" class="fx-crumb" data-path="/"${segs.length ? '' : ' aria-current="page"'}>${iconSVG('hardDrive', 14)}Racine</a>`
      + segs.map((s, i) => {
        acc += '/' + s;
        const cur = i === segs.length - 1;
        return `<span class="fx-sep" aria-hidden="true">${iconSVG('chevronRight', 12)}</span><a href="/fichiers?path=${encodeURIComponent(acc)}" class="fx-crumb" data-path="${esc(acc)}"${cur ? ' aria-current="page"' : ''}>${iconSVG('folder', 14)}${esc(s)}</a>`;
      }).join('');
    crumbs.scrollLeft = crumbs.scrollWidth;

    let disk: HTMLButtonElement | null = null;
    for (const b of places) {
      const p = b.dataset.path!;
      const here = b.dataset.path === state.cwd;
      b.classList.toggle('is-active', here);
      b.toggleAttribute('aria-current', here);
      const inside = state.cwd === p || state.cwd.startsWith(p === '/' ? '/' : p + '/');
      if (b.dataset.free && inside && (!disk || p.length > disk.dataset.path!.length)) disk = b;
    }
    state.free = disk?.dataset.free ?? '';
    root!.dataset.cwd = state.cwd;
    const name = segs.length ? segs[segs.length - 1] : 'Racine';
    $('fx-title').textContent = name;
    document.title = `${name} · Fichiers`;
  }

  async function loadDir(path: string, opts: { push?: boolean; select?: string[]; keepQuery?: boolean; file?: string } = {}) {
    const token = ++loadToken;
    const first = !state.entries.length;
    state.loading = true;
    listEl.setAttribute('aria-busy', 'true');
    if (first) renderSkeleton();
    let data: any;
    let ok = false;
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`, { cache: 'no-store' });
      data = await res.json().catch(() => ({ error: 'Réponse illisible du serveur.' }));
      ok = res.ok;
    } catch {
      data = { error: 'Le serveur ne répond pas.' };
    }
    if (token !== loadToken) return;
    state.loading = false;
    listEl.removeAttribute('aria-busy');
    if (!ok) {
      if (state.entries.length) { toast(data.error ?? 'Dossier inaccessible', 'error'); renderItems(); }
      else { paintNav(); renderError(data.error ?? 'Dossier inaccessible'); paint(); }
      return;
    }
    const moved = data.cwd !== state.cwd;
    state.cwd = data.cwd;
    state.parent = data.parent;
    state.entries = [...data.dirs, ...data.files].map((e: any) => ({ ...e, path: joinPath(data.cwd, e.name) }));
    state.selected = new Set((opts.select ?? []).filter((p) => state.entries.some((e) => e.path === p)));
    state.anchor = state.cursor = [...state.selected][0] ?? null;
    if (!opts.keepQuery) { state.query = ''; filter.value = ''; }
    state.limit = PAGE;
    state.creating = false;
    paintNav();
    renderItems();
    if (opts.push !== false) history.pushState({ fx: state.cwd }, '', `/fichiers?path=${encodeURIComponent(state.cwd)}`);
    if (opts.file && state.entries.some((e) => e.path === opts.file)) { selectOnly(opts.file, true); qlOpen(); }
    else if (state.cursor) itemEl(state.cursor)?.scrollIntoView({ block: 'nearest' });
    else if (moved || first) listEl.scrollTop = 0;
  }
  const reload = (select?: string[]) => loadDir(state.cwd, { push: false, select: select ?? [], keepQuery: true });

  function selectOnly(path: string, reveal = false) {
    state.selected = new Set([path]);
    state.anchor = state.cursor = path;
    paint();
    if (reveal) itemEl(path)?.scrollIntoView({ block: 'nearest' });
  }

  function clickSelect(path: string, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) {
    if (e.shiftKey && state.anchor) {
      const order = visible().map((it) => it.path);
      const a = order.indexOf(state.anchor);
      const b = order.indexOf(path);
      if (a !== -1 && b !== -1) {
        state.selected = new Set(order.slice(Math.min(a, b), Math.max(a, b) + 1));
        state.cursor = path;
      }
    } else if (e.ctrlKey || e.metaKey) {
      state.selected.has(path) ? state.selected.delete(path) : state.selected.add(path);
      state.anchor = state.cursor = path;
    } else {
      state.selected = new Set([path]);
      state.anchor = state.cursor = path;
    }
    paint();
  }
  function selectAll() {
    state.selected = new Set(visible().map((e) => e.path));
    paint();
  }
  const gridCols = () => (state.view === 'icons' ? getComputedStyle(gridEl).gridTemplateColumns.split(' ').filter(Boolean).length || 1 : 1);
  function moveCursor(delta: number | 'home' | 'end', extend = false) {
    const order = visible().map((e) => e.path);
    if (!order.length) return;
    const cur = state.cursor ? order.indexOf(state.cursor) : -1;
    const idx = delta === 'home' ? 0 : delta === 'end' ? order.length - 1
      : cur === -1 ? (delta > 0 ? 0 : order.length - 1)
      : Math.min(order.length - 1, Math.max(0, cur + delta));
    clickSelect(order[idx], { shiftKey: extend, ctrlKey: false, metaKey: false });
    itemEl(order[idx])?.scrollIntoView({ block: 'nearest' });
  }

  let typed = '';
  let typedAt = 0;
  function typeAhead(ch: string) {
    const now = Date.now();
    typed = now - typedAt > 800 ? ch.toLowerCase() : typed + ch.toLowerCase();
    typedAt = now;
    const hit = visible().find((e) => e.name.toLowerCase().startsWith(typed));
    if (hit) selectOnly(hit.path, true);
  }

  async function post(url: string, body: unknown) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch {
      return { ok: false, data: { error: 'Le serveur ne répond pas.' } };
    }
  }
  const dirName = (d: string) => (d === '/' ? 'la racine' : `« ${d.split('/').filter(Boolean).pop()} »`);
  const reportDone = (n: number, verb: string, destDir: string) => {
    if (n > 0) toast(`${plural(n, 'élément')} ${verb}${n > 1 ? 's' : ''} dans ${dirName(destDir)}.`, 'success');
  };
  const reportErrors = (data: any) => { if (data?.errors?.length) toast(data.errors.join('\n'), 'error'); else if (data?.error) toast(data.error, 'error'); };

  async function doDelete(paths: string[]) {
    if (!admin || !paths.length) return;
    const names = paths.map((p) => p.split('/').pop()!);
    const label = paths.length === 1 ? `« ${names[0]} »` : `ces ${paths.length} éléments`;
    const detail = paths.length > 1 ? names.slice(0, 6).join(', ') + (names.length > 6 ? `… (+${names.length - 6})` : '') : '';
    if (!(await confirmDialog({
      title: `Supprimer ${label} ?`,
      message: `${detail ? detail + '. ' : ''}Sans corbeille, la suppression est irréversible.`,
      confirmLabel: 'Supprimer', danger: true,
    }))) return;
    const { ok, data } = await post('/api/files/delete', { paths });
    reportErrors(data);
    if (ok && !data.errors?.length) toast(paths.length > 1 ? `${paths.length} éléments supprimés.` : 'Élément supprimé.', 'success');
    await reload();
  }
  async function doRename(path: string, name: string) {
    const { ok, data } = await post('/api/files/rename', { path, name });
    if (!ok) toast(data.error ?? 'Renommage impossible', 'error');
    await reload(ok ? [joinPath(path.split('/').slice(0, -1).join('/') || '/', name)] : [path]);
  }
  async function doCreate(type: 'file' | 'directory', name: string) {
    const { ok, data } = await post('/api/files/create', { dir: state.cwd, name, type });
    if (!ok) toast(data.error ?? 'Création impossible', 'error');
    await reload(ok ? [joinPath(state.cwd, name)] : []);
  }
  async function doMove(paths: string[], destDir: string) {
    const { data } = await post('/api/files/move', { paths, destDir });
    reportErrors(data);
    reportDone(data?.moved?.length ?? 0, 'déplacé', destDir);
    await reload();
  }
  async function doPaste(destDir = state.cwd) {
    if (!admin || !state.clipboard) return;
    const cut = state.clipboard.mode === 'cut';
    const { data } = await post(cut ? '/api/files/move' : '/api/files/copy', { paths: state.clipboard.paths, destDir });
    reportErrors(data);
    reportDone((cut ? data?.moved : data?.copied)?.length ?? 0, cut ? 'déplacé' : 'copié', destDir);
    if (cut) state.clipboard = null;
    await reload();
  }
  function setClipboard(mode: 'copy' | 'cut') {
    if (!admin || !state.selected.size) return;
    state.clipboard = { mode, paths: selPaths() };
    paint();
    toast(`${plural(state.clipboard.paths.length, 'élément')} ${mode === 'cut' ? 'prêt à déplacer' : 'copié'}${mode === 'copy' && state.clipboard.paths.length > 1 ? 's' : ''}.`, 'info', 2000);
  }
  async function copyPath(path: string) {
    try { await navigator.clipboard.writeText(path); toast('Chemin copié.', 'success', 2000); } catch { toast(path, 'info'); }
  }
  function downloadPath(path: string) {
    const a = document.createElement('a');
    a.href = `/api/files/download?path=${encodeURIComponent(path)}`;
    a.click();
  }
  function openEntry(path: string) {
    const e = state.entries.find((x) => x.path === path);
    if (!e) return;
    if (e.isDir) { void loadDir(path); return; }
    selectOnly(path);
    qlOpen();
  }

  function inlineEdit(input: HTMLInputElement, commit: (v: string) => Promise<void> | void, cancel: () => void, initial: string) {
    input.focus();
    const dot = input.value.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      const v = input.value.trim();
      if (ok && v && v !== initial) commit(v); else cancel();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }
  function startRename(path: string) {
    if (!admin) return;
    const label = itemEl(path)?.querySelector<HTMLElement>('.fx-label');
    if (!label) return;
    const original = label.textContent || '';
    const input = document.createElement('input');
    input.className = 'fx-edit';
    input.value = original;
    input.setAttribute('aria-label', `Nouveau nom de ${original}`);
    label.replaceWith(input);
    inlineEdit(input, (v) => doRename(path, v), renderItems, original);
  }
  function startCreate(type: 'file' | 'directory') {
    if (!admin) return;
    state.creating = true;
    stateEl.hidden = true;
    const dir = type === 'directory';
    const name = dir ? 'Nouveau dossier' : 'nouveau-fichier.txt';
    const input = `<input class="fx-edit" aria-label="Nom du ${dir ? 'dossier' : 'fichier'}" value="${esc(name)}">`;
    let el: HTMLElement;
    if (state.view === 'list') {
      tableEl.hidden = false;
      el = document.createElement('tr');
      el.className = `fx-k-${dir ? 'dir' : 'text'}`;
      el.innerHTML = `<td colspan="5"><span class="fx-name"><span class="fx-ic">${iconSVG(dir ? 'folder' : 'file', 16)}</span>${input}</span></td>`;
      tbody.prepend(el);
    } else {
      gridEl.hidden = false;
      el = document.createElement('div');
      el.className = `fx-tile fx-k-${dir ? 'dir' : 'text'}`;
      el.innerHTML = `<span class="fx-tile__ic">${dir ? `<span class="fx-ic">${iconSVG('folder', 64)}</span>` : `<span class="fx-doc">${iconSVG('file', 20)}<span class="fx-doc__x">txt</span></span>`}</span>${input}`;
      gridEl.prepend(el);
    }
    el.scrollIntoView({ block: 'nearest' });
    inlineEdit(el.querySelector('input')!, (v) => { state.creating = false; return doCreate(type, v); }, () => { state.creating = false; renderItems(); }, '');
  }

  let upHide = 0;
  function uploadFiles(files: FileList | File[], dest = state.cwd) {
    const list = Array.from(files);
    if (!admin || !list.length) return;
    clearTimeout(upHide);
    const form = new FormData();
    form.set('path', dest);
    list.forEach((f) => form.append('file', f));
    upBox.hidden = false;
    upBox.dataset.state = 'busy';
    upFill.style.width = '0%';
    upMsg.textContent = `Téléversement de ${plural(list.length, 'fichier')} vers ${dest}…`;
    upBox.querySelector('[role=progressbar]')?.setAttribute('aria-valuenow', '0');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload');
    xhr.upload.addEventListener('progress', (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      upFill.style.width = `${pct}%`;
      upBox.querySelector('[role=progressbar]')?.setAttribute('aria-valuenow', String(pct));
      upMsg.textContent = `Téléversement… ${pct} % (${fmtBytes(ev.loaded)} sur ${fmtBytes(ev.total)})`;
    });
    xhr.addEventListener('load', () => {
      let data: any = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      const written: string[] = data.written ?? [];
      const errs: string[] = data.errors ?? (xhr.status >= 400 && data.error ? [data.error] : []);
      upFill.style.width = '100%';
      upBox.dataset.state = errs.length ? 'error' : 'ok';
      upMsg.textContent = [written.length ? `${plural(written.length, 'fichier téléversé', 'fichiers téléversés')}.` : '', ...errs].filter(Boolean).join('  ·  ') || 'Téléversement terminé.';
      if (!errs.length) upHide = window.setTimeout(() => { upBox.hidden = true; }, 2500);
      if (dest === state.cwd) reload(state.selected.size ? selPaths() : []);
    });
    xhr.addEventListener('error', () => {
      upBox.dataset.state = 'error';
      upMsg.textContent = 'Le téléversement a échoué (connexion interrompue).';
    });
    xhr.send(form);
  }
  on(fileInput, 'change', () => { if (fileInput.files) uploadFiles(fileInput.files); fileInput.value = ''; });
  on($('fx-upload-close'), 'click', () => { upBox.hidden = true; });

  function setView(v: View) {
    state.view = v;
    store('fx-view', v);
    renderItems();
    if (state.cursor) itemEl(state.cursor)?.scrollIntoView({ block: 'nearest' });
  }
  function toggleHidden() {
    state.showHidden = !state.showHidden;
    store('fx-hidden', state.showHidden ? '1' : '0');
    const keep = new Set(visible().map((e) => e.path));
    state.selected = new Set([...state.selected].filter((p) => keep.has(p)));
    renderItems();
    toast(state.showHidden ? 'Fichiers cachés affichés.' : 'Fichiers cachés masqués.', 'info', 1500);
  }

  /* ---------- Coup d'œil ---------- */
  const qlEntry = () => state.entries.find((e) => e.path === state.cursor) ?? selectedEntries()[0] ?? null;
  const qlCard = (e: Entry, text: string, extra = '') =>
    `<div class="fx-ql-card fx-k-${kindOf(e)}">${bigIconHTML(e, false)}<p class="fx-ql-card__name">${esc(e.name)}</p><p class="fx-ql-card__text">${esc(text)}</p>${extra}</div>`;

  function qlOpen() {
    if (!qlEntry()) return;
    ql.open = true;
    qlEl.hidden = false;
    qlRender();
    qlEl.querySelector<HTMLElement>('[data-ql="close"]')?.focus({ preventScroll: true });
  }
  async function qlLeaveEdit(): Promise<boolean> {
    if (!ql.editing) return true;
    if (ql.dirty && !(await confirmDialog({ title: 'Abandonner les modifications ?', message: 'Vous perdrez les changements non enregistrés.', confirmLabel: 'Abandonner', danger: true }))) return false;
    ql.editing = false;
    ql.dirty = false;
    return true;
  }
  async function qlClose() {
    if (!ql.open || !(await qlLeaveEdit())) return;
    ql.open = false;
    ql.token++;
    qlEl.hidden = true;
    qlBody.innerHTML = '';
    history.replaceState(history.state, '', `/fichiers?path=${encodeURIComponent(state.cwd)}`);
    listEl.focus({ preventScroll: true });
  }
  async function qlStep(delta: number) {
    if (!(await qlLeaveEdit())) return;
    moveCursor(delta);
    qlRender();
  }

  function qlRender() {
    const e = qlEntry();
    if (!e) { void qlClose(); return; }
    const token = ++ql.token;
    // Le contenu et les boutons vont être remplacés : sans ça, le focus tombe sur <body> et Échap, Espace, ← → n'atteignent plus la fenêtre.
    const f = document.activeElement;
    if (!qlWin.contains(f) || qlBody.contains(f) || qlActions.contains(f)) qlWin.focus({ preventScroll: true });
    ql.editing = false;
    ql.dirty = false;
    qlWin.classList.remove('is-editing');
    const k = kindOf(e);
    qlTitle.textContent = e.name;
    qlMeta.textContent = [typeLabel(e), e.isDir ? '' : fmtBytes(e.sizeBytes), `modifié le ${fmtDate(e.mtime)}`].filter(Boolean).join(' · ');
    const order = visible();
    const i = order.findIndex((x) => x.path === e.path);
    qlWin.querySelector<HTMLButtonElement>('[data-ql="prev"]')!.disabled = i <= 0;
    qlWin.querySelector<HTMLButtonElement>('[data-ql="next"]')!.disabled = i === -1 || i >= order.length - 1;
    qlActions.innerHTML = e.isDir
      ? buttonHTML('Ouvrir', { size: 'sm', variant: 'primary', icon: 'open', data: { ql: 'open' } })
      : buttonHTML('Télécharger', { size: 'sm', icon: 'download', data: { ql: 'download' } });
    history.replaceState(history.state, '', `/fichiers?path=${encodeURIComponent(state.cwd)}&file=${encodeURIComponent(e.path)}`);

    const src = esc(inlineUrl(e.path));
    const fail = (msg: string) => () => { if (token === ql.token) qlBody.innerHTML = qlCard(e, msg); };
    if (k === 'dir') { qlBody.innerHTML = qlCard(e, 'Dossier'); return; }
    if (k === 'image') {
      qlBody.innerHTML = `<img alt="${esc(e.name)}" src="${src}">`;
      qlBody.querySelector('img')!.addEventListener('error', fail('Le navigateur ne sait pas afficher cette image.'), { once: true });
      return;
    }
    if (k === 'video') {
      qlBody.innerHTML = `<video controls autoplay playsinline preload="metadata" src="${src}"></video>`;
      qlBody.querySelector('video')!.addEventListener('error', fail('Le navigateur ne sait pas lire ce format vidéo. Téléchargez-le pour l’ouvrir.'), { once: true });
      return;
    }
    if (k === 'audio') {
      qlBody.innerHTML = qlCard(e, fmtBytes(e.sizeBytes), `<audio controls autoplay src="${src}"></audio>`);
      qlBody.querySelector('audio')!.addEventListener('error', fail('Le navigateur ne sait pas lire ce format audio.'), { once: true });
      return;
    }
    if (k === 'pdf') { qlBody.innerHTML = `<iframe src="${src}" title="Aperçu de ${esc(e.name)}"></iframe>`; return; }
    void qlText(e, token);
  }

  async function qlText(e: Entry, token: number) {
    const sk = (w: string) => `<span class="skeleton" style="--w:${w};--h:0.875rem;--r:var(--radius-sm)"></span>`;
    qlBody.innerHTML = `<div class="fx-ql__load">${sk('90%')}${sk('70%')}${sk('80%')}${sk('55%')}</div>`;
    let data: any;
    let ok = false;
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(e.path)}`, { cache: 'no-store' });
      data = await res.json().catch(() => ({ error: 'Réponse illisible du serveur.' }));
      ok = res.ok;
    } catch { data = { error: 'Le serveur ne répond pas.' }; }
    if (token !== ql.token) return;
    if (!ok) { qlBody.innerHTML = qlCard(e, data.error ?? 'Lecture impossible.'); return; }
    if (data.binary) { await qlHex(e, token); return; }
    qlBody.innerHTML = `<pre class="fx-code" tabindex="0"></pre>${data.truncated ? '<p class="fx-ql__note">Fichier long : seule la fin (512 Ko) est affichée.</p>' : ''}`;
    qlBody.querySelector('pre')!.textContent = data.content;
    ql.text = data.content;
    ql.mtime = data.mtime;
    if (admin && !data.truncated) qlActions.insertAdjacentHTML('afterbegin', buttonHTML('Modifier', { size: 'sm', icon: 'pencil', data: { ql: 'edit' } }));
  }

  async function qlHex(e: Entry, token: number) {
    let buf: Uint8Array | null = null;
    try {
      const res = await fetch(inlineUrl(e.path), { headers: { range: 'bytes=0-4095' }, cache: 'no-store' });
      if (res.ok) buf = new Uint8Array(await res.arrayBuffer());
    } catch {}
    if (token !== ql.token) return;
    if (!buf) { qlBody.innerHTML = qlCard(e, 'Fichier binaire, illisible ici.'); return; }
    qlBody.innerHTML = `<pre class="fx-code fx-code--hex" tabindex="0"></pre><p class="fx-ql__note">Fichier binaire : ${e.sizeBytes > buf.length ? `les ${fmtBytes(buf.length)} premiers octets` : 'contenu'} en hexadécimal.</p>`;
    qlBody.querySelector('pre')!.textContent = hexdump(buf);
  }

  function qlEdit() {
    const e = qlEntry();
    if (!admin || !e) return;
    ql.editing = true;
    ql.dirty = false;
    qlWin.classList.add('is-editing');
    qlBody.innerHTML = `<textarea class="fx-ql-edit" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Contenu de ${esc(e.name)}"></textarea>`;
    qlActions.innerHTML = buttonHTML('Annuler', { size: 'sm', data: { ql: 'cancel' } })
      + buttonHTML('Enregistrer', { size: 'sm', variant: 'primary', icon: 'save', title: `Enregistrer (${hintKey('S')})`, disabled: true, data: { ql: 'save' } });
    const ta = qlBody.querySelector('textarea')!;
    ta.value = ql.text;
    ta.addEventListener('input', () => {
      ql.dirty = true;
      qlActions.querySelector<HTMLButtonElement>('[data-ql="save"]')!.disabled = false;
    });
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(0, 0);
    ta.scrollTop = 0;
  }

  async function qlSave(force = false) {
    const e = qlEntry();
    const ta = qlBody.querySelector('textarea');
    const btn = qlActions.querySelector<HTMLButtonElement>('[data-ql="save"]');
    if (!e || !ta || !btn || (!ql.dirty && !force)) return;
    // Une zone de texte ramène les fins de ligne à \n : on rend au fichier ses \r\n d'origine.
    const content = ql.text.includes('\r\n') ? ta.value.replace(/\r?\n/g, '\r\n') : ta.value;
    btn.disabled = true;
    const { ok, data } = await post('/api/files/write', { path: e.path, content, mtime: ql.mtime, force });
    if (!ok && data.conflict) {
      if (await confirmDialog({
        title: 'Le fichier a changé',
        message: `« ${e.name} » a été modifié ailleurs depuis son ouverture. Enregistrer quand même et remplacer cette version ?`,
        confirmLabel: 'Remplacer', danger: true,
      })) return qlSave(true);
      btn.disabled = false;
      return;
    }
    if (!ok) { toast(data.error ?? 'Enregistrement impossible', 'error'); btn.disabled = false; return; }
    ql.dirty = false;
    ql.editing = false;
    toast(`« ${e.name} » enregistré.`, 'success', 2000);
    await reload([e.path]);
    if (ql.open) qlRender();
  }

  on(qlEl, 'click', (ev: MouseEvent) => {
    if (ev.target === qlEl) { void qlClose(); return; }
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-ql]');
    if (!b || b.disabled) return;
    const e = qlEntry();
    switch (b.dataset.ql) {
      case 'close': void qlClose(); break;
      case 'max': b.setAttribute('aria-pressed', String(qlEl.classList.toggle('is-max'))); break;
      case 'prev': void qlStep(-1); break;
      case 'next': void qlStep(1); break;
      case 'download': if (e) downloadPath(e.path); break;
      case 'open': if (e) { void qlClose().then(() => loadDir(e.path)); } break;
      case 'edit': qlEdit(); break;
      case 'cancel': void qlLeaveEdit().then((left) => { if (left) qlRender(); }); break;
      case 'save': void qlSave(); break;
    }
  });
  on(qlEl, 'keydown', (ev: KeyboardEvent) => {
    const t = ev.target as HTMLElement;
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); if (ql.editing) void qlSave(); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); void qlClose(); return; }
    if (ev.key === 'Tab') {
      const f = [...qlWin.querySelectorAll<HTMLElement>('button, textarea, iframe, video, audio, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.matches(':disabled') && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      return;
    }
    if (isTyping(t) || t.closest('video, audio') || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === ' ' && !t.closest('button')) { ev.preventDefault(); void qlClose(); }
    else if (ev.key === 'ArrowLeft' || (ev.key === 'ArrowUp' && !t.closest('.fx-code'))) { ev.preventDefault(); void qlStep(state.view === 'icons' && ev.key === 'ArrowUp' ? -gridCols() : -1); }
    else if (ev.key === 'ArrowRight' || (ev.key === 'ArrowDown' && !t.closest('.fx-code'))) { ev.preventDefault(); void qlStep(state.view === 'icons' && ev.key === 'ArrowDown' ? gridCols() : 1); }
  });
  on(window, 'beforeunload', (ev: BeforeUnloadEvent) => { if (ql.editing && ql.dirty) ev.preventDefault(); });

  /* ---------- Menus ---------- */
  function openMenu(x: number, y: number, items: MenuItem[]) {
    openUiMenu({
      x, y, label: 'Actions', returnFocus: listEl,
      items: items.map((it) => (it === 'sep' ? it : { label: it.label, icon: it.icon, hint: it.hint, danger: it.danger, run: it.act })),
    });
  }
  const viewItems = (): MenuItem[] => [
    state.view === 'icons'
      ? { label: 'Présentation en liste', icon: 'list', hint: hintKey('2'), act: () => setView('list') }
      : { label: 'Présentation en icônes', icon: 'apps', hint: hintKey('1'), act: () => setView('icons') },
    { label: state.showHidden ? 'Masquer les fichiers cachés' : 'Afficher les fichiers cachés', icon: 'eye', hint: IS_MAC ? '⌘⇧.' : 'Ctrl+Maj+.', act: toggleHidden },
  ];
  function menuForSelection(): MenuItem[] {
    const sel = selectedEntries();
    const n = sel.length;
    const items: MenuItem[] = [];
    if (n === 1) {
      const e = sel[0];
      items.push(e.isDir
        ? { label: 'Ouvrir', icon: 'open', hint: 'Entrée', act: () => openEntry(e.path) }
        : { label: `Coup d’œil sur « ${e.name.length > 28 ? e.name.slice(0, 27) + '…' : e.name} »`, icon: 'eye', hint: 'Espace', act: () => openEntry(e.path) });
      if (e.isDir) items.push({ label: 'Coup d’œil', icon: 'eye', hint: 'Espace', act: qlOpen });
      if (!e.isDir) items.push({ label: 'Télécharger', icon: 'download', act: () => downloadPath(e.path) });
      items.push({ label: 'Copier le chemin', icon: 'link', act: () => void copyPath(e.path) });
    }
    if (admin) {
      items.push('sep',
        { label: 'Couper', icon: 'scissors', hint: hintKey('X'), act: () => setClipboard('cut') },
        { label: 'Copier', icon: 'copy', hint: hintKey('C'), act: () => setClipboard('copy') },
      );
      if (n === 1 && sel[0].isDir && state.clipboard) items.push({ label: 'Coller dans ce dossier', icon: 'clipboard', act: () => doPaste(sel[0].path) });
      if (n === 1) items.push({ label: 'Renommer', icon: 'pencil', hint: 'F2', act: () => startRename(sel[0].path) });
      items.push('sep', { label: n > 1 ? `Supprimer (${n})` : 'Supprimer', icon: 'trash', hint: IS_MAC ? '⌘⌫' : 'Suppr', act: () => doDelete(selPaths()), danger: true });
    }
    return items;
  }
  function menuForBackground(): MenuItem[] {
    const items: MenuItem[] = [];
    if (admin) {
      items.push(...menuNew(), { label: 'Téléverser…', icon: 'upload', act: () => fileInput.click() });
      if (state.clipboard) items.push({ label: 'Coller', icon: 'clipboard', hint: hintKey('V'), act: () => doPaste() });
      items.push('sep');
    }
    items.push(...viewItems(), 'sep', { label: 'Copier le chemin du dossier', icon: 'link', act: () => void copyPath(state.cwd) }, { label: 'Actualiser', icon: 'refresh', hint: 'F5', act: () => reload(selPaths()) });
    return items;
  }
  const menuNew = (): MenuItem[] => [
    { label: 'Nouveau dossier', icon: 'folderPlus', act: () => startCreate('directory') },
    { label: 'Nouveau fichier', icon: 'file', act: () => startCreate('file') },
  ];

  on(listEl, 'contextmenu', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.fx-edit')) return;
    e.preventDefault();
    const it = (e.target as HTMLElement).closest<HTMLElement>('.fx-item[data-path]');
    if (!it) { openMenu(e.clientX, e.clientY, menuForBackground()); return; }
    if (!state.selected.has(it.dataset.path!)) selectOnly(it.dataset.path!);
    openMenu(e.clientX, e.clientY, menuForSelection());
  });

  /* ---------- Souris ---------- */
  on(listEl, 'click', (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('.fx-edit, thead')) return;
    const b = t.closest<HTMLElement>('#fx-state [data-act], #fx-state [data-path]');
    if (b) { b.dataset.act === 'refresh' ? reload() : loadDir(b.dataset.path!); return; }
    const it = t.closest<HTMLElement>('.fx-item[data-path]');
    if (!it) {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey) && state.selected.size) { state.selected.clear(); state.cursor = null; paint(); }
      return;
    }
    if (narrow() && !e.shiftKey) { openEntry(it.dataset.path!); return; }
    clickSelect(it.dataset.path!, e);
  });
  on(listEl, 'dblclick', (e: MouseEvent) => {
    const it = (e.target as HTMLElement).closest<HTMLElement>('.fx-item[data-path]');
    if (it && !(e.target as HTMLElement).closest('.fx-edit')) openEntry(it.dataset.path!);
  });

  on(tableEl.querySelector('thead')!, 'click', (e: MouseEvent) => {
    const th = (e.target as HTMLElement).closest<HTMLElement>('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort as SortKey;
    state.sortDir = state.sortKey === key ? -state.sortDir : 1;
    state.sortKey = key;
    renderItems();
    try { sessionStorage.setItem('fx-sort', JSON.stringify({ k: state.sortKey, d: state.sortDir })); } catch {}
  });
  try {
    const s = JSON.parse(sessionStorage.getItem('fx-sort') || 'null');
    if (s && ['name', 'mtime', 'type', 'size'].includes(s.k)) { state.sortKey = s.k; state.sortDir = s.d === -1 ? -1 : 1; }
  } catch {}

  on(filter, 'input', () => {
    state.query = filter.value;
    state.limit = PAGE;
    const keep = new Set(visible().map((e) => e.path));
    state.selected = new Set([...state.selected].filter((p) => keep.has(p)));
    renderItems();
  });

  /* ---------- Clavier ---------- */
  on(listEl, 'keydown', (e: KeyboardEvent) => {
    if (isTyping(e.target as Element)) return;
    const mod = e.metaKey || e.ctrlKey;
    const icons = state.view === 'icons';
    if (mod && e.key === 'ArrowDown') { e.preventDefault(); if (state.selected.size === 1) openEntry(selPaths()[0]); }
    else if (mod && e.key === 'ArrowUp') { e.preventDefault(); if (state.parent !== null) void loadDir(state.parent); }
    else if (mod || e.altKey) return;
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(icons ? gridCols() : 1, e.shiftKey); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(icons ? -gridCols() : -1, e.shiftKey); }
    else if (icons && e.key === 'ArrowRight') { e.preventDefault(); moveCursor(1, e.shiftKey); }
    else if (icons && e.key === 'ArrowLeft') { e.preventDefault(); moveCursor(-1, e.shiftKey); }
    else if (e.key === 'Home') { e.preventDefault(); moveCursor('home', e.shiftKey); }
    else if (e.key === 'End') { e.preventDefault(); moveCursor('end', e.shiftKey); }
    else if (e.key === 'Enter' && state.selected.size === 1) { e.preventDefault(); openEntry(selPaths()[0]); }
    else if (e.key === ' ') { e.preventDefault(); qlOpen(); }
    else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const r = ((state.cursor && itemEl(state.cursor)) || listEl).getBoundingClientRect();
      openMenu(r.left + 48, r.bottom, state.selected.size ? menuForSelection() : menuForBackground());
    } else if (e.key.length === 1 && e.key !== '/' && !e.shiftKey) { e.preventDefault(); typeAhead(e.key); }
  });

  /* ---------- Glisser-déposer (admins) ---------- */
  if (admin) {
    let dragPaths: string[] = [];
    const dropTarget = (el: EventTarget | null): { path: string; el: HTMLElement } | null => {
      const t = (el as HTMLElement | null)?.closest<HTMLElement>('.fx-item[data-dir="true"], .fx-crumb, .fx-place');
      return t?.dataset.path ? { path: t.dataset.path, el: t } : null;
    };
    const clearOver = () => root.querySelectorAll('.is-over').forEach((n) => n.classList.remove('is-over'));
    on(listEl, 'dragstart', (e: DragEvent) => {
      const it = (e.target as HTMLElement).closest<HTMLElement>('.fx-item[data-path]');
      if (!it) { e.preventDefault(); return; }
      const p = it.dataset.path!;
      dragPaths = state.selected.has(p) ? selPaths() : [p];
      e.dataTransfer?.setData('application/x-orvane-move', '1');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    on(listEl, 'dragend', () => { dragPaths = []; clearOver(); });
    on(root, 'dragover', (e: DragEvent) => {
      const types = e.dataTransfer?.types ?? [];
      const internal = types.includes('application/x-orvane-move');
      const files = types.includes('Files');
      if (!internal && !files) return;
      const tgt = dropTarget(e.target);
      if (internal && !tgt) return;
      e.preventDefault();
      clearOver();
      tgt?.el.classList.add('is-over');
      if (files && !internal) dropVeil.hidden = !!tgt && tgt.el.matches('.fx-item');
    });
    on(root, 'dragleave', (e: DragEvent) => {
      if (!root.contains(e.relatedTarget as Node)) { clearOver(); dropVeil.hidden = true; }
    });
    on(root, 'drop', (e: DragEvent) => {
      const types = e.dataTransfer?.types ?? [];
      const tgt = dropTarget(e.target);
      clearOver();
      dropVeil.hidden = true;
      if (types.includes('application/x-orvane-move')) {
        if (!tgt || !dragPaths.length) return;
        e.preventDefault();
        const paths = dragPaths.filter((p) => p !== tgt.path && !tgt.path.startsWith(p + '/'));
        dragPaths = [];
        if (paths.length) doMove(paths, tgt.path);
        return;
      }
      if (e.dataTransfer?.files?.length) {
        e.preventDefault();
        uploadFiles(e.dataTransfer.files, tgt ? tgt.path : state.cwd);
      }
    });
  }
  on(document, 'dragover', (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  on(document, 'drop', (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });

  /* ---------- Navigation ---------- */
  const go = (path: string) => loadDir(path);
  on(crumbs, 'click', (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('a[data-path]');
    if (a) { e.preventDefault(); go(a.dataset.path!); }
  });
  on($('fx-nav'), 'click', (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-path]');
    if (b) go(b.dataset.path!);
  });

  const addr = $<HTMLInputElement>('fx-addr');
  function editAddress() {
    addr.value = state.cwd;
    crumbs.hidden = true; addr.hidden = false;
    addr.focus(); addr.select();
  }
  function endAddress(commit: boolean) {
    if (addr.hidden) return;
    const v = addr.value.trim();
    addr.hidden = true; crumbs.hidden = false;
    if (commit && v && v !== state.cwd) loadDir(v.startsWith('/') ? v : '/' + v);
  }
  on(addr, 'keydown', (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); endAddress(true); }
    if (e.key === 'Escape') { e.preventDefault(); endAddress(false); }
  });
  on(addr, 'blur', () => endAddress(false));
  on($('fx-address'), 'click', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, input')) return;
    editAddress();
  });

  const actions: Record<string, (btn: HTMLElement) => void> = {
    'new': (btn) => { const r = btn.getBoundingClientRect(); openMenu(r.left, r.bottom + 4, menuNew()); },
    upload: () => fileInput.click(),
    actions: (btn) => { const r = btn.getBoundingClientRect(); openMenu(r.left, r.bottom + 4, state.selected.size ? [...menuForSelection(), 'sep', ...viewItems()] : menuForBackground()); },
    quicklook: () => qlOpen(),
    'view-icons': () => setView('icons'),
    'view-list': () => setView('list'),
    back: () => history.back(),
    forward: () => history.forward(),
  };
  on(cmdbar, 'click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!btn || btn.disabled) return;
    actions[btn.dataset.act!]?.(btn);
  });

  const ready = () => root.isConnected && !ql.open && !document.querySelector('.dlg-overlay');
  const when = (fn: () => void) => () => { if (ready()) fn(); };
  const rename = () => { const p = selPaths()[0]; if (p && state.selected.size === 1) startRename(p); };
  const up = () => { if (state.parent !== null) go(state.parent); };
  on(document, 'keydown', (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || !['a', 'c', 'x', 'v'].includes(e.key.toLowerCase())) return;
    const textSelected = !!window.getSelection()?.toString();
    if (isTyping(document.activeElement) || (textSelected && e.key.toLowerCase() !== 'a')) e.stopPropagation();
  }, true);
  // ⌘⇧. comme dans le Finder ; la touche varie selon le clavier (« . », « > », AZERTY…).
  on(document, 'keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.code === 'Period' || e.key === '.' || e.key === '>') && ready() && !isTyping(document.activeElement)) {
      e.preventDefault();
      toggleHidden();
    }
  });

  const unShortcuts = registerShortcuts([
    { keys: 'Mod+A', title: 'Tout sélectionner', group: 'Explorateur', run: when(selectAll) },
    { keys: 'Mod+1', title: 'Présentation en icônes', group: 'Explorateur', run: when(() => setView('icons')) },
    { keys: 'Mod+2', title: 'Présentation en liste', group: 'Explorateur', run: when(() => setView('list')) },
    { keys: 'F5', title: 'Actualiser', group: 'Explorateur', run: when(() => { void reload(selPaths()); }) },
    { keys: 'Backspace', title: 'Dossier parent', group: 'Explorateur', run: when(up) },
    { keys: 'Alt+ArrowUp', title: 'Dossier parent', group: 'Explorateur', run: when(up) },
    { keys: 'Alt+ArrowLeft', title: 'Précédent', group: 'Explorateur', run: when(() => history.back()) },
    { keys: 'Alt+ArrowRight', title: 'Suivant', group: 'Explorateur', run: when(() => history.forward()) },
    { keys: 'Mod+L', title: 'Saisir un chemin', group: 'Explorateur', run: when(editAddress) },
    ...(admin ? [
      { keys: 'Mod+X', title: 'Couper', group: 'Explorateur', run: when(() => setClipboard('cut')) },
      { keys: 'Mod+C', title: 'Copier', group: 'Explorateur', run: when(() => setClipboard('copy')) },
      { keys: 'Mod+V', title: 'Coller', group: 'Explorateur', run: when(() => { void doPaste(); }) },
      { keys: 'Delete', title: 'Supprimer la sélection', group: 'Explorateur', run: when(() => { void doDelete(selPaths()); }) },
      { keys: 'Mod+Backspace', title: 'Supprimer la sélection', group: 'Explorateur', run: when(() => { void doDelete(selPaths()); }) },
      { keys: 'F2', title: 'Renommer', group: 'Explorateur', run: when(rename) },
    ] : []),
  ]);
  const unCommands = registerCommands([
    ...(admin ? [
      { id: 'fx-new-dir', title: 'Nouveau dossier', group: 'Fichiers', icon: 'folderPlus' as IconName, keywords: ['créer', 'répertoire'], run: () => startCreate('directory') },
      { id: 'fx-new-file', title: 'Nouveau fichier', group: 'Fichiers', icon: 'add' as IconName, keywords: ['créer'], run: () => startCreate('file') },
      { id: 'fx-upload', title: 'Téléverser des fichiers…', group: 'Fichiers', icon: 'upload' as IconName, keywords: ['envoyer', 'upload'], run: () => fileInput.click() },
      { id: 'fx-delete', title: 'Supprimer la sélection', group: 'Fichiers', icon: 'trash' as IconName, run: () => void doDelete(selPaths()) },
    ] : []),
    { id: 'fx-refresh', title: 'Actualiser le dossier', group: 'Fichiers', icon: 'refresh', run: () => void reload(selPaths()) },
    { id: 'fx-up', title: 'Aller au dossier parent', group: 'Fichiers', icon: 'arrowUp', run: up },
    { id: 'fx-root', title: 'Aller à la racine /', group: 'Fichiers', icon: 'hardDrive', run: () => go('/') },
    { id: 'fx-path', title: 'Aller au dossier…', group: 'Fichiers', icon: 'enter', keywords: ['adresse', 'chemin'], run: editAddress },
    { id: 'fx-quicklook', title: 'Coup d’œil', group: 'Fichiers', icon: 'eye', keywords: ['aperçu', 'ouvrir'], run: qlOpen },
    { id: 'fx-view-icons', title: 'Présentation en icônes', group: 'Fichiers', icon: 'apps', run: () => setView('icons') },
    { id: 'fx-view-list', title: 'Présentation en liste', group: 'Fichiers', icon: 'list', run: () => setView('list') },
    { id: 'fx-hidden', title: 'Afficher / masquer les fichiers cachés', group: 'Fichiers', icon: 'eye', run: toggleHidden },
    { id: 'fx-select-all', title: 'Tout sélectionner', group: 'Fichiers', icon: 'check', run: selectAll },
    ...[['Nom', 'name'], ['Date de modification', 'mtime'], ['Type', 'type'], ['Taille', 'size']].map(([label, key]) => ({
      id: `fx-sort-${key}`, title: `Trier par ${label.toLowerCase()}`, group: 'Fichiers', icon: 'arrowUpDown' as IconName,
      run: () => { state.sortKey = key as SortKey; state.sortDir = 1; renderItems(); },
    })),
  ]);

  on(document, 'astro:before-swap', () => {
    closeMenu(); clearTimeout(upHide);
    unShortcuts(); unCommands();
    cleanups.forEach((fn) => fn());
    qlEl.remove();
  }, { once: true });

  on(window, 'popstate', () => {
    if (!root.isConnected) return;
    if (ql.editing && ql.dirty) {
      // « Précédent » ne s'annule pas : on revient sur le fichier en cours plutôt que de perdre la saisie.
      history.pushState(history.state, '', `/fichiers?path=${encodeURIComponent(state.cwd)}&file=${encodeURIComponent(qlEntry()?.path ?? '')}`);
      toast('Enregistrez ou annulez vos modifications avant de quitter ce fichier.', 'warning');
      return;
    }
    if (ql.open) { ql.editing = false; ql.open = false; qlEl.hidden = true; qlBody.innerHTML = ''; }
    const q = new URLSearchParams(location.search);
    loadDir(q.get('path') ?? '/', { push: false, file: q.get('file') ?? undefined });
  });

  const q0 = new URLSearchParams(location.search);
  renderSkeleton();
  paintHeaders();
  void loadDir(q0.get('path') ?? state.cwd, { push: false, file: q0.get('file') ?? undefined });
});
