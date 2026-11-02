import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function listProcesses() {
  const { stdout } = await execFileAsync('/usr/bin/ps', [
    '-eo',
    'pid,user:20,pcpu,pmem,stat,comm,args',
    '--no-headers',
  ]);

  const rows = [];
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^\s*(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const [, pid, user, cpu, mem, stat, comm, args] = m;
    rows.push({
      pid: Number(pid),
      user,
      cpu: Number(cpu),
      mem: Number(mem),
      state: stat,
      name: comm,
      command: args,
    });
  }
  return rows;
}

const ALLOWED_SIGNALS = new Set(['SIGTERM', 'SIGKILL']);

export async function killProcess(pid, signal = 'SIGTERM') {
  if (!ALLOWED_SIGNALS.has(signal)) throw new Error('Signal non autorisé');
  if (!Number.isInteger(pid) || pid <= 1) throw new Error('PID invalide');
  process.kill(pid, signal);
}
