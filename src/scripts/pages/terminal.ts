import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { confirmDialog, toast } from '../ui/dialog';
import { registerCommands } from '../ui/commands';

document.addEventListener('astro:page-load', () => {
  const container = document.getElementById('term');
  if (!container) return;

  const msg = document.getElementById('term-msg');
  const state = document.getElementById('term-state');
  const stateText = document.getElementById('term-state-text');
  const statusState = document.getElementById('term-status-state');
  const sizeEl = document.getElementById('term-size');
  const wrap = document.getElementById('term-wrap');
  const fontEl = document.getElementById('term-font');

  const STATUS: Record<string, string> = { success: 'good', accent: 'info', warning: 'warning', danger: 'bad' };
  function setState(text: string, tone: string) {
    if (stateText) stateText.textContent = text;
    if (statusState) statusState.textContent = text;
    if (state) state.className = `v-status term-state${STATUS[tone] ? ` v-status--${STATUS[tone]}` : ''}`;
  }

  function showSize() {
    if (sizeEl) sizeEl.textContent = `${term.cols} × ${term.rows}`;
  }

  function showError(text: string) {
    if (!msg) return;
    msg.textContent = text;
    msg.hidden = false;
  }

  function hideError() {
    if (msg) { msg.textContent = ''; msg.hidden = true; }
  }

  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

  const FONT_MIN = 10;
  const FONT_MAX = 24;
  let storedFont: string | null = null;
  try { storedFont = localStorage.getItem('orvane.term.font'); } catch { /* navigation privée */ }
  const savedRaw = Number(storedFont);
  const savedFont = savedRaw >= FONT_MIN && savedRaw <= FONT_MAX ? savedRaw : 13;
  if (fontEl) fontEl.textContent = String(savedFont);

  const term = new Terminal({
    cursorBlink: true,
    fontFamily: token('--font-mono', 'monospace'),
    fontSize: savedFont,
    scrollback: 5000,
    theme: {
      background: token('--console-bg', '#0c0c0c'),
      foreground: token('--console-fg', '#cccccc'),
      cursor: token('--console-strong', '#f2f2f2'),
      cursorAccent: token('--console-bg', '#0c0c0c'),
      selectionBackground: token('--console-select', '#264f78'),
      red: token('--console-red', '#e74856'),
      brightRed: token('--console-bright-red', '#f1707a'),
      green: token('--console-green', '#16c60c'),
      brightGreen: token('--console-bright-green', '#23d18b'),
      yellow: token('--console-yellow', '#f9f1a5'),
      brightYellow: token('--console-bright-yellow', '#fdf6c3'),
      blue: token('--console-blue', '#3b78ff'),
      brightBlue: token('--console-bright-blue', '#6a9bff'),
      cyan: token('--console-cyan', '#61d6d6'),
      brightCyan: token('--console-bright-cyan', '#9be5e5'),
      white: token('--console-fg', '#cccccc'),
      brightWhite: token('--console-strong', '#f2f2f2'),
      brightBlack: token('--console-muted', '#8a8a8a'),
    },
  });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());
  term.open(container);

  let ws: WebSocket | null = null;
  let intentionalClose = false;
  let sessionEnded = false;
  let retries = 0;
  let retryTimer: number | null = null;
  let lastSentCols = 0;
  let lastSentRows = 0;

  function sendResize() {
    if (ws?.readyState !== WebSocket.OPEN) return;
    if (term.cols === lastSentCols && term.rows === lastSentRows) return;
    lastSentCols = term.cols;
    lastSentRows = term.rows;
    ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
  }

  function connect() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    hideError();
    sessionEnded = false;
    setState('Connexion…', 'accent');
    term.reset();

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({ cols: String(term.cols), rows: String(term.rows) });
    lastSentCols = term.cols;
    lastSentRows = term.rows;
    ws = new WebSocket(`${proto}//${location.host}/api/shell/ws?${params}`);

    ws.addEventListener('message', (event) => {
      let payload: { type: string; data?: string; reason?: string; message?: string };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.type === 'ready') {
        retries = 0;
        setState('Connecté', 'success');
        // ?cwd=<dossier> (bouton Console d'une application) : le shell s'y place et le chemin est cité.
        const cwd = new URLSearchParams(location.search).get('cwd');
        if (cwd) ws?.send(JSON.stringify({ type: 'input', data: `cd '${cwd.replace(/'/g, `'\\''`)}' && clear\r` }));
      } else if (payload.type === 'output' && payload.data) {
        term.write(payload.data);
      } else if (payload.type === 'closed') {
        term.write(`\r\n\n[${payload.reason ?? 'le serveur a fermé la session'}]\r\n`);
        setState('Fermé', 'neutral');
        sessionEnded = true;
      } else if (payload.type === 'error') {
        showError(payload.message ?? 'Erreur de connexion SSH');
        setState('Erreur', 'danger');
        sessionEnded = true;
      }
    });

    ws.addEventListener('close', () => {
      if (intentionalClose || sessionEnded) return;
      if (retries < 3) {
        retries += 1;
        setState(`Reconnexion (${retries}/3)…`, 'warning');
        retryTimer = window.setTimeout(connect, retries * 2000);
      } else {
        setState('Déconnecté', 'neutral');
        showError('Connexion perdue. Utilisez « Nouvelle session » pour reprendre.');
      }
    });

    ws.addEventListener('error', () => {
      showError('Le panel n’a pas pu joindre le terminal.');
      setState('Erreur', 'danger');
    });
  }

  term.onData(sendInput);

  term.onResize(() => { sendResize(); showSize(); });

  const resizeObserver = new ResizeObserver(() => fitAddon.fit());
  resizeObserver.observe(container);

  function sendInput(data: string) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input', data }));
  }

  document.getElementById('term-sigint')?.addEventListener('click', () => { sendInput('\x03'); term.focus(); });
  document.getElementById('term-clear')?.addEventListener('click', () => term.clear());
  async function newSession() {
    if (stateText?.textContent === 'Connecté' && !(await confirmDialog({
      title: 'Démarrer une nouvelle session ?', message: 'Le panel ferme le shell en cours et les commandes qui y tournent.', confirmLabel: 'Nouvelle session', danger: true,
    }))) return;
    intentionalClose = true;
    ws?.close();
    intentionalClose = false;
    retries = 0;
    connect();
    term.focus();
  }
  document.getElementById('term-new')?.addEventListener('click', () => void newSession());

  async function copySelection() {
    const text = term.getSelection();
    if (!text) { toast('Aucune sélection à copier.', 'info'); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast('Sélection copiée.', 'success');
    } catch {
      toast('Le navigateur refuse la copie.', 'error');
    }
  }
  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) term.paste(text);
    } catch {
      toast('Le navigateur bloque le collage : autorisez le presse-papiers ou utilisez Ctrl+Maj+V.', 'warning');
    }
    term.focus();
  }
  document.getElementById('term-copy')?.addEventListener('click', copySelection);
  document.getElementById('term-paste')?.addEventListener('click', pasteClipboard);

  function setFont(size: number) {
    const next = Math.min(FONT_MAX, Math.max(FONT_MIN, size));
    term.options.fontSize = next;
    try { localStorage.setItem('orvane.term.font', String(next)); } catch { /* navigation privée */ }
    if (fontEl) fontEl.textContent = String(next);
    fitAddon.fit();
    term.focus();
  }
  document.getElementById('term-font-down')?.addEventListener('click', () => setFont((term.options.fontSize ?? 13) - 1));
  document.getElementById('term-font-up')?.addEventListener('click', () => setFont((term.options.fontSize ?? 13) + 1));

  const fullBtn = document.getElementById('term-full');
  function toggleFull() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap?.requestFullscreen?.().catch(() => toast('Plein écran indisponible.', 'warning'));
  }
  fullBtn?.addEventListener('click', toggleFull);
  const onFullChange = () => {
    const on = Boolean(document.fullscreenElement);
    const label = fullBtn && [...fullBtn.childNodes].reverse().find((n) => n.nodeType === 3 && n.textContent?.trim());
    if (label) label.textContent = on ? 'Quitter le plein écran' : 'Plein écran';
    fitAddon.fit();
    term.focus();
  };
  document.addEventListener('fullscreenchange', onFullChange);

  document.getElementById('term-keys')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-send]');
    if (!btn) return;
    sendInput(JSON.parse(`"${btn.dataset.send}"`));
    term.focus();
  });

  term.attachCustomKeyEventHandler((e) => {
    if (e.type === 'keydown' && e.ctrlKey && e.shiftKey) {
      if (e.code === 'KeyC') { void copySelection(); return false; }
      if (e.code === 'KeyV') { void pasteClipboard(); return false; }
    }
    return true;
  });

  const unregister = registerCommands([
    { id: 'term.new', title: 'Terminal : nouvelle session', group: 'Terminal', run: () => void newSession() },
    { id: 'term.clear', title: 'Terminal : effacer l’écran', group: 'Terminal', run: () => term.clear() },
    { id: 'term.full', title: 'Terminal : plein écran', group: 'Terminal', run: toggleFull },
    { id: 'term.copy', title: 'Terminal : copier la sélection', group: 'Terminal', run: () => void copySelection() },
    { id: 'term.paste', title: 'Terminal : coller', group: 'Terminal', run: () => void pasteClipboard() },
  ]);

  const closeOnLeave = () => {
    intentionalClose = true;
    ws?.close();
    resizeObserver.disconnect();
    if (retryTimer) clearTimeout(retryTimer);
    document.removeEventListener('fullscreenchange', onFullChange);
    unregister();
  };
  document.addEventListener('astro:before-swap', closeOnLeave, { once: true });
  window.addEventListener('pagehide', closeOnLeave, { once: true });

  fitAddon.fit();
  showSize();
  connect();
  term.focus();
});
