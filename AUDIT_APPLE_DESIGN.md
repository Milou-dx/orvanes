# Audit design Apple : panel Orvane

*Date : 3 novembre 2026. Référentiel : skill `apple-design` (WWDC *Designing Fluid Interfaces*, *UI Typography*, *Principles of Great Design*). Audit en lecture seule, onglet par onglet, à partir du code (aucun rendu dans un navigateur). Les contrastes sont calculés à partir des tokens.*

## Résumé

Le panel repose sur de bonnes fondations : tokens centralisés, thèmes clair et sombre complets, dialogue modal accessible, `prefers-reduced-motion` respecté, 44 px au toucher presque partout et wayfinding solide (fil d'Ariane, ⌘K, rail compact). Les défauts se concentrent sur trois points :

1. **Retours d'action** : `location.reload()` après une action dans une quinzaine d'endroits efface le toast, le scroll et le focus ; des confirmations sont demandées pour des actions non destructives (Démarrer un service, Démarrer Minecraft, Enregistrer le pare-feu) ; des erreurs disparaissent au bout de 2,5 à 4 s.
2. **Systèmes parallèles** : GitHub, Tailscale, Bot Discord, Docker et Minecraft redéfinissent leur palette en hex et leurs propres boutons, au lieu d'utiliser les tokens et `src/components/ui`.
3. **Finitions Apple** : tailles en px plutôt qu'en rem (le texte ne suit pas la taille choisie par l'utilisateur), `:active` absent sur plusieurs contrôles, sorties non animées, aucun `prefers-contrast` ni `prefers-reduced-transparency`, aucun matériau translucide.

**134 problèmes : 🔴 4 · 🟠 70 · 🟡 60.**

### Notes par catégorie (ensemble du panel)

| Catégorie | Note | Justification |
|---|---|---|
| Hiérarchie, typographie, espacements | 7/10 | Échelle tokenisée et tracking adapté aux titres, mais tout est en px et le H1 mobile a la taille d'un H2. |
| Couleurs, contrastes, clair/sombre | 7/10 | Deux thèmes complets, mais blanc sur l'accent sombre (3,65:1) et badge succès (3,92:1). Palettes en dur dans 5 modules. |
| Cohérence des composants | 6/10 | 7 familles de boutons dans les fondations, plus des boutons maison dans presque chaque module. |
| Animations et retours visuels | 6,5/10 | `:active` présent dans le cœur, mais reloads, sorties non animées et connexion qui fait attendre 1,1 s. |
| Accessibilité | 7/10 | Focus, ARIA et dialogue solides. Restent quelques cibles de 22 à 32 px, des `aria-live` bavards et des mots de passe et erreurs perdus. |
| Conventions de plateforme | 6,5/10 | Pas de rem (Dynamic Type), confirmations en trop, actions masquées derrière le survol sur mobile. |

### Notes par onglet

| Onglet | Note | | Onglet | Note |
|---|---|---|---|---|
| Fondations (layout, tokens, connexion) | 7 | | Claude | 7,5 |
| Vue d'ensemble | 8 | | Docker | 8,5 |
| Performances | 8 | | Apps / Projets | 8 |
| Processus | 7 | | GitHub | 6 |
| Services | 6,5 | | Minecraft | 6,5 |
| Fichiers | 8 | | Tailscale | 6,5 |
| Terminal | 7 | | Mail | 8,5 |
| Journaux | 7 | | Bot Discord | 7 |
| Réseau | 7 | | | |
| Magasin | 7 | | | |
| Utilisateurs | 7,5 | | | |
| Paramètres | 8,5 | | | |

### Points forts du projet
- Dialogue modal exemplaire : piège du focus, Échap, retour du focus, focus initial sur « Annuler » pour les actions destructives.
- Confirmations par saisie du nom pour l'irréversible (volumes Docker, monde Minecraft, bot Discord), « Supprimer aussi les données » décoché par défaut.
- `prefers-reduced-motion` traité à deux niveaux, plus un réglage interne dans Claude.
- Tableaux transformés en cartes sur mobile, cibles de 44 px en `pointer: coarse` sur la plupart des contrôles.
- Le module Mail sert de modèle : squelettes, erreurs avec Réessayer, validation inline, brouillon protégé.

**Légende :** `[ ]` à corriger · `[x]` traité (✅ corrigé, ⚠️ partiel) · `[~]` ⏭️ volontairement non modifié, avec la raison. Les § renvoient aux sections du skill apple-design.

---

## Fondations partagées (tous les onglets)

Thème actif : `data-ui='notion'` (`src/layouts/PanelLayout.astro:40`). Contrastes calculés sur `src/styles/tokens.css:340-440`. Non vérifié : rendu navigateur et superposition des surfaces translucides ; `design.astro` (vitrine) et les composants mineurs (Meter, Kbd, SettingsRow) ont seulement été survolés.

Notes : Hiérarchie & typo 7 · Couleurs & contraste 7 · Cohérence composants 7 (7 familles de boutons : `.btn`, `.mini`, `.tbtn`, `.qa`, `.dlg__btn`, `.auth__btn`, `.go`, hauteurs de 28 à 48 px) · Animations & feedback 6,5 · Accessibilité 7 · Conventions plateforme 6,5.

1. [x] 🔴 **Texte blanc sur l'accent en mode sombre : 3,65:1** : `src/styles/tokens.css:405,426` (`--accent:#0a84ff`, `--accent-fg:#fff`). Concerne `.btn--primary`, `.dlg__ok`, le badge de nav à 12 px (`PanelLayout.astro:317`) et le toggle actif. L'accent employé comme couleur de texte n'atteint que 3,82:1 (Craft : couleurs adaptées au clair et au sombre). **Correction :** en sombre, `--accent:#0071e3` pour les fonds (4,7:1) + nouveau token `--accent-text:#409cff` pour les liens, les boutons pressés et les flèches de tri.
   - ✅ Sombre : `--accent #0071e3` (blanc 4,70:1) ; nouveau `--accent-text` (≥4,5:1 en clair et sombre) pour liens, flèches, focus ; 20 textes `color: var(--accent)` du panel et des modules passés en `--accent-text`.
2. [x] 🔴 **Badge « en marche » en clair : 3,92:1 à 12 px** : `src/styles/tokens.css:360` (`--success:#248a3d` sur `--success-subtle`), via `.sbadge--running` (`ui.css:145`) et `.badge--success`. **Correction :** `--success:#1f7a37` (4,86:1).
   - ✅ `--success:#1f7a37` (4,81:1).
3. [x] 🔴 **Bouton de repli des sous-onglets en 22×22 px, même au toucher** : `src/layouts/PanelLayout.astro:326`. C'est sous le minimum WCAG 2.5.8 (24 px), et le bloc `pointer: coarse` (`:509`) ne le couvre pas. **Correction :** `.navsub-toggle{width:44px;height:44px}` dans ce bloc.
   - ✅ `.navsub-toggle` en 44×44 au toucher.
4. [x] 🟠 **Bouton de fermeture des toasts ramené à 24 px au toucher** : `src/styles/global.css:408` écrase la règle de la ligne `:286`. **Correction :** placer la règle de la ligne 408 sous `@media (pointer: fine)`.
   - ✅ Le 24 px passe sous `pointer: fine` : 44 px conservés au toucher.
5. [x] 🟠 **Les toasts disparaissent après 4 s, sans pause, même en cas d'erreur** : `src/scripts/ui/dialog.ts:175` (WCAG 2.2.1). **Correction :** pause sur survol et focus, et pas de minuteur pour les erreurs (ou 10 s minimum).
   - ✅ Pause au survol et au focus, erreurs affichées 10 s minimum (+ test).
6. [x] 🟠 **Focus presque invisible sur la page de connexion (1,06:1)** : `src/layouts/AuthLayout.astro:111`. **Correction :** `outline:2px solid var(--accent); outline-offset:1px`.
   - ✅ `outline:2px solid var(--focus-ring)` sur les champs de connexion.
7. [x] 🟠 **Connexion utilisable seulement après ~1,1 s** : `src/layouts/AuthLayout.astro:182-185`. Les champs restent à opacité 0 pendant l'animation d'entrée (`auth-rise .8s` + délais) (§1 latence). **Correction :** animation de 0,32 s, décalage de 30 ms par élément.
   - ✅ Entrées en 0,32 s, décalage de 30 ms.
