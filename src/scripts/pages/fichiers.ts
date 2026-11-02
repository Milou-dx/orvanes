import { confirmDialog, toast } from '../ui/dialog';
import { IS_MAC, registerCommands, registerShortcuts } from '../ui/commands';
import { buttonHTML, emptyStateHTML, errorStateHTML, esc, iconSVG } from '../ui/html';
import { openMenu as openUiMenu, closeMenu } from '../ui/menu';
import type { IconName } from '../../components/ui/lucide';
import { bytes as fmtBytes, dateTime as fmtDate } from '../../server/core/format';

type Entry = { name: string; isDir: boolean; sizeBytes: number; mode: string; mtime: string; path: string };
type SortKey = 'name' | 'mtime' | 'type' | 'size';
type MenuItem = { label: string; icon?: IconName; hint?: string; act: () => void; danger?: boolean } | 'sep';

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico']);
const PREVIEW_KEY = 'fx-preview';

const joinPath = (dir: string, name: string) => (dir === '/' ? `/${name}` : `${dir}/${name}`);
const ext = (name: string) => (name.includes('.') && !name.startsWith('.') ? name.split('.').pop()!.toLowerCase() : '');
const typeLabel = (e: Entry) => (e.isDir ? 'Dossier' : ext(e.name) ? `Fichier ${ext(e.name).toUpperCase()}` : 'Fichier');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const narrow = () => window.matchMedia('(max-width: 40rem)').matches;
const isTyping = (el: Element | null) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable);

