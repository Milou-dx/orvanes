import { bytes } from '../../server/core/format';

export type Res = 'cpu' | 'mem' | 'disk' | 'net';
const rate = (n: number) => `${bytes(n)}/s`;

type Series = { name: string; dashed?: boolean };
export const STEP_S = 1;
export function createGraph(canvas: HTMLCanvasElement, res: Res, series: Series[], mode: 'percent' | 'auto', mini = false) {
  const ctx = canvas.getContext('2d')!;
  const MAX_POINTS = 180;
  const data: number[][] = series.map(() => []);
  let samples = 0;
  let hoverIdx: number | null = null;
  let lastMax = 100;
  const LADDER = [
    1024, 4 * 1024, 16 * 1024, 64 * 1024, 256 * 1024,
    1024 ** 2, 4 * 1024 ** 2, 16 * 1024 ** 2, 64 * 1024 ** 2, 256 * 1024 ** 2,
    1024 ** 3, 4 * 1024 ** 3,
  ];

  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    return {
      line: v(`--res-${res}`), fill: v(`--res-${res}-fill`), grid: v(`--res-${res}-grid`),
      text: v('--text-secondary'), bg: v('--bg-surface'), font: v('--font-ui') || 'sans-serif',
    };
  }
  const fmt = (v: number) => (mode === 'percent' ? `${Math.round(v)} %` : rate(v));

  if (!mini) {
    canvas.addEventListener('pointermove', (e) => {
      const idx = Math.round((e.offsetX / canvas.clientWidth) * (MAX_POINTS - 1));
      hoverIdx = Math.max(0, Math.min(MAX_POINTS - 1, idx));
      draw();
    });
    canvas.addEventListener('pointerleave', () => { hoverIdx = null; draw(); });
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function niceMax(peak: number) {
    for (const step of LADDER) if (peak <= step) return step;
    return peak * 1.2;
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const p = palette();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);
    const stepX = w / (MAX_POINTS - 1);

    if (!mini) {
      ctx.strokeStyle = p.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 10; i++) {
        const y = Math.round((h / 10) * i) + 0.5;
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      const shift = samples % 6;
      for (let k = MAX_POINTS - 1 - shift; k > 0; k -= 6) {
        const x = Math.round(k * stepX) + 0.5;
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      ctx.stroke();
    }

    const peak = Math.max(0, ...data.flat());
    const max = mode === 'percent' ? 100 : niceMax(Math.max(peak, 1));
    lastMax = max;
    const yOf = (v: number) => h - (Math.min(v, max) / max) * (h - 2) - 1;

    series.forEach((s, i) => {
      const points = data[i];
      if (points.length < 2) return;
      const offset = MAX_POINTS - points.length;
      const trace = () => {
        ctx.beginPath();
        points.forEach((v, idx) => {
          const x = (offset + idx) * stepX;
          if (idx === 0) ctx.moveTo(x, yOf(v)); else ctx.lineTo(x, yOf(v));
        });
      };
      if (!s.dashed) {
        trace();
        ctx.lineTo((offset + points.length - 1) * stepX, h);
        ctx.lineTo(offset * stepX, h);
        ctx.closePath();
        ctx.fillStyle = p.fill;
        ctx.fill();
      }
      trace();
      ctx.strokeStyle = p.line;
      ctx.lineWidth = mini ? 1 : 1.5;
      ctx.setLineDash(s.dashed ? [4, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    if (mini || hoverIdx === null) return;
    const x = Math.round(hoverIdx * stepX) + 0.5;
    ctx.strokeStyle = p.text;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.globalAlpha = 1;
    const ago = Math.round((MAX_POINTS - 1 - hoverIdx) * STEP_S);
    const parts = series.map((s, i) => {
      const pts = data[i];
      const j = hoverIdx! - (MAX_POINTS - pts.length);
      return j >= 0 && j < pts.length ? `${series.length > 1 ? s.name + ' ' : ''}${fmt(pts[j])}` : null;
    }).filter(Boolean);
    if (parts.length) {
      ctx.font = `12px ${p.font}`;
      ctx.fillStyle = p.text;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(`${ago === 0 ? 'maintenant' : `il y a ${ago} s`} · ${parts.join(' · ')}`, 6, 4);
    }
  }

  function push(values: (number | null)[]) {
    values.forEach((v, i) => {
      data[i].push(v ?? 0);
      if (data[i].length > MAX_POINTS) data[i].shift();
    });
    samples++;
    draw();
  }

  function stats(i: number) {
    const pts = data[i];
    if (!pts.length) return { avg: null as number | null, peak: null as number | null };
    return { avg: pts.reduce((a, b) => a + b, 0) / pts.length, peak: Math.max(...pts) };
  }
  function seed(saved: number[][]) {
    saved.forEach((pts, i) => { if (data[i] && Array.isArray(pts)) data[i] = pts.slice(-MAX_POINTS).map(Number); });
    samples = data[0]?.length ?? 0;
    draw();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  return { push, draw, stats, seed, snapshot: () => data.map((d) => d.slice()), max: () => lastMax, stop: () => ro.disconnect() };
}