8. [x] 🟠 **Easing élastique et bouton « aimanté » au survol** : `src/layouts/AuthLayout.astro:98,165-167`, `connexion.ts:10-37`. Le rebond est réservé aux gestes qui ont de l'élan (§4). **Correction :** supprimer `.magnetic`, transition `var(--ease-out)`.
   - ✅ Effet aimanté et easing élastique supprimés.
9. [x] 🟠 **Bouton de connexion sans texte visible (flèche seule)** : `src/pages/connexion.astro:46-50` (Familiarity, labels directs). **Correction :** `<span>Se connecter</span>` à côté de la flèche.
   - ✅ Texte « Se connecter » visible.
10. [x] 🟠 **Sur mobile, H1 et H2 ont la même taille (18 px)** : `src/components/ui/PageHeader.astro:28` vs `ui.css:6`. **Correction :** H1 mobile en `1.375rem/1.75rem`, `letter-spacing:-0.018em`.
   - ✅ H1 mobile en 1.375rem/1.75rem.
11. [x] 🟠 **Toute l'échelle typographique et les hauteurs de contrôles en px** : `src/styles/tokens.css:77-83,204-208,303-308`. La taille de texte choisie par l'utilisateur n'est pas suivie (§15). **Correction :** passer les tokens en rem (`--body-size:.9375rem`, `--control-h:2rem`…).
   - ✅ Échelle typographique, interlignes et hauteurs de contrôles en rem.
12. [x] 🟠 **Aucun `prefers-contrast` ni `prefers-reduced-transparency`** : fondations (seul `forced-colors` est géré, `global.css:368`) (§14). **Correction :** bloc `@media (prefers-contrast: more)` qui renforce `--text-tertiary`, `--control-stroke` et `--border`.
   - ✅ Blocs `prefers-contrast: more` et `prefers-reduced-transparency: reduce`.
13. [x] 🟠 **Flèches de tri invisibles au clavier et au toucher** : `src/styles/ui.css:84-85`. **Correction :** les afficher aussi sur `:focus-visible`, et à `opacity:.5` sous `@media (hover:none)`.
   - ✅ Flèches de tri visibles au focus et sous `hover:none`.
14. [x] 🟡 **Animation de propriétés de mise en page** : `PanelLayout.astro:291` (`grid-template-rows`), `AuthLayout.astro:115` (`top` du label) (§11). **Correction :** `transform` pour le label.
   - ⚠️ Partiel : le label anime seulement `transform` ; `grid-template-rows` de la nav gardé.
15. [x] 🟡 **Sorties non animées** : `src/scripts/ui/dialog.ts:71` (`remove()` immédiat), scrim mobile `PanelLayout.astro:505` (§7). **Correction :** `data-closing` + fondu de sortie, puis `remove()` à `animationend`.
   - ✅ Fondu de sortie pour dialogues, toasts et scrim mobile.
16. [x] 🟡 **Micro-texte sans tracking, titre de groupe hors échelle** : `tokens.css:303` (`--micro-ls:0`), `ui.css:334` (11 px en dur). **Correction :** `--micro-ls:0.01em`, `var(--micro-size)`.
   - ✅ `--micro-ls:0.01em`, `.sgroup__title` sur `--micro-size`.
17. [~] 🟡 **Blocs de tokens sombres en triple** : `tokens.css:116-147`=`149-178`, `241-257`=`258-272`, `399-420`=`421-440`. Ils divergent déjà (`#c0322d` en dur, `global.css:395`). **Correction :** ne garder que les blocs `[data-theme='dark']`.
   - ⏭️ Gardé volontairement : sans JS ou si `localStorage` lève une erreur, `data-theme` n'est pas posé, donc les blocs `prefers-color-scheme` restent nécessaires.
18. [x] 🟡 **Pas de `:active` sur les segments, les onglets et le bouton ⌘K** : `ui.css:20-28,254-260`, `PanelLayout.astro:392-400`. **Correction :** `:active{background:var(--nav-selected)}`.
   - ✅ `:active` sur onglets, sous-onglets, segments et ⌘K.

