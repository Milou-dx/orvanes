# Système de design du panel Orvanes

Référence vivante : la page `/design` (réservée aux administrateurs, absente du menu).

## Règles

- Jamais de couleur hexadécimale ni de taille en pixels dans une page : utiliser les jetons de `src/styles/tokens.css`.
- Une action primaire par zone. Un bouton icône seule a toujours un `label`.
- Toute liste a un état vide, un état d'erreur et un état de chargement (squelette).
- Clair et sombre testés tous les deux. Texte à 4,5:1 minimum.
- L'onglet Claude (`claude.astro`, jetons « classiques » sur `#agent`) est hors périmètre : ne pas le modifier.

## Jetons canoniques

L'interface est celle de mistraOS telle que son mainteneur la règle (`themes/mistra/theme.toml` et `~/.config/mistra` : accent « blue », fenêtres de rayon 30, fonds `3-colonnade` et `1-stairs`) : duotone strict, surfaces grises, un seul accent bleu pour les contrôles, les liens et le focus. Un état se lit par sa forme et son libellé, jamais par une teinte. L'usage passe avant la ressemblance : le Dock reste affiché, l'îlot garde son texte, la barre nomme la page. Ont une couleur : l'accent, le fond d'écran, le logo Orvanes et les logos de marque des modules. Chaque jeton de couleur est déclaré une fois, en `light-dark(clair, sombre)`.

