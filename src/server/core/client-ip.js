const clean = (a) => String(a ?? '').replace(/^::ffff:/, '');
const trustedProxies = () => String(process.env.PANEL_TRUSTED_PROXIES ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Adresse réelle du client. L'en-tête X-Forwarded-For n'est cru que venant de la machine ou d'un proxy
 * déclaré, et seule sa dernière valeur compte : c'est celle ajoutée par notre proxy, le début vient du client.
 */
export function clientIp(peer, forwarded, trusted = trustedProxies()) {
  const ip = clean(peer);
  if (ip !== '127.0.0.1' && ip !== '::1' && !trusted.includes(ip)) return ip;
  return String(forwarded ?? '').split(',').pop().trim() || ip;
}
