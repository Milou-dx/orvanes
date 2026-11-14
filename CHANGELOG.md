# Historique

## 0.3.0 (2026-11-15)

- Interface de mistraOS : surfaces grises en duotone, accent blanc ou noir, rayons 8, 10 et 14, texte en Inter 13 px, mouvements à ressort. Les états et les graphes gardent leur couleur.
- Barre du haut en trois capsules noires : le menu et le fil d'Ariane, la recherche, l'actualisation et le compte.
- La recherche centrale s'ouvre en palette (clic, Ctrl+K ou `/`) : pages, actions, « Chercher le processus » et « Filtrer cette page ». Elle remplace le bouton « Aller à… » et le champ de recherche de processus.
- Le compte et le choix du thème passent du pied du menu à la barre du haut.

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
