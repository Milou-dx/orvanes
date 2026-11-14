// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('astro:transitions/client', () => ({ navigate }));

import { isPaletteOpen, openPalette, searchItems } from '../../src/scripts/layout/palette';

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
      <nav id="nav-pane"><section class="navsec"><button class="navsec__head"><span>Système</span></button>
        <a class="navlink" href="/services"><span class="navlink__glyph"></span><span class="navlink__label">Services</span></a></section></nav>
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

  it('se ferme sans attendre quand la page change', () => {
    openPalette();
    document.dispatchEvent(new Event('astro:before-swap'));
    expect(document.querySelector('.cmdk-overlay')).toBeNull();
    expect(isPaletteOpen()).toBe(false);
  });
});
