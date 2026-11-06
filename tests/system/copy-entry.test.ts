import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { copyEntry } from '../../src/server/files/files.js';

it('copier sur un fichier existant renvoie le code EEXIST', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'copy-'));
  writeFileSync(join(dir, 'a.txt'), 'x');
  const dest = mkdtempSync(join(tmpdir(), 'copy-'));
  writeFileSync(join(dest, 'a.txt'), 'y');
  await expect(copyEntry(join(dir, 'a.txt'), dest)).rejects.toMatchObject({ code: 'EEXIST' });
});
