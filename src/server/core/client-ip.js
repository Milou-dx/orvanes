const clean = (a) => String(a ?? '').replace(/^::ffff:/, '');
const trustedProxies = () => String(process.env.PANEL_TRUSTED_PROXIES ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Adresse réelle du client. L'en-tête X-Forwarded-For n'est cru que venant d'un proxy déclaré, la machine
 * comprise : un client qui passe par un tunnel SSH arrive lui aussi de 127.0.0.1 et choisirait son adresse.
 * Seule la dernière valeur compte : c'est celle ajoutée par notre proxy, le début vient du client.
 */
export function clientIp(peer, forwarded, trusted = trustedProxies()) {
  const ip = clean(peer);
  if (!trusted.includes(ip)) return ip;
  return String(forwarded ?? '').split(',').pop().trim() || ip;
}
