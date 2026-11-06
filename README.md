<img src="docs/brand/orvanes-logo-clair.png" alt="Orvanes" width="220">

# Orvane

Orvane est un panel web d'administration pour un VPS Debian ou Ubuntu : état du système, processus, services systemd, réseau et pare-feu, fichiers, journaux et terminal. Des modules ajoutent d'autres onglets (Docker, Claude, Minecraft, mail…) ; vous installez ceux dont vous avez besoin depuis le panel.

## Prérequis

- Debian 12 ou plus récent, ou Ubuntu 22.04 ou plus récent, en x86_64 ou arm64.
- systemd, 2 Go d'espace disque libre, 1 Go de mémoire.
- Un compte utilisateur avec sudo. Le panel tourne sous ce compte, jamais en root.
- curl et git (l'installation ajoute ce qui manque).

Node.js 22.13 ou plus est requis. Si la machine n'en a pas, l'installation télécharge le binaire officiel dans le dossier du panel, sans toucher au Node du système.

## Installation

Connecté en SSH avec le compte qui fera tourner le panel :

```bash
curl -fsSL https://orvanes.tech/install | bash
```

Le script installe le panel dans `~/orvane`, le construit, crée le premier compte administrateur et lance le service systemd utilisateur `orvane`. Il affiche à la fin l'identifiant (`admin`) et un mot de passe généré : notez-le, il n'apparaîtra plus.

Si `orvanes.tech` ne répond pas : `curl -fsSL https://raw.githubusercontent.com/Milou-dx/orvanes/master/install.sh | bash`. Le catalogue d'intégrations reste servi par `magasin.orvanes.tech` (autre source : `ORVANE_MAGASIN_URL`) ; le panel lui-même continue de fonctionner sans lui.

Variables facultatives, à placer devant `bash` :

| Variable | Défaut | Rôle |
|---|---|---|
| `ORVANE_DIR` | `~/orvane` | Dossier d'installation |
| `ORVANE_REPO`, `ORVANE_BRANCH` | ce dépôt, `master` | Source du code |
| `ORVANE_ADMIN`, `ORVANE_ADMIN_PASSWORD` | `admin`, généré | Premier administrateur |
| `PANEL_HOST`, `PANEL_PORT`, `PANEL_PUBLIC_URL` | `127.0.0.1`, `4321`, vide | Écrits dans le `.env` créé |
| `ORVANE_NO_SERVICE=1` | | Pas de service systemd (conteneur, essai) |

Exemple : `curl -fsSL https://orvanes.tech/install | PANEL_PUBLIC_URL=https://panel.example.com bash`.

Docker n'est pas proposé : le panel pilote systemd, les processus et les fichiers de l'hôte, ce qu'un conteneur isolé ne permet pas.

## Premier lancement

Le panel écoute sur `http://127.0.0.1:4321`, joignable depuis la machine seulement. Choisissez une façon de l'ouvrir depuis votre poste :

- **Reverse proxy HTTPS.** Avec Caddy, un nom de domaine qui pointe vers le serveur suffit :

  ```
  panel.example.com {
      reverse_proxy 127.0.0.1:4321
  }
  ```

  Puis `PANEL_PUBLIC_URL=https://panel.example.com` dans `~/orvane/.env` et `~/orvane/scripts/update.sh`.
- **Tailscale.** `sudo tailscale serve --bg 4321` publie le panel en HTTPS sur votre tailnet ; mettez l'adresse affichée dans `PANEL_PUBLIC_URL`. Autre possibilité : `PANEL_HOST=<IP Tailscale>` dans `.env`, pour un accès en HTTP réservé aux appareils du tailnet.
- **Tunnel SSH**, sans rien exposer : `ssh -L 4321:127.0.0.1:4321 vous@serveur`, puis `http://localhost:4321`.

N'exposez jamais le panel en HTTP sur une adresse publique : il donne la main sur la machine, terminal compris. Il refuse de démarrer sur une autre adresse que `127.0.0.1` tant que la protection par mot de passe est désactivée.

Connectez-vous avec le compte administrateur. La page **Utilisateurs** gère les autres comptes, leurs onglets et la connexion Google. Mot de passe perdu :

```bash
cd ~/orvane && node scripts/admin.mjs reset admin
```

**Double authentification.** Activez-la dans **Paramètres**, surtout pour les administrateurs : le panel donne un terminal sur la machine. Elle s'applique à la connexion par mot de passe ; la connexion Google suit la protection de votre compte Google. `admin.mjs reset` la retire si le téléphone est perdu.

Reverse proxy sur une autre machine ou une autre adresse que `127.0.0.1` : déclarez son adresse dans `PANEL_TRUSTED_PROXIES`, sinon tous les clients partagent le même compteur d'essais de connexion.

## Sauvegarde

```bash
~/orvane/scripts/backup.sh [dossier]    # data/ et .env, défaut ~/orvane-sauvegardes ; coupure de quelques secondes
```

Restauration, sur un panel installé : `systemctl --user stop orvane`, `tar -xzf <archive> -C ~/orvane`, puis `systemctl --user start orvane`. L'archive contient vos secrets : copiez-la hors du serveur.

## Configuration

Toute la configuration tient dans `~/orvane/.env`, créé depuis `.env.example` à l'installation et jamais écrasé ensuite. `.env.example` décrit chaque variable, regroupées par module. Les principales :

| Variable | Défaut | Rôle |
|---|---|---|
| `PANEL_HOST` | `127.0.0.1` | Adresse d'écoute |
| `PANEL_PORT` | `4321` | Port d'écoute |
| `PANEL_PUBLIC_URL` | vide | Adresse(s) publique(s), séparées par des virgules ; requise derrière un proxy |
| `PANEL_DATA_DIR` | `data` | Comptes, sessions, base SQLite, état des modules |
| `PANEL_NAME` | `Orvane` | Nom affiché |

Après une modification, redémarrez : `systemctl --user restart orvane`. `PANEL_PUBLIC_URL` est lu à la construction : lancez `scripts/update.sh` après l'avoir changée.

## Modules

| Module | Rôle |
|---|---|
| Applications | Crée et héberge des sites (statique, Node.js, Astro) avec leur service et un relais `/<id>/`. |
| Claude | Claude Code dans le panel : discussions, sessions, tâches planifiées, outils, graphes de code. |
| Messages de contact | Lit les messages d'un formulaire de contact enregistrés dans un fichier JSONL. |
| Bot Discord | Pilote un bot lancé comme service : console, `.env`, mises à jour git, sauvegardes. |
| Docker | Conteneurs, images, volumes, réseaux, journaux et terminal dans un conteneur. |
| GitHub | État git des projets de `~/dev`, commit, push et branches de sauvegarde. |
| Mail | Client IMAP/SMTP pour une boîte. |
| Minecraft | Serveur Minecraft Java : état, mods, propriétés, sauvegardes, joueurs, console RCON. |
| Tailscale | Machines, utilisateurs, ACL, DNS et réglages du nœud. |

Ouvrez l'onglet **Magasin**, cliquez sur **Installer** : le panel vérifie les commandes requises (par exemple `docker`), lance le script d'installation du module, se reconstruit et redémarre (environ une minute, une installation à la fois). Renseignez ensuite ses variables dans `.env` s'il en a. Le jeton Claude partagé avec les comptes Linux liés (`ORVANE_CLAUDE_SHARED_TOKEN_FILE`) engage votre abonnement : vérifiez que les conditions de votre offre autorisent ce partage. La structure d'un module et la façon d'en écrire un sont décrites dans [docs/MODULES.md](docs/MODULES.md).

## Mise à jour

```bash
~/orvane/scripts/update.sh
```

Le script récupère le code, réinstalle les dépendances si elles ont changé, reconstruit et redémarre le service. `.env` et `data/` restent intacts. Relancer la commande d'installation fait la même chose.

## Désinstallation

```bash
~/orvane/scripts/uninstall.sh           # arrête et supprime le service, garde le dossier
~/orvane/scripts/uninstall.sh --purge   # supprime aussi ~/orvane (code, .env, data/), après confirmation
```

## Dépannage

| Symptôme | Commande |
|---|---|
| Le panel ne répond pas | `systemctl --user status orvane` puis `journalctl --user -u orvane -n 100` |
| Le service s'arrête à la déconnexion SSH | `sudo loginctl enable-linger $USER` |
| « Refus de démarrer » dans le journal | `PANEL_HOST` vise une adresse réseau sans protection : `node scripts/admin.mjs init` |
| Actions refusées (403) derrière le proxy | `PANEL_PUBLIC_URL` absent ou différent de l'adresse du navigateur, puis `scripts/update.sh` |
| Construction échouée à l'installation | `~/orvane/.cache/build.log` |
| Module qui ne s'installe pas | sa sortie s'affiche dans **Magasin** ; vérifiez `requires.commands` dans son `module.json` |

## Développement

Astro 7 en rendu serveur, Node 22, sans framework client.

```
serve.mjs              point d'entrée de production (HTTP + WebSocket, hooks des modules)
astro.config.mjs
install.sh             installation et mise à jour sur un serveur
scripts/
  release.sh           build dans releases/<date>, bascule le lien dist, redémarrage différé (--restart)
  update.sh            pull, dépendances, build, redémarrage
  uninstall.sh         retrait du service, --purge pour le dossier
  admin.mjs            premier administrateur, mot de passe perdu
  lucide-icons.py      génère src/components/ui/lucide.ts
src/
  pages/               routes du cœur (chaque fichier est une URL)
  layouts/             PanelLayout, AuthLayout
  components/ui/       design system
  styles/              tokens.css, global.css, ui.css
  scripts/             code client
  server/              code serveur du cœur : core, system, network, auth, files, shell, modules
  integrations/        intégration Astro qui injecte les routes des modules
modules/<id>/          modules installables : docs/MODULES.md
data/                  données (PANEL_DATA_DIR)
docs/DESIGN-SYSTEM.md  règles d'interface
```

| Commande | Effet |
|---|---|
| `npm install --include=dev` | dépendances, outils de développement compris |
| `npm run dev` | serveur de dev Astro |
| `npm test` | tests vitest |
| `npm run check` | `astro check` (doit rester à 0 erreur) |
| `npm run build` | build dans `releases/<date>` et bascule `dist` |
| `npm run deploy` | build puis redémarrage dès qu'aucun tour Claude n'est en cours |
| `npm run admin -- reset <identifiant>` | nouveau mot de passe |

Rollback : `dist` est un lien vers `releases/<date>`. Faites-le pointer vers une version précédente (`ln -sfn releases/<ancienne> dist`) puis redémarrez le service.

Un build de test n'écrit jamais dans `dist` : `ORVANE_OUT_DIR=/tmp/xxx npx astro build`. Une copie de test écoute sur un autre port que 4321 avec sa propre copie des données (`PANEL_PORT=4470 PANEL_DATA_DIR=/tmp/data ORVANE_DIST=/tmp/xxx node serve.mjs`) : le redémarrage différé et les tâches planifiées ne tournent que sur 4321.

Conventions :

- Node 22 charge directement les `.ts` importés par `serve.mjs` (suppression des types seulement) : ces fichiers et ceux qu'ils importent gardent l'extension `.ts` ou `.js` dans leurs imports relatifs.
- Le code serveur résout `data/`, `scripts/` et `modules/<id>/` depuis le dossier de travail (racine du projet) : l'unité systemd fixe `WorkingDirectory`.
- Les composants d'interface viennent de `src/components/ui/` ; voir `docs/DESIGN-SYSTEM.md`.

## Licence

[AGPL-3.0](LICENSE). Failles de sécurité : voir [SECURITY.md](SECURITY.md). Historique : [CHANGELOG.md](CHANGELOG.md).
