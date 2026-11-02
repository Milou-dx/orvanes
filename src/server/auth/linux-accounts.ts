import { execFileSync } from 'node:child_process';
import os from 'node:os';

export const LINUX_USER = /^[a-z][a-z0-9_-]{0,31}$/;
export const FORBIDDEN_USERS = [...new Set(['root', os.userInfo().username])];
export const FORBIDDEN_GROUPS = ['sudo', 'admin', 'adm', 'wheel', 'docker', 'lxd', 'systemd-journal', 'disk', 'shadow'];

export function nameRefusal(name: unknown): string | null {
  if (typeof name !== 'string' || !LINUX_USER.test(name)) {
    return 'Nom de compte invalide : minuscule au début, puis minuscules, chiffres, « _ » ou « - » (32 caractères au plus).';
  }
  if (FORBIDDEN_USERS.includes(name)) return `Le compte « ${name} » est réservé.`;
  return null;
}

export interface LinuxAccount { name: string; uid: number; gid: number; home: string; groups: string[] }

export function accountRefusal(acc: LinuxAccount): string | null {
  const bad = nameRefusal(acc.name);
  if (bad) return bad;
  if (!(acc.uid >= 1000) || acc.uid >= 60000) return `Le compte « ${acc.name} » n’est pas un compte utilisateur (uid ${acc.uid}).`;
  if (acc.home !== `/home/${acc.name}`) return `Le dossier personnel de « ${acc.name} » doit être /home/${acc.name}.`;
  const admin = acc.groups.filter((g) => FORBIDDEN_GROUPS.includes(g));
  if (admin.length) return `Le compte « ${acc.name} » est membre de ${admin.join(', ')} : il administre la machine.`;
  return null;
}

export function readAccount(name: string): LinuxAccount | null {
  if (!LINUX_USER.test(name)) return null;
  let line: string;
  try {
    line = execFileSync('getent', ['passwd', name], { encoding: 'utf8', timeout: 5000 }).trim();
  } catch {
    return null;
  }
  const f = line.split(':');
  if (f.length < 7 || f[0] !== name) return null;
  const groups = execFileSync('id', ['-nG', '--', name], { encoding: 'utf8', timeout: 5000 }).trim().split(/\s+/).filter(Boolean);
  return { name, uid: Number(f[2]), gid: Number(f[3]), home: f[5], groups };
}

export function checkAccount(name: string): LinuxAccount | string {
  const bad = nameRefusal(name);
  if (bad) return bad;
  const acc = readAccount(name);
  if (!acc) return `Le compte Linux « ${name} » n’existe pas.`;
  return accountRefusal(acc) ?? acc;
}

const sudo = (args: string[]) => execFileSync('sudo', ['-n', ...args], { timeout: 30_000, encoding: 'utf8' });

export function suggestName(email: string): string {
  const base = String(email).split('@')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const name = base.replace(/^[^a-z]+/, '').slice(0, 32);
  return name && !FORBIDDEN_USERS.includes(name) ? name : '';
}

export function provisionAccount(name: string, create: boolean): LinuxAccount {
  const bad = nameRefusal(name);
  if (bad) throw new Error(bad);
  if (create) {
    if (readAccount(name)) throw new Error(`Le compte Linux « ${name} » existe déjà : liez-le plutôt.`);
    sudo(['useradd', '-m', '-U', '-s', '/bin/bash', '--', name]);
    sudo(['chmod', '700', `/home/${name}`]);
  }
  const acc = checkAccount(name);
  if (typeof acc === 'string') throw new Error(acc);
  sudo(['-u', name, 'mkdir', '-p', '--', `${acc.home}/${process.env.ORVANE_CLAUDE_PROJECTS_DIR || 'dev'}`]);
  const panel = os.userInfo().username;
  sudo(['setfacl', '-R', '-m', `u:${panel}:rX`, '--', acc.home]);
  sudo(['setfacl', '-R', '-d', '-m', `u:${panel}:rX`, '--', acc.home]);
  return acc;
}

