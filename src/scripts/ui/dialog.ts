import { PANEL_MARK } from '../../components/ui/icons';
export interface ModalOptions {
  title: string;
  body?: HTMLElement | string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  danger?: boolean;
  wide?: boolean;
  /** Logo du panel au-dessus du titre. */
  logo?: boolean;
  /** false : Échap et clic sur le fond ne ferment pas (seul le bouton de confirmation ferme). */
  dismissible?: boolean;
  onConfirm?: () => boolean | void | Promise<boolean | void>;
}

let seq = 0;
const stack: HTMLElement[] = [];

/** Joue l'animation de sortie (CSS `[data-closing]`) puis retire l'élément ; retrait direct sans animation. */
function dismiss(el: HTMLElement): void {
  el.setAttribute('data-closing', '');
  const running = el.getAnimations?.() ?? [];
  if (!running.length) { el.remove(); return; }
  void Promise.allSettled(running.map((a) => a.finished)).then(() => el.remove());
}

export function openModal(opts: ModalOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const previous = document.activeElement as HTMLElement | null;
    const id = `dlg-${++seq}`;

    const overlay = document.createElement('div');
    overlay.className = 'dlg-overlay';

    const box = document.createElement('div');
    box.className = `dlg${opts.wide ? ' dlg--wide' : ''}`;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', `${id}-t`);

    const title = document.createElement('h2');
    title.className = 'dlg__title';
    title.id = `${id}-t`;
    title.textContent = opts.title;

    const body = document.createElement('div');
    body.className = 'dlg__body';
    if (typeof opts.body === 'string') {
      for (const para of opts.body.split('\n\n')) {
        const p = document.createElement('p');
        p.textContent = para;
        body.append(p);
      }
    } else if (opts.body) {
      body.append(opts.body);
    }

    const actions = document.createElement('div');
    actions.className = 'dlg__actions';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = `dlg__btn dlg__ok${opts.danger ? ' dlg__ok--danger' : ''}`;
    ok.textContent = opts.confirmLabel ?? 'Confirmer';
    actions.append(ok);
    let cancel: HTMLButtonElement | null = null;
    if (opts.cancelLabel !== null) {
      cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'dlg__btn';
      cancel.textContent = opts.cancelLabel ?? 'Annuler';
      actions.prepend(cancel);
    }

    if (opts.logo) {
      const logo = document.createElement('div');
      logo.className = 'dlg__logo';
      logo.setAttribute('aria-hidden', 'true');
      logo.innerHTML = `<svg viewBox="0 0 24 24">${PANEL_MARK}</svg>`;
      box.append(logo);
    }
    box.append(title, body, actions);
    overlay.append(box);

    let closed = false;
    const close = (result: boolean) => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(overlay), 1);
      dismiss(overlay);
      previous?.focus?.({ preventScroll: true });
      resolve(result);
    };

    const confirm = async () => {
      ok.disabled = true;
      try {
        if ((await opts.onConfirm?.()) === false) { ok.disabled = false; return; }
      } catch {
        ok.disabled = false;
        return;
      }
      close(true);
    };

    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== overlay) return;
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        if (opts.dismissible !== false) close(false);
      } else if (e.key === 'Tab') {
        const f = [...box.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    ok.addEventListener('click', confirm);
    cancel?.addEventListener('click', () => close(false));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay && opts.dismissible !== false) close(false); });
    document.addEventListener('keydown', onKey, true);

    stack.push(overlay);
    document.body.append(overlay);
    const field = box.querySelector<HTMLElement>('input, textarea');
    (field ?? (opts.danger ? cancel : null) ?? ok).focus({ preventScroll: true });
  });
}

export function confirmDialog(o: { title: string; message?: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return openModal({ title: o.title, body: o.message, confirmLabel: o.confirmLabel, danger: o.danger });
}

export async function promptDialog(o: {
  title: string; message?: string; label?: string; value?: string; placeholder?: string; confirmLabel?: string;
}): Promise<string | null> {
  const wrap = document.createElement('div');
  if (o.message) {
    const p = document.createElement('p');
    p.textContent = o.message;
    wrap.append(p);
  }
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'filter dlg__input';
  input.value = o.value ?? '';
  if (o.placeholder) input.placeholder = o.placeholder;
  input.setAttribute('aria-label', o.label ?? o.title);
  wrap.append(input);
  let result: string | null = null;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      wrap.closest('.dlg')?.querySelector<HTMLButtonElement>('.dlg__ok')?.click();
    }
  });
  const ok = await openModal({
    title: o.title,
    body: wrap,
    confirmLabel: o.confirmLabel,
    onConfirm: () => { result = input.value; },
  });
  return ok ? result : null;
}

let openErrors: HTMLElement | null = null;

/** Fenêtre d'erreur unique : les erreurs suivantes s'y ajoutent, sans doublon. */
export function showError(message: string): void {
  const text = document.createElement('p');
  text.textContent = message;
  if (openErrors) {
    if (![...openErrors.querySelectorAll('p')].some((p) => p.textContent === message)) openErrors.append(text);
    return;
  }
  const body = document.createElement('div');
  body.append(text);
  openErrors = body;
  void openModal({ title: 'Une erreur est survenue', logo: true, body, confirmLabel: 'Fermer', cancelLabel: null }).then(() => { openErrors = null; });
}

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export function toast(message: string, kind: ToastKind = 'info', durationMs = 4000): void {
  if (kind === 'error') { showError(message); return; }
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.className = 'toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  const t = document.createElement('div');
  t.className = `toast toast--${kind}`;
  t.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.className = 'toast__text';
  text.textContent = message;
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'toast__close';
  x.setAttribute('aria-label', 'Fermer la notification');
  x.textContent = '×';
  let timer = 0;
  const remove = () => { window.clearTimeout(timer); if (t.isConnected && !t.hasAttribute('data-closing')) dismiss(t); };
  x.addEventListener('click', remove);
  t.append(text, x);
  host.append(t);

  // WCAG 2.2.1 : le minuteur s'arrête tant que le toast est survolé ou focalisé.
  let left = durationMs;
  let started = 0;
  const held = new Set<string>();
  const run = () => { started = Date.now(); timer = window.setTimeout(remove, left); };
  const hold = (why: string) => () => {
    if (!held.size) { window.clearTimeout(timer); left -= Date.now() - started; }
    held.add(why);
  };
  const release = (why: string) => () => {
    if (held.delete(why) && !held.size) run();
  };
  t.addEventListener('pointerenter', hold('hover'));
  t.addEventListener('pointerleave', release('hover'));
  t.addEventListener('focusin', hold('focus'));
  t.addEventListener('focusout', release('focus'));
  run();
}
