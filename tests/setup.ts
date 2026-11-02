import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

if (typeof window === 'undefined') process.env.PANEL_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'orvane-test-'));
