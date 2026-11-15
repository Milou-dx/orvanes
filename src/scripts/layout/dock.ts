// Valeurs de mistraOS : dock.toml (magnification) et theme.toml [dock] (reach, en tailles d'icône).
const MAGNIFICATION = 1.2;
const REACH = 2.5;

/** Combien une tuile grandit, le pointeur à `distance` tailles d'icône de son centre : tout l'agrandissement
    dessous, plus rien à `reach`, le long d'un cosinus pour que la rangée ondule sans à-coup. */
export function dockScale(distance: number | null, magnification: number, reach: number): number {
  if (distance === null || magnification <= 1) return 1;
  const d = Math.abs(distance);
  if (d >= reach) return 1;
  return 1 + (magnification - 1) * (1 + Math.cos((Math.PI * d) / reach)) / 2;
}

const still = () => window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 640px)').matches;

function swell(dock: HTMLElement, x: number | null) {
  const row = dock.querySelector<HTMLElement>('.dock__row');
  if (!row) return;
  const cells = [...row.children] as HTMLElement[];
  const styles = getComputedStyle(dock);
  const icon = parseFloat(styles.getPropertyValue('--dock-icon'));
  const gap = parseFloat(styles.getPropertyValue('--dock-gap'));
  // Les centres au repos, calculés et non mesurés : la rangée bouge pendant qu'elle grandit.
  const widths = cells.map((c) => (c.classList.contains('dock__sep') ? c.offsetWidth : icon));
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (cells.length - 1);
  const frame = dock.getBoundingClientRect();
  let at = frame.left + (frame.width - total) / 2;
  cells.forEach((cell, i) => {
    const centre = at + widths[i] / 2;
    at += widths[i] + gap;
    const tile = cell.querySelector<HTMLElement>('.dock__tile');
    if (!tile) return;
    const s = x === null ? 1 : dockScale((x - centre) / (icon + gap), MAGNIFICATION, REACH);
    if (s === 1) tile.style.removeProperty('--s'); else tile.style.setProperty('--s', s.toFixed(3));
  });
}

let grown = false;
function follow(x: number | null) {
  const dock = document.getElementById('dock');
  if (!dock || (x === null && !grown) || still()) return;
  grown = x !== null;
  swell(dock, x);
}
document.addEventListener('pointermove', (e) => follow((e.target as Element | null)?.closest('#dock') ? e.clientX : null));
document.documentElement.addEventListener('pointerleave', () => follow(null));
