// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { openModal } from '../../src/scripts/ui/dialog';

const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('openModal dismissible', () => {
  it('Échap ferme par défaut', async () => {
    let done: boolean | undefined;
    openModal({ title: 'a' }).then((v) => { done = v; });
    await tick(); esc(); await tick();
    expect(done).toBe(false);
  });

  it('dismissible:false ignore Échap ; seul le bouton ferme', async () => {
    let done: boolean | undefined;
    openModal({ title: 'b', dismissible: false, cancelLabel: null }).then((v) => { done = v; });
    await tick(); esc(); await tick();
    expect(done).toBeUndefined();
    (document.querySelectorAll<HTMLButtonElement>('.dlg__ok')).forEach((b) => b.click());
    await tick();
    expect(done).toBe(true);
  });
});
