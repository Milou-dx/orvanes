import { LUCIDE, type IconName } from '../../components/ui/lucide';
import { STATUS_LABEL, toStatus, type Status } from '../../components/ui/status';


const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

export function iconSVG(name: IconName, size = 16): string {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUCIDE[name] ?? ''}</svg>`;
}

export function statusBadgeHTML(status: Status | string, label?: string, opts: { pulse?: boolean; size?: 'sm' | 'md' } = {}): string {
  const s: Status = (status in STATUS_LABEL ? status : toStatus(status)) as Status;
  const cls = ['sbadge', `sbadge--${s}`, opts.size === 'sm' && 'sbadge--sm', opts.pulse && 'sbadge--pulse'].filter(Boolean).join(' ');
  return `<span class="${cls}"><span class="sbadge__dot" aria-hidden="true"></span>${esc(label ?? STATUS_LABEL[s])}</span>`;
}

export interface StateOptions { icon?: IconName; title: string; text?: string; compact?: boolean }

export function emptyStateHTML(o: StateOptions): string {
  return `<div class="ui-state${o.compact ? ' ui-state--compact' : ''}">`
    + `<span class="ui-state__icon">${iconSVG(o.icon ?? 'search', 20)}</span>`
    + `<p class="ui-state__title">${esc(o.title)}</p>`
    + (o.text ? `<p class="ui-state__text">${esc(o.text)}</p>` : '')
    + `</div>`;
}

export function errorStateHTML(o: Partial<StateOptions> & { detail?: string } = {}): string {
  return `<div class="ui-state ui-state--error${o.compact ? ' ui-state--compact' : ''}" role="alert">`
    + `<span class="ui-state__icon">${iconSVG(o.icon ?? 'circleAlert', 20)}</span>`
    + `<p class="ui-state__title">${esc(o.title ?? 'Impossible de charger les données')}</p>`
    + `<p class="ui-state__text">${esc(o.text ?? 'Réessayez dans un instant. Si le problème persiste, consultez les journaux.')}</p>`
    + (o.detail ? `<pre class="ui-state__detail">${esc(o.detail)}</pre>` : '')
    + `</div>`;
}

export interface ButtonOptions {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconOnly?: boolean;
  title?: string;
  disabled?: boolean;
  pressed?: boolean;
  className?: string;
  data?: Record<string, string | number>;
}

export function buttonHTML(text: string, o: ButtonOptions = {}): string {
  const size = o.size ?? 'md';
  const cls = ['btn', `btn--${o.variant ?? 'secondary'}`, `btn--${size}`, o.iconOnly && 'btn--icon', o.className].filter(Boolean).join(' ');
  const glyph = size === 'lg' ? 18 : size === 'sm' ? 14 : 16;
  const title = o.title ?? (o.iconOnly ? text : undefined);
  const attrs = [
    `class="${esc(cls)}"`, 'type="button"',
    o.iconOnly ? `aria-label="${esc(text)}"` : '',
    title ? `title="${esc(title)}"` : '',
    o.disabled ? 'disabled' : '',
    o.pressed === undefined ? '' : `aria-pressed="${o.pressed}"`,
    ...Object.entries(o.data ?? {}).map(([k, v]) => `data-${esc(k)}="${esc(v)}"`),
  ].filter(Boolean).join(' ');
  return `<button ${attrs}>${o.icon ? iconSVG(o.icon, glyph) : ''}${o.iconOnly ? '' : esc(text)}</button>`;
}
