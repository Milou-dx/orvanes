// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from '../../src/scripts/ui/dialog';

const count = () => document.querySelectorAll('.toast').length;

describe('toast', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

  it('se met en pause au survol et reprend le temps restant', () => {
    vi.useFakeTimers();
    toast('ok', 'success', 4000);
    const t = document.querySelector<HTMLElement>('.toast')!;
    vi.advanceTimersByTime(3000);
    t.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(60_000);
    expect(count()).toBe(1);
    t.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(900);
    expect(count()).toBe(1);
    vi.advanceTimersByTime(200);
    expect(count()).toBe(0);
  });

  it('garde une erreur au moins 10 s', () => {
    vi.useFakeTimers();
    toast('ko', 'error', 2000);
    vi.advanceTimersByTime(9_900);
    expect(count()).toBe(1);
    vi.advanceTimersByTime(200);
    expect(count()).toBe(0);
  });
});
