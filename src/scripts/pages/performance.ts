import { bytes } from '../../server/core/format';
import { registerCommands } from '../ui/commands';
import { createGraph, STEP_S } from '../ui/graph';

const rate = (n: number) => `${bytes(n)}/s`;
const RES = ['cpu', 'mem', 'disk', 'net'] as const;
type Res = (typeof RES)[number];

document.addEventListener('astro:page-load', () => {
  const root = document.getElementById('tm');
  if (!root) return;

  const canvas = (id: string) => document.getElementById(id) as HTMLCanvasElement;
  const spark = (r: Res) => root.querySelector(`canvas[data-spark="${r}"]`) as HTMLCanvasElement;
  const big = {
    cpu: createGraph(canvas('cpu-graph'), 'cpu', [{ name: 'Processeur' }], 'percent'),
    mem: createGraph(canvas('mem-graph'), 'mem', [{ name: 'Mémoire' }], 'percent'),
    disk: createGraph(canvas('disk-graph'), 'disk', [{ name: 'Lecture' }, { name: 'Écriture', dashed: true }], 'auto'),
    net: createGraph(canvas('net-graph'), 'net', [{ name: 'Réception' }, { name: 'Envoi', dashed: true }], 'auto'),
  };
  const mini = {
    cpu: createGraph(spark('cpu'), 'cpu', [{ name: '' }], 'percent', true),
    mem: createGraph(spark('mem'), 'mem', [{ name: '' }], 'percent', true),
    disk: createGraph(spark('disk'), 'disk', [{ name: '' }, { name: '', dashed: true }], 'auto', true),
    net: createGraph(spark('net'), 'net', [{ name: '' }, { name: '', dashed: true }], 'auto', true),
  };

  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('.tile'));
  function select(res: string, focus = false) {
    for (const t of tabs) {
      const on = t.dataset.res === res;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    }
    root!.querySelectorAll<HTMLElement>('.rpanel').forEach((p) => { p.hidden = p.dataset.res !== res; });
    try { sessionStorage.setItem('perf-tab', res); } catch {}
    requestAnimationFrame(() => Object.values(big).forEach((g) => g.draw()));
  }
  const tablist = root.querySelector('.tm__list')!;
  const mq = matchMedia('(max-width: 900px)');
  const orient = () => tablist.setAttribute('aria-orientation', mq.matches ? 'horizontal' : 'vertical');
  orient(); mq.addEventListener('change', orient);
  tabs.forEach((t) => t.addEventListener('click', () => select(t.dataset.res!)));
  root.querySelector('.tm__list')!.addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(ke.key)) return;
    ke.preventDefault();
    const at = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const fwd = ke.key === 'ArrowDown' || ke.key === 'ArrowRight';
    const next = tabs[(at + (fwd ? 1 : -1) + tabs.length) % tabs.length];
    select(next.dataset.res!, true);
  });
  let saved: string | null = null;
  try { saved = sessionStorage.getItem('perf-tab'); } catch {}
  if (saved && (RES as readonly string[]).includes(saved)) select(saved);

  const HIST = 'perf-hist';
  try {
    const saved = JSON.parse(sessionStorage.getItem(HIST) || 'null');
    if (saved && Date.now() - saved.at < 60_000) {
      for (const r of RES) if (saved.data?.[r]) { big[r].seed(saved.data[r]); mini[r].seed(saved.data[r]); }
    }
  } catch {}
  const persist = () => {
    try {
      sessionStorage.setItem(HIST, JSON.stringify({ at: Date.now(), data: Object.fromEntries(RES.map((r) => [r, big[r].snapshot()])) }));
    } catch {}
  };
  const pct = (v: number | null) => (v == null ? '-' : `${Math.round(v)} %`);
  const rt = (v: number | null) => (v == null ? '-' : rate(v));
  function paintStats() {
    const c = big.cpu.stats(0), m = big.mem.stats(0), d0 = big.disk.stats(0), d1 = big.disk.stats(1), n0 = big.net.stats(0), n1 = big.net.stats(1);
    set('cpu-avg', pct(c.avg)); set('cpu-peak', pct(c.peak));
    set('mem-avg', pct(m.avg)); set('mem-peak', pct(m.peak));
    set('disk-read-avg', rt(d0.avg)); set('disk-read-peak', rt(d0.peak));
    set('disk-write-avg', rt(d1.avg)); set('disk-write-peak', rt(d1.peak));
    set('net-rx-avg', rt(n0.avg)); set('net-rx-peak', rt(n0.peak));
    set('net-tx-avg', rt(n1.avg)); set('net-tx-peak', rt(n1.peak));
  }

  const errorEl = document.getElementById('perf-error')!;
  const pauseBtn = document.getElementById('perf-pause') as HTMLButtonElement;
  let paused = false;

  function setPaused(on: boolean) {
    paused = on;
    root!.toggleAttribute('data-paused', on);
    pauseBtn.setAttribute('aria-pressed', String(on));
    pauseBtn.querySelector('.lbl')!.textContent = on ? 'Reprendre' : 'Suspendre';
    if (on && timer !== null) { clearTimeout(timer); timer = null; }
    else if (!on && timer === null && !stopped) tick().then(() => schedule());
  }
  pauseBtn.addEventListener('click', () => setPaused(!paused));

  const unregister = registerCommands([
    { id: 'perf-pause', title: 'Suspendre ou reprendre les mesures', icon: 'pause', run: () => pauseBtn.click() },
    ...RES.map((r, i) => ({
      id: `perf-${r}`, title: ['Afficher le processeur', 'Afficher la mémoire', 'Afficher le disque', 'Afficher le réseau'][i],
      icon: (['cpu', 'memory', 'hardDrive', 'network'] as const)[i], run: () => select(r),
    })),
  ]);

  const set = (id: string, text: string) => { const n = document.getElementById(id); if (n) n.textContent = text; };
  const coreEls = Array.from(root.querySelectorAll<HTMLElement>('#cpu-cores .core'));

  let stopped = false;
  let timer: number | null = null;

  async function tick() {
    if (stopped) return;
    try {
      const res = await fetch('/api/system/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const s = await res.json();
      errorEl.hidden = true;

      if (s.cpu?.percent != null) {
        const v = [s.cpu.percent];
        big.cpu.push(v); mini.cpu.push(v);
        set('cpu-use', `${Math.round(s.cpu.percent)} %`);
        set('sub-cpu', `${Math.round(s.cpu.percent)} %`);
      }
      if (Array.isArray(s.cpu?.perCore)) {
        s.cpu.perCore.forEach((v: number | null, i: number) => {
          const core = coreEls[i];
          if (!core) return;
          const pct = v ?? 0;
          (core.querySelector('.core__fill') as HTMLElement).style.width = `${Math.max(0, Math.min(100, pct))}%`;
          core.querySelector('.core__pct')!.textContent = v == null ? '-' : `${Math.round(pct)} %`;
        });
      }
      if (s.load) set('cpu-load', s.load.map((l: number) => l.toFixed(2).replace('.', ',')).join(' · '));

      if (s.memory?.totalBytes) {
        const m = s.memory;
        const pct = (m.usedBytes / m.totalBytes) * 100;
        big.mem.push([pct]); mini.mem.push([pct]);
        set('mem-used', bytes(m.usedBytes));
        set('mem-avail', bytes(m.availableBytes));
        set('mem-swap', `${bytes(m.swapUsedBytes)} / ${bytes(m.swapTotalBytes)}`);
        set('mem-pct', `${Math.round(pct)} %`);
        set('sub-mem', `${bytes(m.usedBytes)} / ${bytes(m.totalBytes)} (${Math.round(pct)} %)`);
      }

      if (s.diskIo) {
        const v = [s.diskIo.readBytesPerSec, s.diskIo.writeBytesPerSec];
        big.disk.push(v); mini.disk.push(v);
        set('disk-read', rate(v[0]));
        set('disk-write', rate(v[1]));
        set('disk-scale', rate(big.disk.max()));
        set('sub-disk', `Lecture ${rate(v[0])} · Écriture ${rate(v[1])}`);
      }

      if (s.network) {
        const v = [s.network.rxBytesPerSec, s.network.txBytesPerSec];
        big.net.push(v); mini.net.push(v);
        set('net-rx', rate(v[0]));
        set('net-tx', rate(v[1]));
        set('net-scale', rate(big.net.max()));
        set('sub-net', `Réception ${rate(v[0])} · Envoi ${rate(v[1])}`);
      }
      paintStats();
      persist();
    } catch {
      errorEl.hidden = false;
    }
  }

  function schedule(wait = STEP_S * 1000) {
    timer = window.setTimeout(async () => {
      const t0 = performance.now();
      await tick();
      if (!paused && !stopped) schedule(Math.max(0, STEP_S * 1000 - (performance.now() - t0)));
    }, wait);
  }
  tick().then(() => schedule());

  document.addEventListener('astro:before-swap', () => {
    stopped = true;
    unregister();
    if (timer !== null) clearTimeout(timer);
    [...Object.values(big), ...Object.values(mini)].forEach((g) => g.stop());
  }, { once: true });
});
