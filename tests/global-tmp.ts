import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Tous les dossiers temporaires des tests vont dans un seul dossier, effacé à la fin du lancement.
export default function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'orvane-vitest-'));
  process.env.TMPDIR = dir; // hérité par les workers (pool forks) : os.tmpdir() y pointe
  return () => rmSync(dir, { recursive: true, force: true });
}
