import dark from '../../assets/wallpaper-dark.webp';
import light from '../../assets/wallpaper-light.webp';

/** À poser en `style` sur l'élément `.wallpaper` : les deux images du fond d'écran de mistraOS (4-tholos). */
export const WALLPAPER = `--wallpaper-light: url(${light.src}); --wallpaper-dark: url(${dark.src})`;