Points forts : dialogue modal exemplaire (piège du focus, Échap, retour du focus, focus initial sur « Annuler » pour le destructif) ; reduced-motion géré à deux niveaux ; tokens centralisés (grille de 4 px, ombres, durées) ; 44 px en `pointer: coarse` presque partout ; wayfinding complet (fil d'Ariane, `aria-current`, rail compact, tiroir, ⌘K) ; tableaux transformés en cartes sur mobile.

## Onglets du panel (Vue d'ensemble, Système, Paramètres)

**Défauts qui reviennent sur plusieurs onglets :** `location.reload()` après une action (Services, Réseau, Utilisateurs, Magasin) efface le toast de succès, le scroll et le focus. Des boutons maison (`.tbtn`, `.mini`, `.svc-act`, `.alert` dupliqué) contournent `Button` et `ActionButton`. Des `aria-live` sont posés sur des textes mis à jour toutes les 2 à 3 s, ce qui fait parler les lecteurs d'écran en continu.

### Vue d'ensemble (`src/pages/index.astro`) : 8/10
19. [x] 🟠 **Pastilles d'état maison** : `src/pages/index.astro:109,179-186`. `.dot` et `.pill` recréent `StatusBadge`, si bien que le même état a deux apparences. **Correction :** utiliser `StatusBadge`.
   - ✅ `.dot`/`.pill` remplacés par `StatusBadge`.
20. [x] 🟠 **Sparkline vide au premier chargement** : `src/pages/index.astro:97,132`. **Correction :** squelette de courbe, ou historique fourni par le serveur.
   - ✅ Squelette de courbe en pointillés jusqu'aux 2 premiers points.
21. [x] 🟡 **Erreur sans issue** : `src/pages/index.astro:105` (« Liste des services indisponible. »). **Correction :** `ErrorState compact` avec un lien vers /services.
   - ✅ `ErrorState compact` avec lien vers /services.
22. [x] 🟡 **Tailles en px en dur** : `src/pages/index.astro:153,160-162`. **Correction :** tokens ou rem.
   - ✅ px → rem.
- ✔ Point fort : repli sur la charge système si la mesure CPU échoue.

### Performances (`src/pages/performance.astro`) : 8/10
23. [x] 🟠 **Pause invisible** : `src/pages/performance.astro:277-283`. Les valeurs figées ressemblent à du direct. **Correction :** badge « En pause » dans l'en-tête du panneau.
   - ✅ Badge « En pause » dans l'en-tête des panneaux (`data-paused`).
24. [x] 🟠 **Saut de mise en page quand une erreur apparaît** : `src/pages/performance.astro:81-83,306,356`. **Correction :** emplacement réservé ou bandeau superposé.
   - ✅ Bandeau d'erreur superposé, plus de saut de mise en page.
25. [x] 🟠 **Graphes sans alternative textuelle** : `src/pages/performance.astro:105,134,155,180`. **Correction :** `role="img"` + `aria-describedby` vers la valeur courante.
   - ✅ Canvas en `role="img"` + `aria-describedby` vers la valeur courante.
26. [x] 🟡 **Libellés « L … É » cryptiques, valeurs masquées sur mobile, `aria-orientation` figé** : `src/pages/performance.astro:342,351,461`. **Correction :** libellés complets, valeur courte gardée sur mobile, orientation mise à jour en JS.
   - ✅ Libellés complets, valeur gardée sur mobile, `aria-orientation` suivi en JS.
- ✔ Point fort : `tablist` entièrement navigable au clavier, onglet actif mémorisé.

### Processus (`src/pages/processus.astro`) : 7/10
27. [x] 🟠 **Panneau de détail reconstruit toutes les 2 s, ce qui fait perdre le focus** : `src/pages/processus.astro:160-181,273-282`. **Correction :** repeindre seulement quand la sélection change, sinon mettre à jour les valeurs en place.
   - ✅ Détail construit une fois par sélection, valeurs mises à jour en place : le focus reste.
28. [x] 🟠 **Les lignes bougent sous le pointeur avant une action destructive** : `src/pages/processus.astro:129,303-314`. **Correction :** geler l'ordre pendant le survol ou la sélection.
   - ✅ Tableau gelé pendant le survol des lignes ou un menu ouvert.
29. [x] 🟠 **Détail hors écran sur mobile** : `src/pages/processus.astro:363-366`. **Correction :** feuille inférieure (bottom sheet) ou défilement automatique vers le détail.
   - ✅ `scrollIntoView` vers le détail sous 1200 px (smooth sauf reduced-motion).
30. [x] 🟡 **`aria-live` toutes les 2 s, bouton à libellé et `aria-pressed` cumulés, `.tbtn` maison** : `src/pages/processus.astro:34,177-180,283-289`. **Correction :** `aria-live` réservé à l'alerte, libellé fixe, `Button`.
   - ✅ `aria-live` → `role="status"` sur l'alerte seule, libellé fixe, boutons du design system.
- ✔ Point fort : confirmation qui nomme le processus, avec un second niveau « Forcer la fermeture ».

### Services (`src/pages/services.astro`) : 6,5/10
31. [x] 🟠 **Confirmation demandée pour Démarrer** : `src/pages/services.astro:153-157` (Agency : ne confirmer que le destructif). **Correction :** la retirer pour `start`, la garder pour `stop` et `restart`.
   - ✅ Confirmation retirée pour Démarrer (gardée pour Arrêter/Redémarrer).
32. [x] 🟠 **Reload après l'action** : `src/pages/services.astro:168-169`. Le toast est effacé et le statut n'a parfois pas encore changé. **Correction :** mise à jour de la ligne avec spinner jusqu'au nouvel état.
   - ✅ Ligne mise à jour en place avec spinner ; carte « Services importants » : reload + toast après rechargement. Limite : état attendu, pas relu.
33. [x] 🟠 **Boutons `.svc-act` maison, libellé seulement dans `title`** : `src/pages/services.astro:94-95,189-207`. **Correction :** `ActionButton`.
   - ⚠️ Partiel : `ActionButton` sur la carte ; dans le tableau généré en JS, `.svc-act` garde son style mais gagne un libellé visible (>900 px), `aria-label` et 44 px au toucher.
34. [x] 🟡 **Compteurs « 0 » en dur avant hydratation, « protégé » visible seulement en `title`** : `src/pages/services.astro:67-68,121`. **Correction :** compteurs calculés côté serveur, texte visible.
   - ✅ Compteurs calculés côté serveur, « Protégé : non arrêtable » visible.
- ✔ Point fort : SSH et Tailscale protégés, avec un libellé explicite.

### Fichiers (`src/pages/fichiers.astro`, `src/scripts/pages/fichiers.ts`) : 8/10
35. [x] 🟠 **Aucun retour après Coller et Déplacer** : `src/scripts/pages/fichiers.ts:340-355`. **Correction :** toast « N éléments déplacés dans <dossier> ».
   - ✅ Toast « N éléments déplacés/copiés dans « dossier » ».
36. [x] 🟠 **En-têtes de colonne de 24 px au toucher** : `src/pages/fichiers.astro:199`. **Correction :** 44 px sous `pointer: coarse`.
   - ✅ En-têtes de colonne à 44 px sous `pointer: coarse`.
37. [x] 🟡 **« Ce PC », une métaphore Windows sur un serveur Linux** : `src/pages/fichiers.astro:55`. **Correction :** « Stockage du serveur ».
   - ✅ « Ce PC » → « Stockage du serveur ».
38. [x] 🟡 **Effet de survol sur une colonne non triable** : `src/pages/fichiers.astro:203`. **Correction :** `th[data-sort]:hover`.
   - ✅ Survol limité aux colonnes triables.
- ✔ Point fort : la suppression prévient « irréversible, pas de corbeille » et liste les noms ; états chargement, vide et erreur avec Réessayer.

### Terminal (`src/pages/terminal.astro`) : 7/10
39. [x] 🟠 **« Nouvelle session » coupe le shell en cours sans prévenir** : `src/pages/terminal.astro:226-234`. **Correction :** confirmer si l'état est « Connecté ».
   - ✅ Confirmation avant « Nouvelle session » si une session est connectée.
40. [x] 🟠 **Erreur non annoncée, mise en page qui saute** : `src/pages/terminal.astro:54,89-94`. **Correction :** `role="alert"` + emplacement réservé.
   - ✅ `#term-msg` en `role="alert"`, emplacement réservé.
41. [x] 🟠 **`localStorage` sans try/catch** : `src/pages/terminal.astro:105,261`. En navigation privée, le terminal ne s'initialise pas. **Correction :** envelopper la lecture et l'écriture.
   - ✅ `localStorage` en try/catch.
42. [x] 🟡 **Couleurs ANSI « bright » identiques aux normales, « Ctrl+C » à côté de « Copier »** : `src/pages/terminal.astro:19,22,115-132`. **Correction :** tokens pour les variantes bright, libellé « Interrompre (Ctrl+C) ».
   - ✅ Couleurs ANSI bright distinctes, bouton « Interrompre (Ctrl+C) ».
- ✔ Point fort : barre de touches spéciales en 44 px au toucher.

### Journaux (`src/pages/logs.astro`) : 7/10
43. [x] 🟠 **Reconstruction complète toutes les 3 s, qui efface la sélection de texte** : `src/pages/logs.astro:151,180`. **Correction :** repeindre seulement en cas de changement, et mettre en pause pendant une sélection.
   - ✅ Repeint seulement si le contenu change, et jamais pendant une sélection.
44. [x] 🟠 **Une seule erreur de polling efface tout le journal** : `src/pages/logs.astro:170-175`. **Correction :** garder les lignes et afficher un bandeau « Données non actualisées ».
   - ✅ Une erreur de polling garde les lignes + bandeau « Données non actualisées ».
45. [x] 🟠 **La surbrillance de recherche casse le HTML** : `src/pages/logs.astro:150-152`. Chercher « amp » ou « lt » insère `<mark>` au milieu des entités. **Correction :** surligner avant l'échappement.
   - ✅ Surlignage par segments avant échappement (`src/scripts/pages/logs.ts`), 4 tests ajoutés.
46. [x] 🟡 **Réglages placés avant le contenu, `aria-live` bavard, état vide en `<p>` nu** : `src/pages/logs.astro:36,39-62,78`. **Correction :** barre compacte, `EmptyState`.
   - ✅ Réglages en barre compacte, `aria-live` retiré, `EmptyState`.
- ✔ Point fort : le niveau de chaque ligne est annoncé aux lecteurs d'écran.

### Réseau (`src/pages/reseau.astro`) : 7/10
47. [x] 🟠 **Validation du pare-feu non inline** : `src/pages/reseau.astro:287,391-392`. **Correction :** erreur sous chaque champ + `aria-invalid`.
   - ✅ Erreurs sous Port/Source + `aria-invalid`.
48. [x] 🟠 **Succès effacé par le reload, « Enregistrer » confirmé alors que c'est sans risque** : `src/pages/reseau.astro:402,416,420-423`. **Correction :** mise à jour locale, retirer cette confirmation.
   - ✅ « Enregistrer » sans confirmation ; toast après rechargement.
49. [x] 🟠 **Boutons `.mini` maison, liens `href="#"` qui servent de boutons** : `src/pages/reseau.astro:73,108,120,223,253`. **Correction :** `Button size="sm"`, `<button>`.
   - ✅ `.mini` → `Button` ; liens `href="#"` → `<button>`.
50. [x] 🟡 **Graphe silencieux en cas de panne (`catch {}`), canvas sans `role="img"`** : `src/pages/reseau.astro:102,331-340,440,459`. **Correction :** état « Mesures indisponibles ».
   - ✅ Canvas `role="img"`, « Mesures indisponibles » après 3 échecs.
- ✔ Point fort : bandeau « règles non enregistrées » en tête de page.

### Magasin (`src/pages/modules.astro`, `src/scripts/pages/modules.ts`) : 7/10
51. [x] 🟠 **Installation d'environ une minute sans progression, reload pendant que le serveur redémarre** : `src/scripts/pages/modules.ts:37-38,54-55`. **Correction :** bandeau « Installation en cours », attendre que le panel réponde avant de recharger.
   - ✅ Bandeau « en cours, environ une minute », rechargement seulement quand le panel répond.
52. [x] 🟠 **Magasin injoignable signalé en simple pied de groupe** : `src/pages/modules.astro:40`. **Correction :** `ErrorState` + Réessayer.
   - ✅ `ErrorState` + Réessayer.
53. [x] 🟡 **Sortie non annoncée, reconstruction à relancer à la main** : `src/pages/modules.astro:19,35`. **Correction :** `role="status"`, polling.
   - ✅ Sorties `role="status"`, polling de la reconstruction.
54. [x] 🟡 **px en dur** : `src/pages/modules.astro:89,92`.
   - ✅ px → tokens.
- ✔ Point fort : « Supprimer aussi les données » est décoché par défaut.

### Utilisateurs (`src/pages/acces.astro`, `src/scripts/pages/acces.ts`) : 7,5/10
55. [x] 🔴 **Mot de passe généré perdu si la copie échoue** : `src/scripts/pages/acces.ts:96`. « Copier et fermer » avale l'erreur du presse-papiers (`.catch(()=>{})`) puis ferme la fenêtre, alors que le texte affiché dit « il ne sera plus jamais affiché » (Responsibility : risque de perte d'accès). **Correction :** fermer seulement après une copie réussie ; sinon garder la fenêtre ouverte, mot de passe sélectionnable et message d'échec.
   - ✅ Fermeture seulement par le bouton (nouvelle option `dismissible:false` : Échap et clic sur le fond ignorés, testée) ; si la copie échoue : message, mot de passe sélectionné, 2e clic pour fermer après copie manuelle.
