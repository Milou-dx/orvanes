// Seule liste des adresses du panel : astro.config.mjs (allowedDomains) et serve.mjs (refus des
// autres Host, contre le DNS rebinding). Lue à l'appel : astro.config.mjs l'importe avant loadEnv().
export function panelUrls() {
  const port = process.env.PANEL_PORT || '4321';
  const loopback = [...new Set([process.env.PANEL_HOST || '127.0.0.1', '127.0.0.1', 'localhost', '[::1]'])]
    .map((h) => new URL(`http://${h.includes(':') && !h.startsWith('[') ? `[${h}]` : h}:${port}`));
  return [
    ...String(process.env.PANEL_PUBLIC_URL ?? '').split(',').map((s) => s.trim()).filter(Boolean).map((raw) => new URL(raw)),
    ...loopback,
  ];
}

let hosts;

/** @param {string | undefined} host valeur d'un en-tête Host */
export const isDeclaredHost = (host) => (hosts ??= new Set(panelUrls().map((u) => u.host))).has(String(host ?? '').toLowerCase());
