# Historique

## 0.4.1 (2026-11-15)

- Sécurité (GHSA-fw54-xhg2-vm5h) : le panel répond 421 à toute adresse absente de `PANEL_PUBLIC_URL`, hors 127.0.0.1, localhost, [::1] et `PANEL_HOST` au port `PANEL_PORT`. Une page tierce ne peut plus ouvrir le terminal par DNS rebinding, même protection par mot de passe coupée. Un tunnel SSH garde le même port local.
- Pour les modules : `guarded()` exige un `Host` déclaré et compare `Origin` à cette liste, plus au `Host` reçu.
- Sécurité (GHSA-4qj6-x664-r75w) : changer `X-Forwarded-For` à chaque essai ne contourne plus le blocage des mots de passe faux. La machine elle-même n'est plus crue sur cet en-tête sans déclaration.
- À faire derrière un proxy local (nginx, Caddy) : ajouter `PANEL_TRUSTED_PROXIES=127.0.0.1` dans `.env`. Sans cela, tous les clients comptent pour 127.0.0.1 : 5 mots de passe faux bloquent un identifiant pour tout le monde, et les ouvertures de connexion Google sont comptées ensemble.
- Un identifiant est aussi bloqué après 20 mots de passe faux, quelle que soit l'adresse : même délai croissant, de 30 s à 15 min.

## 0.4.0 (2026-11-15)

- Bureau de mistraOS : fond d'écran, page dans une fenêtre de rayon 30, Dock toujours affiché en bas à la place du menu latéral. Le réglage « Menu » disparaît.
- Barre du haut comme celle du bureau, texte à chasse fixe : fil d'Ariane à gauche, recherche au centre, date et heure à droite.
- Accent bleu de mistraOS pour les contrôles, les liens et le focus.
- Duotone strict : plus de vert, d'orange ni de rouge. Un état se lit à la forme de son point (plein, anneau, triangle, carré) et à son libellé ; graphes et terminal en gris.
- Icônes Phosphor Bold à la place de Lucide, mêmes noms.
- Écran de connexion de mistraOS : fond flouté, horloge, champs dépolis.
- Navigateurs : Chrome 123, Firefox 120 ou Safari 17.5 au minimum (`light-dark()`, `linear()`).
- Pour les modules : les jetons `--mac-*` et la fonction `tone()` n'existent plus ; `#nav-pane` et `.navlink` sont remplacés par `#dock` et `.dock__tile` ; les jetons d'état (`--success`, `--danger`, `--tone-*`) sont gris ; du texte blanc posé en dur sur `var(--accent)` devient illisible en sombre, utiliser `var(--accent-fg)`.
- La CI lance aussi `astro check` et `astro build`.

## 0.3.0 (2026-11-15)

- Interface de mistraOS : surfaces grises en duotone, accent blanc ou noir, rayons 8, 10 et 14, texte en Inter 13 px, mouvements à ressort. Les états et les graphes gardent leur couleur.
- Barre du haut en trois capsules noires : le menu et le fil d'Ariane, la recherche, l'actualisation et le compte.
- La recherche centrale s'ouvre en palette (clic, Ctrl+K ou `/`) : pages, actions, « Chercher le processus » et « Filtrer cette page ». Elle remplace le bouton « Aller à… » et le champ de recherche de processus.
- Le compte et le choix du thème passent du pied du menu à la barre du haut.
- Terminal et journaux aux couleurs de la fenêtre, en clair comme en sombre ; notifications sous la barre, noires comme elle ; avatars et icônes de fichiers sans teinte.

## 0.2.1 (2026-11-06)

- Nom unifié : Orvanes.
- Documentation déplacée sur https://orvanes.tech/docs.

## 0.2.0 (2026-11-06)

- Nouveau logo Orvanes, nom par défaut du panel aligné.
- Fenêtre d'erreur avec le logo.
- Page Sécurité : double authentification pour tous les comptes.
- Copier sur un fichier existant : message clair.

## 0.1.0 (2026-11-05)

- Double authentification TOTP dans Paramètres.
- Content-Security-Policy sur les pages du panel.
- Limitation des essais de connexion : `X-Forwarded-For` n'est plus cru venant d'un client direct.
- Les modules trouvent le Node installé par `install.sh` (le module Applications refusait de s'installer).
- `scripts/backup.sh` sauvegarde `data/` et `.env`.
- Signalement de bug : lien pour ouvrir une issue GitHub depuis une autre instance.
- Dépôt déplacé vers `Milou-dx/orvanes`.
- Licence AGPL-3.0.