document.addEventListener('astro:page-load', () => {
  const root = document.getElementById('fx');
  if (!root) return;

  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const listEl = $('fx-list');
  const tbody = $('fx-tbody') as HTMLTableSectionElement;
  const tableEl = $('fx-table');
  const stateEl = $('fx-state');
  const statusEl = $('fx-status');
  const clipEl = $('fx-clip');
  const crumbs = $('fx-crumbs');
  const branches = Array.from(root.querySelectorAll<HTMLElement>('.fx-branch'));
  const diskBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.fx-disk'));
  const cmdbar = $('fx-cmdbar');
  const fileInput = $<HTMLInputElement>('fx-file-input');
  const filter = $<HTMLInputElement>('fx-filter');
  const selAll = $<HTMLInputElement>('fx-sel-all');
  const upBox = $('fx-upload');
  const upFill = $('fx-upload-fill');
  const upMsg = $('fx-upload-msg');
  const dropVeil = $('fx-drop');
  const pv = $('fx-preview');
  const pvTitle = $('fx-pv-title');
  const pvBody = $('fx-pv-body');

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
    query: '',
    loading: true,
    creating: false,
    previewOn: false,
  };
  let loadToken = 0;
  let pvToken = 0;
  let pvTimer = 0;
  const cleanups: Array<() => void> = [];
  const on = (t: EventTarget, ev: string, fn: (e: any) => void, opts?: boolean | AddEventListenerOptions) => {
    t.addEventListener(ev, fn, opts);
    cleanups.push(() => t.removeEventListener(ev, fn, opts));
  };

  function visible(): Entry[] {
    const q = state.query.trim().toLowerCase();
    const list = q ? state.entries.filter((e) => e.name.toLowerCase().includes(q)) : [...state.entries];
    const dir = state.sortDir;
    const cmp = (a: Entry, b: Entry) => {
      switch (state.sortKey) {
        case 'size': return dir * (a.sizeBytes - b.sizeBytes) || a.name.localeCompare(b.name, 'fr');
        case 'mtime': return dir * (a.mtime < b.mtime ? -1 : a.mtime > b.mtime ? 1 : 0);
        case 'type': return dir * typeLabel(a).localeCompare(typeLabel(b), 'fr') || a.name.localeCompare(b.name, 'fr');
        default: return dir * a.name.localeCompare(b.name, 'fr', { numeric: true });
      }
    };
    return [...list.filter((e) => e.isDir).sort(cmp), ...list.filter((e) => !e.isDir).sort(cmp)];
  }
  const selectedEntries = () => state.entries.filter((e) => state.selected.has(e.path));
  const selPaths = () => [...state.selected];

  function rowHTML(e: Entry): string {
    const sel = state.selected.has(e.path);
    const cut = state.clipboard?.mode === 'cut' && state.clipboard.paths.includes(e.path);
    return `<tr class="fx-row${sel ? ' is-selected' : ''}${cut ? ' is-cut' : ''}" role="row" aria-selected="${sel}" data-path="${esc(e.path)}" data-dir="${e.isDir}" draggable="true">
      <td class="fx-chk"><input type="checkbox" tabindex="-1" aria-label="Sélectionner ${esc(e.name)}"${sel ? ' checked' : ''}></td>
      <td><span class="fx-name${e.isDir ? ' is-dir' : ''}">${iconSVG(e.isDir ? 'folder' : 'file', 16)}<span class="fx-name__t">${esc(e.name)}</span></span></td>
      <td class="is-muted is-nowrap fx-hide-sm">${esc(fmtDate(e.mtime))}</td>
      <td class="is-muted is-nowrap fx-hide-md">${esc(typeLabel(e))}</td>
      <td class="al-right is-nowrap${e.isDir ? ' is-muted' : ''}">${e.isDir ? '' : esc(fmtBytes(e.sizeBytes))}</td>
      <td class="is-mono is-muted fx-hide-md">${esc(e.mode)}</td>
    </tr>`;
  }

  function renderRows() {
    const items = visible();
    const rows: string[] = [];
    if (state.parent !== null && !state.query) {
      rows.push(`<tr class="fx-row fx-row--up" data-parent="1"><td></td><td colspan="5"><span class="fx-name is-dir">${iconSVG('arrowUp', 16)}<span class="fx-name__t">Dossier parent</span></span></td></tr>`);
    }
    rows.push(...items.map(rowHTML));
    tbody.innerHTML = rows.join('');

    const showTable = !state.loading && (items.length > 0 || state.parent !== null || state.creating);
    tableEl.hidden = !showTable && !state.loading;
    if (!state.loading && !items.length && !state.creating) {
      stateEl.hidden = false;
      stateEl.innerHTML = state.query
        ? emptyStateHTML({ icon: 'search', title: 'Aucun résultat', text: `Aucun élément ne correspond à « ${state.query} » dans ce dossier.`, compact: true })
        : emptyStateHTML({ icon: 'folder', title: 'Ce dossier est vide', text: 'Glisse des fichiers ici ou utilise Nouveau et Téléverser.', compact: true });
    } else if (!state.loading) {
      stateEl.hidden = true;
      stateEl.innerHTML = '';
    }
    paint();
    paintHeaders();
  }

  function renderSkeleton() {
    stateEl.hidden = true;
    tableEl.hidden = false;
    tbody.innerHTML = Array.from({ length: 8 }, (_, i) =>
      `<tr class="fx-skel"><td></td><td><span class="skeleton" style="--w:${40 + ((i * 17) % 35)}%;--h:1rem;--r:var(--radius-sm)"></span></td><td><span class="skeleton" style="--w:70%;--h:1rem;--r:var(--radius-sm)"></span></td><td class="fx-hide-md"><span class="skeleton" style="--w:50%;--h:1rem;--r:var(--radius-sm)"></span></td><td><span class="skeleton" style="--w:40%;--h:1rem;--r:var(--radius-sm)"></span></td><td class="fx-hide-md"></td></tr>`).join('');
  }

  function renderError(message: string) {
    tableEl.hidden = true;
    stateEl.hidden = false;
    stateEl.innerHTML = errorStateHTML({ title: 'Dossier inaccessible', text: message, compact: true })
      + `<div class="fx-retry">${buttonHTML('Réessayer', { size: 'sm', data: { act: 'refresh' } })}${buttonHTML('Aller à la racine', { size: 'sm', data: { path: '/' } })}</div>`;
  }

  function paint() {
    for (const tr of tbody.querySelectorAll<HTMLElement>('tr[data-path]')) {
      const p = tr.dataset.path!;
      const sel = state.selected.has(p);
      tr.classList.toggle('is-selected', sel);
      tr.classList.toggle('is-cut', state.clipboard?.mode === 'cut' && state.clipboard.paths.includes(p));
      tr.classList.toggle('is-cursor', p === state.cursor);
      tr.setAttribute('aria-selected', String(sel));
      const box = tr.querySelector<HTMLInputElement>('.fx-chk input');
      if (box) box.checked = sel;
    }
    const items = visible();
    const nSel = state.selected.size;
    const dirs = items.filter((e) => e.isDir).length;
    const sel = selectedEntries();
    const selSize = sel.filter((e) => !e.isDir).reduce((s, e) => s + e.sizeBytes, 0);
    statusEl.textContent = state.loading ? 'Chargement…'
      : [plural(items.length, 'élément'), dirs ? plural(dirs, 'dossier') : '',
         nSel ? `${plural(nSel, 'sélectionné')}${selSize ? ` (${fmtBytes(selSize)})` : ''}` : ''].filter(Boolean).join(' · ');
    clipEl.textContent = state.clipboard
      ? `${plural(state.clipboard.paths.length, 'élément')} ${state.clipboard.mode === 'cut' ? 'à déplacer' : 'copié'}${state.clipboard.paths.length > 1 && state.clipboard.mode === 'copy' ? 's' : ''}`
      : '';
    selAll.checked = items.length > 0 && items.every((e) => state.selected.has(e.path));
    selAll.indeterminate = nSel > 0 && !selAll.checked;
    selAll.disabled = !items.length;

    const one = sel.length === 1 ? sel[0] : null;
    setCmd('rename', !!one);
    setCmd('cut', nSel >= 1);
    setCmd('copy', nSel >= 1);
    setCmd('paste', !!state.clipboard);
    setCmd('download', !!one && !one.isDir);
    setCmd('delete', nSel >= 1);
    setCmd('up', state.parent !== null);
    schedulePreview();
  }
  function setCmd(act: string, enabled: boolean) {
    cmdbar.querySelectorAll<HTMLButtonElement>(`[data-act="${act}"]`).forEach((b) => { b.disabled = !enabled; });
  }

  function paintHeaders() {
    for (const th of root!.querySelectorAll<HTMLElement>('th[data-sort]')) {
      const active = th.dataset.sort === state.sortKey;
      th.setAttribute('aria-sort', active ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none');
      const arrow = th.querySelector('.fx-arrow');
      if (arrow) arrow.innerHTML = active ? iconSVG(state.sortDir === 1 ? 'chevronUp' : 'chevronDown', 16) : '';
    }
  }

  function paintNav() {
    const segs = state.cwd.split('/').filter(Boolean);
    let acc = '';
    crumbs.innerHTML = `<a href="/fichiers?path=%2F" class="fx-crumb" data-path="/" aria-label="Racine">${iconSVG('hardDrive', 16)}</a>`
      + segs.map((s, i) => {
        acc += '/' + s;
        const cur = i === segs.length - 1;
        return `<span class="fx-sep" aria-hidden="true">${iconSVG('chevronRight', 16)}</span><a href="/fichiers?path=${encodeURIComponent(acc)}" class="fx-crumb" data-path="${esc(acc)}"${cur ? ' aria-current="page"' : ''}>${esc(s)}</a>`;
      }).join('');
    crumbs.scrollLeft = crumbs.scrollWidth;

    let best: HTMLButtonElement | null = null;
    for (const b of diskBtns) {
      const p = b.dataset.path!;
      const inside = state.cwd === p || state.cwd.startsWith(p === '/' ? '/' : p + '/');
      if (inside && (!best || p.length > best.dataset.path!.length)) best = b;
    }
    diskBtns.forEach((b) => { b.classList.toggle('is-active', b === best); b.toggleAttribute('aria-current', b === best); });
    branches.forEach((br) => { br.innerHTML = ''; });
    if (best) {
      const base = best.dataset.path!;
      const rest = state.cwd.slice(base === '/' ? 1 : base.length + 1).split('/').filter(Boolean);
      let p = base;
      const html = rest.map((s, i) => {
        p = joinPath(p, s);
        return `<button type="button" class="fx-node${i === rest.length - 1 ? ' is-active' : ''}" style="--depth:${i + 1}" data-path="${esc(p)}">${iconSVG('folder', 16)}<span>${esc(s)}</span></button>`;
      }).join('');
      const target = best.nextElementSibling as HTMLElement | null;
      if (target?.classList.contains('fx-branch')) target.innerHTML = html;
    }
    root!.dataset.cwd = state.cwd;
    $('fx-title').textContent = segs.length ? segs[segs.length - 1] : 'Racine';
    document.title = `${segs.length ? segs[segs.length - 1] : '/'} · Fichiers`;
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
      if (state.entries.length) { toast(data.error ?? 'Dossier inaccessible', 'error'); renderRows(); }
      else { paintNav(); renderError(data.error ?? 'Dossier inaccessible'); paint(); }
      return;
    }
    state.cwd = data.cwd;
    state.parent = data.parent;
    state.entries = [...data.dirs, ...data.files].map((e: any) => ({ ...e, path: joinPath(data.cwd, e.name) }));
    state.selected = new Set((opts.select ?? []).filter((p) => state.entries.some((e) => e.path === p)));
    state.anchor = state.cursor = [...state.selected][0] ?? null;
    if (!opts.keepQuery) { state.query = ''; filter.value = ''; }
    state.creating = false;
    paintNav();
    renderRows();
    if (opts.push !== false) history.pushState({ fx: state.cwd }, '', `/fichiers?path=${encodeURIComponent(state.cwd)}`);
    if (opts.file) selectOnly(opts.file, true);
    else if (state.selected.size === 1) tbody.querySelector(`tr[data-path="${CSS.escape([...state.selected][0])}"]`)?.scrollIntoView({ block: 'nearest' });
    else listEl.scrollTop = 0;
  }
  const reload = (select?: string[]) => loadDir(state.cwd, { push: false, select: select ?? [], keepQuery: true });

  function selectOnly(path: string, reveal = false) {
    state.selected = new Set([path]);
    state.anchor = state.cursor = path;
    paint();
    if (reveal) {
      tbody.querySelector(`tr[data-path="${CSS.escape(path)}"]`)?.scrollIntoView({ block: 'nearest' });
      if (!state.previewOn) setPreview(true, false);
    }
  }

  function clickSelect(path: string, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }, toggle = false) {
    if (e.shiftKey && state.anchor) {
      const order = visible().map((it) => it.path);
      const a = order.indexOf(state.anchor);
      const b = order.indexOf(path);
      if (a !== -1 && b !== -1) {
        state.selected = new Set(order.slice(Math.min(a, b), Math.max(a, b) + 1));
        state.cursor = path;
      }
    } else if (e.ctrlKey || e.metaKey || toggle) {
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
  function moveCursor(delta: number | 'home' | 'end', extend: boolean) {
    const order = visible().map((e) => e.path);
    if (!order.length) return;
    const cur = state.cursor ? order.indexOf(state.cursor) : -1;
    const idx = delta === 'home' ? 0 : delta === 'end' ? order.length - 1 : Math.min(order.length - 1, Math.max(0, (cur === -1 ? (delta > 0 ? -1 : order.length) : cur) + delta));
    const path = order[idx];
    clickSelect(path, { shiftKey: extend, ctrlKey: false, metaKey: false });
    tbody.querySelector(`tr[data-path="${CSS.escape(path)}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  async function post(url: string, body: unknown) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch {
      return { ok: false, data: { error: 'Le serveur ne répond pas.' } };
    }
  }
  const reportErrors = (data: any) => { if (data?.errors?.length) toast(data.errors.join('\n'), 'error'); };

  async function doDelete(paths: string[]) {
    if (!paths.length) return;
    const names = paths.map((p) => p.split('/').pop()!);
    const label = paths.length === 1 ? `« ${names[0]} »` : `ces ${paths.length} éléments`;
    const detail = paths.length > 1 ? names.slice(0, 6).join(', ') + (names.length > 6 ? `… (+${names.length - 6})` : '') : '';
    if (!(await confirmDialog({
      title: `Supprimer définitivement ${label} ?`,
      message: `${detail ? detail + '. ' : ''}Cette action est irréversible (pas de corbeille).`,
      confirmLabel: 'Supprimer', danger: true,
    }))) return;
    const { data } = await post('/api/files/delete', { paths });
    reportErrors(data);
    if (!data.errors?.length) toast(paths.length > 1 ? `${paths.length} éléments supprimés.` : 'Élément supprimé.', 'success');
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
    await reload();
  }
  async function doPaste(destDir = state.cwd) {
    if (!state.clipboard) return;
    const cut = state.clipboard.mode === 'cut';
    const { data } = await post(cut ? '/api/files/move' : '/api/files/copy', { paths: state.clipboard.paths, destDir });
    reportErrors(data);
    if (cut) state.clipboard = null;
    await reload();
  }
  function setClipboard(mode: 'copy' | 'cut') {
    if (!state.selected.size) return;
    state.clipboard = { mode, paths: selPaths() };
    paint();
    toast(`${plural(state.clipboard.paths.length, 'élément')} ${mode === 'cut' ? 'prêt à déplacer' : 'copié'}${mode === 'copy' && state.clipboard.paths.length > 1 ? 's' : ''}.`, 'info', 2000);
  }
  function downloadPath(path: string) {
    const a = document.createElement('a');
    a.href = `/api/files/download?path=${encodeURIComponent(path)}`;
    a.click();
  }
  function openEntry(path: string) {
    const e = state.entries.find((x) => x.path === path);
    if (!e) return;
    if (e.isDir) { loadDir(path); return; }
    selectOnly(path);
    if (!state.previewOn) setPreview(true, false);
  }

  function inlineEdit(input: HTMLInputElement, commit: (v: string) => Promise<void> | void, cancel: () => void, initial: string) {
    input.focus();
    const dot = initial.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : initial.length);
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
    const span = tbody.querySelector<HTMLElement>(`tr[data-path="${CSS.escape(path)}"] .fx-name__t`);
    if (!span) return;
    const original = span.textContent || '';
    const input = document.createElement('input');
    input.className = 'fx-edit';
    input.value = original;
    input.setAttribute('aria-label', `Nouveau nom de ${original}`);
    span.replaceWith(input);
    inlineEdit(input, (v) => doRename(path, v), renderRows, original);
  }
  function startCreate(type: 'file' | 'directory') {
    state.creating = true;
    tableEl.hidden = false;
    stateEl.hidden = true;
    const name = type === 'directory' ? 'Nouveau dossier' : 'nouveau-fichier.txt';
    const tr = document.createElement('tr');
    tr.className = 'fx-row fx-row--new';
    tr.innerHTML = `<td></td><td colspan="5"><span class="fx-name${type === 'directory' ? ' is-dir' : ''}">${iconSVG(type === 'directory' ? 'folder' : 'file', 16)}<input class="fx-edit" aria-label="Nom du ${type === 'directory' ? 'dossier' : 'fichier'}" value="${esc(name)}"></span></td>`;
    const up = tbody.querySelector('.fx-row--up');
    up ? up.after(tr) : tbody.prepend(tr);
    tr.scrollIntoView({ block: 'nearest' });
    inlineEdit(tr.querySelector('input')!, (v) => { state.creating = false; return doCreate(type, v); }, () => { state.creating = false; renderRows(); }, '');
  }

  let upHide = 0;
  function uploadFiles(files: FileList | File[], dest = state.cwd) {
    const list = Array.from(files);
    if (!list.length) return;
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

  function setPreview(open: boolean, persist = true) {
    state.previewOn = open;
    root!.classList.toggle('fx--preview', open);
    cmdbar.querySelector<HTMLElement>('[data-act="preview"]')?.setAttribute('aria-pressed', String(open));
    if (persist) try { localStorage.setItem(PREVIEW_KEY, open ? '1' : '0'); } catch {}
    if (open) schedulePreview(0); else history.replaceState(history.state, '', `/fichiers?path=${encodeURIComponent(state.cwd)}`);
  }
  function schedulePreview(delay = 160) {
    if (!state.previewOn) return;
    clearTimeout(pvTimer);
    pvTimer = window.setTimeout(renderPreview, delay);
  }
  const kv = (rows: Array<[string, string]>) =>
    `<dl class="fx-kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

  async function renderPreview() {
    const sel = selectedEntries();
    const token = ++pvToken;
    if (sel.length === 0) {
      pvTitle.textContent = 'Aperçu';
      pvBody.innerHTML = emptyStateHTML({ icon: 'eye', title: 'Aucun élément sélectionné', text: 'Sélectionnez un fichier pour en voir le contenu.', compact: true });
      return;
    }
    if (sel.length > 1) {
      const total = sel.filter((e) => !e.isDir).reduce((s, e) => s + e.sizeBytes, 0);
      pvTitle.textContent = `${sel.length} éléments`;
      pvBody.innerHTML = kv([['Dossiers', String(sel.filter((e) => e.isDir).length)], ['Fichiers', String(sel.filter((e) => !e.isDir).length)], ['Taille cumulée', fmtBytes(total)]]);
      return;
    }
    const e = sel[0];
    pvTitle.textContent = e.name;
    const meta = kv([
      ['Type', typeLabel(e)], ...(e.isDir ? [] : [['Taille', fmtBytes(e.sizeBytes)] as [string, string]]),
      ['Modifié', fmtDate(e.mtime)], ['Droits', e.mode], ['Chemin', e.path],
    ]);
    const actions = `<div class="fx-pv-actions">${e.isDir
      ? buttonHTML('Ouvrir le dossier', { size: 'sm', data: { act: 'open' } })
      : buttonHTML('Télécharger', { size: 'sm', data: { act: 'download' } })}</div>`;
    if (e.isDir) { pvBody.innerHTML = meta + actions; return; }

    if (IMAGE_EXT.has(ext(e.name))) {
      pvBody.innerHTML = `<div class="fx-pv-img"><img alt="Aperçu de ${esc(e.name)}" src="/api/files/download?path=${encodeURIComponent(e.path)}"></div>${meta}${actions}`;
      return;
    }
    pvBody.innerHTML = `${meta}${actions}<div class="fx-pv-load"><span class="skeleton" style="--w:90%;--h:1rem;--r:var(--radius-sm)"></span><span class="skeleton" style="--w:70%;--h:1rem;--r:var(--radius-sm)"></span><span class="skeleton" style="--w:80%;--h:1rem;--r:var(--radius-sm)"></span></div>`;
    let res: Response; let data: any;
    try {
      res = await fetch(`/api/files/read?path=${encodeURIComponent(e.path)}`, { cache: 'no-store' });
      data = await res.json().catch(() => ({ error: 'Réponse illisible du serveur.' }));
    } catch { if (token === pvToken) pvBody.querySelector('.fx-pv-load')!.outerHTML = errorStateHTML({ title: 'Lecture impossible', text: 'Le serveur ne répond pas.', compact: true }); return; }
    if (token !== pvToken) return;
    const slot = pvBody.querySelector('.fx-pv-load');
    if (!slot) return;
    if (!res.ok) slot.outerHTML = errorStateHTML({ title: 'Lecture impossible', text: data.error ?? 'Fichier illisible.', compact: true });
    else if (data.binary) slot.outerHTML = emptyStateHTML({ icon: 'file', title: 'Fichier binaire', text: 'Aperçu indisponible. Utilisez Télécharger.', compact: true });
    else {
      slot.outerHTML = `<pre class="fx-code" tabindex="0">${esc(data.content)}</pre>${data.truncated ? '<p class="fx-note">Fichier long : seule la fin est affichée.</p>' : ''}`;
      history.replaceState(history.state, '', `/fichiers?path=${encodeURIComponent(state.cwd)}&file=${encodeURIComponent(e.path)}`);
    }
  }
  on(pv, 'click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b) return;
    const one = selectedEntries()[0];
    if (b.dataset.act === 'close-preview') setPreview(false);
    else if (b.dataset.act === 'download' && one) downloadPath(one.path);
    else if (b.dataset.act === 'open' && one) loadDir(one.path);
  });

  function openMenu(x: number, y: number, items: MenuItem[]) {
    openUiMenu({
      x, y, label: 'Actions', returnFocus: listEl,
      items: items.map((it) => (it === 'sep' ? it : { label: it.label, icon: it.icon, hint: it.hint, danger: it.danger, run: it.act })),
    });
  }

  const hintKey = (k: string) => (IS_MAC ? `⌘${k}` : `Ctrl+${k}`);
  function menuForSelection(): MenuItem[] {
    const sel = selectedEntries();
    const n = sel.length;
    const items: MenuItem[] = [];
    if (n === 1) {
      const e = sel[0];
      items.push({ label: e.isDir ? 'Ouvrir' : 'Aperçu', icon: e.isDir ? 'open' : 'eye', hint: 'Entrée', act: () => openEntry(e.path) });
      if (!e.isDir) items.push({ label: 'Télécharger', icon: 'download', act: () => downloadPath(e.path) });
      items.push('sep');
    }
    items.push(
      { label: 'Couper', icon: 'scissors', hint: hintKey('X'), act: () => setClipboard('cut') },
      { label: 'Copier', icon: 'copy', hint: hintKey('C'), act: () => setClipboard('copy') },
    );
    if (n === 1 && sel[0].isDir && state.clipboard) items.push({ label: 'Coller dans ce dossier', icon: 'clipboard', act: () => doPaste(sel[0].path) });
    if (n === 1) items.push({ label: 'Renommer', icon: 'pencil', hint: 'F2', act: () => startRename(sel[0].path) });
    items.push('sep', { label: n > 1 ? `Supprimer (${n})` : 'Supprimer', icon: 'trash', hint: 'Suppr', act: () => doDelete(selPaths()), danger: true });
    return items;
  }
  function menuForBackground(): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Nouveau dossier', icon: 'folderPlus', act: () => startCreate('directory') },
      { label: 'Nouveau fichier', icon: 'add', act: () => startCreate('file') },
      { label: 'Téléverser…', icon: 'upload', act: () => fileInput.click() },
    ];
    if (state.clipboard) items.push('sep', { label: 'Coller', icon: 'clipboard', hint: hintKey('V'), act: () => doPaste() });
    items.push('sep', { label: 'Actualiser', icon: 'refresh', hint: 'F5', act: () => reload(selPaths()) });
    return items;
  }
  const menuNew = (): MenuItem[] => [
    { label: 'Dossier', icon: 'folderPlus', act: () => startCreate('directory') },
    { label: 'Fichier texte', icon: 'file', act: () => startCreate('file') },
  ];

  on(listEl, 'contextmenu', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.fx-edit')) return;
    e.preventDefault();
    const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-path]');
    if (!tr) { openMenu(e.clientX, e.clientY, menuForBackground()); return; }
    if (!state.selected.has(tr.dataset.path!)) selectOnly(tr.dataset.path!);
    openMenu(e.clientX, e.clientY, menuForSelection());
  });

  on(tbody, 'click', (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('.fx-edit')) return;
    const tr = t.closest<HTMLElement>('tr');
    if (!tr) return;
    if (tr.dataset.parent) { if (state.parent !== null) loadDir(state.parent); return; }
    const path = tr.dataset.path;
    if (!path) return;
    if (t.closest('.fx-chk')) { clickSelect(path, e, true); return; }
    if (narrow() && !e.shiftKey) { openEntry(path); return; }
    clickSelect(path, e);
  });
  on(tbody, 'dblclick', (e: MouseEvent) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-path]');
    if (tr && !(e.target as HTMLElement).closest('.fx-chk, .fx-edit')) openEntry(tr.dataset.path!);
  });
  on(listEl, 'click', (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('#fx-state [data-act],#fx-state [data-path]');
    if (!b) return;
    if (b.dataset.act === 'refresh') reload();
    else if (b.dataset.path) loadDir(b.dataset.path);
  });
  on(listEl, 'mousedown', (e: MouseEvent) => {
    if (e.target === listEl || (e.target as HTMLElement).closest('#fx-state')) {
      if (!(e.ctrlKey || e.metaKey) && state.selected.size) { state.selected.clear(); paint(); }
    }
  });

  on(selAll, 'change', () => { selAll.checked ? selectAll() : (state.selected.clear(), paint()); });

  on(root.querySelector('thead')!, 'click', (e: MouseEvent) => {
    const th = (e.target as HTMLElement).closest<HTMLElement>('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort as SortKey;
    state.sortDir = state.sortKey === key ? -state.sortDir : 1;
    state.sortKey = key;
    renderRows();
    try { sessionStorage.setItem('fx-sort', JSON.stringify({ k: state.sortKey, d: state.sortDir })); } catch {}
  });
  try {
    const s = JSON.parse(sessionStorage.getItem('fx-sort') || 'null');
    if (s && ['name', 'mtime', 'type', 'size'].includes(s.k)) { state.sortKey = s.k; state.sortDir = s.d === -1 ? -1 : 1; }
  } catch {}

  on(filter, 'input', () => {
    state.query = filter.value;
    const keep = new Set(visible().map((e) => e.path));
    state.selected = new Set([...state.selected].filter((p) => keep.has(p)));
    renderRows();
  });

  on(listEl, 'keydown', (e: KeyboardEvent) => {
    if (isTyping(e.target as Element)) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(1, e.shiftKey); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(-1, e.shiftKey); }
    else if (e.key === 'Home') { e.preventDefault(); moveCursor('home', e.shiftKey); }
    else if (e.key === 'End') { e.preventDefault(); moveCursor('end', e.shiftKey); }
    else if (e.key === 'Enter' && state.selected.size === 1) { e.preventDefault(); openEntry(selPaths()[0]); }
    else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const r = (tbody.querySelector('tr.is-cursor') ?? listEl).getBoundingClientRect();
      openMenu(r.left + 48, r.bottom, state.selected.size ? menuForSelection() : menuForBackground());
    }
  });

  let dragPaths: string[] = [];
  const dropTarget = (el: EventTarget | null): { path: string; el: HTMLElement } | null => {
    const t = (el as HTMLElement | null)?.closest<HTMLElement>('tr[data-dir="true"], tr[data-parent], .fx-crumb, .fx-disk, .fx-node');
    if (!t) return null;
    const path = t.dataset.parent ? state.parent : t.dataset.path;
    return path ? { path, el: t } : null;
  };
  const clearOver = () => root!.querySelectorAll('.is-over').forEach((n) => n.classList.remove('is-over'));
  on(tbody, 'dragstart', (e: DragEvent) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-path]');
    if (!tr) { e.preventDefault(); return; }
    const p = tr.dataset.path!;
    dragPaths = state.selected.has(p) ? selPaths() : [p];
    e.dataTransfer?.setData('application/x-orvane-move', '1');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });
  on(tbody, 'dragend', () => { dragPaths = []; clearOver(); });
  on(root, 'dragover', (e: DragEvent) => {
    const types = e.dataTransfer?.types ?? [];
    const internal = types.includes('application/x-orvane-move');
    const files = types.includes('Files');
    if (!internal && !files) return;
    const tgt = dropTarget(e.target);
    if (internal && !tgt) return;
    if (files && !internal && !root.contains(e.target as Node)) return;
    e.preventDefault();
    clearOver();
    tgt?.el.classList.add('is-over');
    if (files && !internal) dropVeil.hidden = !!tgt && tgt.el.matches('tr');
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
  on(document, 'dragover', (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  on(document, 'drop', (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });

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
    rename: () => { const p = selPaths()[0]; if (p && state.selected.size === 1) startRename(p); },
    cut: () => setClipboard('cut'),
    copy: () => setClipboard('copy'),
    paste: () => { void doPaste(); },
    download: () => { const e = selectedEntries()[0]; if (e && !e.isDir && state.selected.size === 1) downloadPath(e.path); },
    delete: () => { void doDelete(selPaths()); },
    refresh: () => { void reload(selPaths()); },
    up: () => { if (state.parent !== null) go(state.parent); },
    back: () => history.back(),
    forward: () => history.forward(),
    preview: () => setPreview(!state.previewOn),
  };
  on(root, 'click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('#fx-cmdbar [data-act], #fx-nav-bar [data-act]');
    if (!btn || btn.disabled) return;
    actions[btn.dataset.act!]?.(btn);
  });

  const ready = () => root.isConnected && !document.querySelector('.dlg-overlay');
  const when = (fn: () => void) => () => { if (ready()) fn(); };
  on(document, 'keydown', (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || !['a', 'c', 'x', 'v'].includes(e.key.toLowerCase())) return;
    const textSelected = !!window.getSelection()?.toString();
    if (isTyping(document.activeElement) || (textSelected && e.key.toLowerCase() !== 'a')) e.stopPropagation();
  }, true);

  const unShortcuts = registerShortcuts([
    { keys: 'Mod+A', title: 'Tout sélectionner', group: 'Explorateur', run: when(selectAll) },
    { keys: 'Mod+X', title: 'Couper', group: 'Explorateur', run: when(() => setClipboard('cut')) },
    { keys: 'Mod+C', title: 'Copier', group: 'Explorateur', run: when(() => setClipboard('copy')) },
    { keys: 'Mod+V', title: 'Coller', group: 'Explorateur', run: when(() => { void doPaste(); }) },
    { keys: 'Delete', title: 'Supprimer la sélection', group: 'Explorateur', run: when(() => { void doDelete(selPaths()); }) },
    { keys: 'F2', title: 'Renommer', group: 'Explorateur', run: when(() => actions.rename(cmdbar)) },
    { keys: 'F5', title: 'Actualiser', group: 'Explorateur', run: when(() => { void reload(selPaths()); }) },
    { keys: 'Backspace', title: 'Dossier parent', group: 'Explorateur', run: when(() => actions.up(cmdbar)) },
    { keys: 'Alt+ArrowUp', title: 'Dossier parent', group: 'Explorateur', run: when(() => actions.up(cmdbar)) },
    { keys: 'Alt+ArrowLeft', title: 'Précédent', group: 'Explorateur', run: when(() => history.back()) },
    { keys: 'Alt+ArrowRight', title: 'Suivant', group: 'Explorateur', run: when(() => history.forward()) },
    { keys: 'Mod+L', title: 'Saisir un chemin', group: 'Explorateur', run: when(editAddress) },
    { keys: 'Shift+N', title: 'Nouveau dossier', group: 'Explorateur', run: when(() => startCreate('directory')) },
    { keys: 'p', title: 'Afficher / masquer l’aperçu', group: 'Explorateur', run: when(() => setPreview(!state.previewOn)) },
  ]);
  const unCommands = registerCommands([
    { id: 'fx-new-dir', title: 'Nouveau dossier', group: 'Fichiers', icon: 'folderPlus', keywords: ['créer', 'répertoire'], run: () => startCreate('directory') },
    { id: 'fx-new-file', title: 'Nouveau fichier', group: 'Fichiers', icon: 'add', keywords: ['créer'], run: () => startCreate('file') },
    { id: 'fx-upload', title: 'Téléverser des fichiers…', group: 'Fichiers', icon: 'upload', keywords: ['envoyer', 'upload'], run: () => fileInput.click() },
    { id: 'fx-refresh', title: 'Actualiser le dossier', group: 'Fichiers', icon: 'refresh', run: () => void reload(selPaths()) },
    { id: 'fx-up', title: 'Aller au dossier parent', group: 'Fichiers', icon: 'arrowUp', run: () => actions.up(cmdbar) },
    { id: 'fx-root', title: 'Aller à la racine /', group: 'Fichiers', icon: 'hardDrive', run: () => go('/') },
    { id: 'fx-path', title: 'Saisir un chemin…', group: 'Fichiers', icon: 'enter', keywords: ['adresse', 'aller'], run: editAddress },
    { id: 'fx-preview', title: 'Afficher / masquer l’aperçu', group: 'Fichiers', icon: 'eye', run: () => setPreview(!state.previewOn) },
    { id: 'fx-select-all', title: 'Tout sélectionner', group: 'Fichiers', icon: 'check', run: selectAll },
    { id: 'fx-delete', title: 'Supprimer la sélection', group: 'Fichiers', icon: 'trash', run: () => void doDelete(selPaths()) },
    ...[['Nom', 'name'], ['Date de modification', 'mtime'], ['Type', 'type'], ['Taille', 'size']].map(([label, key]) => ({
      id: `fx-sort-${key}`, title: `Trier par ${label.toLowerCase()}`, group: 'Fichiers', icon: 'arrowUpDown' as IconName,
      run: () => { state.sortKey = key as SortKey; state.sortDir = 1; renderRows(); },
    })),
  ]);

  on(document, 'astro:before-swap', () => {
    closeMenu(); clearTimeout(pvTimer); clearTimeout(upHide);
    unShortcuts(); unCommands();
    cleanups.forEach((fn) => fn());
  }, { once: true });

  on(window, 'popstate', () => {
    if (!root.isConnected) return;
    const q = new URLSearchParams(location.search);
    loadDir(q.get('path') ?? '/', { push: false, file: q.get('file') ?? undefined });
  });

  let wantPreview = false;
  try { wantPreview = localStorage.getItem(PREVIEW_KEY) !== '0' && !narrow(); } catch { wantPreview = !narrow(); }
  const q0 = new URLSearchParams(location.search);
  setPreview(wantPreview || !!q0.get('file'), false);
  renderSkeleton();
  void loadDir(q0.get('path') ?? state.cwd, { push: false, file: q0.get('file') ?? undefined });
});
