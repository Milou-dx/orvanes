import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('install.sh : création de .env', () => {
  it.each(['https://panel.test/a|b', 'x&y', 'c:\\chemin\\n', "q'uo\"te $HOME"])('écrit la valeur telle quelle : %s', (value) => {
    const dir = mkdtempSync(join(tmpdir(), 'orvane-install-'));
    writeFileSync(join(dir, '.env.example'), 'PANEL_HOST=127.0.0.1\nPANEL_PORT=4321\nPANEL_PUBLIC_URL=\nAUTRE=1\n');
    execFileSync('bash', ['-c', 'source <(sed \'$d\' "$1"); configure >/dev/null', '_', resolve('install.sh')], {
      env: { ...process.env, ORVANE_DIR: dir, PANEL_HOST: '127.0.0.1', PANEL_PUBLIC_URL: value, PANEL_PORT: '4510' },
    });
    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe(`PANEL_HOST=127.0.0.1\nPANEL_PORT=4510\nPANEL_PUBLIC_URL=${value}\nAUTRE=1\n`);
  });
});
