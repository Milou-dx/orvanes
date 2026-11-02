import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

/** @param {URL | string} file */
export function loadEnv(file) {
  if (!existsSync(file)) return;
  const before = new Set(Object.keys(process.env));
  process.loadEnvFile(file);
  for (const [k, v] of Object.entries(process.env)) {
    if (!before.has(k) && v && /^~(\/|$)/.test(v)) process.env[k] = homedir() + v.slice(1);
  }
}
