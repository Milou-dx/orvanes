#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../src/server/core/env.js';

loadEnv(new URL('../.env', import.meta.url));
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const core = await import('../src/server/auth/auth-core.js');
const [command = 'init', rawId] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function password() {
  const given = process.env.ORVANE_ADMIN_PASSWORD ?? '';
  if (given && given.length < 8) fail('ORVANE_ADMIN_PASSWORD doit faire au moins 8 caractères.');
  return given || core.generatePassword();
}

function upsertAdmin(id, clear) {
  const users = core.listUsers();
  const hash = core.hashPassword(clear);
  const existing = users.find((u) => u.email === id);
  if (existing) {
    core.saveUsers(users.map((u) => (u.id === existing.id ? { ...u, role: 'admin', status: 'active', totp: undefined, password: hash } : u)));
    core.destroyUserSessions(existing.id);
  } else {
    core.saveUsers([...users, core.newUser({ email: id, name: id.split('@')[0], role: 'admin', password: hash })]);
  }
}

const id = core.normalizeEmail(rawId ?? (command === 'init' ? 'admin' : ''));
if (!/^[^\s\u0000-\u001f]{3,120}$/.test(id)) fail('Identifiant invalide : 3 à 120 caractères, sans espace.');

if (command === 'init') {
  const ready = core.listUsers().some((u) => u.role === 'admin' && u.status === 'active' && u.password);
  if (ready && core.isEnabled()) {
    console.log('Protection déjà active avec un administrateur : rien à faire.');
    console.log('Mot de passe perdu : node scripts/admin.mjs reset <identifiant>');
    process.exit(0);
  }
  if (!ready) {
    const clear = password();
    upsertAdmin(id, clear);
    console.log(`Administrateur créé. Identifiant : ${id}`);
    console.log(`Mot de passe : ${clear}`);
    console.log('Notez-le maintenant : il ne sera plus affiché.');
  }
  core.saveSettings({ enabled: true });
  console.log('Protection par mot de passe activée.');
} else if (command === 'reset') {
  if (!rawId) fail('Usage : node scripts/admin.mjs reset <identifiant>');
  const clear = password();
  upsertAdmin(id, clear);
  core.saveSettings({ enabled: true });
  console.log(`Nouveau mot de passe pour ${id} : ${clear}`);
  console.log('Ses sessions ouvertes sont fermées. Protection par mot de passe active.');
} else {
  fail('Usage : node scripts/admin.mjs init [identifiant] | reset <identifiant>');
}