56. [x] 🟠 **Validation de l'e-mail par toast** : `src/scripts/pages/acces.ts:186-191`. **Correction :** message sous le champ.
   - ✅ Erreur sous le champ Identifiant, plus de toast.
57. [x] 🟠 **Toast suivi d'un reload immédiat** : `src/scripts/pages/acces.ts:141,196-198,264,321`. **Correction :** mise à jour locale du tableau.
   - ✅ Toast différé après rechargement.
58. [x] 🟡 **`.mini` et `.alert` maison, `1px` en dur, « Déconnecter » confirmé alors que c'est réversible** : `src/pages/acces.astro:208,237,241,243,278-279`, `acces.ts:292`. **Correction :** `Button`, `--border-width`, retirer cette confirmation.
   - ✅ `.mini` → `Button`, `--border-width`, confirmation « Déconnecter » retirée ; `.alert` maison conservé. Bonus : bouton « Définir le mot de passe » qui n'avait aucun handler, branché.
- ✔ Point fort : confirmation « danger » réservée aux onglets sensibles dans la matrice de droits.

### Paramètres (`src/pages/parametres.astro`) : 8,5/10
59. [x] 🟡 **Valeurs techniques sans bouton Copier** : `src/pages/parametres.astro:36-39`.
   - ✅ Boutons Copier (adresse, dossier de données).
60. [x] 🟡 **Jargon (« Variable PANEL_NAME… »), seuil « 1000 px » écrit en dur** : `src/pages/parametres.astro:26,36,38,39`.
   - ✅ Jargon et « 1000 px » retirés des descriptions.
61. [x] 🟡 **Flash possible du mauvais état sélectionné** : `src/pages/parametres.astro:20,27`. **Correction :** poser l'état avant le rendu.
   - ✅ État posé avant le rendu par un script inline.
- ✔ Point fort : peu de contrôles, chacun décrit, appliqué immédiatement sans bouton Enregistrer.

## Intégration : Claude (`modules/claude`)

Non vérifié : rendu réel, contrastes mesurés, `popover.ts`, et `settings.ts`, lu seulement par grep. Le logo officiel reste : c'est le choix de l'utilisateur.

### Fil de discussion et streaming (`modules/claude/scripts/thread.ts`, `styles/thread.css`) : 7/10
Le streaming est soigné : suivi du bas, bouton « Aller au dernier message », annonces. Mais le suivi automatique vole le scroll et le fil n'est pas une région live.
62. [x] 🟠 **Le suivi automatique vole le scroll** : `modules/claude/scripts/thread.ts:84,92,93`. `follow` reste vrai tant que l'utilisateur est à moins de 96 px du bas, et un `ResizeObserver` force alors `scrollTop = scrollHeight` (§3 interruptibilité). **Correction :** couper `follow` dès que la molette, le toucher ou PageUp/↑ fait remonter de plus de 8 px, et ne le réactiver qu'en bas du fil ou via le bouton.
   - ✅ Le suivi se détache à la molette/toucher/PageUp/↑/Home vers le haut, se réattache en bas ou via le bouton.
63. [x] 🟠 **Le fil n'est pas une région live** : `modules/claude/pages/claude.astro:166`, `scripts/thread.ts:207,293`. `#cl-thread` n'a ni `role="log"` ni `aria-live`, et la réponse annoncée est tronquée à 600 caractères. **Correction :** `role="log" aria-label="Conversation"` + `aria-busy` pendant le tour.
   - ✅ `#cl-thread` en `role="log"`, `aria-label`, `aria-busy` pendant le tour (`aria-live="off"` pour ne pas doubler `#cl-announce`).
64. [x] 🟠 **Le mode reduced-motion supprime les indicateurs d'activité** : `modules/claude/styles/base.css:423-429` fige l'étoile `.live__star` (`thread.css:282`), les points d'attente et le shimmer, donc rien n'indique plus que Claude génère (§14 : il faut adoucir le feedback, pas le supprimer). **Correction :** neutraliser seulement transform/translate/scale, et garder un fondu d'opacité lent.
   - ✅ Reduced-motion : fondu d'opacité lent `cl-calm` au lieu d'indicateurs figés.
65. [x] 🟡 **Entrée des étapes à 420 ms avec flou animé** : `modules/claude/styles/thread.css:159-163`. **Correction :** 180 ms, opacité et translateY seulement, sans blur.
   - ✅ Entrée des étapes en 180 ms, opacité + translateY, sans flou.
66. [x] 🟡 **Valeurs en dur qui dupliquent des tokens** : `thread.css:25,239,417,425`, `composer.css:99`, `activity.css:45`. **Correction :** `var(--cl-border)` et `var(--cl-bg-200)` ; garder `#fff` seulement pour l'iframe, avec un commentaire.
   - ✅ `var(--cl-border)`/`var(--cl-bg-200)` ; `#fff` de l'iframe commenté.

### Composeur (`scripts/composer.ts`, `styles/composer.css`) : 7,5/10
67. [x] 🟠 **Bouton de retrait de pièce jointe en 24×24 px au toucher** : `modules/claude/styles/composer.css:105,197`. **Correction :** 36 px minimum sous `pointer: coarse`, ou une zone `::before { inset:-8px }`.
   - ✅ `.chip__rm` en 36 px au toucher.
68. [~] 🟡 **Agrandissement automatique en deux reflows à chaque frappe** : `modules/claude/scripts/composer.ts:63-66`. **Correction :** `field-sizing: content` + `max-height`, ou un `requestAnimationFrame`.
   - ⏭️ Non modifié : l'agrandissement du champ est piloté en JS ; le risque de casser la saisie de l'onglet Claude était jugé supérieur au gain.
69. [x] 🟡 **Retour à l'appui de 60 ms, à peine visible** : `modules/claude/styles/composer.css:49`. **Correction :** 100 ms en `ease-out` sur `transform`.
   - ✅ Retour à l'appui à 100 ms `ease-out`.

