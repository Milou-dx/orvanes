import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.PANEL_PORT = '4321';
  process.env.PANEL_PUBLIC_URL = 'https://panel.example.com';
});
vi.mock('../../src/server/shell/ssh-shell.js', () => ({
  open: vi.fn(async () => {}),
  write: vi.fn(),
  resize: vi.fn(),
  closeSession: vi.fn(),
}));

const ssh = await import('../../src/server/shell/ssh-shell.js');
const { attachShellWebSocket } = await import('../../src/server/shell/ws-shell.js');
const { guarded, isEnabled } = await import('../../src/server/auth/auth-core.js');
const { isDeclaredHost } = await import('../../src/server/core/hosts.js');

let server: http.Server;
let port: number;

beforeAll(async () => {
  server = http.createServer();
  attachShellWebSocket(guarded(server));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => vi.mocked(ssh.open).mockClear());

function upgrade(host: string, origin?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1', port, path: '/api/shell/ws',
      headers: {
        host, ...(origin ? { origin } : {}),
        connection: 'Upgrade', upgrade: 'websocket',
        'sec-websocket-key': 'AAAAAAAAAAAAAAAAAAAAAA==', 'sec-websocket-version': '13',
      },
    });
    req.on('upgrade', (res, socket) => { socket.destroy(); resolve(res.statusCode ?? 0); });
    req.on('response', (res) => { res.resume(); resolve(res.statusCode ?? 0); });
    req.on('error', reject);
    req.end();
  });
}

describe('terminal : hôtes déclarés, protection coupée', () => {
  it('la protection par mot de passe est bien coupée', () => expect(isEnabled()).toBe(false));

  it('refuse le DNS rebinding (Host et Origin du domaine tiers, identiques)', async () => {
    const status = await upgrade('rebind.evil:4321', 'http://rebind.evil:4321');
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
    expect(ssh.open).not.toHaveBeenCalled();
  });

  it.each([
    ['127.0.0.1:4321', 'http://attacker.com'],
    ['127.0.0.1:4321', 'http://rebind.evil:4321'],
    ['rebind.evil:4321', undefined],
  ])('refuse Host %s, Origin %s', async (host, origin) => {
    expect(await upgrade(host, origin)).toBe(401);
    expect(ssh.open).not.toHaveBeenCalled();
  });

  it.each([
    ['127.0.0.1:4321', 'http://127.0.0.1:4321'],
    ['localhost:4321', 'http://localhost:4321'],
    ['[::1]:4321', 'http://[::1]:4321'],
    ['panel.example.com', 'https://panel.example.com'],
    ['127.0.0.1:4321', 'https://panel.example.com'],
    ['127.0.0.1:4321', undefined],
  ])('ouvre le terminal : Host %s, Origin %s', async (host, origin) => {
    expect(await upgrade(host, origin)).toBe(101);
    expect(ssh.open).toHaveBeenCalledOnce();
  });
});

describe('isDeclaredHost', () => {
  it.each([
    ['127.0.0.1:4321', true],
    ['LOCALHOST:4321', true],
    ['panel.example.com', true],
    ['127.0.0.1:4322', false],
    ['panel.example.com:4321', false],
    ['rebind.evil:4321', false],
    ['', false],
    [undefined, false],
  ])('%s : %s', (host, ok) => expect(isDeclaredHost(host)).toBe(ok));
});
