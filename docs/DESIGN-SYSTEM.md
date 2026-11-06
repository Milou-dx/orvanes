# Système de design du panel Orvanes

Référence vivante : la page `/design` (réservée aux administrateurs, absente du menu).

## Règles

- Jamais de couleur hexadécimale ni de taille en pixels dans une page : utiliser les jetons de `src/styles/tokens.css`.
- Une action primaire par zone. Un bouton icône seule a toujours un `label`.
- Toute liste a un état vide, un état d'erreur et un état de chargement (squelette).
- Clair et sombre testés tous les deux. Texte à 4,5:1 minimum.
- L'onglet Claude (`claude.astro`, jetons « classiques » sur `#agent`) est hors périmètre : ne pas le modifier.

## Jetons canoniques

| Famille | Jetons |
|---|---|
| Fonds | `--bg-app`, `--bg-surface`, `--bg-surface-2`, `--bg-hover` |
| Filets | `--border`, `--border-strong`, `--field-stroke` (bord des champs, 3:1) |
| Texte | `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-disabled` |
| Accent | `--accent`, `--accent-hover`, `--accent-active`, `--accent-subtle`, `--accent-border`, `--accent-fg` |
| Sémantique | `--success`, `--warning`, `--danger`, `--info` (+ `-subtle`, `-border`) ; points : `--status-online/-warning/-error/-offline` |
| Teintes | `--tone-<gray\|brown\|orange\|yellow\|green\|blue\|purple\|pink\|red>-bg/-fg` : palette de base des couleurs sémantiques et des graphes, jamais pour teinter une icône |
| Rayons | `--radius-xs` 4, `--radius-sm` 6, `--radius-md` 8, `--radius-lg` 12, `--radius-full` (points seulement) |
| Ombres | `--shadow-xs`, `--shadow-sm`, `--shadow-md` |
| Mouvement | `--dur-fast`, `--dur-base`, `--dur-enter`, `--ease-out`, `--ease-in`, `--ease-in-out` |
| Typo | `--{micro,meta,dense,body,card,section,page}-{size,lh,ls}`, `--weight-{regular,medium,semibold,bold}`, `--font-ui`, `--font-mono` |
| Espaces | `--space-0-5` à `--space-16` (grille de 4 px), `--control-h-sm/-h/-h-lg`, `--row-h`, `--row-h-compact` |
| Empilement | `--z-sticky`, `--z-pane`, `--z-drawer`, `--z-menu`, `--z-overlay`, `--z-toast` |

`--text-disabled` est réservé aux contrôles désactivés (sous 4,5:1 par conception) : une mention informative (« protégé », « Non renseigné ») prend `--text-tertiary`. Un lien posé sur un fond teinté (`-subtle`) garde la couleur du texte, souligné.

Alias conservés (ne plus les utiliser dans du code neuf) : `--radius-control` = sm, `--radius-card` / `--radius-modal` = md, `--radius-pill`, `--shadow-subtle` = xs, `--shadow-overlay` = md, `--duration-micro/-ui/-page`, `--ease`.

Police : Inter Variable auto-hébergée via `@fontsource-variable/inter` (licence OFL, importée par PanelLayout, servie par Vite).

## Points de rupture et cibles tactiles

