# Modules

Un module (une « intégration ») ajoute un ou plusieurs onglets au panel : pages, routes d'API, code serveur, script client, tests. Le panel n'en contient aucun : ils sont publiés sur le Magasin, <https://magasin.orvanes.tech>, et l'administrateur les installe depuis la page Magasin (`/modules`). Une fois installé, un module vit dans `modules/<id>/`, un dossier ignoré par git. Ses sources sont dans le dépôt `orvane-magasin`, dont le module `github` sert de modèle.

## Magasin

- **Catalogue** : `index.json` liste les modules (id, version, sha256 du paquet). `index.json.sig` est sa signature Ed25519. Le panel vérifie cette signature avec la clé publique de `src/server/modules/store-key.js`, et refuse un catalogue mal signé.
- **Paquets** : `paquets/<id>-<version>.tar.gz`, sans `tests/`. Un paquet est refusé si son sha256 diffère du catalogue, s'il contient un lien, un fichier spécial, un chemin absolu ou `..`, ou si son `module.json` ne correspond pas à l'entrée du catalogue.
- **Installer, mettre à jour, désinstaller** : `src/server/modules/store-ops.js`. Les pages d'un module sont intégrées à la construction, donc chaque opération relance `scripts/release.sh --restart` en arrière-plan (environ une minute ; journal dans `.cache/magasin-rebuild.log`). Une mise à jour est proposée quand le Magasin a une version plus récente.
- **Publier** : seulement depuis le serveur qui détient la clé privée, avec `npm run magasin -- publier <id>|--tous` ou le bouton « Publier » de la page Magasin. Il faut `ORVANE_MAGASIN_SOURCES`, `ORVANE_MAGASIN_PUBLIC` et `ORVANE_MAGASIN_KEY` (voir `.env.example`). Republier une version existante avec un autre contenu est refusé : il faut augmenter `version`.
- **Autre Magasin** : `ORVANE_MAGASIN_URL` (catalogue signé par la même clé).

## Structure

```
modules/<id>/
  module.json          manifeste (obligatoire)
  logo.svg             logo affiché dans /modules (et dans le menu pour un onglet sans `icon`)
  pages/               routes, même convention que src/pages
    <id>.astro         → /<id>
    api/<id>.ts        → /api/<id>
    api/<id>/[nom].ts  → /api/<id>/[nom]
    x/index.astro      → /x
  server/              code serveur (importé par les pages et les API)
    nav.ts             optionnel : pastille du menu (voir plus bas)
    hooks.js           optionnel : hook chargé par serve.mjs
  scripts/             code client (importé par un <script> de page)
  components/          composants .astro propres au module
  tests/               tests vitest (*.test.ts)
  install.sh           optionnel
  uninstall.sh         optionnel
```

Les fichiers de `pages/` dont le nom commence par `_` ne deviennent pas des routes. Extensions reconnues : `.astro`, `.ts`, `.js`.

Le module importe le cœur par chemin relatif : `../../../src/layouts/PanelLayout.astro`, `../../../src/components/ui/Card.astro`, `../../../src/server/core/safe`. Le cœur n'importe jamais le code d'un module : il passe par le manifeste, le registre et les conventions de cette page.

## Manifeste `module.json`

