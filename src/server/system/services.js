import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { protectedUnits as moduleProtectedUnits } from '../modules/registry.js';

const execFileAsync = promisify(execFile);
const SYSTEMCTL = '/usr/bin/systemctl';

const CORE_PROTECTED = [
  'ssh', 'sshd', 'tailscaled', 'systemd-logind', 'systemd-journald', 'dbus', 'systemd-resolved',
];

export function protectedUnits() {
  return [...CORE_PROTECTED.map((unit) => ({ unit, reason: '' })), ...moduleProtectedUnits()];
}

const DETAILS_TTL_MS = 15_000;
let details = { at: 0, units: '', byId: {}, inflight: null };

async function fetchDetails(units) {
  if (units.length === 0) return {};
  const { stdout } = await execFileAsync(SYSTEMCTL, [
    'show',
    ...units,
    '--property=Id,UnitFileState,MainPID',
  ]);
  const byId = {};
  for (const block of stdout.split('\n\n').filter(Boolean)) {
    const props = {};
    for (const line of block.split('\n')) {
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      props[line.slice(0, idx)] = line.slice(idx + 1);
    }
    if (props.Id) byId[props.Id] = props;
  }
  return byId;
}

async function unitDetails(units) {
  const key = units.join(' ');
  const refresh = () => {
    if (!details.inflight) {
      details.inflight = fetchDetails(units)
        .then((byId) => { details = { at: Date.now(), units: key, byId, inflight: null }; return byId; })
        .catch((err) => { details.inflight = null; throw err; });
    }
    return details.inflight;
  };
  if (details.at === 0) return refresh();
  if (details.units !== key || Date.now() - details.at > DETAILS_TTL_MS) refresh().catch(() => {});
  return details.byId;
}

export async function listServices() {
  const { stdout } = await execFileAsync(SYSTEMCTL, [
    'list-units',
    '--type=service',
    '--all',
    '--no-legend',
    '--no-pager',
    '--plain',
  ]);

  const services = [];
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^\s*(\S+\.service)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const [, unit, load, active, sub, description] = m;
    services.push({ unit, name: unit.replace(/\.service$/, ''), load, active, sub, description: description.trim() });
  }

  const byId = await unitDetails(services.map((s) => s.unit));
  for (const s of services) {
    const p = byId[s.unit];
    s.enabled = p?.UnitFileState || 'unknown';
    s.pid = s.active === 'active' && p?.MainPID && p.MainPID !== '0' ? Number(p.MainPID) : null;
  }

  return services;
}

const ALLOWED_ACTIONS = new Set(['start', 'stop', 'restart', 'enable', 'disable']);

function normalizeUnit(name) {
  if (!/^[a-zA-Z0-9_.@-]+$/.test(name)) throw new Error('Nom de service invalide');
  return name.endsWith('.service') ? name : `${name}.service`;
}

export async function runServiceAction(name, action) {
  if (!ALLOWED_ACTIONS.has(action)) throw new Error('Action non autorisée');
  const unit = normalizeUnit(name);
  await execFileAsync('/usr/bin/sudo', ['-n', SYSTEMCTL, action, unit]);
  details.at = 0;
  return unit;
}
