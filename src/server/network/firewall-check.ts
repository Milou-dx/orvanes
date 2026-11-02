const PORT_RE = /^\d{1,5}(:\d{1,5})?$/;
const CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

export function allowError(protocol: string, port: string, source: string | null): string | null {
  if (protocol !== 'tcp' && protocol !== 'udp') return 'Protocole invalide';
  if (!port) return 'Indiquez un port (8080) ou une plage (8000:8100).';
  if (!PORT_RE.test(port)) return 'Port invalide (attendu : 8080 ou 8000:8100)';
  if (port.split(':').some((p) => Number(p) < 1 || Number(p) > 65535)) return 'Port hors plage 1-65535';
  if (source && !CIDR_RE.test(source)) return 'Source invalide (attendu : 10.0.0.5 ou 10.0.0.0/24)';
  return null;
}
