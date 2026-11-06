# Historique

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