### Barre latérale (`scripts/sidebar.ts`, `styles/sidebar.css`, `styles/layout.css`) : 7/10
70. [x] 🟠 **Le tiroir mobile se téléporte** : `modules/claude/styles/layout.css:5,16,63`. Il n'y a aucune transition, alors que le voile, lui, s'anime (§7 : sortir par le chemin d'entrée). **Correction :** sur mobile, `translate:-100% → 0` en 240 ms, symétrique à la fermeture.
   - ✅ Tiroir mobile en `transform` 240 ms, symétrique ; desktop inchangé.
71. [x] 🟡 **Lignes de conversation sans `:active`** : `modules/claude/styles/sidebar.css:53-58,86-90`. **Correction :** `:active { background: var(--cl-bg-300) }`.
   - ✅ `:active` sur les lignes de navigation et de conversation.
72. [x] 🟡 **Menus, modales et tiroir opaques, aucun matériau** : `modules/claude/styles/*.css` (§12). **Correction :** `backdrop-filter: blur(20px) saturate(1.4)` + fond `color-mix(... 80%, transparent)` sur `.cl-menu`, `.cl-modal` et le tiroir. Prévoir le repli `prefers-reduced-transparency`.
   - ✅ Flou + fond `color-mix` 80 % sur menus, modales et tiroir ; repli opaque en `prefers-reduced-transparency`.

### Palette Ctrl+K (`scripts/palette.ts`, `styles/palette.css`) : 8/10
73. [x] 🟡 **Onglets de type de 28 à 36 px** : `modules/claude/styles/palette.css:35-37,85`. **Correction :** 40 px sous `pointer: coarse`.
   - ✅ Onglets de la palette à 40 px au toucher.
74. [x] 🟡 **Lignes sans `:active`** : `modules/claude/styles/palette.css:50-53`. **Correction :** `.pal__row:active { background: var(--cl-bg-300) }`.
   - ✅ `:active` sur les lignes et onglets de la palette.

### Progression et Activité (`scripts/progress.ts`, `styles/progress.css`) : 7/10
75. [x] 🟠 **Le panneau s'anime à l'entrée mais disparaît d'un coup** : `modules/claude/styles/progress.css:21,72,75`. Il se ferme en `display:none` immédiat (§7). **Correction :** état `closing` avec l'animation inverse, retiré à `animationend`, comme dans `modal.ts:146-149`.
   - ✅ Sortie animée `data-state="closing"` puis masquage à `animationend` (300 ms max).
76. [x] 🟡 **L'étape « en cours » ne se distingue que par la couleur en reduced-motion** : `modules/claude/styles/progress.css:51`. **Correction :** ajouter un contour ou une icône propre à `in_progress`.
   - ✅ Étape `in_progress` en graisse 600 en plus de la pastille.

### Panneau d'artéfact (`scripts/artifacts.ts`, `styles/thread.css:408-437`) : 7/10
77. [x] 🟠 **Onglets Aperçu/Code d'environ 24 px, sans flèches clavier ni `:active`** : `modules/claude/styles/thread.css:419-420,432-437`. **Correction :** `min-height` 32 px (40 px au toucher), `:active`, et un roving tabindex piloté par ←/→.
   - ✅ Onglets Aperçu/Code 32 px (40 au toucher), `:active`, roving tabindex.

### Réglages, Tâches planifiées, Vues : 8/10
78. [x] 🟡 **Onglets de réglages de 32 à 36 px** : `modules/claude/styles/settings.css:24,114`. **Correction :** 44 px sous `pointer: coarse`.
   - ✅ Onglets de réglages à 44 px au toucher.
79. [x] 🟡 **Barres d'usage en `200ms ease-out` codé en dur** : `modules/claude/styles/settings.css:84`, `composer.css:84`. **Correction :** `var(--cl-dur-base)` et `var(--cl-ease-out)`.
   - ✅ Barres d'usage sur `--cl-dur-base`/`--cl-ease-out`.

### Points forts
- `:active` sur les boutons d'icône, l'envoi et les cartes, avec un halo de focus unique (`base.css:224`).
- États bien traités : squelettes de chargement, état d'échec, annonces vocales, `aria-busy`, scroll conservé au rechargement (`thread.ts:157-175`).
- Double garde reduced-motion (préférence système + réglage interne), modale avec sortie animée, confirmations réservées aux suppressions.

## Intégrations : Docker, Apps, GitHub

Non lus en détail : `blob.astro`, `commits.astro` (CSS seulement), `scripts/apps`, sous-pages GitHub issues/pulls/actions.

### Docker (`modules/docker/pages/docker/*`, `components/DockerShell.astro`) : 8,5/10
Très solide : suppressions confirmées, états vide/erreur traités, tokens utilisés. Restent un thème parallèle en dur et quelques retours à renforcer pendant les actions longues.
80. [x] 🟠 **Thème Docker parallèle en dur** : `modules/docker/components/DockerShell.astro:61-78,93`. Une trentaine de couleurs hex (`--dk-accent #1d63ed`, `--dk-bg`, `--dk-border`, `--dk-green`…) répétées 3 fois (clair, sombre, auto). Cela contourne les tokens du panel (familiarité/cohérence, §16.4). **Correction :** mapper `--dk-*` sur `--accent`, `--bg-surface`, `--success`… ; garder seulement le bleu Docker si voulu ; dédupliquer le bloc dark.
   - ✅ `--dk-*` mappés sur les tokens du panel, bleu Docker gardé, blocs sombres supprimés.
81. [x] 🟡 **Pull d'image : 1er retour après 1 s, pas de progression chiffrée** : `modules/docker/pages/docker/images.astro:138-140`. `setTimeout` avant le 1er appel, barre indéterminée seule (§1 latence, feedback de statut). **Correction :** appeler l'API d'abord puis attendre ; afficher « N/M couches ».
   - ✅ 1er appel API immédiat, progression « N/M couches ».
82. [x] 🟡 **Fin de pull : rechargement forcé à 900 ms** : `modules/docker/pages/docker/images.astro:147`. Coupe l'état « terminé », perd scroll/sélection. **Correction :** insérer la ligne en place ou lien « Voir l'image ».
   - ✅ Plus de reload auto : état « terminé » conservé + bouton « Voir l'image ».
83. [x] 🟡 **Erreur de pull sans relance ni `role="alert"`** : `modules/docker/pages/docker/images.astro:150-153`. **Correction :** bouton Réessayer + `role="alert"` sur l'état d'erreur.
   - ✅ Erreur en `role="alert"` + bouton « Réessayer ».
- ✔ Point fort : confirmations proportionnées (saisie du nom pour les ressources critiques, `volumes.astro:77`, `reseaux.astro:75`, `index.astro:381`), suppression désactivée si ressource utilisée, `.dk-ibtn` 44 px en tactile, `scale:.94` à `:active`.

### Apps / Projets (`modules/apps/pages/projets.astro`) : 8/10
Galerie propre, filtres accessibles, états vide/aucun résultat, reduced-motion respecté. Le contraste et quelques px en dur restent à reprendre.
84. [x] 🟠 **Pastille d'état sur héros clair, contraste non garanti** : `modules/apps/pages/projets.astro:166-168`. `#fff` sur `rgb(0 0 0/.4)` + blur, posé sur dégradé `hsl(var(--h) 70% 55%)` ou image (§12 vibrancy). **Correction :** fond `rgb(0 0 0/.6)` ou token d'overlay ; garder un libellé texte en plus du point.
   - ✅ Fond de pastille à `rgb(0 0 0/.6)` ; libellé texte déjà présent.
85. [x] 🟡 **Valeurs en dur** : `modules/apps/pages/projets.astro:145,150,152,167,169,171`. `#fff`, `104px`, `36px`, `15px`, `11px`, `99px`… (§15 rem). **Correction :** tokens `--space-*`, `--meta-size`, `--radius-full`, rem.
   - ✅ px → rem/tokens ; `#fff` gardé sur les dégradés indépendants du thème.
86. [x] 🟡 **Pas de retour à l'appui sur les cartes** : `modules/apps/pages/projets.astro:144`. Seul `:hover` (§1). **Correction :** `.tile__foot a:active { scale:.98 }`.
   - ✅ `.tile__foot a:active{scale:.98}` (désactivé en reduced-motion).
87. [~] 🟡 **Bouton copier 22 px à la souris, retour de copie à vérifier** : `modules/apps/pages/projets.astro:172-174`. **Correction :** confirmer qu'un toast « Adresse copiée » ou un changement d'icône suit le clic.
   - ⏭️ Déjà en place : toasts de copie succès/erreur dans `apps/scripts/apps.ts`, 44 px au toucher.
- ✔ Point fort : `aria-pressed` sur les filtres, `aria-live` sur le compteur, deux états vides distincts avec action.

### GitHub (`modules/github/pages/github.astro`, `pages/github/[owner]/[repo]/*`, `components/{Gh,LocalCard}.astro`) : 6/10
Fonctionnellement soigné (confirmations, validation inline), mais en rupture avec le design system : palette Primer en dur, px partout, aucun retour à l'appui.
88. [x] 🟠 **Système de design parallèle complet en dur** : `modules/github/components/Gh.astro:14-21,30-49,94`. Palette Primer (~60 hex) en clair/sombre/auto, `.btn`/`.box-empty` réimplémentent `Button`/`EmptyState` du panel (familiarité, §16.4). **Correction :** mapper `--gh-*` sur les tokens du panel et réutiliser `src/components/ui` ; à défaut, documenter le choix et dédupliquer le bloc dark.
   - ✅ Palette `--gh-*` mappée sur les tokens, blocs clair/sombre/auto supprimés ; `.btn` maison conservé.
89. [x] 🟠 **Cibles tactiles 28-32 px sans `pointer: coarse`** : `modules/github/components/Gh.astro:66,76,79-81` ; boutons Pousser/Pull/Commiter en `btn-sm` (`LocalCard.astro:34-38`). **Correction :** `@media (pointer:coarse){ .gh .btn,.gh .btn-sm,.gh input,.gh select{min-height:44px} }`.
   - ✅ 44 px sous `pointer:coarse` pour boutons et champs.
90. [x] 🟠 **Aucun retour à l'appui ni état occupé visible** : `modules/github/components/Gh.astro:65-77`. Seul `:hover`, `cursor:progress` comme unique signe d'occupation, puis `location.reload()` à 800 ms (`github.ts:34`) (§1, feedback de statut). **Correction :** `.gh .btn:active{scale:.97}`, `[aria-busy=true]{opacity:.6}` + libellé « Pull… », mise à jour en place au lieu du reload.
   - ✅ `:active`, `aria-busy`, libellé « Pull… » ; reload immédiat + toast après rechargement (sessionStorage).
91. [x] 🟡 **Menu « Nouveau » en `<details>` non ancré** : `modules/github/pages/github.astro:85-98,224`. Pas de fermeture Échap/clic extérieur, ombre et `top:40px` en dur (§7). **Correction :** popover du panel, ou `toggle` + Échap/clic extérieur, `var(--shadow-md)`.
   - ✅ Menu « Nouveau » : Échap et clic extérieur, ombre et position en tokens.
92. [x] 🟡 **Typographie en px figés** : `Gh.astro:25,60,66,90,110`, `github.astro:229`, `issues/[n].astro:46` (§15). **Correction :** rem / `--space-*` / `--*-size`.
   - ✅ Tailles de police et de boutons en tokens/rem.
- ✔ Point fort : validation inline `aria-invalid` + message (`github.ts:11-14`), confirmation réservée au destructif, focus-visible défini.

## Intégration : Minecraft (`modules/minecraft`)

**Transverse :** le module a son propre CSS (`.mc-btn`, `.mc-card`, `.mc-input`, `.mc-alert`) à côté de `src/components/ui`. Le libellé de phase est copié dans 5 fichiers (`minecraft.astro:27`, `live.ts:6`, `installations.astro:184`, `console.astro:21`, `parametres`) avec des variantes (« Démarrage… » / « Démarrage »). `.sr-only` est redéfini 3 fois (`mods.astro:48`, `parametres.astro:354`, `Wizard.astro:85`). Le bloc `#bk-job` est dupliqué (`minecraft.astro:117`, `parametres.astro:274`).
Non vérifié : rendu mobile réel (lecture du CSS uniquement).

### Accueil (`pages/minecraft.astro`, `scripts/serveur.ts`, `components/Banner.astro`) : 7/10
93. [x] 🟠 **Le message d'erreur d'une opération s'efface après 2,5 s** : `modules/minecraft/scripts/serveur.ts:69`. La page se recharge même quand le job finit en `error`. **Correction :** ne recharger que si `phase === 'done'`, sinon garder la bannière d'erreur.
   - ✅ Rechargement seulement sur `done` ; en erreur, la bannière reste.
94. [x] 🟠 **Confirmation sur des actions non destructives** : `modules/minecraft/scripts/serveur.ts:17-22,29-33`. Démarrer et Sauvegarder ouvrent une boîte de dialogue (Agency : à force, on clique sans lire). **Correction :** confirmer seulement Arrêter, et Redémarrer quand des joueurs sont connectés.
   - ✅ Plus de confirmation pour Démarrer/Sauvegarder ; Arrêter confirmé ; Redémarrer seulement si des joueurs sont connectés.
95. [x] 🟡 **Boutons sans `:active` ni état occupé** : `modules/minecraft/scripts/serveur.ts:84-100`, `styles/launcher.css:129`. **Correction :** `.mc-btn:active:not(:disabled){transform:scale(.97)}` + `aria-busy` pendant l'appel.
   - ✅ `.mc-btn:active` + `aria-busy` pendant le job.
96. [x] 🟡 **Couleurs en dur** : `components/Banner.astro:176-203,216,223`, `styles/launcher.css:119,146,149,156-158`. **Correction :** tokens `--mc-warn-fill`, `--mc-green-hover`… Garder le paysage de la bannière (illustration), avec un commentaire.
   - ✅ Couleurs → tokens `--mc-*` ; paysage de la bannière gardé avec commentaire.
- ✔ Point fort : barre « Lancement du serveur » claire, actions rapides désactivées avec leur explication.

### Joueurs (`pages/joueurs.astro`, `scripts/joueurs.ts`) : 7/10
97. [x] 🟠 **« Débannir » et « Retirer OP » en rouge alors que ces actions sont réversibles** : `modules/minecraft/scripts/joueurs.ts:268`. **Correction :** retirer `mini--danger`.
   - ✅ « Débannir » n'est plus en rouge.
98. [x] 🟠 **Deux dialogues enchaînés pour un bannissement, sélecteur global fragile** : `modules/minecraft/scripts/joueurs.ts:225-229,279`. **Correction :** `openModal` qui expose `close()`, et un seul dialogue de danger avec un champ « Motif ».
   - ✅ Un seul dialogue de bannissement avec champ Motif, sans sélecteur global.
99. [x] 🟠 **Retour d'action non annoncé, reload qui perd l'onglet et le scroll** : `modules/minecraft/scripts/joueurs.ts:155,240,306`. **Correction :** `role="status"` sur `pm__msg`, mise à jour des lignes et badges en place.
   - ✅ `role="status"`, fiche mise à jour en place ; rechargement à la fermeture + toast après coup (l'onglet de la liste reste perdu).
100. [x] 🟡 **Pseudo validé après la fermeture du prompt** : `modules/minecraft/scripts/joueurs.ts:296`. **Correction :** `maxlength=16` + `pattern` et message sous le champ.
   - ✅ Pseudo validé dans le dialogue (`maxlength`, motif, message sous le champ).
- ✔ Point fort : états vides précis pour chaque onglet, infobulles qui expliquent `clear` et `kill`.

### Console (`pages/console.astro`) : 6/10
101. [x] 🟠 **Le journal `aria-live` annonce chaque ligne du flux** : `modules/minecraft/pages/console.astro:92`. Le lecteur d'écran est inondé. **Correction :** `aria-live="off"` sur `#viewer`, et une petite zone `role=status` qui n'annonce que les erreurs.
   - ✅ `aria-live="off"` sur le journal + zone `role="status"` pour les erreurs.
102. [x] 🟠 **« Suivre le flux » ne se réactive pas en redescendant** : `modules/minecraft/pages/console.astro:219-224`. **Correction :** recocher la case quand l'utilisateur revient en bas, et afficher un bouton flottant « Reprendre le suivi ».
   - ✅ Le suivi se réactive en bas + bouton « Reprendre le suivi ».
103. [x] 🟠 **Erreur de job effacée par le reload, boutons actifs pendant un job** : `modules/minecraft/pages/console.astro:58,315-317,331-346`. Possible double lancement. **Correction :** désactiver start/restart/stop pendant le job, `role="status"` sur `#job`, reload seulement sur `done`.
   - ✅ Boutons désactivés pendant un job, `role="status"`, rechargement seulement sur `done`.
104. [x] 🟡 **Erreurs de commande et de flux muettes** : `modules/minecraft/pages/console.astro:93,104,234-239,265`. **Correction :** `role="alert"` sur `#cmd-msg`, pastille « Flux interrompu, reconnexion… » via `es.onerror`, `readOnly` au lieu de `disabled`.
   - ✅ `role="alert"`, pastille « Flux interrompu, reconnexion… », `readOnly`.
105. [x] 🟡 **Champ de commande à 32 px, `pulse-subtle` sans garde reduced-motion** : `modules/minecraft/pages/console.astro:400-403,429`. **Correction :** `min-height: var(--control-h-lg)` + `animation:none` en reduced-motion.
   - ✅ Champ à `--control-h-lg`, animation coupée en reduced-motion.
- ✔ Point fort : historique ↑/↓ avec brouillon conservé, filtres, plafond à 2000 lignes.

### Mods (`pages/minecraft/mods.astro`, `scripts/mods.ts`) : 6/10
106. [x] 🟠 **Pas d'état vide** : `modules/minecraft/scripts/mods.ts:26-32`. La liste reste vide avec « 0 affiché sur 0 mod ». **Correction :** « Aucun mod installé, déposez un .jar ci-dessus » / « Aucun résultat pour “…” ».
   - ✅ États vides « Aucun mod installé » / « Aucun résultat ».
107. [x] 🟠 **Interrupteur sans réponse immédiate, double annonce, 48×26 px** : `modules/minecraft/scripts/mods.ts:24,51-64`, `pages/minecraft/mods.astro:63-66`. **Correction :** bascule optimiste avec retour arrière en cas d'erreur, `aria-label` = nom du mod seul, zone cliquable ≥ 44 px.
   - ✅ Bascule optimiste avec retour arrière, `aria-label` = nom, zone 52×44 px.
108. [x] 🟡 **Animation de `left` au lieu de `transform`, `#fff` en dur** : `modules/minecraft/pages/minecraft/mods.astro:66-70`. **Correction :** `transform: translateX()` + token.
   - ✅ Animation en `transform: translateX()` ; `#fff` déjà remplacé par `--mc-on-fill`.
109. [x] 🟡 **Erreur de chargement sans « Réessayer »** : `modules/minecraft/scripts/mods.ts:40`. **Correction :** bouton Réessayer + `aria-busy` sur la liste.
   - ✅ Bouton Réessayer + `aria-busy`.
- ✔ Point fort : dépôt de .jar avec statut par fichier, bandeau « Redémarrage requis ».

### Installations (`pages/minecraft/installations.astro`) : 7/10
110. [x] 🟡 **État figé, jamais rafraîchi** : `modules/minecraft/pages/minecraft/installations.astro:188,198`. **Correction :** réutiliser `live.ts`.
   - ✅ État en direct via `live.ts`.
111. [x] 🟡 **Libellé « Jamais depuis le démarrage de la machine » trompeur, page sans action** : `installations.astro:208`. **Correction :** « Pas encore démarré » + liens Console et Propriétés.
   - ✅ « Pas encore démarré » + liens Console et Propriétés.
112. [x] 🟡 **px en dur** : `installations.astro:231,234`. **Correction :** `rem` / `var(--meta-size)`.
   - ✅ px → rem / `--meta-size`.
- ✔ Point fort : jauge disque `role=meter`, alertes à 80 % et 100 % avec lien vers le réglage.

### Paramètres (`pages/minecraft/parametres.astro`, `scripts/parametres.ts`) : 6/10
113. [x] 🟠 **Retour « Fait. » générique puis reload** : `modules/minecraft/scripts/parametres.ts:35,41,45`. **Correction :** « <pseudo> ajouté à la liste blanche », mise à jour en place.
   - ✅ Messages précis par action, affichés après le rechargement.
114. [x] 🟠 **Restauration sans verrou ni retour, double envoi possible** : `modules/minecraft/scripts/parametres.ts:56-59`. **Correction :** désactiver les boutons `data-restore` dès l'envoi + toast « Restauration lancée ».
   - ✅ Boutons de restauration verrouillés + toast « Restauration lancée ».
115. [x] 🟡 **Validation du pseudo native seulement** : `modules/minecraft/pages/minecraft/parametres.astro:75-77`. **Correction :** aide persistante via `aria-describedby` + `aria-invalid`.
   - ✅ Aide persistante `aria-describedby` + `aria-invalid`.
116. [x] 🟡 **Curseurs Xmx/Xms sans la valeur actuelle** : `parametres.astro:288-293`. **Correction :** afficher « actuel : 4 Go ».
   - ✅ « (actuel : 4 Go) » à côté des curseurs.
- ✔ Point fort : restauration confirmée par saisie du nom du monde.

### Propriétés (`pages/minecraft/proprietes.astro`) : 7/10
117. [x] 🟠 **Aucune validation inline des champs** : `modules/minecraft/pages/minecraft/proprietes.astro:75-78,149-165`. **Correction :** tester `validity` à la saisie, message sous le champ, « Enregistrer » désactivé tant qu'un champ est invalide.
   - ✅ Validation inline, « Enregistrer » désactivé si un champ est invalide.
118. [x] 🟠 **Modifications perdues en navigation interne** : `proprietes.astro:219-222`. La garde est retirée à `astro:before-swap` sans vérification. **Correction :** si `dirty().length`, bloquer ou confirmer avant le swap.
   - ✅ `astro:before-preparation` bloque la navigation interne si des modifications sont en attente (invite `beforeunload` native).
119. [x] 🟡 **Compteur de modifications non annoncé, pas d'annulation par champ** : `proprietes.astro:92-95,129`. **Correction :** `role="status"` + bouton « Rétablir » par ligne.
   - ✅ `role="status"` sur le compteur + bouton « Rétablir » par ligne.
120. [x] 🟡 **Toast masqué par la modale « Redémarrer maintenant ? »** : `proprietes.astro:168-173`. **Correction :** bandeau « Redémarrage requis » avec bouton.
   - ✅ Bandeau « Redémarrage requis » à la place de la modale.
- ✔ Point fort : réutilise `Toggle`, `SettingsGroup`, `Toolbar` et `ErrorState` du design system.

### Assistant de création (`components/Wizard.astro`, `scripts/wizard.ts`) : 6/10
121. [x] 🟠 **Le focus ne suit pas l'étape** : `modules/minecraft/scripts/wizard.ts:42`, `components/Wizard.astro:20`. Le `h3` n'a pas de `tabindex="-1"`. **Correction :** ajouter `tabindex="-1"` + annonce « Étape 2 sur 6 ».
   - ✅ `tabindex="-1"` sur les titres, focus + annonce « Étape n sur 6 ».
122. [x] 🟠 **Passage à l'étape suivante même si le chargement échoue** : `modules/minecraft/scripts/wizard.ts:132,145`. **Correction :** `loadLoaders()` renvoie un booléen et la navigation n'a lieu qu'en cas de succès.
   - ✅ `loadLoaders()` renvoie un booléen : on ne passe pas à l'étape suivante si le chargement échoue.
123. [x] 🟡 **Bouton Installer désactivé sans explication** : `components/Wizard.astro:60`, `scripts/wizard.ts:51`. **Correction :** message inline sur le nom + « Cochez l'EULA pour continuer ».
   - ✅ Message sous Installer (EULA ou nom invalide).
- ✔ Point fort : cartes radio de versions réellement accessibles (`:has(:checked)`, `:focus-within`).

## Intégrations : Tailscale, Mail, Bot Discord

Non vérifié : rendu réel (pas d'exécution). Les sous-pages Tailscale mineures (`logs/*`, `apps`, `api`, `settings/billing|webhooks|trust-credentials`) ont seulement été parcourues par grep.

### Tailscale (`modules/tailscale/**`) : 6,5/10
Les actions destructives sont bien confirmées, mais la console forme un second design system et il lui manque la validation inline, l'état de chargement et le retour au toucher.
124. [x] 🟠 **Éditeur ACL : pas de validation inline, erreur non annoncée** : `modules/tailscale/pages/tailscale/acls/file.astro:33`, `modules/tailscale/scripts/tailscale-console/acl-file.ts:46-59`. Le HuJSON n'est vérifié qu'à l'enregistrement. L'erreur s'affiche dans un `<p hidden>` sans `role="alert"`, invisible si l'onglet Aperçu est actif. Le bouton n'a pas d'état occupé. **Correction :** `role="alert"`, ligne et colonne de l'erreur dans la gouttière, validation en debounce à la saisie, `aria-busy` + libellé « Enregistrement… ».
   - ✅ `role=alert`, bouton « Enregistrement… » + `aria-busy`, validation HuJSON à la saisie (600 ms).
125. [x] 🟠 **Modale « Générer une clé » : un champ invalide ne donne aucun message** : `modules/tailscale/scripts/tailscale-console/settings-keys.ts:25`. Hors de 1-90 jours, le code fait seulement `focus()` + `return false`. **Correction :** `aria-invalid="true"` sur `#k-days` et aide en `--danger`, comme dans `modules/mail/scripts/settings.ts:63-93`.
   - ✅ `aria-invalid` + aide en rouge `role=alert` sur la durée de clé.
126. [x] 🟠 **Actions de ligne cachées au toucher** : `modules/tailscale/styles/tailscale-console.css:288-289`, `modules/tailscale/pages/tailscale/machines/index.astro:148`. `.ts-row-hover` n'apparaît qu'au survol, donc « Partager… » est inaccessible sur mobile. **Correction :** `@media (hover:none){ .ts-row-hover{visibility:visible} }` ou déplacer l'action dans le menu de ligne.
   - ✅ Actions de ligne visibles sous `hover:none`.
127. [x] 🟡 **Design system parallèle, sans `:active` ni reduced-motion, cibles de 30 px** : `modules/tailscale/styles/tailscale-console.css:14-95,194-212,233-239,163,209,273`. Palette `--ts-*` complète. `.ts-btn`, `.ts-input`, `.ts-badge`, `.ts-tabs` et `.ts-empty` dupliquent les composants du panel. **Correction :** `.ts-btn:active{transform:scale(.97)}`, bloc `prefers-reduced-motion`, contrôles d'au moins 36 px (44 px au toucher), `--ts-*` réduits à des surcharges des tokens.
   - ✅ `:active`, bloc reduced-motion, contrôles 36 px (44 au toucher). Palette `--ts-*` conservée (apparence Tailscale voulue).
128. [x] 🟡 **`location.reload()` après chaque mutation (15 occurrences)** : `modules/tailscale/scripts/tailscale-console/*.ts` (ex. `settings-keys.ts:49`). Le scroll et le focus sont perdus (§7). **Correction :** retirer ou mettre à jour la ligne dans le DOM, comme le fait `removeRow` dans Mail.
   - ✅ `reloadPage()` partagée : les 15 reloads réaffichent le toast après rechargement.
- ✔ Point fort : confirmations nommées et bien ciblées (suppression désactivée pour le propriétaire et pour « Ce serveur »), onglets ARIA navigables aux flèches, Échap pour sortir du piège Tab.

### Mail (`modules/mail/pages/mail.astro`) : 8,5/10
Le module le plus abouti : tokens du panel partout, squelettes de chargement, bandeau d'erreur avec Réessayer, états vides, `aria-live`, un seul volet à la fois sur mobile, brouillon protégé.
129. [x] 🟠 **Corbeille et spam sans « Annuler »** : `modules/mail/scripts/actions.ts:30-42`, boutons voisins `modules/mail/pages/mail.astro:66-67`. Le mauvais clic est probable au toucher et le toast ne propose pas d'annulation (Agency : réversibilité plutôt que confirmation). **Correction :** action « Annuler » dans le toast (6 s), qui renvoie le message dans son dossier d'origine.
   - ✅ Bandeau « Annuler » 6 s pour Corbeille/Spam depuis la boîte de réception. Limite : messages identiques (sujet+date+expéditeur) confondables.
130. [x] 🟡 **Cibles de la barre d'actions et du bouton Retour sous 44 px** : `modules/mail/pages/mail.astro:59-68,164`. **Correction :** `@media (pointer:coarse)` à 44 px, et plus d'espace entre Spam et Corbeille.
   - ✅ 44 px au toucher pour la barre d'actions et Retour, Supprimer plus espacé.
131. [x] 🟡 **Erreur d'envoi non reliée au champ** : `modules/mail/scripts/composer.ts:88-103`. **Correction :** `aria-invalid` sur le champ fautif, `role="alert"` sur `.mail-compose__error`.
   - ✅ `role=alert` sur l'erreur d'envoi, `aria-invalid` + focus sur le champ fautif.
- ✔ Point fort : garde-fou de brouillon (Échap, clic extérieur, Annuler), libellé « Supprimer définitivement » selon le dossier, reduced-motion géré.

### Bot Discord (`modules/discord-bot/pages/bot.astro`) : 7/10
Bonne structure ARIA et confirmations différenciées, mais le module réimplémente un thème et ses propres contrôles.
132. [x] 🟠 **Palette et contrôles dupliqués, gris et rouges en dur** : `modules/discord-bot/pages/bot.astro:410-413,428-437,508-525` (`#313338`, `#e3e5e8`, `:hover #6d6f78`, `#a12828`). **Correction :** mapper `--dc-text`, `--dc-chat` et `--dc-side` sur les tokens du panel. Garder seulement le blurple et les pastilles de statut. Remplacer `.dc-btn` par `Button` (déjà importé).
   - ✅ Gris/fonds/textes mappés sur les tokens, blocs sombres supprimés ; blurple et statuts gardés. `.dc-btn` conservé.
133. [x] 🟠 **Aucun retour à l'appui** : `modules/discord-bot/pages/bot.astro:494,518-525`. Démarrer, arrêter et redémarrer ne montrent aucun état pressé ni occupé (§1). **Correction :** `.dc-btn:active,.dc-iconbtn:active{transform:scale(.97);transition:transform 100ms}` + `aria-busy` visible.
   - ✅ `:active` + `aria-busy` visible pendant les envois.
134. [x] 🟡 **Cibles de 32 px, transition de 350 ms, reduced-motion partiel** : `modules/discord-bot/pages/bot.astro:452,475,494,627`. **Correction :** 44 px sous `pointer:coarse`, transition ramenée à 200 ms au plus, bloc reduced-motion étendu.
   - ✅ Transition 200 ms, 44 px au toucher, reduced-motion étendu.
- ✔ Point fort : arrêt forcé et suppression confirmés par saisie du nom, `role="log"` + `aria-live` sur le journal, état de jeton refusé géré.


---

## Récapitulatif des corrections (3 novembre 2026)

**Bilan :** 129 corrigés ✅ · 2 partiels ⚠️ (n°14, n°33) · 3 volontairement non modifiés ⏭️ (n°17, n°68, n°87).

**Vérifications :** `vitest` 274/274 (8 tests ajoutés : surlignage des journaux, toasts, fenêtre non fermable) · `astro check` 0 erreur · `npm run build` réussi. Le rendu n'a pas été contrôlé dans un navigateur.

**Restent ouverts :**
- n°33 : les boutons du tableau Services gardent leur style maison (le tableau est généré en JS et le CSS scopé d'`ActionButton` ne s'y applique pas).
- n°14 : `grid-template-rows` toujours animé dans la nav.
- Palettes parallèles réduites mais pas supprimées : `--ts-*` (apparence Tailscale voulue), `.btn` GitHub, `.dc-btn` Discord, `.mc-btn` Minecraft. Ces modules ne réutilisent pas encore `Button`.
- Plusieurs `location.reload()` sont conservés : le toast s'affiche désormais après le rechargement, mais le scroll et l'onglet actif ne sont pas restaurés (Minecraft joueurs/paramètres, Réseau, Utilisateurs, Tailscale, GitHub).
- Badge « danger » en sombre à 4,38:1 : relevé pendant les corrections, hors audit.

**Fichiers créés :** `src/scripts/pages/logs.ts`, `tests/pages/logs-highlight.test.ts`, `tests/ui/toast.test.ts`, `tests/ui/modal-dismiss.test.ts`, `modules/minecraft/scripts/phase.ts`, `modules/minecraft/scripts/flash.ts`, `modules/minecraft/components/JobBar.astro`.