Trois points de rupture, écrits en dur dans les `@media` (ils n'acceptent pas `var()`) ; jetons de référence `--bp-sm/-md/-lg` dans `tokens.css`.

| Nom | Largeur | Effet |
|---|---|---|
| sm | 640 px | tableaux en cartes, grilles réduites, libellés de commandes masqués |
| md | 900 px | colonnes `hide-md` masquées, volets empilés |
| lg | 1200 px | volets latéraux repliés, colonnes optionnelles masquées |

Cibles : `@media (pointer: coarse)` donne 44 px minimum (`--touch-target`) à tout bouton, case, onglet et entrée de menu ; à la souris 24 px minimum.

Tableaux sous 640 px : `.dt` passe en cartes (1re cellule = titre, `data-label` posé par `ui-table.ts`, actions en bas, colonnes `hide-sm`/`hide-md` masquées). Classe `dt--scroll` pour garder le défilement horizontal (matrices).

## Menu contextuel (`src/scripts/ui/menu.ts`)

`openMenu({ items, anchor?, x?, y?, label?, returnFocus? })` : menu « … » ou clic droit, un seul ouvert, tenu dans la fenêtre, flèches / Début / Fin / Échap (rend le focus) / Tab. `items` : `{ label, icon?, hint?, danger?, disabled?, run }` ou `'sep'`. `bindContextMenu(el, (ev, cible) => items | null)` ajoute clic droit, touche Menu et Maj+F10. Styles `.ui-menu` dans `ui.css`. Bouton « … » : `Button` ghost `sm` `iconOnly` icône `more`.

## Composants (`src/components/ui/`)

| Composant | Props |
|---|---|
| `PageSection` | `title?`, `description?`, `level?: 2\|3`, `id?` ; slot `actions` |
| `SubNav` | `items: {href, label, icon?, count?, prefix?}[]`, `label`, `current?` |
| `Tabs` | `id`, `tabs: {id, label, icon?, count?}[]`, `label`, `selected?` ; un slot par id d'onglet ; événement `tabs:change` |
| `Toolbar` | `search?` (placeholder), `controls?` (id du DataTable), `topSearch?`, `count?`, `label?`, `searchId?` ; slots `left`, `right` |
| `DataTable` | `id`, `columns`, `rows?`, `caption?`, `empty?`, `noun?`, `sort?`, `density?`, `sticky?`, `maxHeight?`, `client?`, `loading?`, `skeletonRows?`, `footer?` ; slot = vos `<tr>` |
| `EmptyState` | `icon?`, `title`, `text?`, `compact?` ; slot `actions` |
| `ErrorState` | `title?`, `text?`, `detail?`, `icon?`, `compact?` ; slot `actions` |
| `StatusBadge` | `status?: running\|stopped\|warning\|error\|unknown`, `raw?` (état brut systemd/Docker), `label?`, `pulse?`, `size?` |
| `StatGrid` | `items?`, `min?`, `cols?` ; sinon slot de `<Stat>` |
| `KeyValue` | `items: {label, value, mono?, html?}[]`, `mono?`, `cols?: 1\|2`, `plain?` |
| `Kbd` | `keys` (ex. `"Mod+K"`) |
| `Segmented` | `options: {value, label, icon?, iconOnly?, count?}[]`, `label`, `selected?`, `attr?` (→ `data-<attr>`), `id?` ; classes globales `.seg`, `.seg__btn` (aria-pressed ou aria-current), `.seg__n` |
| `PageHeader` | `title`, `description?` ; slot `actions`. Posé par `PanelLayout` : une page ne l'écrit pas elle-même |
| `ModuleLogo` | `id` (module), `size?` (16) ; logo du module en SVG dans la page (voir « Logos des modules ») |
| `Card` | `title?`, `description?`, `icon?` (Lucide, monochrome), `flush?`, `interactive?`, `id?` ; slot `actions` |
| `SettingsRow` | `title`, `desc?`, `icon?`, `href?` ; `check`, `info`, `warning` sont teintées (état), les autres neutres |
| `Button` (+ `title`, `hidden`, `pressed`, `data-*` ; classes `.btn` globales), `Badge`, `Stat`, `Meter`, `Input`, `Select`, `Toggle`, `Skeleton`, `Spinner`, `ActionButton`, `Icon` | inchangés |

Colonne (`columns`) : `key`, `label`, `sortable?`, `type?: text\|number\|date`, `align?`, `mono?`, `muted?`, `nowrap?`, `actions?`, `width?`, `hideBelow?: sm\|md\|lg`, `hideLabel?`, côté serveur `format?(row)`, `value?(row)`, côté client `render?(row)`, `value?(row)`.

Classes de cellule pour vos `<tr>` : `is-mono`, `is-muted`, `is-nowrap`, `is-actions`, `al-right`, `al-center`, `hide-sm`, `hide-md`, `hide-lg` ; `data-value` sur un `<td>` pour trier sur une autre valeur que le texte.

Classes héritées toujours valides : `.tbl`, `.filter`, `.mini` (`--go`, `--danger`), `.tbtn`, `.empty`, `.statusbar`, `.menu`, `.tgl`.

## API JS des tableaux (`src/scripts/ui/table.ts`)

```ts
mountTable(target: string | HTMLElement, options: TableOptions): TableController
getTable(id: string): TableController | undefined
```

`TableOptions` : `columns`, `rows?`, `rowKey?`, `empty?`, `emptyFiltered?`, `noun?`, `sort?`, `onRowClick?`, `rowClass?`, `filterKeys?`, `caption?`.

`TableController` : `setRows(rows)`, `setLoading(on?, count?)`, `setError(state | null)`, `setFilter(q)`, `sortBy(key, dir?)`, `setDensity('comfortable' | 'compact')`, `visibleRows()`, `destroy()`.

Un `<DataTable>` serveur est amélioré automatiquement à chaque `astro:page-load`. Le tri et le filtre sont mémorisés par page (sessionStorage) et survivent à l'actualisation automatique. Filtre : tout `<input data-table-filter="id">` ; compteur : tout élément `data-table-count="id"`.

Fabriques HTML client (`src/scripts/ui/html.ts`) : `esc`, `iconSVG`, `statusBadgeHTML`, `emptyStateHTML`, `errorStateHTML`, `buttonHTML`, `toStatus`. Toute donnée insérée en `innerHTML` passe par `esc()`.

## Commandes et raccourcis (`src/scripts/ui/commands.ts`)

```ts
registerCommands(cmds: Command[], scope?: 'page' | 'global'): () => void
registerShortcuts(list: Shortcut[], scope?: 'page' | 'global'): () => void
```

`Command` : `id`, `title`, `run`, `group?`, `keywords?`, `icon?`, `hint?`, `shortcut?`. `Shortcut` : `keys`, `title`, `run`, `group?`, `allowInInputs?`. Touches : `'r'`, `'?'`, `'Shift+R'`, `'Mod+K'` (Ctrl, ou ⌘ sur Mac).

Portée « page » par défaut : vidée à chaque navigation, actualisation comprise. Enregistrer donc dans un écouteur `astro:page-load`, avec une garde sur un élément de la page.

Globaux : Ctrl/⌘ K (palette), Ctrl/⌘ F ou `/` (recherche de la page), `?` (aide), Échap. Aucun raccourci sous `.xterm` ni sous `[data-no-shortcuts]`.

## Fenêtres (`src/scripts/ui/dialog.ts`)

`openModal`, `confirmDialog`, `promptDialog`, `toast(message, 'info' | 'success' | 'warning' | 'error')` : signatures inchangées. Modales empilables : Échap et Tab ne concernent que celle du dessus.

Recherche du haut : masquée quand la page a un champ `Toolbar topSearch` visible (Ctrl+F et `/` vont alors à ce champ).

## Cadre (PanelLayout)

Props : `title`, `subtitle?`, `refreshMs?` (`null` désactive l'actualisation), `favicon?`, `bare?` ; slot `actions`. `title`, `subtitle` et `actions` forment l'en-tête de page (`PageHeader`), identique sur tous les onglets du cœur et des modules : titre égal au libellé du menu, description courte, actions à droite (elles passent sous le titre sur téléphone). En-tête et contenu partagent la largeur `--content-max` et la marge `--page-gutter` (32 px, 24 px sous 1000 px, 16 px sur téléphone).

Menu (`src/layouts/nav.ts`, source unique du volet, du fil d'Ariane et de la palette Ctrl+K, qui relit les liens du volet) :

| Section | Contenu |
|---|---|
| Système | Vue d'ensemble, Performances, Processus, Services, Journaux, Fichiers, Terminal, Réseau |
| Modules | onglets des modules installés, modules triés par nom, onglets dans l’ordre du manifeste ; section absente sans module installé |
| Paramètres | Modules, Utilisateurs (`/acces`), Paramètres (`/parametres` : thème, menu compact, informations de l'instance) |

Un module désinstallé sort du menu, du fil d'Ariane et de la palette. Libellés courts (« Messages », « Outils », « Graphes ») : le contexte va dans la description de la page. Le filtrage par droits (`allowedTabs`) est inchangé. Pied du volet : le compte connecté et « Se déconnecter » (protection activée seulement). Pour suspendre l'actualisation pendant une action, poser `data-busy` sur un élément.

Exceptions assumées, dans le même cadre : l'onglet Claude (`bare`, rendu de claude.ai) et la console Tailscale (reproduction de la console officielle, avec son propre menu latéral dans la zone de contenu).

## Icônes

Une seule famille : Lucide au trait (`src/components/ui/lucide.ts`, généré par `scripts/lucide-icons.py`), via `Icon.astro`, `Sym.astro` (même icône, tracé partagé par un sprite `<use>` pour les chevrons répétés du menu) ou `iconSVG()` côté client.

- Épaisseur unique 1,75 ; aucune prop pour la changer.
- Tailles : 16 px dans le menu, les boutons, les tableaux ; 20 px pour une icône isolée (boutons `lg`, zones de dépôt).
- Monochromes (`currentColor`, gris secondaire au repos). L'élément actif du menu se marque par son fond et son texte, pas par une couleur d'icône.
- Couleur réservée au sens : succès, avertissement, erreur, information (`StatusBadge`, `Badge`, icônes d'état de `SettingsRow`).
- Pas d'emoji ni de glyphe Unicode décoratif ; les flèches de données (↑ émis, ↓ reçu) restent du texte.
- Application ou élément sans logo : une icône Lucide neutre ou ses initiales.

## Logos des modules

`modules/<id>/logo.svg` : logo officiel de Simple Icons pour une marque (viewBox 24×24, couleur officielle en `fill` sur `<svg>`, source et licence CC0 en commentaire), icône Lucide en `currentColor` sinon. `ModuleLogo` insère le fichier dans la page (sans commentaire ni `<title>`), à la taille demandée, proportions conservées :

- logo de couleur (Docker, Discord, Claude) : couleur officielle dans les deux thèmes ;
- encre quasi noire (luminance < 0,05 : GitHub `#181717`, Tailscale `#242424`, monochromes par nature) : remplacée par `currentColor`, donc blanche en thème sombre comme le recommande Simple Icons.

Affichage : page `/modules` (20 px dans un carré neutre de 32 px) et section « Modules » du menu (16 px), quand l'onglet ne déclare pas d'`icon` Lucide. Le logo Minecraft de Simple Icons est un logotype illisible à 16 px : l'onglet déclare `"icon": "cube"`, le logotype reste sur `/modules`. Le logo du panel (`PANEL_MARK`, `src/components/ui/icons.ts`) sert au volet, à l'écran de connexion et aux favicons.
