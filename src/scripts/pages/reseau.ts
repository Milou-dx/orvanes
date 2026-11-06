import { confirmDialog, toast } from '../ui/dialog';
import { registerCommands } from '../ui/commands';
import { getTable } from '../ui/table';
import { allowError } from '../../server/network/firewall-check';
import { createGraph } from '../ui/graph';
import { bytes } from '../../server/core/format';

let liveCanvas: HTMLCanvasElement | null = null;
function startLive(canvas: HTMLCanvasElement) {
  if (canvas === liveCanvas) return;
  liveCanvas = canvas;
  const graph = createGraph(canvas, 'net', [{ name: 'Réception' }, { name: 'Envoi', dashed: true }], 'auto');
  const err = document.getElementById('net-live-err');
  const rxNow = document.getElementById('net-rx-now'), txNow = document.getElementById('net-tx-now');
  let fails = 0;
  const tick = async () => {
    if (!canvas.isConnected) { graph.stop(); if (liveCanvas === canvas) liveCanvas = null; return; }
    if (document.visibilityState === 'visible') {
      try {
        const s = await (await fetch('/api/system/stats')).json();
        graph.push([s.network?.rxBytesPerSec ?? 0, s.network?.txBytesPerSec ?? 0]);
        if (rxNow) rxNow.textContent = `${bytes(s.network?.rxBytesPerSec ?? 0)}/s`;
        if (txNow) txNow.textContent = `${bytes(s.network?.txBytesPerSec ?? 0)}/s`;
        fails = 0;
      } catch { fails++; }
      if (err) err.hidden = fails < 3;
    }
    setTimeout(tick, 1000);
  };
  tick();
}

document.addEventListener('astro:page-load', () => {
  const live = document.getElementById('net-live') as HTMLCanvasElement | null;
  if (live) startLive(live);
  try {
    const flash = sessionStorage.getItem('reseau-flash');
    if (flash) { sessionStorage.removeItem('reseau-flash'); toast(flash, 'success'); }
  } catch {}
  // Onglets : bouton actif en aria-pressed, panneau correspondant affiché, choix gardé par page.
  const tabs = document.querySelector<HTMLElement>('[data-tabs="reseau"]');
  const TAB_KEY = `tabs:${location.pathname}:reseau`;
  const select = (id: string) => {
    if (!tabs) return;
    for (const b of tabs.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-pressed', String(on));
      const panel = document.getElementById(`reseau-panel-${b.dataset.tab}`);
      if (panel) panel.hidden = !on;
    }
    try { sessionStorage.setItem(TAB_KEY, id); } catch {}
  };
  tabs?.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-tab]');
    if (b) select(b.dataset.tab!);
  });
  tabs?.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const all = [...tabs.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const next = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]!;
    next.focus();
    select(next.dataset.tab!);
    e.preventDefault();
  });
  try { const saved = sessionStorage.getItem(TAB_KEY); if (saved && document.getElementById(`reseau-tab-${saved}`)) select(saved); } catch {}
  const goTab = (tab: string) => document.getElementById(`reseau-tab-${tab}`)?.click();
  document.querySelectorAll<HTMLElement>('[data-go]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    goTab(el.dataset.go!);
  }));

  const form = document.getElementById('fw-form') as HTMLFormElement | null;
  if (!form) return;

  document.getElementById('ports-expo')?.addEventListener('change', (e) => {
    getTable('ports-tbl')?.setFilter((e.target as HTMLSelectElement).value);
  });
  registerCommands([
    { id: 'reseau-fw', title: 'Réseau : voir le pare-feu', group: 'Réseau', run: () => goTab('pare-feu') },
    { id: 'reseau-ports', title: 'Réseau : voir les connexions et ports', group: 'Réseau', run: () => goTab('ports') },
    { id: 'reseau-ifaces', title: 'Réseau : voir les interfaces', group: 'Réseau', run: () => goTab('interfaces') },
    { id: 'reseau-dns', title: 'Réseau : voir DNS et routes', group: 'Réseau', run: () => goTab('dns') },
    { id: 'reseau-save', title: 'Pare-feu : enregistrer les règles', group: 'Réseau', run: () => document.getElementById('fw-save')?.click() },
  ]);
  const msg = document.getElementById('fw-msg');

  // Toast de succès affiché APRÈS le rechargement (sinon il disparaît avec la page).
  const reloadWith = (message: string) => {
    try { sessionStorage.setItem('reseau-flash', message); } catch { toast(message, 'success'); setTimeout(() => location.reload(), 800); return; }
    location.reload();
  };

  function show(text: string, ok: boolean) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = `t-meta msg ${ok ? 'msg--ok' : 'msg--err'}`;
    msg.hidden = false;
  }

  async function call(body: unknown): Promise<any> {
    const res = await fetch('/api/firewall', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json() };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const port = String(fd.get('port') ?? '').trim();
    const proto = String(fd.get('protocol') ?? 'tcp');
    const source = String(fd.get('source') ?? '').trim();

    const invalid = allowError(proto, port, source || null);
    const portErr = document.getElementById('fw-port-err')!, sourceErr = document.getElementById('fw-source-err')!;
    const portIn = document.getElementById('fw-port')!, sourceIn = document.getElementById('fw-source')!;
    const bad = (input: HTMLElement, el: HTMLElement, text: string | null) => {
      el.textContent = text ?? ''; el.hidden = !text;
      if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    };
    const onSource = !!invalid && invalid.startsWith('Source');
    bad(portIn, portErr, invalid && !onSource ? invalid : null);
    bad(sourceIn, sourceErr, onSource ? invalid : null);
    if (invalid) { (onSource ? sourceIn : portIn).focus(); return; }
    if (msg) msg.hidden = true;
    const where = source ? `depuis ${source}` : 'depuis toutes les sources';
    if (!(await confirmDialog({ title: 'Autoriser ce trafic ?', message: `${proto.toUpperCase()} ${port} ${where}.`, confirmLabel: 'Autoriser' }))) return;

    try {
      const { ok, data } = await call({
        protocol: proto, port, source: source || null, comment: fd.get('comment'),
      });
      if (!ok) { show(data.error ?? 'Échec', false); return; }
      reloadWith(`Règle ajoutée en position ${data.position}. Enregistrez-la pour qu’elle survive au redémarrage.`);
    } catch {
      show('Le panel n’a pas pu joindre le service.', false);
    }
  });

  document.getElementById('fw-rules')?.addEventListener('click', async (ev) => {
    const btn = (ev.target as Element).closest<HTMLButtonElement>('button[data-del]');
    if (!btn) return;
    const num = btn.dataset.del!;
    if (!(await confirmDialog({ title: `Supprimer la règle n° ${num} ?`, confirmLabel: 'Supprimer', danger: true }))) return;
    btn.disabled = true;
    const { ok, data } = await call({ op: 'delete', num: Number(num) });
    if (!ok) { toast(data.error ?? 'Échec', 'error'); btn.disabled = false; return; }
    reloadWith(`Règle n° ${num} supprimée.`);
  });

  document.getElementById('fw-save')?.addEventListener('click', async () => {
    const { ok, data } = await call({ op: 'persist' });
    if (!ok) { toast(data.error ?? 'Échec', 'error'); return; }
    reloadWith('Règles enregistrées.');
  });
});
