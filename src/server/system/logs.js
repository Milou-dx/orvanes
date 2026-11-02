import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { logSources } from '../modules/registry.js';

const execFileAsync = promisify(execFile);

const CORE_SOURCES = {
  system: { label: 'Système (journald)', kind: 'journal', unit: null },
  ssh: { label: 'SSH', kind: 'journal', unit: 'ssh.service' },
  panel: { label: 'Panel', kind: 'journal', unit: process.env.PANEL_SERVICE || 'orvane.service', user: true },
};

function sources() {
  return { ...CORE_SOURCES, ...Object.fromEntries(logSources().map((s) => [s.id, s])) };
}

export function listLogSources() {
  return Object.entries(sources()).map(([id, s]) => ({ id, label: s.label }));
}

export async function readLog(sourceId, lines = 300, search = '') {
  const all = sources();
  const source = Object.hasOwn(all, sourceId) ? all[sourceId] : null;
  if (!source) throw new Error('Source de log inconnue');

  let content;
  if (source.kind === 'journal') {
    const args = ['-n', String(lines), '--no-pager', '-o', 'short-iso'];
    if (source.unit) args.push(source.user ? '--user-unit' : '-u', source.unit);
    const { stdout } = await execFileAsync('/usr/bin/journalctl', args);
    content = stdout;
  } else {
    const raw = await fs.readFile(source.path, 'utf8');
    content = raw.split('\n').slice(-lines).join('\n');
  }

  if (search) {
    const needle = search.toLowerCase();
    content = content
      .split('\n')
      .filter((l) => l.toLowerCase().includes(needle))
      .join('\n');
  }
  return content;
}