```json
{
  "id": "github",
  "name": "GitHub",
  "description": "État git des projets du panel, commit, push et sauvegardes sur le compte GitHub configuré.",
  "version": "1.0.0",
  "logo": "logo.svg",
  "requires": { "commands": ["git"], "modules": [] },
  "tabs": [
    { "id": "github", "label": "GitHub", "href": "/github", "pages": ["/github"], "api": ["/api/github"], "adminOnly": true, "sensitive": true }
  ],
  "scripts": { "install": "install.sh", "uninstall": "uninstall.sh" }
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `id` | oui | Minuscules, chiffres et tirets, commence par une lettre. Égal au nom du dossier. |
| `name` | oui | Nom affiché dans `/modules`. |
| `description` | oui | Une phrase factuelle : ce que fait le module. |
| `version` | oui | Chaîne libre, affichée telle quelle. |
| `logo` | oui | Nom d'un fichier `.svg` à la racine du module, sans sous-dossier. Seul fichier du module servi au navigateur, par `/modules-assets/<id>/<logo>`. |
| `requires.commands` | non | Commandes qui doivent exister (`command -v`) pour installer. |
| `requires.modules` | non | Modules qui doivent être installés avant celui-ci. Ils ne peuvent plus être désinstallés tant que celui-ci l'est. |
| `tabs` | oui | Au moins un onglet (voir ci-dessous). |
| `server` | non | Chemin relatif d'un hook serveur `.js` ou `.ts`, chargé par `serve.mjs`. |
| `scripts.install`, `scripts.uninstall` | non | Scripts bash relatifs au dossier du module. |
| `data` | non | Chemins supprimés à la désinstallation si l'administrateur coche « Supprimer aussi les données ». Deux bases seulement : `data/…`, le dossier de données du panel (`PANEL_DATA_DIR`, sinon `data/`), et `.cache/…`, le cache du panel. Tout autre chemin (`.env`, `modules`, `node_modules`…), un chemin absolu, la base elle-même ou un chemin qui en sort fait échouer la désinstallation. À la suppression, un dossier intermédiaire en lien symbolique qui sortirait de la base n'est pas suivi (chemin ignoré, signalé dans la sortie) et un lien symbolique est retiré comme lien, sa destination reste. |
| `env` | non | Variables d'environnement lues par le module : `{ name, default, description }`. Documentaire : reportez-les dans `.env.example`, section du module. L'administrateur les renseigne dans `.env`. |
| `logs` | non | Sources de l'onglet Journaux quand le module est installé : `{ id, label, unit, user? }` (journal systemd, `user: true` pour `--user-unit`) ou `{ id, label, file }` (fin d'un fichier). |
| `protectedUnits` | non | Unités que la page Services refuse de démarrer, arrêter ou redémarrer : `{ unit, reason? }`. `reason` s'affiche à la place du message par défaut, par exemple pour renvoyer vers la page du module. |

Dans `logs` et `protectedUnits`, `${VAR}` et `${VAR:-défaut}` prennent la valeur de l'environnement et `~/` en tête désigne le dossier personnel : `"file": "${ORVANE_MINECRAFT_DIR:-~/minecraft-server}/logs/latest.log"`.

Champs d'un onglet :

| Champ | Obligatoire | Rôle |
|---|---|---|
| `id` | oui | Identifiant du droit (page Utilisateurs). Un id déjà pris par le cœur est ignoré. |
| `label` | oui | Libellé du menu et de la page Utilisateurs. |
| `href` | oui | Lien du menu. |
| `pages` | oui | Préfixes de pages couverts par l'onglet. |
| `api` | non | Préfixes d'API couverts (commencent par `/api/`). |
| `icon` | non | Nom d'icône Lucide (`src/components/ui/lucide.ts`). Absent : le menu affiche le logo du module. |
| `adminOnly` | non | Réservé aux administrateurs, jamais attribuable. |
| `sensitive` | non | Signalé comme sensible dans la page Utilisateurs. |
| `exact` | non | `pages` ne couvre que le chemin exact, pas ses sous-chemins. |

`pages` et `api` servent trois fois : droits d'accès (`src/server/auth/auth-core.js`), réponse 404 quand le module n'est pas installé (`src/middleware.ts`), routage des WebSockets dans `serve.mjs`. Déclarez-y toutes les routes du module. Une route qu'aucun onglet ne revendique reste réservée aux administrateurs.

## Cycle de vie

1. **Build.** `src/integrations/modules.mjs` lit chaque `modules/*/module.json`, le valide et injecte ses pages comme routes Astro. Un manifeste invalide ou illisible fait échouer le build avec le nom du module et la liste des erreurs ; une route de module déjà prise par le cœur (`src/pages`) ou par un autre module aussi, segments dynamiques compris (`api/x/[id].ts` et `api/x/[nom].ts` reconnaissent les mêmes URL). Toutes les routes sont construites, module installé ou non.
2. **Exécution.** Le registre (`src/server/modules/registry.js`) relit les manifestes et `data/modules.json` (`{ "installed": ["github"] }`, fichier absent = aucun module installé) avec un cache d'une seconde. Un module non installé : ses pages répondent la page 404 du panel, ses API `404 {"error": "Module non installé : <nom>"}` (sous `/api`, le panel ne renvoie jamais de HTML : route inconnue `404 {"error": "Route inconnue"}`, méthode non gérée `405 {"error": "Méthode non autorisée"}` avec l'en-tête `Allow`), ses onglets n'apparaissent ni dans le menu (section Modules : modules triés par nom, onglets dans l'ordre du manifeste), ni dans la palette Ctrl+K, ni dans la page Utilisateurs.
3. **Installation** (`/modules`, ou `POST /api/modules {"action":"install","id":"<id>"}`). Le registre vérifie `requires`, lance `bash install.sh` (10 minutes maximum), puis ajoute l'id à `data/modules.json` si le script sort en 0. Sinon le module reste non installé et la page affiche la sortie du script. Le menu montre l'onglet au rechargement suivant ; aucun redémarrage.
4. **Désinstallation** (`{"action":"uninstall","id":"<id>","purge":true|false}`). Refusée si un module installé déclare celui-ci dans `requires.modules`. Le registre lance `uninstall.sh`, retire l'id de `data/modules.json`, puis supprime les chemins `data` si `purge` vaut `true`. Les droits d'un compte sur un module sont conservés à la désinstallation et s'appliquent de nouveau à la réinstallation : ils ne donnent rien tant que le module est désinstallé, et modifier le compte entre-temps ne les efface pas.

Les scripts reçoivent ces variables :

| Variable | Valeur |
|---|---|
| `MODULE_ID` | id du module |
| `MODULE_DIR` | chemin absolu de `modules/<id>` |
| `PANEL_ROOT` | racine du panel |
| `PANEL_DATA_DIR` | dossier de données du panel |

Ils héritent aussi de l'environnement du panel, `.env` compris.

Écrivez des scripts idempotents (une seconde exécution ne casse rien) avec `set -euo pipefail`. Ce qu'`install.sh` crée hors de `data`, et les caches que le module écrit en fonctionnant (`.cache/…`, `memo(…, { persist: true })` dans `.cache/memo/`), `uninstall.sh` le retire : un module désinstallé ne laisse rien. Ce qu'ils écrivent sur la sortie standard ou d'erreur s'affiche dans `/modules`.

## Ajouter un module

1. Créez `modules/<id>/` et `module.json` (copiez celui de `modules/github`).
2. Ajoutez `logo.svg`. Pour une marque, prenez le SVG de Simple Icons (`curl -fsSL https://cdn.jsdelivr.net/npm/simple-icons@<version>/icons/<nom>.svg`), posez sa couleur officielle avec `fill` sur `<svg>`, et indiquez source et licence (CC0) en commentaire XML. Un logotype horizontal est accepté : réglez son `viewBox` sur son cadre réel ; `ModuleLogo` fixe la hauteur et en déduit la largeur (sans déformation).
3. Écrivez les pages dans `modules/<id>/pages/` comme dans `src/pages/`, avec `export const prerender = false;` et `PanelLayout`.
4. Mettez le code serveur dans `server/`, le client dans `scripts/` (`<script>import '../scripts/<id>';</script>` dans la page), les tests dans `tests/`.
5. Pour migrer un onglet du cœur : `git mv` des fichiers, correction des imports, puis retirez son entrée de `CORE_TABS` (`src/server/auth/auth-core.js`) et de `CORE_NAV` (`src/layouts/nav.ts`).
6. Vérifiez : `npm test`, `npx astro check` (0 erreur), `ORVANE_OUT_DIR=/tmp/orvane-build npx astro build` (le log annonce « N route(s) de modules injectée(s) »).
7. Installez le module depuis `/modules` sur un panel de test, ouvrez ses pages, désinstallez-le, vérifiez le 404.

Un nouveau dossier de module demande un build : ses routes n'existent qu'après. Installer ou désinstaller un module déjà construit ne demande ni build ni redémarrage.

## Hook serveur

Pour ce qui ne passe pas par Astro (WebSocket, proxy HTTP), déclarez `"server": "server/hooks.js"`. `serve.mjs` charge ce fichier au démarrage pour chaque module présent, installé ou non, et appelle :

```js
export function attach({ server, guarded, isInstalled }) {
  guarded(server).on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/api/<id>/ws') || !isInstalled()) return;
    // prise en charge de la connexion
  });
}
```

- `server` : le `http.Server` du panel.
- `guarded(server)` : même serveur, mais chaque `upgrade` passe d'abord le contrôle d'accès (session, onglet autorisé, même origine).
- `isInstalled()` : relit l'état. Le hook ignore toute requête tant qu'il renvoie `false`. Une tâche de fond (minuteur, planificateur) le relit à chaque déclenchement et ne fait rien tant qu'il est faux.

`attach` est facultatif. Pour intercepter des requêtes HTTP AVANT le handler d'Astro (relais, proxy), exportez `request` :

```js
export function request(req, res) {
  if (!req.url.startsWith('/<id>/')) return false;   // pas pour nous : la requête continue vers Astro
  // répondre à res
  return true;                                        // prise en charge
}
```

`serve.mjs` appelle `request(req, res)` de chaque hook, dans l'ordre de chargement, uniquement pour les modules installés (`src/server/modules/request-hooks.js`) : un module désinstallé n'intercepte rien, sans que le hook ait à le vérifier. Le premier qui renvoie `true` gagne. `request` est synchrone ; une exception répond 500. Le contrôle d'accès n'est pas appliqué : c'est au hook de décider ce qu'il expose.

Deux exports facultatifs servent au redémarrage différé (`npm run deploy` dépose `.cache/restart-requested`, le vrai panel s'arrête dès que plus rien n'est en cours) :

```js
export const busy = () => tourEnCours();   // vrai : serve.mjs repousse l'arrêt et réessaie 2 s plus tard
export function detach() { arreterMinuteurs(); }   // appelé juste avant l'arrêt du process
```

`attach` peut être `async` : `serve.mjs` attend sa fin avant de charger le hook suivant. Une erreur dans `busy()` ou `detach()` s'affiche dans le journal et n'empêche pas l'arrêt.

Un upgrade vers un chemin qu'aucun hook ne prend en charge est fermé, sauf s'il appartient à un module installé. Node charge le hook sans Vite : extension `.js` ou `.ts` obligatoire dans ses imports relatifs (`.ts` par suppression des types). Une erreur au chargement s'affiche dans le journal ; le panel démarre quand même.

## Pastille du menu

`modules/<id>/server/nav.ts` peut exporter `badge(): number` (ou `Promise<number>`), par exemple un nombre de messages non lus. `buildNav` (`src/layouts/nav.ts`) l'appelle à chaque rendu du menu, pour les modules installés et visibles seulement ; 0 masque la pastille, une erreur aussi. La pastille porte `data-badge="<id>"` : un script client peut la mettre à jour en direct. Gardez `badge()` rapide : lecture en mémoire ou en base locale, sans appel réseau.

## Tests

`vitest.config.ts` inclut `modules/*/tests/**/*.test.ts`. `tests/setup.ts` donne à chaque fichier de test un `PANEL_DATA_DIR` temporaire. Le registre se teste avec `createRegistry({ root, dataDir })` sur un dossier temporaire (voir `tests/modules/registry.test.ts`).
