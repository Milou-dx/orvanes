// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('astro:transitions/client', () => ({ navigate }));

import { isPaletteOpen, openPalette, searchItems } from '../../src/scripts/layout/palette';
import { openMenu, isMenuOpen } from '../../src/scripts/ui/menu';

const input = () => document.querySelector<HTMLInputElement>('.cmdk__input')!;
const titles = () => [...document.querySelectorAll('.cmdk__label')].map((el) => el.textContent);
function type(text: string) {
  input().value = text;
  input().dispatchEvent(new Event('input', { bubbles: true }));
}
const press = (key: string) => input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('entrées de recherche de la palette', () => {
  it('propose la recherche de processus quand l’onglet est permis', () => {
    expect(searchItems('nginx', { target: false, processus: true }).map((i) => i.title)).toEqual(['Chercher le processus « nginx »']);
  });
  it('propose le filtre de la page avant les processus quand la page a un champ', () => {
    expect(searchItems('nginx', { target: true, processus: true }).map((i) => i.id)).toEqual(['search:page', 'search:processus']);
  });
  it('ne propose rien pour une requête vide', () => {
    expect(searchItems('   ', { target: true, processus: true })).toEqual([]);
  });
  it('ne propose pas les processus sans le droit sur l’onglet', () => {
    expect(searchItems('nginx', { target: false, processus: false })).toEqual([]);
  });
});

describe('palette née de l’îlot', () => {
  beforeEach(() => {
    navigate.mockClear();
    document.body.innerHTML = `
      <nav id="dock"><a class="dock__tile" href="/services" data-label="Services" data-section="Système"><span class="dock__glyph"></span></a></nav>
      <button class="island" data-cmdk-open data-processus>Rechercher…</button>`;
  });
  afterEach(() => { if (isPaletteOpen()) press('Escape'); });

  it('Entrée sur « Chercher le processus » mène à /processus?q=', () => {
    openPalette();
    type('nginx');
    expect(titles()).toEqual(['Chercher le processus « nginx »']);
    press('Enter');
    expect(navigate).toHaveBeenCalledWith('/processus?q=nginx');
    expect(isPaletteOpen()).toBe(false);
  });

  it('filtre le champ de la page quand elle en a un', () => {
    document.body.insertAdjacentHTML('beforeend', '<input type="search" data-search-target />');
    const target = document.querySelector<HTMLInputElement>('[data-search-target]')!;
    openPalette();
    type('ssh');
    expect(titles()[0]).toBe('Filtrer cette page : « ssh »');
    press('Enter');
    expect(target.value).toBe('ssh');
  });

  it('une page qui porte la saisie passe avant la recherche de processus', () => {
    openPalette();
    type('serv');
    expect(titles()).toEqual(['Services', 'Chercher le processus « serv »']);
    press('Enter');
    expect(navigate).toHaveBeenCalledWith('/services');
  });

  it('Échap referme et rend le focus à l’îlot', () => {
    const island = document.querySelector<HTMLElement>('.island')!;
    island.focus();
    openPalette();
    expect(document.activeElement).toBe(input());
    press('Escape');
    expect(document.querySelector('.cmdk-overlay')).toBeNull();
    expect(document.activeElement).toBe(island);
    expect(island.classList.contains('island--away')).toBe(false);
  });

  it('un mot de la section ne passe pas devant la recherche de processus', () => {
    openPalette();
    type('système');
    expect(titles()[0]).toBe('Chercher le processus « système »');
  });

  it('ouverte au clavier sans focus, elle rend le focus à l’îlot', () => {
    (document.activeElement as HTMLElement | null)?.blur();
    openPalette();
    press('Escape');
    expect(document.activeElement).toBe(document.querySelector('.island'));
  });

  it('referme le menu ouvert', () => {
    openMenu({ items: [{ label: 'Un', run: () => {} }], x: 0, y: 0 });
    openPalette();
    expect(isMenuOpen()).toBe(false);
  });

  it('un appui en dehors la referme sans bloquer le clic', () => {
    openPalette();
    const link = document.querySelector<HTMLElement>('.dock__tile')!;
    const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    link.dispatchEvent(down);
    expect(isPaletteOpen()).toBe(false);
    expect(down.defaultPrevented).toBe(false);
  });

  describe('avec le mouvement', () => {
    beforeEach(() => { vi.useFakeTimers(); window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia; });
    afterEach(() => { vi.runAllTimers(); vi.useRealTimers(); delete (window as { matchMedia?: unknown }).matchMedia; });

    it('Échap laisse la forme revenir à l’îlot avant de la retirer', () => {
      const island = document.querySelector<HTMLElement>('.island')!;
      openPalette();
      expect(island.classList.contains('island--away')).toBe(true);
      press('Escape');
      expect(document.querySelectorAll('.cmdk-overlay').length).toBe(1);
      expect(island.classList.contains('island--away')).toBe(true);
      vi.advanceTimersByTime(700);
      expect(document.querySelector('.cmdk-overlay')).toBeNull();
      expect(island.classList.contains('island--away')).toBe(false);
    });

    it('rouverte pendant la fermeture, il n’en reste qu’une', () => {
      openPalette();
      press('Escape');
      openPalette();
      expect(document.querySelectorAll('.cmdk-overlay').length).toBe(1);
      expect(document.querySelector('.island')!.classList.contains('island--away')).toBe(true);
    });

    it('une navigation la retire tout de suite', () => {
      openPalette();
      document.dispatchEvent(new Event('astro:before-swap'));
      expect(document.querySelector('.cmdk-overlay')).toBeNull();
    });
  });

  it('se ferme sans attendre quand la page change', () => {
    openPalette();
    document.dispatchEvent(new Event('astro:before-swap'));
    expect(document.querySelector('.cmdk-overlay')).toBeNull();
    expect(isPaletteOpen()).toBe(false);
  });
});