| Famille | Jetons |
|---|---|
| Palette source | `--m-surface` (contenu), `--m-sidebar` (fond des panneaux latéraux d'une page), `--m-card`, `--m-popover`, `--m-text`, `--m-text-dim`, `--m-border`, `--m-accent`, `--m-accent-text`, `--m-shade` : les valeurs de mistraOS, dont dérivent les jetons ci-dessous. Une page lit les jetons dérivés, jamais `--m-*` |
| Terminal et journaux | `--console-bg`, `--console-fg`, `--console-muted`, `--console-strong`, `--console-select`, `--console-black/-blue/-magenta/-cyan` (+ `-bright-`) : fond et encre de la fenêtre, gris ANSI de mistraOS ; `--console-red/-green/-yellow` viennent de `--danger`, `--success`, `--warning`. Un script qui lit un jeton pour un canvas ou xterm passe par `pickScheme` (`src/scripts/ui/html.ts`) |
| Fenêtre et Dock | `--window-radius` 30, `--window-border` 2 (couleur `--m-border-active`), `--window-gap` 12, `--window-gap-inner` 6 ; `--dock-icon` 48, `--dock-gap` 6, `--dock-dot` 4, `--dock-tile-radius` 26 % ; `--dur-settle`, `--dur-shake` |
| Écran de connexion | `--lock-ink`, `--lock-ink-glass` (encre blanche à 62 %), `--lock-field` (noir dépoli), `--lock-field-w` 300, `--lock-field-h` 44 |
| Îlot | `--island`, `--island-text`, `--island-text-dim`, `--island-highlight` (noirs dans les deux modes), `--island-h`, `--island-pad`, `--island-gap` |
| Fonds | `--bg-app`, `--bg-surface`, `--bg-surface-2`, `--bg-hover` |
| Filets | `--border`, `--border-strong`, `--field-stroke` (bord des champs, 3:1) |
| Texte | `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-disabled` |
| Accent | `--accent`, `--accent-hover`, `--accent-active`, `--accent-subtle`, `--accent-border`, `--accent-fg` |
| Sémantique | `--success`, `--warning`, `--danger`, `--info` (+ `-subtle`, `-border`) ; points : `--status-online/-warning/-error/-offline`. Tous valent l'encre du texte (`-offline` : l'encre secondaire) : ils disent le rôle, pas une couleur |
| Teintes | `--tone-<gray\|brown\|orange\|yellow\|green\|blue\|purple\|pink\|red>-bg/-fg` : tous gris, gardés pour les modules qui les nomment ; code neuf : `--bg-hover` et `--text-secondary` |
| Rayons | `--radius-xs` 4, `--radius-sm` 8 (lignes, entrées de menu), `--radius-md` 10 (contrôles), `--radius-lg` 14 (cartes, menus, dialogues), `--radius-full` (capsules, interrupteurs, points) |
| Ombres | `--shadow-xs`, `--shadow-sm`, `--shadow-md` |
| Mouvement | `--dur-fast`, `--dur-base`, `--dur-enter`, `--ease-out`, `--ease-in`, `--ease-in-out` ; ressorts `--ease-spring-morph` + `--dur-spring-morph` (îlot), `--ease-spring-toggle` + `--dur-spring-toggle` (interrupteur) ; fondu `--ease-fade` + `--dur-fade` ; survol qui voyage `--ease-hover` + `--dur-hover-move`, `--dur-hover-fade` ; appui `--press-scale` |
| Typo | `--{micro,meta,dense,body,card,section,page}-{size,lh,ls}`, `--weight-{regular,medium,semibold,bold}`, `--font-ui`, `--font-mono` |
| Espaces | `--space-0-5` à `--space-16` (grille de 4 px), `--control-h-sm/-h/-h-lg`, `--row-h`, `--row-h-compact`, `--toggle-w/-h/-pad` ; `--headerbar-h` 47 (barre d'en-tête), `--list-row-h` 50 (ligne de liste), les mesures de libadwaita |
| Boutons | `--button-fill`, `--button-fill-hover` : voile de l'encre (10 %, 14 %) sans bord ni ombre, le bouton secondaire de mistraOS. Le texte y garde 7:1 sur carte et fond, vérifié par le test de contraste |
| Empilement | `--z-sticky`, `--z-pane`, `--z-drawer`, `--z-menu`, `--z-overlay`, `--z-toast` |

`--text-disabled` est réservé aux contrôles désactivés (sous 4,5:1 par conception) : une mention informative (« protégé », « Non renseigné ») prend `--text-tertiary`. Un lien posé sur un fond teinté (`-subtle`) garde la couleur du texte, souligné.

Alias conservés (ne plus les utiliser dans du code neuf) : `--radius-control` = md, `--radius-card` / `--radius-modal` = lg, `--radius-pill`, `--shadow-subtle` = xs, `--shadow-overlay` = md, `--duration-micro/-ui/-page`, `--ease`.

Police : Inter Variable seule, auto-hébergée via `@fontsource-variable/inter` (licence OFL, importée par PanelLayout, servie par Vite). Corps 13 px, rampe 26 (page), 17 (section), 15 (carte), 13, 12 (meta), 11 (micro).

Contraste : `tests/ui/tokens-contrast.test.ts` vérifie les paires de jetons dans les deux modes (texte 7:1, texte secondaire et états 4,5:1). Une nouvelle paire texte/fond s'y ajoute dans le même commit.

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

`openMenu({ items, anchor?, x?, y?, label?, returnFocus?, island? })` : menu « … » ou clic droit, un seul ouvert, tenu dans la fenêtre, flèches / Début / Fin / Échap (rend le focus) / Tab. `items` : `{ label, icon?, hint?, danger?, disabled?, run }` ou `'sep'`. `bindContextMenu(el, (ev, cible) => items | null)` ajoute clic droit, touche Menu et Maj+F10. Styles `.ui-menu` dans `ui.css`. Bouton « … » : `Button` ghost `sm` `iconOnly` icône `more`.

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
| `PageHeader` | `title`, `description?` ; slot `actions`. Posé par `PanelLayout` : une page ne l'écrit pas elle-même. Barre d'en-tête de mistraOS (AdwHeaderBar) : titre et sous-titre centrés, actions au bout, collée en haut de la fenêtre |
| `ModuleLogo` | `id` (module), `size?` (16) ; logo du module en SVG dans la page (voir « Logos des modules ») |
| `Card` | `title?`, `description?`, `icon?` (Phosphor, monochrome), `flush?`, `interactive?`, `id?` ; slot `actions`. Groupe de Réglages de mistraOS : titre et actions sur le fond de la fenêtre, contenu dans la liste arrondie |
| `SettingsRow` | `title`, `desc?`, `icon?`, `tint?` (jeton de couleur de l'icône), `href?` ; tuile neutre, seules les icônes d'état (`check`, `circleCheck`, `warning`, `circleAlert`, `circleX`) prennent leur couleur |
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

Globaux : Ctrl/⌘ K (palette), Ctrl/⌘ F ou `/` (champ de recherche de la page ; sans champ, `/` ouvre la palette et Ctrl/⌘ F reste la recherche du navigateur), `?` (aide), Échap. Aucun raccourci sous `.xterm` ni sous `[data-no-shortcuts]`.

## Fenêtres (`src/scripts/ui/dialog.ts`)

`openModal`, `confirmDialog`, `promptDialog`, `toast(message, 'info' | 'success' | 'warning' | 'error')` : signatures inchangées. Modales empilables : Échap et Tab ne concernent que celle du dessus.

Recherche : la barre n'a pas de champ à elle. Un champ de page marqué `data-search-target` (`Toolbar topSearch`) reçoit Ctrl+F, `/`, la valeur de `?q=` au chargement et l'entrée « Filtrer cette page » de la palette.

## Cadre (PanelLayout)

Le bureau de mistraOS, de haut en bas : la barre à îlot, la fenêtre de la page, le Dock, posés sur le fond d'écran (`.wallpaper`, images de mistraOS dans `src/assets/` : `3-colonnade` en clair, `1-stairs` en sombre, passées par `WALLPAPER` de `src/components/ui/wallpaper.ts`).

Barre du haut : des capsules noires (`.capsule`, `.island`, hautes de `--island-h`, à `--window-gap` du bord), noires en clair comme en sombre, texte en `--font-mono` comme la barre de mistraOS.

| Zone | Contenu |
|---|---|
| Gauche | le logo (lien vers l'accueil) et le fil d'Ariane : section, puis page |
| Centre | l'îlot « Rechercher… » (`.island`, `data-cmdk-open`), toujours lisible : un clic, Ctrl/⌘ K ou `/` le transforme en palette |
| Droite | l'état de l'actualisation (`#refresh-state`), la date et l'heure (`data-clock`, « dim. 15 nov. 14:39 »), puis le compte (`data-account-menu` : thème, paramètres, sécurité, aide, déconnexion), présent seulement quand la protection est activée |

Fenêtre (`.frame` > `.content`) : rayon, bord de la fenêtre active et marges de mistraOS, sans ombre ni barre de titre (pas de boutons de fenêtre : une page n'a rien à fermer). Le cadre porte l'arrondi, `.content` défile dedans.

Dock (`#dock`, `src/scripts/layout/dock.ts`) : la navigation du panel. Une tuile noire par onglet (`.dock__tile`, icône Phosphor ou logo du module), un séparateur entre sections, un point sous l'onglet ouvert, une pastille pour les non lus (`data-badge`). Il reste affiché en permanence, sous la fenêtre. À la souris, les tuiles grandissent sous le pointeur (1,2 sous lui, plus rien à 2,5 tuiles) et le nom de l'onglet monte dans une capsule. Au doigt ou sous 640 px, la rangée défile et rien ne grandit. Il n'y a ni volet, ni tiroir, ni mode compact.

Ce qui naît de la barre reste noir comme elle : le menu du compte (`openMenu({ island: true })`) et les notifications (`toast`, affichées sous l'îlot, au centre).

Tout ce qui se pose sur du noir porte la classe `.on-island` : elle redéfinit les jetons de fond, de texte, de filet et de focus aux jetons de l'îlot, les composants posés dedans (`Kbd`, icônes) suivent sans style propre.

Palette (`src/scripts/layout/palette.ts`) : c'est l'îlot lui-même. La forme noire part du rectangle de l'îlot et prend la taille de son contenu sur le ressort `--ease-spring-morph` ; le contenu arrive en fondu quand la forme est presque là, et la liste fait grandir la forme à chaque frappe. Un seul fond (`.cmdk__fill`) voyage vers la ligne active. Échap, un clic ailleurs ou une navigation la referment ; `prefers-reduced-motion` supprime le morph et le voyage. Résultats : les pages et actions dont le nom porte la saisie, puis « Filtrer cette page : « q » » (page avec `data-search-target`) et « Chercher le processus « q » » (onglet Processus permis), puis les rapprochements lettre à lettre.

Props : `title`, `subtitle?`, `refreshMs?` (`null` désactive l'actualisation), `favicon?`, `bare?` ; slot `actions`. `title`, `subtitle` et `actions` forment la barre d'en-tête de la fenêtre (`PageHeader`), identique sur tous les onglets du cœur et des modules : titre égal au libellé du menu au centre, description courte dessous, actions au bout (sur téléphone, le titre passe à gauche). Elle reste en haut quand le contenu défile. Barre et contenu prennent la marge `--page-gutter` (32 px, 24 px sous 1000 px, 16 px sur téléphone), le contenu la largeur `--content-max`.

## Intérieur d'un onglet

Comme l'app Réglages de mistraOS (`AdwPreferencesPage`) : des groupes empilés à 24 px, chacun avec son titre en gras (13 px) et sa description (12 px) sur le fond de la fenêtre, puis son contenu dans une liste arrondie (`--bg-surface`, `--radius-card`, ni bord ni ombre). Lignes de 50 px (`--list-row-h`), filets entre les lignes, pas de survol sur une ligne de réglage.

Trois écritures du même groupe, à choisir selon la page :

- `Card` (composant) ;
- `.v-card` de `src/styles/vault.css`, pour les pages qui l'importent : `.v-card__head` et `.v-toolbar` restent sur le fond ; tous les autres enfants forment la liste, arrondie en haut et en bas. `.v-row`, `.v-list`, `.v-table-wrap`, `.v-stats` et `.v-card__foot` portent leur hauteur ; tout autre bloc (champ, texte, graphe) prend 12 px de marge verticale ;
- `.v-stats` > `.v-stat` (`__l` libellé, `__v` chiffre en `--page-size`, `__u` unité, `__c` note) : le bandeau de chiffres de Services, Processus, Réseau et Performances, une seule définition dans `vault.css`.

Boutons secondaires (`.v-btn--outline`) : le voile gris `--button-fill`, sans bord.

Menu (`src/layouts/nav.ts`, source unique du Dock, du fil d'Ariane et de la palette Ctrl+K, qui relit les tuiles du Dock) :

| Section | Contenu |
|---|---|
| Système | Vue d'ensemble, Performances, Processus, Services, Journaux, Fichiers, Terminal, Réseau |
| Modules | onglets des modules installés, modules triés par nom, onglets dans l’ordre du manifeste ; section absente sans module installé |
| Paramètres | Modules, Utilisateurs (`/acces`), Paramètres (`/parametres` : thème, informations de l'instance) |

Un module désinstallé sort du menu, du fil d'Ariane et de la palette. Libellés courts (« Messages », « Outils », « Graphes ») : le contexte va dans la description de la page. Le filtrage par droits (`allowedTabs`) est inchangé. Pour suspendre l'actualisation pendant une action, poser `data-busy` sur un élément.

Exceptions assumées, dans le même cadre : l'onglet Claude (`bare`, rendu de claude.ai) et la console Tailscale (reproduction de la console officielle, avec son propre menu latéral dans la zone de contenu).

## Écran de connexion (AuthLayout)

L'écran de connexion de mistraOS, pour `/connexion`, `/portail`, 404 et 500 : le fond d'écran flouté et assombri (`.auth__bg`), l'horloge et la date en verre à 8,5 % du haut (`.auth__clock`, heure du navigateur), le contenu à 9 % du bas sur 300 px. Champs et boutons : noir dépoli (`--lock-field`), encre blanche, dans les deux thèmes. Un champ en erreur se secoue (`--dur-shake`) et prend un liseré blanc.

## Icônes

Une seule famille, celle de mistraOS : Phosphor Bold (`src/components/ui/glyphs.ts`, généré par `scripts/phosphor-icons.py`, licence MIT dans `THIRD_PARTY_NOTICES.md`), via `Icon.astro`, `Sym.astro` (même icône, tracé partagé par un sprite `<use>` pour les chevrons répétés) ou `iconSVG()` côté client.

- Une seule graisse, Bold, en tracés pleins sur la grille de 256 ; aucune prop pour la changer.
- Tailles : 24 px dans une tuile du Dock, 16 px dans les boutons, les tableaux ; 20 px pour une icône isolée (boutons `lg`, zones de dépôt).
- Monochromes (`currentColor`, gris secondaire au repos).
- Aucune couleur : un état se lit à sa forme et à son libellé. `StatusBadge` : point plein (actif), anneau (arrêté, inconnu), triangle (avertissement), carré (erreur).
- Pas d'emoji ni de glyphe Unicode décoratif ; les flèches de données (↑ émis, ↓ reçu) restent du texte.
- Application ou élément sans logo : une icône Phosphor neutre ou ses initiales sur une tuile neutre. Compte : ses initiales sur l'accent, dans un carré arrondi (`.v-avatar`), jamais une couleur tirée du nom.

## Logos des modules

`modules/<id>/logo.svg` : logo officiel de Simple Icons pour une marque (viewBox 24×24, couleur officielle en `fill` sur `<svg>`, source et licence CC0 en commentaire), icône Phosphor en `currentColor` sinon. `ModuleLogo` insère le fichier dans la page (sans commentaire ni `<title>`), à la taille demandée, proportions conservées :

- logo de couleur (Docker, Discord, Claude) : couleur officielle dans les deux thèmes ;
- encre quasi noire (luminance < 0,05 : GitHub `#181717`, Tailscale `#242424`, monochromes par nature) : remplacée par `currentColor`, donc blanche en thème sombre comme le recommande Simple Icons.

Affichage : page `/modules` (20 px dans un carré neutre de 32 px) et tuile du Dock (24 px), quand l'onglet ne déclare pas d'`icon` du panel. Le logo Minecraft de Simple Icons est un logotype illisible à 16 px : l'onglet déclare `"icon": "cube"`, le logotype reste sur `/modules`. Le logo du panel (`PANEL_MARK`, `src/components/ui/icons.ts`) sert à la barre, à l'écran de connexion et aux favicons.
