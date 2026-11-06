import { toast } from '../ui/dialog';
import { registerCommands } from '../ui/commands';
import { esc, iconSVG } from '../ui/html';
import { highlightLine } from './logs';

type Level = 'error' | 'warn' | 'info' | 'debug' | 'ok' | 'none';
const POLL_MS = 3000;
const PREF = 'logs-live';

function levelOf(l: string): Level {
  if (/\b(FATAL|CRITICAL|SEVERE|ERROR|ERR|Exception|Traceback|failed|failure|panic)\b/i.test(l)) return 'error';
  if (/\b(WARN|WARNING)\b|Can't keep up/i.test(l)) return 'warn';
  if (/\bDone \(/.test(l)) return 'ok';
  if (/\b(INFO)\b/.test(l)) return 'info';
  if (/\b(DEBUG|TRACE)\b/i.test(l)) return 'debug';
  return 'none';
}
const TAG: Record<string, string> = { error: 'Erreur : ', warn: 'Avertissement : ' };

document.addEventListener('astro:page-load', () => {
  const root = document.getElementById('lg-root');
  if (!root) return;
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const sourceSel = $<HTMLSelectElement>('lg-source'), levelSel = $<HTMLSelectElement>('lg-level'), linesSel = $<HTMLSelectElement>('lg-lines');
  const search = $<HTMLInputElement>('lg-search'), viewer = $('lg-viewer'), stat = $('lg-stat'), stale = $('lg-stale');
  const liveBtn = $<HTMLButtonElement>('lg-live'), followBtn = $<HTMLButtonElement>('lg-follow'), liveState = $('lg-live-state');
  const lvTabs = [...root.querySelectorAll<HTMLButtonElement>('[data-lv]')];

  let all: { text: string; level: Level }[] = [];
  let live = true;
  try { live = localStorage.getItem(PREF) !== 'off'; } catch {}
  let follow = true;
  let shown: string[] = [];
  let timer: number | undefined;
  let busy = false;
  let failed = false;
  let painted = '';

  const setBtn = (b: HTMLElement, icon: 'play' | 'pause' | 'arrowDown', text: string, on: boolean) => {
    b.innerHTML = `${iconSVG(icon, 16)}${esc(text)}`;
    b.setAttribute('aria-pressed', String(on));
  };
  const paintButtons = () => {
    setBtn(liveBtn, live ? 'pause' : 'play', live ? 'Pause' : 'Reprendre', live);
    liveState.textContent = live ? 'En direct' : 'En pause';
    liveState.className = `v-status v-status--${live ? 'good' : 'warning'}`;
    liveBtn.title = live ? 'Mise à jour en direct active : mettre en pause' : 'En pause : reprendre le direct';
    setBtn(followBtn, 'arrowDown', 'Suivre', follow);
    followBtn.title = 'Suivre les nouvelles lignes';
  };

  const toBottom = () => { viewer.scrollTop = viewer.scrollHeight; };

  function render(force = true) {
    const q = search.value.trim().toLowerCase();
    const lv = levelSel.value;
    const keep = all.filter((l) => (lv === 'all' || l.level === lv) && (!q || l.text.toLowerCase().includes(q)));
    shown = keep.map((l) => l.text);
    const counts = { error: 0, warn: 0 };
    for (const l of all) if (l.level === 'error' || l.level === 'warn') counts[l.level]++;
    for (const t of lvTabs) {
      t.setAttribute('aria-pressed', String(t.dataset.lv === lv));
      const n = t.querySelector('[data-n]');
      if (n) n.textContent = String(counts[t.dataset.lv as 'error' | 'warn']);
    }
    stat.textContent = `${keep.length} sur ${all.length} lignes · ${counts.error} erreurs · ${counts.warn} avertissements`;

    if (failed) return;
    // Repeindre seulement si le contenu change, et jamais pendant une sélection de texte (le polling l'effacerait).
    const sig = `${lv}|${q}|${keep.length}|${keep.map((l) => l.text).join('\n')}`;
    if (!force) {
      if (sig === painted) return;
      const sel = getSelection();
      if (sel && !sel.isCollapsed && viewer.contains(sel.anchorNode)) return;
    }
    painted = sig;
    if (!keep.length) {
      viewer.innerHTML = `<p class="lg-msg">${all.length ? 'Aucune ligne ne correspond aux filtres.' : 'Aucune ligne à afficher.'}</p>`;
      return;
    }
    viewer.innerHTML = keep.map((l) => {
      const body = highlightLine(l.text, q);
      const tag = TAG[l.level] ? `<span class="visually-hidden">${TAG[l.level]}</span>` : '';
      return `<div class="line l-${l.level}">${tag}${body}</div>`;
    }).join('');
    if (follow) toBottom();
  }

  async function load(manual = false) {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch(`/logs?format=json&source=${encodeURIComponent(sourceSel.value)}&lines=${linesSel.value}`, { headers: { accept: 'application/json' } });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `Erreur ${res.status}`);
      failed = false;
      stale.hidden = true;
      all = (out.lines as string[]).map((text) => ({ text, level: levelOf(text) }));
      render(manual);
      if (manual) toast('Journal actualisé.', 'success', 1500);
    } catch (e: any) {
      if (all.length) { stale.hidden = false; return; }
      failed = true;
      painted = '';
      viewer.innerHTML = `<div class="v-empty" role="alert"><span class="lg-err-icon">${iconSVG('circleAlert', 20)}</span>`
        + `<p class="v-empty__title">Impossible de lire ce journal</p>`
        + `<p class="v-empty__text">Réessayez ou choisissez une autre source.</p><pre class="v-code">${esc(e?.message ?? e)}</pre></div>`;
    } finally { busy = false; }
  }

  function schedule() {
    clearInterval(timer);
    if (live) timer = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
  }
  const setLive = (v: boolean) => {
    live = v;
    try { localStorage.setItem(PREF, v ? 'on' : 'off'); } catch {}
    paintButtons(); schedule();
    if (v) load();
  };
  const setFollow = (v: boolean) => { follow = v; paintButtons(); if (v) toBottom(); };

  sourceSel.addEventListener('change', () => {
    const u = new URL(location.href); u.searchParams.set('source', sourceSel.value);
    history.replaceState(history.state, '', u);
    viewer.innerHTML = '<p class="lg-msg">Chargement…</p>';
    all = []; painted = ''; stale.hidden = true;
    load();
  });
  linesSel.addEventListener('change', () => load());
  levelSel.addEventListener('change', () => render());
  for (const t of lvTabs) t.addEventListener('click', () => { levelSel.value = t.dataset.lv!; render(); });
  search.addEventListener('input', () => render());
  liveBtn.addEventListener('click', () => setLive(!live));
  followBtn.addEventListener('click', () => setFollow(!follow));
  $('lg-refresh').addEventListener('click', () => load(true));
  $('lg-download').addEventListener('click', () => {
    if (!shown.length) { toast('Rien à télécharger.', 'warning'); return; }
    const blob = new Blob([shown.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orvane-${sourceSel.value}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  viewer.addEventListener('scroll', () => {
    const atBottom = viewer.scrollHeight - viewer.scrollTop - viewer.clientHeight < 24;
    if (atBottom !== follow) { follow = atBottom; paintButtons(); }
  }, { passive: true });

  paintButtons(); schedule(); load();
  document.addEventListener('astro:before-swap', () => clearInterval(timer), { once: true });

  const lvlCmd = (title: string, v: string) => ({ id: `logs-lvl-${v}`, title, icon: 'filter' as const, run: () => { levelSel.value = v; render(); } });
  registerCommands([
    { id: 'logs-live', title: 'Journaux : pause / reprise du direct', icon: 'pause', run: () => setLive(!live) },
    { id: 'logs-refresh', title: 'Journaux : actualiser', icon: 'refresh', run: () => load(true) },
    { id: 'logs-download', title: 'Journaux : télécharger les lignes affichées', icon: 'download', run: () => $('lg-download').click() },
    lvlCmd('Journaux : erreurs seulement', 'error'),
    lvlCmd('Journaux : avertissements seulement', 'warn'),
    lvlCmd('Journaux : tous les niveaux', 'all'),
  ]);
});
