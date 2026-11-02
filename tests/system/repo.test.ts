import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

describe('dépôt', () => {
  it('dist n’est pas versionné et il est ignoré', () => {
    expect(git('ls-files', 'dist')).toBe('');
    expect(git('check-ignore', '--no-index', 'dist', 'releases/x', '.runtime/node', '.env')).toBe('dist\nreleases/x\n.runtime/node\n.env');
  });
});
