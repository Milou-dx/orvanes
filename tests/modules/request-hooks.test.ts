import { describe, expect, it, vi } from 'vitest';
import { closeUnclaimedUpgrade, handleHookRequest } from '../../src/server/modules/request-hooks.js';

const res = () => ({ headersSent: false, writeHead: vi.fn(), end: vi.fn() });

describe('hooks serveur : request', () => {
  it('ignore un module non installé, même si son hook réclamerait la requête', () => {
    const request = vi.fn(() => true);
    expect(handleHookRequest([{ id: 'a', hook: { request } }], () => false, {}, res())).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it('le premier hook qui répond true gagne, dans l’ordre', () => {
    const calls: string[] = [];
    const mk = (id: string, ret: boolean) => ({ id, hook: { request: () => (calls.push(id), ret) } });
    expect(handleHookRequest([mk('a', false), mk('b', true), mk('c', true)], () => true, {}, res())).toBe(true);
    expect(calls).toEqual(['a', 'b']);
  });

  it('un hook sans request est ignoré', () => {
    expect(handleHookRequest([{ id: 'a', hook: {} }], () => true, {}, res())).toBe(false);
  });

  it('une exception répond 500', () => {
    const r = res();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const hook = { request: () => { throw new Error('boum'); } };
    expect(handleHookRequest([{ id: 'a', hook }], () => true, {}, r)).toBe(true);
    expect(r.writeHead).toHaveBeenCalledWith(500, expect.anything());
  });
});

describe('hooks serveur : upgrade que personne ne prend', () => {
  const modules = {
    moduleForPath: (p: string) => (p.startsWith('/api/agent') ? { id: 'claude' } : p.startsWith('/api/mc') ? { id: 'minecraft' } : null),
    isInstalled: (id: string) => id === 'claude',
  };
  const upgrade = (url: string) => {
    const socket = { destroy: vi.fn() };
    closeUnclaimedUpgrade(modules)({ url }, socket);
    return socket.destroy.mock.calls.length > 0;
  };

  it.each([
    ['/api/shell/ws', false],
    ['/api/agent/ws', false],
    ['/api/mc/ws', true],
    ['/inconnu', true],
    ['//api/agent/ws', true],
  ])('%s fermé : %s', (url, closed) => {
    expect(upgrade(url)).toBe(closed);
  });
});
