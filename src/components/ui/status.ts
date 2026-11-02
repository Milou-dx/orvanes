export type Status = 'running' | 'stopped' | 'warning' | 'error' | 'unknown';

export const STATUS_LABEL: Record<Status, string> = {
  running: 'En cours',
  stopped: 'Arrêté',
  warning: 'Attention',
  error: 'Erreur',
  unknown: 'Inconnu',
};

export function toStatus(raw: string | null | undefined): Status {
  const v = String(raw ?? '').toLowerCase();
  if (['running', 'active', 'online', 'up', 'healthy', 'started', 'ok'].includes(v)) return 'running';
  if (['stopped', 'inactive', 'offline', 'exited', 'dead', 'created', 'down'].includes(v)) return 'stopped';
  if (['warning', 'degraded', 'restarting', 'activating', 'deactivating', 'starting', 'paused', 'unhealthy'].includes(v)) return 'warning';
  if (['error', 'failed', 'crashed'].includes(v)) return 'error';
  return 'unknown';
}
