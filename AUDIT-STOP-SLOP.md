# Audit stop-slop du panel Orvane

Date : 2026-11-03. Audit en lecture seule, onglet par onglet. Aucun fichier du projet n'a été modifié.
Critères : skill `stop-slop` (SKILL.md, references/phrases.md, references/structures.md), appliqués au français.
Périmètre : les 11 onglets de base, le layout commun, les pages connexion et erreur, et les 8 modules (Applications, Claude, Discord, Docker, GitHub, Mail, Minecraft, Tailscale).
Hors périmètre : README.md, docs/ (dont docs/conception), tests, node_modules, dist, lockfiles.

## Résumé

437 relevés : **124 hauts**, **147 moyens**, **166 bas**.

| Catégorie (regroupée) | Relevés |
|---|---|---|
| voix passive | 181 |
| adverbe | 70 |
| tiret cadratin | 64 |
| autres (jargon, vague, énumération, interrogatif, formule…) | 48 |
| extrême paresseux | 39 |
| fausse agentivité | 22 |
| contraste binaire | 13 |

Onglets les plus touchés : Minecraft (63), Claude (49), Utilisateurs (33), Discord (22), Réseau (20).

## Corrections (2026-11-03)

Décision : tout corriger. Résultat : **422 ✅ corrigés**, **15 ⏭️ ignorés**, **0 ⚠️**. Deuxième passage : les 4 ⚠️ corrigés (valeurs vides « - » partout, test docker aligné), fin de #164, et suppression des derniers cadratins des commentaires (apps, docker, minecraft, docs/AUDIT.md) (raisons dans la colonne Statut).
Vérification : `vitest` 266/266 tests verts (identique à avant), `astro check` 0 erreur.
Les 4 anciens ⚠️ (valeurs vides `—` comparées par du code ou un test) sont corrigés au 2e passage.

## Limites

- Les auditeurs ont repéré les chaînes par grep ciblé, sans relire chaque fichier ligne à ligne. Ils ont pu manquer quelques relevés isolés.
- Quelques numéros de ligne sont approximatifs (préfixe `~`, surtout dans minecraft/proprietes.astro).
- Certaines corrections font perdre de l'information, par exemple quand elles retirent « définitivement » d'un avertissement de suppression ou un élément d'une liste. Il faut les relire au moment de corriger. Un avertissement de suppression garde le sens « irréversible ».
- Les relevés de cadratin qui sont des valeurs vides affichées (`—` dans une cellule) sont en sévérité basse.
- Les relevés `M/` désignent `modules/minecraft/`.

## Relevés par onglet
Note : les fichiers de ce périmètre contiennent presque aucun commentaire de code. Les textes d'UI sont globalement propres. Les relevés portent surtout sur les « — » utilisés comme valeur vide.

## Commun : layout et navigation (src/layouts, src/components/ui, src/scripts/layout, src/scripts/ui)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 1 |  src/scripts/layout/shortcuts.ts:30 | extrême paresseux | `'Partout dans le panel'` | « Partout » vague pour un titre de groupe | `'Sur toutes les pages'` | moyenne | ✅ |

## Onglet : Vue d'ensemble (/)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 2 |  src/pages/index.astro:69,75,81,85,86 (5 occurrences) | tiret cadratin | `'—'` | Cadratin affiché comme valeur vide | tiret simple `-` ou `n/a` | basse | ✅ |

## Onglet : Performances (/performance)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 3 |  src/pages/performance.astro:31,36,37,42,43,44,45,48,49,50,51,54,55,56,57,62,63,64,65,112,117,137,138,139,158,159,183,184,261,262,320 (31 lignes) | tiret cadratin | `value: '—'`, `<dd id="disk-read">—</dd>` | Cadratin affiché comme valeur vide (UI) | tiret simple `-` ou `n/a` | basse | ✅ |

## Onglet : Processus (/processus)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 4 |  src/pages/processus.astro:35,36,37 (3 occurrences) | tiret cadratin | `<strong id="pm-cpu">—</strong>` | Cadratin affiché comme valeur vide | tiret simple `-` ou `n/a` | basse | ✅ |
| 5 |  src/pages/processus.astro:316 | adverbe / adjectif d'emphase | `Nouvelle tentative automatique toutes les 2 secondes.` | « automatique » superflu | `Nouvelle tentative toutes les 2 secondes.` | basse | ✅ |
| 6 |  src/pages/processus.astro:186,208 | voix passive (elliptique) | `` `${what} copié.` ``, `'Signal envoyé.'` | Participe passé sans sujet. Forme usuelle de toast, sens technique net | `` `Copie de ${what} faite.` `` ou laisser tel quel | basse | ⏭️ forme usuelle de toast, sens net |

## Onglet : Services (/services)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 7 |  src/pages/services.astro:155 | voix passive | `'Les applications qui en dépendent seront interrompues.'` | « seront interrompues » : passif futur, acteur absent | `'Les applications qui en dépendent s’arrêteront.'` | haute | ✅ |
| 8 |  src/pages/services.astro:168 | voix passive (elliptique) | `` `${verb} : « ${unit} » demandé.` `` | Participe passé sans sujet | `` `Demande envoyée : ${verb.toLowerCase()} « ${unit} ».` `` | basse | ✅ |
| 9 |  src/pages/services.astro:92,118 (2 occurrences) | tiret cadratin | `'—'` | Cadratin affiché comme valeur vide | tiret simple `-` ou `n/a` | basse | ✅ |

## Onglet : Journaux (/logs)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 10 |  src/pages/logs.astro:131 | adverbe / adjectif d'emphase | `'Défilement automatique en bas'` | « automatique » : sens technique, équivalent possible | `'Suivre les nouvelles lignes'` | basse | ✅ |

## Onglet : Fichiers (/fichiers)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 11 |  src/scripts/pages/fichiers.ts:322 | adverbe | `Supprimer définitivement ${label} ?` | adverbe (« définitivement »), redondant avec le message suivant | `Supprimer ${label} ?` | moyenne | ✅ |
| 12 |  src/scripts/pages/fichiers.ts:323 | vague / contraste léger | `Cette action est irréversible (pas de corbeille).` | formule générique, « Cette action » | `Pas de corbeille : le fichier disparaît.` | basse | ✅ |
| 13 |  src/scripts/pages/fichiers.ts:515 | voix passive | `Fichier long : seule la fin est affichée.` | passif | `Le panel affiche seulement la fin de ce long fichier.` | moyenne | ✅ |
| 14 |  src/scripts/pages/fichiers.ts:118 | énumération / ton | `Glisse des fichiers ici ou utilise Nouveau et Téléverser.` | tutoiement, incohérent avec le « vous » ailleurs (l.479, l.513) | `Glissez des fichiers ici ou utilisez Nouveau et Téléverser.` | basse | ✅ |
| 15 |  src/pages/api/files/upload.ts:54 | voix passive | `nom de fichier refusé` | passif elliptique | `le panel refuse ce nom de fichier` | basse | ✅ |
| 16 |  src/pages/api/files/copy.ts:28 ; move.ts:28 ; delete.ts:26 | voix passive | `copie refusée` / `déplacement refusé` / `suppression refusée` | passif nominal répété (3 occurrences) | `droits insuffisants pour copier` / `…déplacer` / `…supprimer` | basse | ✅ |
| 17 |  src/pages/api/files/read.ts:66 | fausse agentivité | `Lecture refusée : le panel n’a pas les droits sur ce fichier.` | « Lecture refusée » passif ; seconde partie suffit | `Le panel n’a pas les droits de lecture sur ce fichier.` | basse | ✅ |

## Onglet : Terminal (/terminal)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 18 |  src/pages/terminal.astro:50 | tiret cadratin | `<span id="term-size" class="mono">—</span>` | « — » comme valeur vide affichée | tiret simple `-` ou `n/a` | basse | ✅ |
| 19 |  src/pages/terminal.astro:251 | voix passive / énumération | `Collage refusé : autorisez l’accès au presse-papiers ou utilisez Ctrl+Maj+V.` | « refusé » passif | `Le navigateur bloque le collage : autorisez le presse-papiers ou utilisez Ctrl+Maj+V.` | moyenne | ✅ |
| 20 |  src/pages/terminal.astro:243 | voix passive | `Copie refusée par le navigateur.` | passif | `Le navigateur refuse la copie.` | moyenne | ✅ |
| 21 |  src/pages/terminal.astro:185 | voix passive | `session fermée` (message de repli) | passif | `le serveur a fermé la session` | basse | ✅ |
| 22 |  src/server/shell/ssh-shell.js:74 | voix passive | `session SSH fermée` | passif | `le serveur SSH a fermé la session` | basse | ✅ |
| 23 |  src/server/shell/ssh-shell.js:102 | voix passive | `Session introuvable ou terminée` | passif | `Session introuvable ou close` (acceptable) | basse | ✅ |
| 24 |  src/pages/terminal.astro:179 | commentaire | `// ?cwd=<dossier> (bouton Console d'une application) : on s'y place, chemin cité pour le shell.` | « on » sans acteur ; sinon correct | `// ?cwd=<dossier> (bouton Console d'une application) : le shell s'y place ; le chemin est cité.` | basse | ✅ |

## Onglet : Réseau (/reseau)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 25 |  src/server/network/firewall.ts:22,25,28,31,34 | tiret cadratin | `Chaîne Tailscale — c’est par elle que vous atteignez ce panel.` (5 occurrences, affichées en infobulle `protectedReason`) | cadratin dans texte UI ; 3 phrases du type « X — la supprimer coupe… » | `Chaîne Tailscale : c’est par elle que vous atteignez ce panel.` (idem pour les 4 autres, remplacer « — » par « : ») | haute | ✅ |
| 26 |  src/server/network/firewall.ts:28 | ton | `SSH — la supprimer te coupe l’accès à la machine.` | tutoiement incohérent avec « vous » (l.22) | `SSH : la supprimer vous coupe l’accès à la machine.` | moyenne | ✅ |
| 27 |  src/server/network/firewall.ts:34 | vague / conditionnel | `Refus final — la supprimer ouvrirait tous les ports non filtrés.` | cadratin + « tous » | `Refus final : la supprimer ouvre les ports non filtrés.` | haute | ✅ |
| 28 |  src/server/network/firewall.ts:125 | tiret cadratin | `Règle introuvable — la liste a peut-être changé, recharge la page.` | cadratin ; tutoiement ; hésitation | `Règle introuvable : la liste a changé. Rechargez la page.` | haute | ✅ |
| 29 |  src/pages/reseau.astro:72 | voix passive | `Elles seront perdues au prochain redémarrage du serveur.` | futur passif | `Le prochain redémarrage du serveur les efface.` | haute | ✅ |
| 30 |  src/pages/reseau.astro:72 | voix passive | `Règles du pare-feu non enregistrées.` | participe passif | `Le pare-feu a des règles non enregistrées.` | basse | ✅ |
| 31 |  src/pages/reseau.astro:258 | extrême paresseux | `Tout ce qui n’est pas autorisé est bloqué.` | « Tout » vague, passif | `Le pare-feu bloque tout port non autorisé.` | haute | ✅ |
| 32 |  src/pages/reseau.astro:261 | extrême / vague | `placées après « Refuser », elles ne s’appliquent jamais.` | « jamais », passif (« placées ») | `elles suivent « Refuser » et n’ont aucun effet.` | moyenne | ✅ |
| 33 |  src/pages/reseau.astro:185 | voix passive | `Le processus n’est affiché que pour les programmes lancés par le compte du panel.` | double passif | `Le panel affiche le processus des seuls programmes qu’il a lancés.` | haute | ✅ |
| 34 |  src/pages/reseau.astro:140 | fausse agentivité | `Le système n’a remonté aucune carte réseau.` | le système « remonte » | `Aucune carte réseau détectée.` | moyenne | ✅ |
| 35 |  src/pages/reseau.astro:226 | voix passive | `Aucune règle de pare-feu n’a été remontée.` | passif | `Aucune règle de pare-feu trouvée.` | moyenne | ✅ |
| 36 |  src/pages/reseau.astro:196 | voix passive | `Aucun port en écoute remonté.` | participe passif, doublon du titre | `Le système ne signale aucun port ouvert.` | basse | ✅ |
| 37 |  src/pages/reseau.astro:299 | voix passive | `La table de routage n’a pas pu être lue.` | passif | `Le panel n’a pas pu lire la table de routage.` | moyenne | ✅ |
| 38 |  src/pages/reseau.astro:292 | adverbe / hypothèse | `Les modifier ici risquerait de couper l’accès au serveur.` | conditionnel flou ; « fournis par » passif | `Votre hébergeur fournit ces réglages (DHCP). Les modifier ici peut couper l’accès au serveur.` | moyenne | ✅ |
| 39 |  src/pages/reseau.astro:100 | énumération | `Toutes interfaces, une mesure par seconde. Envoi en pointillé.` | « Toutes » vague | `Somme des interfaces, une mesure par seconde. Envoi en pointillé.` | basse | ✅ |
| 40 |  src/pages/reseau.astro:56,113,129,181,214,246,247,249,293,294,295,309,310 | tiret cadratin | `'—'` (13 occurrences, valeur vide affichée) | cadratin comme placeholder de donnée | tiret simple `-` ou `n/a` | basse | ✅ |
| 41 |  src/pages/reseau.astro:401 | formule / impératif | `Règle insérée en position ${data.position}. Pensez à enregistrer.` | « insérée » passif | `Règle en position ${data.position}. Enregistrez-la pour qu’elle survive au redémarrage.` | moyenne | ✅ |
| 42 |  src/pages/reseau.astro:420 | voix passive / formulation | `Elles survivront alors au redémarrage.` | « alors » rempli | `Elles survivront au redémarrage.` | basse | ✅ |
| 43 |  src/pages/reseau.astro:283 | question rhétorique UI | `Pourquoi cette ouverture ?` | placeholder qui commence par un mot interrogatif | `Motif de l’ouverture` | basse | ✅ |
| 44 |  src/server/network/firewall.ts:114 | voix passive | `ajoutée depuis le panel` | participe passif (commentaire iptables visible) | `ajout via le panel` | basse | ✅ |

## Onglet : Magasin (/modules)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 45 |  src/pages/modules.astro:79 | voix passive | `le panel refuse tout ce qui n’a pas été publié depuis le serveur principal` | passif + « tout ce qui » vague | `le panel refuse tout paquet que le serveur principal n’a pas publié` | haute | ✅ |
| 46 |  src/pages/modules.astro:79 | fausse agentivité / vague | `Chaque paquet est signé` | passif + « Chaque » | `Le serveur principal signe chaque paquet.` | haute | ✅ |
| 47 |  src/pages/modules.astro:59 | adverbe | `Visible sur ce serveur seulement.` | adverbe « seulement » | `Visible sur ce serveur uniquement.` (ou `Réservé à ce serveur.`) | moyenne | ✅ |
| 48 |  src/pages/modules.astro:65 | extrême paresseux | `publié : {m.published ?? 'jamais'}` | « jamais » comme valeur vide | `publié : non` | basse | ✅ |
| 49 |  src/pages/modules.astro:19 | voix passive | `Le panel se reconstruit pour ajouter ou retirer des onglets.` | verbe pronominal à sens passif | `Le panel se reconstruit` : acceptable ; option `Le panel se reconstruit (ajout ou retrait d’onglets). Rechargez dans une minute.` | basse | ⏭️ verbe pronominal acceptable, deja propre |
| 50 |  src/scripts/pages/modules.ts:21 | voix passive / fausse agentivité | `« ${n} » va être téléchargé depuis le Magasin, vérifié, puis son script d’installation s’exécutera sur ce serveur.` | double passif, énumération en trois étapes | `Le panel télécharge « ${n} » depuis le Magasin, le vérifie, puis exécute son script d’installation sur ce serveur.` | haute | ✅ |
| 51 |  src/scripts/pages/modules.ts:22 | voix passive | `ses réglages et données sont gardés` | passif | `le panel garde ses réglages et données` | haute | ✅ |
| 52 |  src/scripts/pages/modules.ts:23 | voix passive | `ses fichiers seront retirés du panel` | passif | `le panel supprime ses fichiers` | haute | ✅ |
| 53 |  src/scripts/pages/modules.ts:24 | voix passive | `sera signée et proposée à tous les panels` | passif + « tous » | `Le panel signe la version de « ${n} » présente dans les sources et la propose aux autres panels.` | haute | ✅ |
| 54 |  src/scripts/pages/modules.ts:19 | adverbe | `Le panel se reconstruira ensuite et redémarrera (environ une minute).` | « ensuite » | `Le panel se reconstruit et redémarre (environ une minute).` | basse | ✅ |
| 55 |  src/pages/api/modules.ts:44 | formule | `L’opération a échoué.` | vague, aucun détail | `L’opération a échoué : consultez le journal du panel.` | basse | ✅ |

## Onglet : Utilisateurs (/acces)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 56 |  src/scripts/pages/acces.ts:91 | extrême paresseux / passif | `Notez ce mot de passe maintenant : il ne sera plus jamais affiché.` | « jamais », passif, « maintenant » | `Notez ce mot de passe : le panel ne l’affichera plus.` | haute | ✅ |
| 57 |  src/pages/acces.astro:122 | adverbe | `chaque case est enregistrée tout de suite` | passif + « chaque » + « tout de suite » | `le panel enregistre chaque case à l’instant` → mieux : `cochez un onglet pour l’ouvrir à un utilisateur ; le panel enregistre la case aussitôt.` | haute | ✅ |
| 58 |  src/pages/acces.astro:57 | voix passive | `La protection est désactivée.` | passif | `La protection est inactive.` | moyenne | ✅ |
| 59 |  src/pages/acces.astro:64 | adverbe | `n’ont encore aucun droit` | « encore » + « aucun » | `n’ont aucun droit pour l’instant` | basse | ✅ |
| 60 |  src/pages/acces.astro:115 | contraste binaire | `ni la page, ni les fonctions qu’elle appelle ne lui sont accessibles autrement` | contraste en négation, long | `il ne peut ouvrir ni la page ni ses fonctions sans cette attribution.` | haute | ✅ |
| 61 |  src/pages/acces.astro:115 | voix passive | `Les onglets marqués « sensible » donnent la main sur la machine.` | « marqués » passif léger | `Les onglets « sensible » donnent la main sur la machine.` | moyenne | ✅ |
| 62 |  src/pages/acces.astro:122 | passif | `{sensitiveCount} onglets sont marqués sensible : ils donnent la main sur la machine.` | passif | `{sensitiveCount} onglets « sensible » donnent la main sur la machine.` | moyenne | ✅ |
| 63 |  src/pages/acces.astro:187 | adverbe / extrême | `ajoutez comme utilisateurs de test chaque adresse Gmail qui doit se connecter (la vôtre comprise)` | « chaque » vague, parenthèse | `ajoutez comme utilisateurs de test les adresses Gmail autorisées à se connecter, la vôtre incluse` | basse | ✅ |
| 64 |  src/pages/acces.astro:189 | adverbe | `ajoutez exactement :` | adverbe « exactement » | `ajoutez :` | haute | ✅ |
| 65 |  src/pages/acces.astro:190 | énumération en trois | `enregistrez, puis testez` / `Copiez l’ID client et le code secret… enregistrez, puis testez` | trois actions | `Copiez l’ID client et le code secret dans le formulaire, puis enregistrez et testez.` | basse | ✅ |
| 66 |  src/pages/acces.astro:192 | contraste binaire | `le bouton fonctionne donc par le domaine public, pas par l’adresse Tailscale` | « X, pas Y » | `le bouton passe par le domaine public ; l’adresse Tailscale ne le supporte pas.` | haute | ✅ |
| 67 |  src/pages/acces.astro:192 | fausse agentivité / vague | `Un compte Google inconnu n’obtient rien : il apparaît ici « en attente » et vous décidez.` | « n’obtient rien » vague, « rien » extrême | `Un compte Google inconnu apparaît ici « en attente » ; vous décidez de son accès.` | moyenne | ✅ |
| 68 |  src/pages/acces.astro:200 | extrême / passif | `Désactivée : le panel est ouvert comme avant. Activée : écran de connexion, onglets filtrés par compte, terminal et Claude compris.` | passifs (« ouvert », « filtrés »), énumération | `Désactivée : le panel reste ouvert. Activée : écran de connexion et onglets limités par compte, terminal et Claude inclus.` | moyenne | ✅ |
| 69 |  src/pages/acces.astro:206 | phrase sèche | `Obligatoire.` | fragment dramatique | supprimer, ou `Ce compte est requis.` | basse | ✅ |
| 70 |  src/pages/acces.astro:219 | passif | `Les sites publiés par le relais… et les applications créées restent publics.` | participes passifs | `Les sites du relais (par exemple /blog ou /docs) et les applications restent publics.` | basse | ✅ |
| 71 |  src/pages/acces.astro:226 | tiret / adverbe | `la protection se désactive dès la requête suivante.` | pronominal passif ; « Si vous êtes enfermé dehors » imagé | `Verrouillé hors du panel ? En SSH, supprimez data/auth.json ; la protection s’arrête à la requête suivante.` | moyenne | ✅ |
| 72 |  src/scripts/pages/acces.ts:132 | voix passive | `Le compte sera aussi désactivé et ses sessions fermées.` | passif + adverbe « aussi » | `Le panel désactivera le compte et fermera ses sessions.` | haute | ✅ |
| 73 |  src/scripts/pages/acces.ts:132 | contraste léger | `Ce compte ne verra plus que les onglets que vous lui attribuez.` | « ne… que » | `Ce compte ne verra que les onglets que vous lui attribuez.` | basse | ✅ |
| 74 |  src/scripts/pages/acces.ts:134 | énumération | `tous les onglets (terminal, fichiers, Docker…)` | « tous » + énumération ouverte | `Ce compte verra les onglets terminal et fichiers et pourra gérer les accès.` | basse | ✅ |
| 75 |  src/scripts/pages/acces.ts:136 | voix passive | `Ses sessions ouvertes seront fermées et cette personne ne pourra plus entrer.` | passif | `Le panel fermera ses sessions ouvertes ; cette personne ne pourra plus entrer.` | haute | ✅ |
| 76 |  src/scripts/pages/acces.ts:177 | formule | `Connexion avec Google : mettez l’adresse Gmail comme identifiant, la personne sera reconnue à sa première connexion.` | passif | `…, le panel reconnaîtra la personne à sa première connexion.` | moyenne | ✅ |
| 77 |  src/scripts/pages/acces.ts:193 | énumération | `Ce compte verra tous les onglets, terminal et fichiers compris, et pourra gérer les accès.` | « tous » | `Ce compte verra tous les onglets, dont terminal et fichiers, et gérera les accès.` | basse | ✅ |
| 78 |  src/scripts/pages/acces.ts:214 | passif | `Les sessions ouvertes de ce compte seront fermées.` | passif | `Le panel fermera les sessions ouvertes de ce compte.` | haute | ✅ |
| 79 |  src/scripts/pages/acces.ts:240 | fausse agentivité | `Claude de ${u.name} tourne sous le compte Linux « … », enfermé dans /home/…` | « enfermé » passif | `Claude de ${u.name} tourne sous le compte Linux « … » et reste limité à /home/…` | moyenne | ✅ |
| 80 |  src/scripts/pages/acces.ts:241 | contraste binaire | `Sans compte Linux, Claude ne fait que consulter. Lié à un compte, il écrit dans /home/<compte>… et rien ailleurs.` | « ne… que », « rien ailleurs » | `Sans compte Linux, Claude consulte seulement. Lié à un compte, il écrit dans /home/<compte> (projets, commandes, npm, git).` | moyenne | ✅ |
| 81 |  src/scripts/pages/acces.ts:292 | passif | `Ses sessions ouvertes seront fermées ; elle ou il pourra se reconnecter.` | passif | `Le panel fermera ses sessions ouvertes ; la personne pourra se reconnecter.` | haute | ✅ |
| 82 |  src/scripts/pages/acces.ts:297 | passif | `Le compte et ses sessions sont supprimés. Un compte Google pourra refaire une demande d’accès.` | passif | `Le panel supprime le compte et ses sessions. Un compte Google pourra refaire une demande.` | haute | ✅ |
| 83 |  src/scripts/pages/acces.ts:297 | extrême | `Ce compte a accès à tout le panel.` | « tout » | `Ce compte accède à tous les onglets du panel.` | basse | ✅ |
| 84 |  src/scripts/pages/acces.ts:317 | passif + contraste | `Le compte sera bloqué : cette personne ne pourra pas entrer.` | passif | `Le panel bloquera ce compte ; cette personne ne pourra pas entrer.` | haute | ✅ |
| 85 |  src/scripts/pages/acces.ts:401 | adverbe / passif | `Dès maintenant, le panel demande une connexion. Vous allez être déconnecté…` | « Dès maintenant », passif « être déconnecté » | `Le panel demande désormais une connexion. Il va vous déconnecter ; reconnectez-vous avec le compte de secours (identifiant et mot de passe) ou Google.` | haute | ✅ |
| 86 |  src/scripts/pages/acces.ts:401 | formule | `Si vous êtes enfermé dehors : supprimez le fichier data/auth.json en SSH.` | tournure imagée | `Verrouillé hors du panel ? Supprimez data/auth.json en SSH.` | moyenne | ✅ |
| 87 |  src/scripts/pages/acces.ts:402 | extrême | `redeviendra ouvert à toute personne qui l’atteint, sans connexion.` | « toute personne » | `Le panel s’ouvrira à quiconque l’atteint, sans connexion.` | moyenne | ✅ |
| 88 |  src/pages/api/admin/auth.ts:32 ; src/scripts/pages/acces.ts:15 | formule | `L’opération a échoué. Consultez le journal du panel.` | message vague (2 occurrences) | `Échec de l’opération. Détails dans le journal du panel.` | basse | ✅ |

## Onglet : Paramètres (/parametres)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 89 |  src/pages/parametres.astro:26 | voix passive | `Mémorisé sur cet appareil.` | participe passif | `Le panel le mémorise sur cet appareil.` | moyenne | ✅ |
| 90 |  src/pages/parametres.astro:26 | adverbe (libellé) | `Automatique : réduit aux icônes sous 1000 px de large.` | « Automatique » libellé de l’option, sens technique | conserver (basse) ; option : `Auto` | basse | ⏭️ libelle d'option au sens technique |

## Onglet : Connexion et pages d'erreur (/connexion, /portail, /404, /500, API auth)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 91 |  src/pages/connexion.astro:79 | voix passive | `Vous pourrez vous connecter dès qu’elle sera acceptée.` | passif | `Vous pourrez vous connecter dès que l’administrateur l’aura acceptée.` | haute | ✅ |
| 92 |  src/pages/connexion.astro:104 | voix passive / adverbe | `aucun onglet ne vous a encore été donné.` | passif + « encore » + « aucun » | `l’administrateur ne vous a donné aucun onglet.` | haute | ✅ |
| 93 |  src/pages/connexion.astro:104 | contraste binaire | `Votre compte est actif mais aucun onglet…` | « X mais Y » | `Votre compte est actif, sans onglet attribué.` | moyenne | ✅ |
| 94 |  src/pages/connexion.astro:35 (ERREURS) | voix passive | `Connexion Google refusée.` / `Compte bloqué.` | participes passifs elliptiques | `Google a refusé la connexion.` / `Le panel a bloqué ce compte.` | moyenne | ✅ |
| 95 |  src/pages/connexion.astro:35 (ERREURS) | formule | `Trop de tentatives, réessayez plus tard.` | « plus tard » vague | `Trop de tentatives : réessayez dans quelques minutes.` | basse | ✅ |
| 96 |  src/pages/connexion.astro:97 | adverbe | `si nécessaire` | `Demandez à un administrateur de vous l’attribuer si nécessaire.` | `Demandez-le à un administrateur.` | basse | ✅ |
| 97 |  src/pages/connexion.astro:100 | contraste léger | `Cette page n’existe pas ou est réservée aux administrateurs.` | passif | `Cette page n’existe pas ou seuls les administrateurs y accèdent.` | basse | ✅ |
| 98 |  src/pages/404.astro:10 | fausse agentivité | `L’adresse … ne correspond à aucune page du panel.` | « aucune » correct, mais l’adresse « correspond » | `Le panel n’a aucune page à l’adresse …` | basse | ✅ |
| 99 |  src/pages/500.astro:19 | fausse agentivité / passif / hésitation | `Cette page n’a pas pu s’afficher. Réessayez dans quelques secondes : si le panel vient d’être mis à jour, il est peut-être en train de redémarrer.` | « n’a pas pu s’afficher » (objet agit), passif, conditionnel | `Le panel n’a pas pu afficher cette page. Réessayez dans quelques secondes : une mise à jour récente peut expliquer un redémarrage.` | haute | ✅ |
| 100 |  src/pages/500.astro:19 | extrême | `Une erreur est survenue` | passif-like, générique | `Erreur du panel` | moyenne | ✅ |
| 101 |  src/pages/portail.astro:15 | interrogatif | `Où aller ?` | titre de page qui commence par un mot interrogatif (question d'UI réelle) | conserver ; option `Choisir une destination` | basse | ⏭️ vraie question d'UI, titre clair |
| 102 |  src/scripts/pages/connexion.ts:4 ; src/pages/api/auth/login.ts:22 | formule | `La connexion a échoué. Réessayez, ou consultez le journal du panel.` | message vague, double directive | `Connexion impossible. Réessayez ou consultez le journal du panel.` | basse | ✅ |

## Onglet : Design (/design)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 103 |  src/pages/design.astro:132 | extrême paresseux / contraste | `Toujours une variable de tokens.css : jamais de couleur hexadécimale ni de taille en pixels dans une page.` | « Toujours »/« jamais », contraste « X : jamais Y » | `Utilisez une variable de tokens.css à la place d’une couleur hexadécimale ou d’une taille en pixels.` | haute | ✅ |
| 104 |  src/pages/design.astro:140 | extrême paresseux | `Jamais pour décorer une icône.` | « Jamais » vague | `Ne l’utilisez pas pour décorer une icône.` | haute | ✅ |
| 105 |  src/pages/design.astro:140 | énumération en trois | `(succès, avertissement, erreur, information)` | énumération de quatre, liste de référence | conserver (liste exacte des tons) | basse | ⏭️ liste de reference exacte des tons |
| 106 |  src/pages/design.astro:287 | extrême paresseux | `Jamais de zone blanche : on explique, on propose l’action suivante.` | « Jamais » + « on » | `Évitez les zones blanches : expliquez la situation et proposez l’action suivante.` | haute | ✅ |
| 107 |  src/pages/design.astro:304 | contraste binaire | `Spinner : actions courtes uniquement ; squelette pour les contenus.` | adverbe « uniquement » ; mêmes éléments | `Spinner pour les actions courtes ; squelette pour les contenus.` | moyenne | ✅ |
| 108 |  src/pages/design.astro:315 | adverbe | `Redémarrage automatique` (exemple de libellé) | adverbe dans libellé, sens technique | conserver (basse) ; option `Redémarrage auto` | basse | ⏭️ libelle d'exemple au sens technique |
| 109 |  src/pages/design.astro:388 | voix passive | `Cette action est définitive.` | formule générique, « Cette action » | `Impossible à annuler.` | basse | ✅ |
| 110 |  src/pages/design.astro:380 | adverbe | `Les sites seront indisponibles quelques secondes.` | passif léger | `Les sites restent indisponibles quelques secondes.` | basse | ✅ |
| 111 |  src/pages/design.astro:210 | voix passive | `Le choix est mémorisé pendant l’actualisation automatique.` | passif + adverbe | `La page conserve le choix pendant l’actualisation.` | moyenne | ✅ |
| 112 |  src/pages/design.astro:225 | méta-commentaire | `Cette page enregistre deux commandes : essayez-les.` (l.329) | « enregistre » correct, impératif « essayez-les » | `Cette page enregistre deux commandes d’exemple.` | basse | ✅ |
| 113 |  src/pages/design.astro:235 | tiret cadratin | `: '—'` | valeur vide affichée | tiret simple `-` ou `n/a` | basse | ✅ |
| 114 |  src/pages/design.astro:106 | commentaire | `// seulement sur cette page` | « seulement » adverbe | `// uniquement sur cette page` ou supprimer | basse | ✅ |
| 115 |  src/pages/design.astro:158 | voix passive | `Inter Variable auto-hébergée` | participe passif | `Police Inter Variable, hébergée par le panel` (acceptable) | basse | ✅ |
Un seul sous-onglet dans module.json (`claude`, route `/claude`). Relevé ciblé par grep (cadratins, adverbes, passifs, interrogatifs, extrêmes), pas de lecture intégrale.

## Onglet : Claude (/claude)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 116 |  modules/claude/scripts/conv-menu.ts:29 | Passif + adverbe | `sera supprimée définitivement, avec ses fichiers.` / `La réponse en cours sera arrêtée.` | Deux passifs futurs, adverbe « définitivement » | `Claude supprime « X » et ses fichiers sans retour possible.` / `Claude arrête la réponse en cours.` | haute | ✅ |
| 117 |  modules/claude/scripts/header.ts:111 | Passif + adverbe | `sera supprimée définitivement, avec ses fichiers.` / `La réponse en cours sera arrêtée.` | Idem conv-menu.ts:29 | Même correction | haute | ✅ |
| 118 |  modules/claude/scripts/menus/permission.ts:16 | Adverbe | `Accepter toutes les modifications automatiquement` | « automatiquement » | `Accepter toutes les modifications` (ou `Accepter les modifications sans demander`) | haute | ✅ |
| 119 |  modules/claude/scripts/settings.ts:235 | Adverbe | `il répond directement : c’est plus rapide et cela consomme moins de votre limite d’utilisation.` | « directement » ; « Désactivée » sans sujet clair | `Désactivez la réflexion : Claude répond plus vite et consomme moins de votre limite d’utilisation.` | haute | ✅ |
| 120 |  modules/claude/scripts/views.ts:123 | Adverbe | `Déposez des fichiers ou ajoutez-les manuellement` | « manuellement » | `Déposez des fichiers ou ajoutez-les un à un` | haute | ✅ |
| 121 |  modules/claude/scripts/view-scheduled.ts:102,220 | Adverbe | `Configurer manuellement` | « manuellement » (2 occurrences, bouton et menu) | `Configurer une tâche` | haute | ✅ |
| 122 |  modules/claude/scripts/view-scheduled.ts:91 ; modules/claude/scripts/sidebar.ts:66 ; modules/claude/scripts/view-projects.ts:46 | Adverbe | `Créées récemment` / `Créés récemment` | « récemment » dans les libellés de tri | `Plus récentes` / `Plus récents` | moyenne | ✅ |
| 123 |  modules/claude/scripts/views.ts:139 | Adverbe | `Minuscules, chiffres et tirets seulement (61 caractères au plus), sans tiret au début.` | « seulement » | `Minuscules, chiffres et tirets (61 caractères au plus), sans tiret au début.` | moyenne | ✅ |
| 124 |  modules/claude/scripts/views.ts:107 | Passif | `La création de projet est réservée aux administrateurs et aux comptes liés à un compte Linux.` | « est réservée » | `Seuls les administrateurs et les comptes liés à un compte Linux créent des projets.` | moyenne | ✅ |
| 125 |  modules/claude/server/agent/scheduled-http.ts:21,22 ; modules/claude/server/agent/scheduler.ts:60 | Passif | `Les tâches Code sont réservées aux administrateurs.` / `La recherche web est réservée aux administrateurs.` | « sont réservées » dans des messages d'erreur visibles | `Seuls les administrateurs créent des tâches Code.` / `Seuls les administrateurs activent la recherche web.` | moyenne | ✅ |
| 126 |  modules/claude/scripts/views.ts:216 | Passif + contraste | `Projet « ${n} » créé, mais ${plural(failed.length, 'fichier n’a pas été copié', 'fichiers n’ont pas été copiés')}` | « n’a pas été copié » passif ; construction « X, mais Y » | `Projet « ${n} » créé. Échec de la copie de : …` | moyenne | ✅ |
| 127 |  modules/claude/scripts/composer.ts:188 | Passif | `Connexion perdue : le message est resté dans le champ.` | Tournure indirecte | `Connexion perdue : votre message reste dans le champ.` | basse | ✅ |
| 128 |  modules/claude/scripts/thread.ts:72 | Passif | `votre réponse n’a pas été envoyée. Réessayez dans un instant.` | « n’a pas été envoyée » | `Connexion perdue : Claude n’a pas reçu votre réponse. Réessayez.` | moyenne | ✅ |
| 129 |  modules/claude/server/agent/workspace.ts:61 | Passif | `Les chemins qui remontent (..) sont refusés.` | Passif dans une erreur visible | `Le chemin ne peut pas remonter (..).` | moyenne | ✅ |
| 130 |  modules/claude/server/agent/runner.ts:429 | Passif | `Contexte compacté : l’historique a été résumé.` | « a été résumé » | `Contexte compacté : Claude a résumé l’historique.` | moyenne | ✅ |
| 131 |  modules/claude/scripts/view-scheduled.ts:155 | Passif | `« ${t.name} » est lancée. La conversation apparaît dans votre liste.` | « est lancée » | `Claude lance « ${t.name} ». La conversation apparaît dans votre liste.` | moyenne | ✅ |
| 132 |  modules/claude/scripts/settings.ts:168-171 | Interrogatif en tête | `Quand l’onglet est masqué, …` / `Quand une tâche planifiée a terminé …` / `Quand Claude Code a terminé …` / `Quand Claude Code attend …` | 4 aides commencent par « Quand » ; « est masqué » passif | `Si l’onglet est masqué, une notification signale la fin de réponse de Claude.` / `Notifie la fin d’une tâche planifiée.` / `Notifie la fin du travail de Claude Code.` / `Notifie l’attente de votre autorisation ou d’une réponse.` | moyenne | ✅ |
| 133 |  modules/claude/scripts/settings.ts:174 | Contraste léger | `Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur.` | Passif « sont bloquées » | `Votre navigateur bloque les notifications de ce site : autorisez-les dans ses réglages.` | basse | ✅ |
| 134 |  modules/claude/scripts/notify.ts:72 | Adverbe | `même quand cet onglet est masqué` | Passif léger | `même si vous masquez cet onglet` | basse | ✅ |
| 135 |  modules/claude/scripts/feedback.ts:18 | Adverbe | `N’a pas entièrement respecté ma demande` | « entièrement » | `N’a respecté qu’une partie de ma demande` | moyenne | ✅ |
| 136 |  modules/claude/scripts/code-changes.ts:132,145 ; modules/claude/scripts/code-files.ts:165,304 | Adverbe + passif | `seules les modifications d’un dépôt git sont listées.` / `Liste coupée : seuls les premiers fichiers sont affichés.` / `Seuls les dossiers déjà ouverts sont filtrés.` / `seuls les premiers 512 Ko sur … sont affichés.` | Passifs, restriction par « seul » | `Cette liste ne montre que les modifications d’un dépôt git.` / `La liste coupe après les premiers fichiers.` / `Le filtre ne parcourt que les dossiers ouverts.` / `L’aperçu montre les 512 premiers Ko sur … .` | basse | ✅ |
| 137 |  modules/claude/scripts/view-projects.ts:295 | Extrême vague | `Claude s’appuie sur les mêmes consignes chaque fois que vous travaillez dans ce projet.` | « chaque fois » | `Claude suit ces consignes dans tout ce projet.` | basse | ✅ |
| 138 |  modules/claude/scripts/view-projects.ts:300 | Passif | `Ajoutez des documents : ils sont copiés dans le dossier du projet.` | « sont copiés » | `Ajoutez des documents : Claude les copie dans le dossier du projet.` | basse | ✅ |
| 139 |  modules/claude/scripts/permissions-ui.ts:118 | Extrême vague | `Approuver en demandant à chaque fois` | Libellé technique | `Approuver, puis redemander` | basse | ⏭️ libellé technique « à chaque fois » porte le sens, « redemander » le changerait |
| 140 |  modules/claude/scripts/menus/model.ts:19 | Contraste binaire | `Un effort plus élevé signifie des réponses plus approfondies, mais prend plus de temps et consomme vos limites plus rapidement.` | Structure « X, mais Y » ; adverbe « plus rapidement » (comparatif) | `Un effort plus élevé approfondit les réponses, prend plus de temps et épuise vos limites plus vite.` | moyenne | ✅ |
| 141 |  modules/claude/scripts/settings-usage.ts:78 | Cadratin (valeur vide) | `'–'` | Demi-cadratin affiché comme valeur vide | tiret simple `-` ou `n/a` | basse | ✅ |
| 142 |  modules/claude/scripts/code-sessions.ts:50 | Cadratin (valeur vide) | `: '—'` | Cadratin affiché comme valeur vide | `-` ou `n/a` | basse | ✅ |
| 143 |  modules/claude/server/outils/outils-claude.py:391 | Cadratin | `Boîte à outils de la VM (inventaire local `outils-claude`) — outils qui correspondent à cette demande :` | Cadratin dans un texte injecté à Claude | `Boîte à outils de la VM (inventaire local `outils-claude`). Outils qui correspondent à cette demande :` | moyenne | ✅ |
| 144 |  modules/claude/server/outils/outils-claude.py:175 | Cadratin | `{description} — {n} skills, …` | Cadratin dans un texte affiché | `{description} : {n} skills, …` | moyenne | ✅ |
| 145 |  modules/claude/server/outils/outils-claude.py:393 | Adverbe | `Utilise ceux qui servent vraiment la tâche` | « vraiment » | `Utilise ceux qui servent la tâche` | moyenne | ✅ |
| 146 |  modules/claude/server/outils/outils-claude.py:80,248 | Extrême vague | `jamais envoyé sans accord` / `à chaque message` | « jamais », « chaque » (descriptions affichées) | `Claude demande votre accord avant tout envoi.` / `à chaque message` peut rester (sens technique) | basse | ✅ |
| 147 |  modules/claude/server/outils/outils-claude.py:11 | Adverbe/Extrême | `Rien n'est mis en cache : … relus a chaque appel` | Docstring, « Rien », faute « a » | `Aucun cache : l'inventaire relit les plugins, skills et hooks à chaque appel` | basse | ✅ |
| 148 |  modules/claude/server/agent/modes.ts:104,112 | Adverbes (prompt système) | `ne réponds jamais que tu ne peux pas générer de PDF` / `mentionne-le simplement` | « jamais », « simplement » | `mentionne-le` ; `réponds que tu génères des PDF` | basse | ✅ |
| 149 |  modules/claude/server/agent/runner.ts:199-200 | Adverbe + passif (prompt système) | `exécutée automatiquement` / `est refusée d'office` | « automatiquement », passif | `que Claude exécute sans personne devant l'écran` / `Refuse toute action qui demanderait une autorisation.` | basse | ✅ |
| 150 |  modules/claude/server/agent/scheduled.ts:132 | Adverbe (modèle de tâche) | `réponds simplement « Rien de nouveau depuis hier »` | « simplement » | `réponds « Rien de nouveau depuis hier »` | moyenne | ✅ |
| 151 |  modules/claude/server/agent/scheduled.ts:55,74,75,103,104,112,117,118,119,130 | Extrême vague | `chaque matin` / `chaque message` / `chaque dépôt` / `chaque idée` / `n’importe quelle semaine` | Modèles de tâches visibles ; « chaque » sert surtout ici de sens technique | `chaque matin`, `chaque message` peuvent rester ; remplacer `n’importe quelle semaine` par `toute semaine` | basse | ✅ |
| 152 |  modules/claude/server/agent/ws-agent.ts:160 | Adverbe | `Messages texte uniquement.` | « uniquement » | `Envoyez du texte.` | basse | ✅ |
| 153 |  modules/claude/server/agent/attachments.ts:94 | Passif | `Ce fichier est enregistré sur la VM à ce chemin` | « est enregistré » (prompt) | `Le panel a enregistré ce fichier sur la VM à ce chemin` | basse | ✅ |
| 154 |  modules/claude/pages/claude.astro:143,247 | Adverbe (commentaire) | `Code seulement.` / `ouverture automatique seulement` | Commentaires HTML | supprimer « seulement » | basse | ✅ |
| 155 |  modules/claude/pages/claude.astro:280 | Cadratin (commentaire) | `Surcouches … nouveau projet (H) — modal.ts` | Cadratin | `… (H) : modal.ts` | basse | ✅ |
| 156 |  modules/claude/scripts/settings.ts:3 ; speech.ts:2 ; feedback.ts:2 ; account.ts:2 | Cadratin (commentaire) | `— PROPRIÉTAIRE : T4/T5` | 4 cadratins en tête de fichier (account.ts:2 en fin de ligne) | remplacer par `:` ou `.` | basse | ✅ |
| 157 |  modules/claude/server/agent/protocol.ts:17,254,386,459,474,476 | Cadratin (commentaire) | `aucun outil, …` etc. | 6 cadratins (6 occurrences) | `:` ou `.` | basse | ✅ |
| 158 |  modules/claude/pages/api/agent/projects.ts:23 ; pages/api/agent/projects/[name]/files.ts:9 ; pages/api/agent/projects/[name]/instructions.ts:14 ; pages/api/agent/conversations.ts:29 | Cadratin (commentaire) | `{ … } — administrateurs seulement` | 4 cadratins (4 occurrences) | `:` ; supprimer « seulement » | basse | ✅ |
| 159 |  modules/claude/server/agent/workspace.ts:274 ; permissions.ts:198 ; pdf-tool.ts:29,30 | Cadratin (commentaire) | `dépôt — arbre ET dossier .git — dans son /home` etc. | 4 cadratins (4 occurrences) | virgules ou deux-points | basse | ✅ |
| 160 |  modules/claude/tools/agent-smoke.mjs:39,134,216,224,236 | Cadratin (log de test) | `ok — ${what}` | 5 cadratins dans des logs de test (6 avec 134 double) | `ok : ${what}` | basse | ✅ |
| 161 |  modules/claude/scripts/progress.ts:7 ; palette.ts ; view-projects.ts:6 ; settings.ts:235 ; menus/permission.ts:4 ; scripts/notify.ts:7 ; scripts/modes.ts:19 ; scripts/incognito.ts:77 ; scripts/state.ts:65,315 ; scripts/dom.ts:151 ; scripts/turn.ts:461 ; scripts/markdown.ts:70 | Adverbe « seulement » (commentaire) | `… seulement` | ~13 commentaires avec « seulement » (13 occurrences) | supprimer ou reformuler (`ne … que`) | basse | ✅ |
| 162 |  modules/claude/server/agent/{permissions,modes,runner,workspace,projects,store,protocol,scheduler,hooks,sandbox,attachments}.ts ; server/uploads-cleanup.js | Adverbe « seulement/uniquement/réellement/strictement » (commentaire) | `… seulement` | ~45 commentaires, motif mécanique (~45 occurrences), dont protocol.ts:68,86,152,236,253,254,273,392,486,760,769 | reformuler sans adverbe | basse | ✅ |
| 163 |  modules/claude/scripts/menus/families.ts:68 ; modes.ts:91 ; progress-model.ts:148 ; workspace.ts:139 | Adverbe « réellement » (commentaire) | `Modèle réellement utilisé` | 4 occurrences | `Modèle utilisé` | basse | ✅ |
| 164 |  modules/claude/scripts/menus/project.ts:2 ; scripts/code-ui.ts ; server/agent/store.ts:187 | Passif (commentaire) | `est fixé à la création` / `est redessiné` | passifs mécaniques dans commentaires (~25, ex. conv-menu, palette.ts:105, progress.ts:47) | forme active | basse | ✅ (2e passage : 29 commentaires de plus convertis) |
Routes : /minecraft (avec /minecraft/installations, /mods, /parametres, /proprietes), /joueurs, /console. Chemins relatifs à /home/ubuntu/dev/orvane. Préfixe M = modules/minecraft.

## Onglet : Minecraft (/minecraft)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 165 |  M/scripts/serveur.ts:10 | voix passive | `Les joueurs sont prévenus dans le chat avant la coupure.` | passif | `Le serveur prévient les joueurs dans le chat avant la coupure.` | haute | ✅ |
| 166 |  M/scripts/serveur.ts:11 | voix passive | `Le monde est sauvegardé avant l’arrêt.` | passif | `Le serveur sauvegarde le monde avant l’arrêt.` | haute | ✅ |
| 167 |  M/scripts/serveur.ts:13 | voix passive, fausse agentivité | `La sauvegarde automatique est suspendue le temps d’écrire le monde sur le disque.` | passif | `Le panel suspend la sauvegarde automatique pendant l’écriture du monde sur le disque.` | haute | ✅ |
| 168 |  M/scripts/serveur.ts:20 | voix passive | `ils sont prévenus dans le chat 2 minutes avant. Le monde est sauvegardé, puis le serveur recharge ses mods (quelques minutes).` | passifs | `le panel les prévient dans le chat 2 minutes avant. Il sauvegarde le monde, puis le serveur recharge ses mods (quelques minutes).` | haute | ✅ |
| 169 |  M/scripts/serveur.ts:25 | voix passive, négation | `ils sont prévenus 2 minutes avant. Le monde est sauvegardé, puis personne ne pourra se connecter tant que vous ne l’aurez pas redémarré.` | passif, extrême vague (« personne ») | `le panel les prévient 2 minutes avant et sauvegarde le monde. Aucun joueur ne peut se connecter avant votre redémarrage.` | haute | ✅ |
| 170 |  M/scripts/serveur.ts:12,31 | fausse agentivité | `Le chargement du serveur et de ses mods peut prendre quelques minutes` | nominalisation | `Le serveur et ses mods mettent quelques minutes à charger` | moyenne | ✅ |
| 171 |  M/scripts/serveur.ts:14 | fausse agentivité | `Le serveur reste jouable pendant l’archivage.` | acceptable, motif léger | `Les joueurs peuvent continuer à jouer pendant l’archivage.` | basse | ✅ |
| 172 |  M/server/actions.ts:103,106,116,157,160,241 | cadratin (6 occurrences) | `préavis de 2 minutes en cours` (`— `) | cadratin dans les messages du bandeau de tâche | remplacer ` — ` par ` : ` ou une virgule, ex. `2 joueurs connectés : préavis de 2 minutes en cours` | haute | ✅ |
| 173 |  M/server/actions.ts:116,241 | fausse agentivité | `le chargement des mods peut prendre quelques minutes` | nominalisation | `les mods mettent quelques minutes à charger` | moyenne | ✅ |
| 174 |  M/pages/minecraft.astro:54,58,63,64,68,69,101 | cadratin valeur vide (7 occurrences) | `?? '—'` | placeholder de donnée | tiret simple `-` ou `n/a` | basse | ✅ |
| 175 |  M/pages/minecraft.astro:69 | jargon | `(données vivantes du tas)` | jargon JVM, tournure obscure | `(tas Java en cours d’utilisation)` | moyenne | ✅ |
| 176 |  M/pages/minecraft.astro:29 | commentaire, jargon | `données vivantes (tas utilisé hors génération jeune), pas l'empreinte du processus` | contraste binaire « X, pas Y » | `Mémoire : tas utilisé hors génération jeune (l'empreinte du processus est exclue).` | basse | ✅ |
| 177 |  M/pages/minecraft.astro:72 | voix passive | `Mesures actualisées toutes les 10 s quand la page est visible.` | passif | `La page actualise les mesures toutes les 10 s tant qu’elle est visible.` | haute | ✅ |
| 178 |  M/pages/minecraft/installations.astro:35 | fausse agentivité, extrême | `Le panel gère un seul serveur. Sa configuration vient …` | « vient de » vague | `Le panel gère un seul serveur. Sa configuration est lue dans …` (éviter passif : `Le panel lit la configuration dans …`) | moyenne | ✅ |
| 179 |  M/pages/minecraft/installations.astro:46-51,58 | cadratin valeur vide (6 occurrences, l.27,41,46,47,48,51,58) | `?? '—'` | placeholder | `-` ou `n/a` | basse | ✅ |
| 180 |  M/pages/minecraft/installations.astro:52 | extrême paresseux | `Jamais depuis le démarrage de la machine` | « Jamais » imprécis | `Pas de démarrage depuis le boot de la machine` | moyenne | ✅ |
| 181 |  M/pages/minecraft/installations.astro:61 | voix passive | `Plus de 80 % de l’espace réservé est utilisé.` | passif | `Le serveur occupe plus de 80 % de l’espace réservé.` | haute | ✅ |
| 182 |  M/pages/minecraft/installations.astro:62 | voix passive, fausse agentivité | `Espace réservé plein : dépôts de mods et sauvegardes sont bloqués.` | passif | `Espace réservé plein : le panel bloque les dépôts de mods et les sauvegardes.` | haute | ✅ |
| 183 |  M/pages/minecraft/installations.astro:63 | contraste binaire, passif | `Limite souple mesurée par le panel (du, toutes les 5 min), pas un quota du système.` | « X, pas Y » + passif | `Le panel mesure cette limite souple avec du, toutes les 5 min. Le système n’impose aucun quota.` | haute | ✅ |
| 184 |  M/pages/minecraft/installations.astro:21 | commentaire, extrême | `vide tant que l'unité n'a jamais tourné` | « jamais » | `vide si l'unité n'a pas encore tourné` | basse | ✅ |
| 185 |  M/pages/minecraft/mods.astro:27 | adverbe, passif | `Jars … seulement, 150 Mo au plus. Vérifiés sans extraction.` | « seulement », passif | `Jars … uniquement, 150 Mo au plus. Le panel les vérifie sans extraction.` | haute | ✅ |
| 186 |  M/pages/minecraft/mods.astro:31 | fausse agentivité | `les changements de mods s’appliquent au prochain démarrage du serveur` | acceptable | `Redémarrage requis : le serveur applique les changements de mods au prochain démarrage.` | basse | ✅ |
| 187 |  M/pages/minecraft/mods.astro:38 | adjectif restrictif | `Seuls les administrateurs peuvent ajouter, activer ou désactiver des mods.` | énumération en trois, motif léger | `Seuls les administrateurs gèrent les mods.` | basse | ✅ |
| 188 |  M/scripts/upload.ts:3 | voix passive | `Seuls les fichiers .jar sont acceptés.` | passif | `Le panel accepte uniquement les fichiers .jar.` | haute | ✅ |
| 189 |  M/pages/minecraft/parametres.astro:46 | énumération en trois+ | `difficulté, mode de jeu, joueurs max, liste blanche, distance de vue…` | liste longue avec points de suspension | `Difficulté, mode de jeu, joueurs max, liste blanche.` | moyenne | ✅ |
| 190 |  M/pages/minecraft/parametres.astro:56 | voix passive, jargon | `Écrit dans … ; pris en compte au prochain démarrage.` | passifs | `Le panel écrit la valeur dans … ; elle s’applique au prochain démarrage.` | haute | ✅ |
| 191 |  M/pages/minecraft/parametres.astro:62 | cadratin valeur vide | `'—'` | placeholder | `-` | basse | ✅ |
| 192 |  M/pages/minecraft/parametres.astro:66 | contraste binaire, passif | `Limite souple, pas un quota du système : alerte à 80 %, dépôts de mods et sauvegardes bloqués au-delà de 100 %.` | « X, pas Y » + passif | `Limite souple sans quota système. Le panel alerte à 80 % et bloque les dépôts de mods et les sauvegardes au-delà de 100 %.` | haute | ✅ |
| 193 |  M/pages/minecraft/parametres.astro:72 | adverbe, passif | `Modifications envoyées par RCON, appliquées tout de suite.` | « tout de suite », passifs | `Le panel envoie les modifications par RCON et le serveur les applique aussitôt.` | haute | ✅ |
| 194 |  M/pages/minecraft/parametres.astro:72 | vague | `(lecture seule pour l’instant)` | « pour l’instant » vague | `(lecture seule)` | basse | ✅ |
| 195 |  M/pages/minecraft/parametres.astro:95 | passif | `Restaurer demande un serveur arrêté ; une sauvegarde de sécurité est faite avant.` | passif | `La restauration exige un serveur arrêté. Le panel crée d’abord une sauvegarde de sécurité.` | haute | ✅ |
| 196 |  M/scripts/parametres.ts:52 | voix passive, adverbe | `Le monde actuel est d’abord archivé (sauvegarde de sécurité), puis remplacé par « … ».` | passifs, « d’abord » | `Le panel archive le monde actuel (sauvegarde de sécurité), puis le remplace par « … ».` | haute | ✅ |
| 197 |  M/pages/minecraft/proprietes.astro:64 | cadratin valeur vide | `p.value \|\| '—'` | placeholder | `-` | basse | ✅ |
| 198 |  M/pages/minecraft/proprietes.astro:~120 | voix passive | `Prises en compte au prochain redémarrage du serveur` | passif | `Le serveur applique ces changements à son prochain redémarrage` | haute | ✅ |
| 199 |  M/pages/minecraft/proprietes.astro:~170 | adverbe, passif | `Enregistrer quand même` | « quand même » | `Enregistrer` | moyenne | ✅ |
| 200 |  M/pages/minecraft/proprietes.astro:~171 | passif, adverbe | `Les joueurs connectés sont prévenus dans le chat 2 minutes avant. Vous pouvez aussi attendre le redémarrage automatique de la nuit.` | passif, « automatique » (nécessaire) | `Le panel prévient les joueurs connectés dans le chat 2 minutes avant. Vous pouvez aussi attendre le redémarrage de la nuit.` | haute | ✅ |
| 201 |  M/pages/minecraft/proprietes.astro:~172 | adverbe | `Redémarrer le serveur maintenant ?` | « maintenant » | `Redémarrer le serveur ?` | basse | ✅ |
| 202 |  M/server/mc-properties.ts:52 | adverbe | `Remet chaque joueur dans le mode ci-dessus à la connexion` | « chaque », « ci-dessus » | `Remet le joueur dans le mode ci-dessus à chaque connexion` | basse | ✅ |
| 203 |  M/server/mc-properties.ts:68 | adverbe | `Appliquer la liste blanche immédiatement` | adverbe | `Appliquer la liste blanche sans attendre` ou `Appliquer la liste blanche en direct` | moyenne | ✅ |
| 204 |  M/server/mc-properties.ts:72,103 | extrême paresseux | `(0 = jamais)`, `(-1 = jamais compresser)` | « jamais » | `(0 = désactivé)`, `(-1 = pas de compression)` | basse | ✅ |
| 205 |  M/server/mc-properties.ts:80 | cadratin | `où les machines et mobs tournent — très coûteux sur ATM10` | cadratin, intensifieur « très » | `où les machines et mobs tournent. Coûteux sur ATM10` | haute | ✅ |
| 206 |  M/server/mc-properties.ts:70 | extrême | `n’importe qui peut se connecter sous le pseudo d’un autre joueur` | extrême vague | `un tiers peut se connecter sous le pseudo d’un autre joueur` | basse | ✅ |
| 207 |  M/server/mc-properties.ts:86 | fausse agentivité | `fait charger (ou créer) un AUTRE monde` | majuscules d'emphase | `charge ou crée un autre monde` | moyenne | ✅ |
| 208 |  M/server/mc-properties.ts:87,88 | adverbe | `Utilisée seulement à la création d’un monde` | « seulement » | `Utilisée uniquement à la création d’un monde` | moyenne | ✅ |
| 209 |  M/server/mc-properties.ts:100 | fausse agentivité, passif | `Changer le port coupe l’accès aux joueurs tant que le pare-feu et leur adresse de connexion ne sont pas mis à jour.` | passif | `Changer le port coupe l’accès aux joueurs jusqu’à la mise à jour du pare-feu et de leur adresse de connexion.` | moyenne | ✅ |
| 210 |  M/server/mc-properties.ts:213 | jargon | `valeur non proposée` | tournure obscure | `valeur absente de la liste` | basse | ✅ |
| 211 |  M/components/Wizard.astro:27 | contraste | `Vanilla : le jeu seul. Fabric et NeoForge chargent des mods (pas les mêmes).` | parenthèse vague | `Vanilla : le jeu seul. Fabric et NeoForge chargent des mods incompatibles entre eux.` | basse | ✅ |
| 212 |  M/components/Wizard.astro:33 | passif | `Chaque jar est vérifié : archive saine, descripteur lu sans extraction, loader identique à celui choisi.` | passifs, « chaque » | `Le panel vérifie chaque jar : archive saine, descripteur lu sans extraction, loader identique au loader choisi.` | haute | ✅ |
| 213 |  M/components/Wizard.astro:52 | contraste, passif | `Limite souple : le panel mesure l’espace utilisé, prévient à 80 % et bloque … au-delà de 100 %. Ce n’est pas un quota du système.` | « Ce n’est pas X », énumération en trois | `Limite souple sans quota système. Le panel prévient à 80 % et bloque les dépôts de mods et les sauvegardes au-delà de 100 %.` | haute | ✅ |
| 214 |  M/components/Wizard.astro:4 | commentaire | `Tout est revalidé côté serveur.` | « Tout » vague | `Le serveur revalide chaque champ.` | basse | ✅ |
| 215 |  M/scripts/wizard.ts:142 | voix passive | `loader différent, ne sera pas installé` | passif futur | `loader différent : le panel ne l’installe pas` | haute | ✅ |
| 216 |  M/scripts/wizard.ts:136 | jargon/vague | `étape sans objet` | formule | `cette étape ne s’applique pas` | basse | ✅ |
| 217 |  M/scripts/wizard.ts:63 | vague | `seules les versions qui demandent Java … sont proposées` | passif, « seules » | `le panel propose uniquement les versions qui demandent Java …` | moyenne | ✅ |
| 218 |  M/scripts/wizard.ts:54 | cadratin valeur vide | `st.version \|\| '—'` (2 occurrences) | placeholder | `-` | basse | ✅ |
| 219 |  M/home.astro:22 | cadratin valeur vide (2) | `'—'` | placeholder | `-` | basse | ✅ |
| 220 |  M/home.astro:12 | commentaire | `seulement serveur en ligne` | adverbe | `serveur en ligne uniquement` | basse | ✅ |
| 221 |  M/scripts/live.ts:2-4 | commentaire | `toutes les 10 s, seulement quand la page est visible … une erreur réseau est ignorée` | « seulement », passif | `toutes les 10 s, uniquement si la page est visible … le script ignore une erreur réseau` | basse | ✅ |
| 222 |  M/scripts/live.ts:22-25 | cadratin valeur vide (4) | `'—'` | placeholder | `-` | basse | ✅ |
| 223 |  M/components/Banner.astro:3-4 | commentaire | `Le relief est calculé (somme de sinus) pour rester déterministe et léger.` | passif | `Le code calcule le relief (somme de sinus) pour rester déterministe et léger.` | basse | ✅ |
| 224 |  M/scripts/serveur.ts:1-5 | commentaire | `rien n'est envoye sans clic explicite`, `Toute action passe par une confirmation` | « Toute », passif | `Chaque action demande une confirmation ; le panel n'envoie rien sans clic.` | basse | ✅ |
| 225 |  M/scripts/serveur.ts:68,108 | commentaire passif | `Page rechargee pour afficher le nouvel etat` | passif | `La page recharge pour afficher le nouvel état` | basse | ✅ |
| 226 |  M/pages/api/mc/*.ts (command.ts:15,21; action.ts:16; wizard.ts:29; player.ts:17,39; roster.ts:36,38; settings.ts:28; mods.ts:19; properties.ts:16) | voix passive | `Action non autorisée`, `Un serveur est déjà configuré.`, `Ce joueur n’est plus connecté.`, `Corps de requête invalide : JSON attendu.` (6 occurrences), `Action destructive : confirmation manquante.` (2) | erreurs surtout nominales ; « Action non autorisée » passif léger ; « se modifient par RCON » passif (settings.ts:28) | `Action refusée` ; settings.ts:28 : `Serveur arrêté : modifiez la liste blanche et les opérateurs par RCON, serveur en ligne.` | moyenne | ✅ |
| 227 |  M/pages/api/mc/texture.ts:13 | commentaire, cadratin | `namespace:nom — les deux segments sont contraints` | cadratin + passif | `namespace:nom : les deux segments sont contraints` | basse | ✅ |

## Onglet : Joueurs (/joueurs)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 228 |  M/pages/joueurs.astro:121 | extrême paresseux | `même s’il n’est jamais venu.` | « jamais » | `même s’il ne s’est pas encore connecté.` | haute | ✅ |
| 229 |  M/scripts/joueurs.ts:290 | extrême paresseux, fausse agentivité | `Fonctionne même si le joueur n’est jamais venu.` | « jamais », fausse agentivité | `Le joueur peut ne s’être jamais connecté.` ou `Marche aussi pour un joueur jamais connecté.` | haute | ✅ |
| 230 |  M/pages/joueurs.astro:127 | passif | `Évènements, sessions et connexions sur les N derniers jours.` | énumération en trois | `Évènements et sessions des N derniers jours.` | moyenne | ✅ |
| 231 |  M/components/ActivityPanel.astro:69,123 | passif | `Rien d’enregistré …`, `Aucune session enregistrée …` | participe passé en état vide | `Aucun évènement …`, `Aucune session …` | moyenne | ✅ |
| 232 |  M/components/ActivityPanel.astro:88,95,96 | cadratin valeur vide (3) | `?? '—'` | placeholder | `-` | basse | ✅ |
| 233 |  M/components/ActivityPanel.astro:4-6 | commentaire | `Les tentatives sont remplies côté client (le bruit des scanners s'affiche à la demande).` | passif | `Le client remplit les tentatives ; le bruit des scanners s'affiche sur demande.` | basse | ✅ |
| 234 |  M/scripts/joueurs.ts:340 | passif, formule | `Seul le bruit des scanners a été enregistré : cochez l’option pour l’afficher.` | passif | `Le panel n’a enregistré que du bruit de scanners : cochez l’option pour l’afficher.` | haute | ✅ |
| 235 |  M/scripts/joueurs.ts:169 | extrême, passif | `Vider TOUT l’inventaire de %s ?\n\nLes objets sont détruits, pas récupérables.` | « TOUT » en capitales, passif, « pas X » | `Vider l’inventaire de %s ?\n\nLe panel détruit les objets, sans récupération possible.` | haute | ✅ |
| 236 |  M/scripts/joueurs.ts:170 | fausse agentivité | `Son stuff tombe au sol` | jargon | `Son équipement tombe au sol` | moyenne | ✅ |
| 237 |  M/scripts/joueurs.ts:145 | emphase | `retire TOUS les effets, y compris les bons.` | capitales d’emphase | `retire les effets, bons compris.` | moyenne | ✅ |
| 238 |  M/scripts/joueurs.ts:151 | contraste, extrême | `Rien ne tombe au sol, rien n’est récupérable.` | structure en parallèle, passif | `Le serveur détruit l’inventaire sans le déposer au sol.` | haute | ✅ |
| 239 |  M/scripts/joueurs.ts:219 | négation passive | `Il ne pourra plus se reconnecter tant qu’il n’est pas débanni.` | passif | `Il ne pourra plus se reconnecter avant son débannissement.` | moyenne | ✅ |
| 240 |  M/scripts/joueurs.ts:267-268 | jargon | `kick : déconnecte le joueur, il peut revenir aussitôt.` | adverbe « aussitôt » | `kick : déconnecte le joueur, qui peut revenir.` | moyenne | ✅ |
| 241 |  M/scripts/joueurs.ts:268 | extrême | `ban : empêche toute reconnexion tant qu’il n’est pas débanni.` | « toute », passif | `ban : bloque la reconnexion jusqu’au débannissement.` | moyenne | ✅ |
| 242 |  M/scripts/joueurs.ts:113,124,128,129,336 | cadratin valeur vide (5) | `'—'` | placeholder | `-` | basse | ✅ |
| 243 |  M/scripts/joueurs.ts:1-5 | commentaire | `Aucune requete n'est envoyee sans clic explicite.` | passif, « explicite » | `Le script n'envoie aucune requête sans clic.` | basse | ✅ |
| 244 |  M/scripts/joueurs.ts:239,275,286,317,325 | commentaire passif | `se mettent a jour`, `Les confirmations s'ouvrent`, `le bruit des scanners est masque par defaut` | passif | `le panel masque le bruit des scanners par défaut` | basse | ✅ |
| 245 |  M/components/RosterTable.astro:2-6 | commentaire | `Les joueurs arrivent déjà décorés par la page` | adverbe « déjà », fausse agentivité | `La page décore les joueurs avant de les passer au tableau.` | basse | ✅ |

## Onglet : Console Minecraft (/console)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 246 |  M/pages/console.astro:232 | cadratin (2 paires) | `—— le journal a été recréé (redémarrage du serveur) ——` | double cadratin + passif, texte visible dans la console | `[le journal a été recréé après le redémarrage du serveur]` ou `Le serveur a recréé le journal (redémarrage).` | haute | ✅ |
| 247 |  M/pages/console.astro:237 | cadratin | ``—— ${d.message} ——`` | cadratin visible | ``[${d.message}]`` | haute | ✅ |
| 248 |  M/pages/console.astro:351 | voix passive | `ils seront prévenus dans le chat et le redémarrage aura lieu dans 2 minutes.` | passif futur | `le panel les prévient dans le chat et redémarre dans 2 minutes.` | haute | ✅ |
| 249 |  M/pages/console.astro:353 | voix passive | `ils seront prévenus dans le chat et l’arrêt aura lieu dans 2 minutes.` | passif futur | `le panel les prévient dans le chat et arrête le serveur dans 2 minutes.` | haute | ✅ |
| 250 |  M/pages/console.astro:310 | voix passive | `Les joueurs sont prévenus dans le chat. L’arrêt sauvegarde le monde.` | passif, fausse agentivité | `Le panel prévient les joueurs dans le chat et sauvegarde le monde avant l’arrêt.` | haute | ✅ |
| 251 |  M/pages/console.astro:312 | fausse agentivité | `Le serveur répondra quand la ligne « Done » apparaîtra ci-dessous.` | acceptable | `Le serveur répond dès que la ligne « Done » apparaît ci-dessous.` | basse | ✅ |
| 252 |  M/pages/console.astro:~100 | contraste | `Le serveur n’est pas en ligne : l’envoi de commandes est désactivé.` | négation + passif | `Serveur hors ligne : envoi de commandes désactivé.` | moyenne | ✅ |
| 253 |  M/pages/console.astro:198 | passif | `Copie refusée par le navigateur.` | participe passé | `Le navigateur a refusé la copie.` | moyenne | ✅ |
| 254 |  M/pages/console.astro:31,37-40 | cadratin valeur vide (6) | `'—'` | placeholder | `-` | basse | ✅ |
| 255 |  M/pages/console.astro:409-410 | commentaire, cadratin, contraste | `Console : toujours sombre … quel que soit le theme du panel — c'est une sortie de programme, pas une surface d'UI.` | cadratin, « toujours », « pas X » | `Console sombre quel que soit le thème du panel : c'est une sortie de programme.` | moyenne | ✅ |
| 256 |  M/pages/console.astro:57,113-114,118-119,178,218 | commentaires | `masquee tant qu'aucun job n'est en cours`, `le script du document n'est pas re-execute`, `chaque closure`, `au-dela, le DOM devient le goulot` | passif, extrêmes (« chaque ») | `Bannière d'opération masquée sans job en cours.` etc. | basse | ✅ |
| 257 |  M/pages/console.astro:53 | commentaire | `Pas d'actualisation auto : le flux SSE est deja en direct.` | adverbe « déjà » | `Pas d'actualisation auto : le flux SSE est en direct.` | basse | ✅ |
Chemins relatifs à /home/ubuntu/dev/orvane. Les deux modules n'ont qu'un onglet (module.json) ; les sous-onglets sont les pages listées ci-dessous.

## Onglet : Containers (/docker)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 258 |  modules/docker/pages/docker/index.astro:362 | voix passive | `Les conteneurs en marche seront ignorés.` | passif | `Le panel ignore les conteneurs en marche.` | haute | ✅ |
| 259 |  modules/docker/pages/docker/index.astro:381 | voix passive | `Le conteneur et ses données non persistées seront perdus.` | passif | `Vous perdez le conteneur et ses données non persistées.` | haute | ✅ |
| 260 |  modules/docker/pages/docker/index.astro:393 | voix passive | `Projet protégé : ses services seront coupés. Tapez « ${project} » pour confirmer.` | passif | `Projet protégé : l’action coupe ses services. Tapez « ${project} » pour confirmer.` | haute | ✅ |
| 261 |  modules/docker/pages/docker/index.astro:424 | voix passive | `ses conteneurs seront arrêtés et supprimés (volumes conservés)` | passif | `l’action arrête et supprime ses conteneurs (volumes conservés)` | haute | ✅ |
| 262 |  modules/docker/pages/docker/index.astro:189 | adverbe | `machine locale seulement` | « seulement » | `accessible depuis la machine locale` | moyenne | ✅ |
| 263 |  modules/docker/pages/docker/index.astro:369,401,432 | voix passive | `${sel.length} conteneur(s) traité(s)` / `projet ${project} traité` | participes passifs elliptiques | `${verb} : ${n} conteneur(s).` | basse | ✅ |
| 264 |  modules/docker/pages/docker/index.astro:143,184,196,200,472,479 | cadratin (valeur vide affichée) | `'—'` (6 occurrences) | cadratin comme placeholder | tiret simple `-` ou `n/a` | basse | ✅ |
| 265 |  modules/docker/pages/docker/index.astro:489 | passif / fausse agentivité | `Un conteneur est apparu, a disparu ou a change d'etat` | commentaire, mineur | laisser ou `Un conteneur apparaît, disparaît ou change d'état` | basse | ✅ |

## Onglet : Détail d'un conteneur (/docker/conteneur)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 266 |  modules/docker/pages/docker/conteneur.astro:55 | voix passive, hésitation | `Il a peut-être été supprimé entre-temps.` | passif + « peut-être » + « entre-temps » | `Quelqu’un l’a peut-être supprimé. Revenez à la liste pour le retrouver.` | haute | ✅ |
| 267 |  modules/docker/pages/docker/conteneur.astro:281 | voix passive | `Le conteneur et ses données non persistées seront perdus.` | passif | `Vous perdez le conteneur et ses données non persistées.` | haute | ✅ |
| 268 |  modules/docker/pages/docker/conteneur.astro:82 | adverbe | `Machine locale seulement` | « seulement » | `Accessible depuis la machine locale` | moyenne | ✅ |
| 269 |  modules/docker/pages/docker/conteneur.astro:344 | adverbe | `Nouvel essai automatique dans quelques secondes.` | « automatique », sens technique | `Le panel réessaie dans quelques secondes.` | basse | ✅ |
| 270 |  modules/docker/pages/docker/conteneur.astro:250 | fausse agentivité | `les courbes apparaissent dès qu’il démarre` | objet qui agit | `Démarrez-le pour afficher les courbes.` | basse | ✅ |
| 271 |  modules/docker/pages/docker/conteneur.astro:518,549 | cadratin | `'\r\n—— session fermée ——\r\n'` / `—— reconnexion ——` | doubles cadratins affichés dans le terminal | `-- session fermée --` / `-- reconnexion --` | haute | ✅ |
| 272 |  modules/docker/pages/docker/conteneur.astro:25,45,121,125,126,177,233,235,238,240,244,245,246,389,470 | cadratin (valeur vide affichée) | `'—'`, `max —`, `— (code de sortie …)` (15 occurrences) | cadratin comme placeholder | tiret simple `-` ou `n/a` | basse | ✅ |
| 273 |  modules/docker/pages/docker/conteneur.astro:39 | extrêmes paresseux | `Jamais` / `Toujours` | libellés de politique de redémarrage, sens technique | laisser | basse | ⏭️ libellés techniques de politique de redémarrage, sens porté |

## Onglet : Images (/docker/images)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 274 |  modules/docker/pages/docker/images.astro:167 | voix passive | `Elle pourra être retéléchargée.` | passif | `Vous pourrez la retélécharger.` | moyenne | ✅ |
| 275 |  modules/docker/scripts/run.ts:87 | adverbe | `(sinon 127.0.0.1 seulement)` | « seulement » | `(sinon 127.0.0.1)` | moyenne | ✅ |
| 276 |  modules/docker/scripts/run.ts:111 | extrêmes paresseux | `Chaque port doit être un nombre entre 1 et 65535.` | « Chaque » | `Les ports sont des nombres entre 1 et 65535.` | moyenne | ✅ |
| 277 |  modules/docker/scripts/run.ts:113 | fausse agentivité | `Chaque volume demande une source et un chemin absolu dans le conteneur.` | un volume ne demande rien | `Indiquez une source et un chemin absolu dans le conteneur pour chaque volume.` | moyenne | ✅ |
| 278 |  modules/docker/scripts/run.ts:3 | extrêmes paresseux | `jamais de mode privilegie` | commentaire | mineur | basse | ⏭️ commentaire technique, jamais porte le sens sécurité |

## Onglet : Volumes (/docker/volumes)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 279 |  modules/docker/pages/docker/volumes.astro:23 | voix passive | `Un volume attaché à un conteneur ne peut pas être supprimé. … les données sont perdues pour de bon.` | passif ×2, « pour de bon » vague | `Vous ne pouvez pas supprimer un volume attaché à un conteneur. La suppression demande de retaper son nom et détruit les données.` | haute | ✅ |
| 280 |  modules/docker/pages/docker/volumes.astro:77 | voix passive, adverbe | `Les données seront perdues définitivement.` | passif + « définitivement » | `Les données disparaissent pour de bon.` ou `Cette suppression détruit les données.` | haute | ✅ |
| 281 |  modules/docker/pages/docker/volumes.astro:76 | extrême | `la perte est définitive` | redondant avec la ligne 77 | `Ce volume appartient à un projet protégé.` | basse | ✅ |

## Onglet : Networks (/docker/reseaux)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 282 |  modules/docker/pages/docker/reseaux.astro:30 | adverbe | `ce qui n’arrive normalement pas` | « normalement » | `Docker n’a renvoyé aucun réseau : vérifiez le démon.` | haute | ✅ |
| 283 |  modules/docker/pages/docker/reseaux.astro:21 | voix passive | `ne peuvent pas être supprimés` | passif | `Vous ne pouvez pas supprimer les réseaux système (bridge, host, none) ni ceux qui ont des conteneurs.` | moyenne | ✅ |
| 284 |  modules/docker/pages/docker/reseaux.astro:75 | voix passive | `Le réseau sera supprimé.` | passif | `Cette action supprime le réseau.` | moyenne | ✅ |

## Onglet : Builds (/docker/builds)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 285 |  modules/docker/pages/docker/builds.astro:34 | adverbe | `seulement le cache du constructeur classique` | « seulement » | `Buildx n’est pas installé sur cette machine : le panel affiche le cache du constructeur classique, sans historique des builds.` | moyenne | ✅ |
| 286 |  modules/docker/scripts/prune.ts:26 | voix passive | `Éléments qui seront supprimés` | passif (aria-label de la fenêtre de nettoyage) | `Éléments à supprimer` | moyenne | ✅ |
| 287 |  modules/docker/scripts/prune.ts:38 | contraste binaire, adverbe | `(pas seulement les « dangling »)` / `(pas seulement le cache orphelin)` | « pas seulement » | `Aussi toutes les images inutilisées, en plus des « dangling »` | moyenne | ✅ |
| 288 |  modules/docker/scripts/prune.ts:67 | voix passive | `est épargné` | passif | `Le panel épargne le projet protégé « … ».` | moyenne | ✅ |
| 289 |  modules/docker/server/docker.js:530,540 | adverbe | `Seulement les images sans nom ni étiquette` / `Seulement le cache orphelin` | note affichée dans la fenêtre de nettoyage | `Images sans nom ni étiquette (« dangling »).` / `Cache orphelin (« dangling »).` | moyenne | ✅ |
| 290 |  modules/docker/server/docker.js:534 | adverbe, voix passive | `Volumes anonymes inutilisés seulement … Les données supprimées sont perdues pour de bon.` | « seulement », passif, expression vague | `Volumes anonymes inutilisés (les volumes nommés restent). Vous perdez leurs données.` | haute | ✅ |

## Onglet : Transverse Docker (module.json, shell, scripts, serveur, install)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 291 |  modules/docker/module.json:23 | voix passive, extrême | `jamais montables … sont toujours refusés` | passif, « jamais/toujours » | `Dossiers hôte supplémentaires que le panel refuse de monter … (il refuse aussi le socket Docker et le dossier du panel).` | moyenne | ✅ |
| 292 |  modules/docker/uninstall.sh:3 | voix passive, extrême | `ils ne sont jamais touchés` | commentaire, passif | `le module ne les touche pas` | moyenne | ✅ |
| 293 |  modules/docker/server/docker.js:7,8,25,68,130,515,546 | extrêmes paresseux | `Toujours execFile/spawn … jamais de shell`, `jamais supprimables`, `aucun minuteur`, `ne sont jamais nettoyes`, `pas seulement dans l'interface` (7 occurrences) | commentaires | mineur, laisser ou reformuler à l'affirmatif | basse | ⏭️ commentaires d'invariants de sécurité, jamais porte le sens |
| 294 |  modules/docker/components/DockerShell.astro:6,81,243 | adverbe | `seulement`, `toujours sur ecran tactile` | commentaires | mineur | basse | ⏭️ commentaires CSS/code, sens technique |
| 295 |  modules/docker/components/DockerShell.astro:49 | cadratin (valeur vide affichée) | `'—'` | placeholder RAM | `-` | basse | ✅ |
| 296 |  modules/docker/scripts/format.ts:5,19,23 | cadratin (valeur vide affichée) | `return '—'` (3 occurrences) | placeholder | `-` ou `n/a` | basse | ✅ corrigé au 2e passage (code et test alignés sur « - ») |
| 297 |  modules/docker/server/validate.js:27,33 | extrêmes paresseux | `Jamais montables`, `jamais un dossier cache` | commentaires | mineur | basse | ⏭️ commentaires d'invariants de sécurité, jamais porte le sens |

## Onglet : Connexion à l'API (/tailscale/api)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 298 |  modules/tailscale/components/TsConnect.astro:92 | voix passive | `Les identifiants seront effacés de ce serveur.` | passif | `Le panel efface les identifiants de ce serveur.` | haute | ✅ |
| 299 |  modules/tailscale/components/TsConnect.astro:14 | fausse agentivité | `La console lit et modifie votre tailnet par l’API Tailscale.` | une console ne lit pas | `Vous lisez et modifiez votre tailnet par l’API Tailscale.` | basse | ✅ |
| 300 |  modules/tailscale/scripts/tailscale-console/api.ts:35 | cadratin | `.join(' — ')` | séparateur dans un message d'erreur affiché | `.join(' : ')` | haute | ✅ |
| 301 |  modules/tailscale/pages/api/tailscale/credentials.ts:7 | formule à citer, extrême | `Le secret entre, il ne ressort jamais.` | commentaire, formule | `Le serveur reçoit le secret et ne le renvoie pas.` | basse | ✅ |

## Onglet : Machines (/tailscale/machines)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 302 |  modules/tailscale/scripts/tailscale-console/machine-actions.ts:287 | voix passive, adverbe | `sera définitivement retirée de votre réseau` | passif + « définitivement » | `Cette action retire ${nom} de votre réseau. Pour la rajouter, réauthentifiez-vous au tailnet depuis l'appareil.` | haute | ✅ |
| 303 |  modules/tailscale/scripts/tailscale-console/machine-actions.ts:260 | adverbe | `actuellement ${user}` | « actuellement » | supprimer `, actuellement …,` ou `, aujourd'hui …,` | moyenne | ✅ |
| 304 |  modules/tailscale/scripts/tailscale-console/machine-actions.ts:288 | méta-commentaire | `Astuce : maintenez Alt (Option)…` | équivalent de « Hint: » | `Maintenez Alt (Option) en cliquant sur « Supprimer » pour passer cette confirmation.` | moyenne | ✅ |
| 305 |  modules/tailscale/scripts/tailscale-console/machine-actions.ts:95 | extrême | `coupe toutes les connexions existantes` | « toutes » | `coupe les connexions existantes` | moyenne | ✅ |
| 306 |  modules/tailscale/scripts/tailscale-console/machine-actions.ts:307 | voix passive | `est générée, et la machine est pré-autorisée` | passif | `Le panel génère une clé d'authentification à usage unique (valable 1 heure) et pré-autorise la machine.` | moyenne | ✅ |
| 307 |  modules/tailscale/scripts/tailscale-console/machine-actions.ts:328 | voix passive, contraste | `La clé n'est affichée qu'ici : elle n'est pas conservée.` | passif ×2 | `Copiez la clé maintenant : le panel ne la conserve pas.` | moyenne | ✅ |
| 308 |  modules/tailscale/scripts/tailscale-console/machine-actions.ts:123 | jargon | `dans le respect de vos ACL` | formule vague | `selon vos ACL` | basse | ✅ |
| 309 |  modules/tailscale/scripts/tailscale-console/machine-actions.ts:68 | cadratin (valeur vide affichée) | `${d.hostname \|\| '—'}` | placeholder | `-` | basse | ✅ |
| 310 |  modules/tailscale/pages/tailscale/machines/index.astro:103,132,143 | cadratin (valeur vide affichée) | `'—'` (3 occurrences) | placeholder | `-` ou `n/a` | basse | ✅ corrigé au 2e passage (code et test alignés sur « - ») |

## Onglet : Fiche machine (/tailscale/machines/[id])

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 311 |  modules/tailscale/pages/tailscale/machines/[id].astro:51,56,65,66,67,68,69,70,71,72,98,119,121 | cadratin (valeur vide affichée) | `'—'` (13 occurrences) | placeholder | `-` ou `n/a` | basse | ✅ |
| 312 |  modules/tailscale/pages/tailscale/machines/[id].astro:126,138 | cadratin (valeur vide affichée) | `<dt>—</dt>` (2 occurrences) | libellé de liste réduit à un cadratin | supprimer le `<dt>` ou `-` | basse | ✅ |

## Onglet : Démarrage SSH (/tailscale/machines/[id]/ssh)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 313 |  modules/tailscale/pages/tailscale/machines/[id]/ssh.astro:50 | adverbe | `contient déjà au moins une règle` | « déjà » | `Votre politique contient au moins une règle ssh. Vérifiez qu’elle couvre cette machine.` | moyenne | ✅ |
| 314 |  modules/tailscale/pages/tailscale/machines/[id]/ssh.astro:51 | voix passive | `les connexions SSH seront refusées` | passif | `Aucune règle ssh n’existe : Tailscale refusera les connexions SSH.` | moyenne | ✅ |

## Onglet : Ce serveur (/tailscale/ce-serveur)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 315 |  modules/tailscale/pages/tailscale/ce-serveur.astro:363 | adverbe, fausse agentivité, extrême | `Volontairement absent d’ici : … l’un de ces réglages couperait le panel sans moyen de le réparer depuis le panel.` | adverbe, objet qui agit | `Absents de cette page : se déconnecter, quitter le compte, le mode bouclier et le choix d’un nœud de sortie. Ces réglages coupent le panel, que seul Tailscale rend joignable, et vous ne pourriez plus le réparer d'ici.` | haute | ✅ |
| 316 |  modules/tailscale/pages/tailscale/ce-serveur.astro:289 | adverbe | `il doit rester joignable directement` | « directement » | `il doit rester joignable sans intermédiaire` | haute | ✅ |
| 317 |  modules/tailscale/pages/tailscale/ce-serveur.astro:244 | contraste binaire, extrême | `« Direct » : … c’est le plus rapide. « Relais » : … plus lent mais toujours chiffré` | « toujours », contraste | `« Direct » : les deux appareils se parlent sans intermédiaire (le plus rapide). « Relais » : le trafic passe par un serveur DERP, plus lent, et reste chiffré de bout en bout.` | moyenne | ✅ |
| 318 |  modules/tailscale/pages/tailscale/ce-serveur.astro:296 | contraste binaire | `servies par le panel, sous /nom, pas par Tailscale Serve ou Funnel` | « pas par » | `Le panel sert les applications sous /nom, sans Tailscale Serve ni Funnel.` | moyenne | ✅ |
| 319 |  modules/tailscale/pages/tailscale/ce-serveur.astro:334 | voix passive | `n’ont pas pu être lues. Actualisez la page dans un instant.` | passif | `Le panel n’a pas pu lire les préférences de Tailscale. Actualisez la page.` | moyenne | ✅ |
| 320 |  modules/tailscale/pages/tailscale/ce-serveur.astro:139 | voix passive | `Une version plus récente de Tailscale est publiée.` | passif | `Tailscale a publié une version plus récente.` | moyenne | ✅ |
| 321 |  modules/tailscale/pages/tailscale/ce-serveur.astro:346 | extrême | `Tout appareil autorisé par les règles d’accès … pourra ouvrir une session` | « Tout » | `Un appareil autorisé par les règles d’accès pourra ouvrir une session …` | moyenne | ✅ |
| 322 |  modules/tailscale/pages/tailscale/ce-serveur.astro:256,265 | extrême | `Chaque appareil est joignable par son nom.` / `Toutes les requêtes passent par le résolveur par défaut.` | « Chaque », « Toutes » | `Les appareils sont joignables par leur nom.` / `Les requêtes passent par le résolveur par défaut.` | moyenne | ✅ |
| 323 |  modules/tailscale/pages/tailscale/ce-serveur.astro:348 | fausse agentivité | `Tailscale s’installe seul quand une version plus récente est publiée.` | un logiciel ne s'installe pas seul | `Tailscale se met à jour dès qu’une version plus récente existe.` | moyenne | ✅ |
| 324 |  modules/tailscale/pages/tailscale/ce-serveur.astro:167 | fausse agentivité | `la page se met à jour toute seule` | objet qui agit | `la page se rafraîchit` | basse | ✅ |
| 325 |  modules/tailscale/pages/tailscale/ce-serveur.astro:65 | extrême | `jamais désigné par son nom réel` | commentaire | mineur | basse | ✅ |
| 326 |  modules/tailscale/pages/tailscale/ce-serveur.astro:68,126,152,156,236,259,268,354 | cadratin (valeur vide affichée) | `'—'` (8 occurrences) | placeholder | `-` ou `n/a` | basse | ✅ |
| 327 |  modules/tailscale/scripts/tailscale.ts:31 | cadratin (valeur vide affichée) | `value \|\| '—'` | placeholder | `-` | basse | ✅ |
| 328 |  modules/tailscale/scripts/tailscale.ts:174 | adverbe | `uniquement sur cette page` | commentaire | `sur cette page` | basse | ✅ |
| 329 |  modules/tailscale/pages/tailscale/index.astro | | | | Aucun relevé. | | ⏭️ aucun relevé |

## Onglet : Utilisateurs (/tailscale/users)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 330 |  modules/tailscale/scripts/tailscale-console/users.ts:84 | voix passive | `l’invitation a été envoyée par e-mail` | passif | `Tailscale a envoyé l’invitation par e-mail.` | haute | ✅ |
| 331 |  modules/tailscale/scripts/tailscale-console/users.ts:57 | voix passive | `Ses machines seront retirées du tailnet.` | passif | `Tailscale retire ses machines du tailnet.` | moyenne | ✅ |
| 332 |  modules/tailscale/pages/tailscale/users.astro:25 | cadratin (valeur vide affichée) | `return '—'` | placeholder | `-` | basse | ✅ |

## Onglet : Règles d'accès (/tailscale/acls)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 333 |  modules/tailscale/pages/tailscale/acls/index.astro:37 | voix passive, extrême | `Chaque modification est validée puis enregistrée dans le fichier de politique.` | passif + « Chaque » | `Le panel valide puis enregistre vos modifications dans le fichier de politique.` | haute | ✅ |
| 334 |  modules/tailscale/scripts/tailscale-console/acl.ts:60 | voix passive | `Cette règle sera retirée de la politique. Les accès qu’elle autorisait seront coupés.` | passif ×2 | `Cette action retire la règle de la politique et coupe les accès qu’elle autorisait.` | haute | ✅ |
| 335 |  modules/tailscale/scripts/tailscale-console/acl.ts:100 | voix passive, adverbe | `ne sera plus approuvée automatiquement` | passif + « automatiquement » | `Tailscale n’approuvera plus la route ${cidr} sans intervention.` | haute | ✅ |
| 336 |  modules/tailscale/pages/tailscale/acls/index.astro:126 | voix passive | `sont acceptées sans intervention` | passif | `Tailscale accepte sans intervention les routes de sous-réseau annoncées par ces approbateurs.` | moyenne | ✅ |
| 337 |  modules/tailscale/pages/tailscale/acls/index.astro:145 | voix passive, adverbe | `Aucune route approuvée automatiquement … devront être approuvées à la main` | passif, « automatiquement » (sens technique) | `Aucune route à approbation automatique` / `Vous approuverez les routes annoncées à la main.` | moyenne | ✅ |
| 338 |  modules/tailscale/scripts/tailscale-console/acl-client.ts:48 | voix passive | `les commentaires seront perdus` | passif | `cette modification réécrit la politique en JSON et supprime les commentaires.` | haute | ✅ |
| 339 |  modules/tailscale/scripts/tailscale-console/acl-client.ts:10 | adverbe | `a changé entre-temps` | « entre-temps » (repris dans acl-model.ts:69,96) | `La politique a changé, rechargez la page.` | moyenne | ✅ |
| 340 |  modules/tailscale/pages/tailscale/acls/index.astro:72 | cadratin (valeur vide affichée) | `v.comment \|\| '—'` | placeholder | `-` | basse | ✅ |

## Onglet : Fichier de politique (/tailscale/acls/file)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 341 |  modules/tailscale/pages/tailscale/acls/file.astro:20 | adverbe, voix passive | `Modifiez directement le fichier de politique (HuJSON : les commentaires sont conservés).` | « directement », passif | `Modifiez le fichier de politique (HuJSON : l’éditeur conserve les commentaires).` | haute | ✅ |

## Onglet : Tests (/tailscale/acls/tests)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 342 |  modules/tailscale/pages/tailscale/acls/tests.astro:23 | voix passive, extrême | `Des tests d’accès vérifiés à chaque enregistrement … la modification est refusée.` | passif, « chaque » | `Tailscale exécute ces tests d’accès à l’enregistrement de la politique et refuse la modification si l’un échoue.` | haute | ✅ |
| 343 |  modules/tailscale/pages/tailscale/acls/tests.astro:48 | voix passive | `ne sera pas cassée par une future modification` | passif | `Ajoutez un test pour garder une règle d’accès intacte lors des prochaines modifications.` | moyenne | ✅ |
| 344 |  modules/tailscale/scripts/tailscale-console/acl-tests.ts:44 | voix passive | `Le test pour « ${src} » sera retiré de la politique.` | passif | `Cette action retire de la politique le test pour « ${src} ».` | haute | ✅ |
| 345 |  modules/tailscale/pages/tailscale/acls/tests.astro:40 | cadratin (valeur vide affichée) | `t.proto ?? '—'` | placeholder | `-` | basse | ✅ |

## Onglet : Définitions (/tailscale/acls/definitions)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 346 |  modules/tailscale/pages/tailscale/acls/definitions.astro:11 | mot interrogatif en tête, extrême | `Qui peut attribuer chaque tag (tag:nom) à une machine.` | « Qui… », « chaque » | `Utilisateurs autorisés à attribuer un tag (tag:nom) à une machine.` | moyenne | ✅ |
| 347 |  modules/tailscale/scripts/tailscale-console/acl-definitions.ts:52 | voix passive | `l’enregistrement sera refusé tant qu’elles existent` | passif | `Tailscale refusera l’enregistrement tant qu’elles existent.` | moyenne | ✅ |

## Onglet : Journaux (/tailscale/logs, /tailscale/logs/network)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 348 |  modules/tailscale/pages/tailscale/logs/index.astro:21 | voix passive | `Se configure dans la console officielle.` | passif pronominal | `Configurez-la dans la console officielle.` | moyenne | ✅ |
| 349 |  modules/tailscale/pages/tailscale/logs/index.astro:14 | voix passive | `les modifications apportées à la configuration` | participe passif | `les modifications de la configuration de votre tailnet` | basse | ✅ |
| 350 |  modules/tailscale/scripts/tailscale-console/logs.ts:13,40,42,88 | cadratin (valeur vide affichée) | `'—'` (4 occurrences) | placeholder | `-` | basse | ✅ |
| 351 |  modules/tailscale/scripts/tailscale-console/logs-model.ts:21,22,34,71 | cadratin (valeur vide affichée) | `'—'` (4 occurrences) | placeholder | `-` | basse | ✅ corrigé au 2e passage (code et test alignés sur « - ») |
| 352 |  modules/tailscale/scripts/tailscale-console/logs-model.ts:69 | cadratin | `ou « — » si absente` | commentaire | `ou « - » si absente` | moyenne | ✅ corrigé au 2e passage (code et test alignés sur « - ») |

## Onglet : DNS (/tailscale/dns)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 353 |  modules/tailscale/pages/tailscale/dns.astro:129 | extrême | `le domaine de votre tailnet est toujours le premier domaine de recherche` | « toujours » | `le domaine de votre tailnet est le premier domaine de recherche` | moyenne | ✅ |
| 354 |  modules/tailscale/pages/tailscale/dns.astro:73 | cadratin (valeur vide affichée) | `{suffix \|\| '—'}` | placeholder | `-` | basse | ✅ |

## Onglet : Services (/tailscale/services)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 355 |  modules/tailscale/pages/tailscale/services.astro:41 | voix passive, adverbe | `sans qu’ils soient encore définis` | passif + « encore » | `Les services découverts sont ceux que vos machines exposent sans définition.` | moyenne | ✅ |
| 356 |  modules/tailscale/scripts/tailscale-console/services.ts:16 | voix passive | `Seul le protocole tcp est pris en charge.` | passif | `Le panel prend en charge le protocole tcp.` | moyenne | ✅ |
| 357 |  modules/tailscale/pages/tailscale/services.astro:67 | adverbe | `laissez la politique le faire automatiquement` | « automatiquement » (sens technique) | `ou laissez la politique l’approuver` | basse | ✅ |
| 358 |  modules/tailscale/pages/tailscale/services.astro:53,54 | cadratin (valeur vide affichée) | `'—'` (2 occurrences) | placeholder | `-` | basse | ✅ |

## Onglet : Apps (/tailscale/apps)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 359 |  modules/tailscale/pages/tailscale/apps.astro:55 | fausse agentivité | `Les apps vous laissent contrôler l’accès à vos applications SaaS tierces` | objet qui agit | `Contrôlez l’accès à vos applications SaaS tierces, sans configuration chez les utilisateurs.` | basse | ✅ |

## Onglet : Réglages (/tailscale/settings/*)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 360 |  modules/tailscale/pages/tailscale/settings/index.astro:82 | adverbe | `Supprime définitivement le tailnet, ses machines et ses utilisateurs.` | « définitivement » ; énumération en trois | `Supprime le tailnet et ses machines. Action irréversible.` | haute | ✅ |
| 361 |  modules/tailscale/scripts/tailscale-console/settings-keys.ts:38 | voix passive | `elle ne sera plus affichée` | passif | `Copiez cette clé maintenant : le panel ne la réaffichera pas.` | haute | ✅ |
| 362 |  modules/tailscale/scripts/tailscale-console/settings-webhooks.ts:28 | voix passive | `il ne sera plus affiché` | passif | `Copiez ce secret maintenant : le panel ne le réaffichera pas.` | haute | ✅ |
| 363 |  modules/tailscale/scripts/tailscale-console/settings-webhooks.ts:84 | adverbe | `cesse de fonctionner immédiatement` | « immédiatement » | `L’ancien secret ne fonctionne plus.` | haute | ✅ |
| 364 |  modules/tailscale/scripts/tailscale-console/settings-keys.ts:48 | adverbe | `Les machines déjà enregistrées` | « déjà » | `Les machines enregistrées avec cette clé restent connectées, mais la clé ne fonctionnera plus.` | moyenne | ✅ |
| 365 |  modules/tailscale/scripts/tailscale-console/settings-keys.ts:12 | voix passive | `Les machines sont retirées quand elles se déconnectent.` | passif | `Tailscale retire les machines à leur déconnexion.` | moyenne | ✅ |
| 366 |  modules/tailscale/pages/tailscale/settings/keys.astro:27,63 | adverbe | `Vous n’avez pas encore de clé d’authentification.` / `pas encore de jeton d’accès` | « encore », redondant avec le titre | supprimer le paragraphe ou `Créez-en une avec le bouton ci-dessus.` | moyenne | ✅ |
| 367 |  modules/tailscale/pages/tailscale/settings/webhooks.astro:23 | adverbe | `Vous n’avez pas encore de point de terminaison.` | « encore », redondant | supprimer le paragraphe | moyenne | ✅ |
| 368 |  modules/tailscale/pages/tailscale/settings/device-management.astro:25 | extrême | `Un admin doit approuver chaque appareil avant qu’il rejoigne le tailnet.` | « chaque » | `Un admin doit approuver un appareil avant qu’il rejoigne le tailnet.` | moyenne | ✅ |
| 369 |  modules/tailscale/pages/tailscale/settings/user-management.astro:33 | extrême | `approuver chaque nouvel utilisateur` | « chaque » | `approuver un nouvel utilisateur avant qu’il rejoigne le tailnet` | moyenne | ✅ |
| 370 |  modules/tailscale/pages/tailscale/settings/device-management.astro:28 | voix passive | `doivent être signées par un nœud de confiance` | passif | `Un nœud de confiance doit signer les nouvelles clés de nœud.` | moyenne | ✅ |
| 371 |  modules/tailscale/pages/tailscale/settings/device-management.astro:53 | fausse agentivité, adverbe | `Mettre à jour automatiquement … installent seules` | machines qui agissent seules | `Mettre à jour les nouveaux appareils` / `Les nouvelles machines installent les versions du client.` | basse | ✅ |
| 372 |  modules/tailscale/pages/tailscale/settings/policy-file-management.astro:27 | voix passive | `Enregistré à la sortie du champ.` | passif elliptique | `Le panel enregistre à la sortie du champ.` | basse | ✅ |
| 373 |  modules/tailscale/pages/tailscale/settings/billing.astro:31 | voix passive | `Le plan réel n’est pas exposé par l’API` | passif | `L’API n’indique pas le plan réel : consultez la console officielle.` | moyenne | ✅ |
| 374 |  modules/tailscale/scripts/tailscale-console/settings-common.ts:38 | voix passive | `doit être comprise entre 1 et 180 jours` | passif | `Entrez une durée entre 1 et 180 jours.` | basse | ✅ |

## Onglet : Transverse Tailscale (module.json, serveur, install, styles)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 375 |  modules/tailscale/server/tailscale.ts:5,9 | cadratin | `…`whois` — tout cela marche sans` / `sudo -n` — le même chemin que le pare-feu — et UNIQUEMENT pour` (2 lignes, 3 cadratins) | cadratins dans un commentaire | virgules ou points | moyenne | ✅ |
| 376 |  modules/tailscale/server/tailscale.ts:9-13 | adverbe, fausse agentivité | `UNIQUEMENT … Rien de ce qui pourrait couper le panel n'y figure` | adverbe, phrase de 5 lignes | `Seule une liste fermée de réglages (SETTINGS) passe par sudo -n. Elle exclut tout réglage qui couperait le panel.` | moyenne | ✅ |
| 377 |  modules/tailscale/styles/tailscale-console.css:2 | cadratin | `Console Tailscale (/tailscale/*) — reproduction de la console` | commentaire CSS | `Console Tailscale (/tailscale/*) : reproduction de la console` | moyenne | ✅ |
| 378 |  modules/tailscale/server/tailscale-api.ts:7 | voix passive, extrême | `ne sont jamais renvoyés au navigateur` | commentaire | `Le serveur ne les renvoie pas au navigateur` | moyenne | ✅ |
| 379 |  modules/tailscale/server/tailscale-api.ts:96,197 | adverbe, extrême | `Le HuJSON se demande explicitement` / `on vérifie toujours` | commentaires | mineur | basse | ⏭️ commentaire de 96 conservé car la correction proposée n'existe pas, 197 corrigé |
| 380 |  modules/tailscale/server/tailscale.ts:278-280 | extrême | `la page ne doit jamais l'attendre` | commentaire | mineur | basse | ✅ |
| 381 |  modules/tailscale/module.json:23 (env PANEL_DATA_DIR) | voix passive | `où est enregistré tailscale-api.json` | passif | `où le module enregistre tailscale-api.json` | moyenne | ✅ |
| 382 |  modules/tailscale/uninstall.sh:3 | voix passive, extrême | `supprimé seulement sur demande de purge … ne sont jamais touchés` | passif, « seulement », « jamais » | `le module le supprime à la demande de purge … Il ne touche ni Tailscale ni le réseau privé.` | moyenne | ✅ |
Chemins relatifs à /home/ubuntu/dev/orvane. Chaque module n'a qu'un onglet dans module.json ; les sous-vues (salons Discord, vues GitHub, pages de dépôt) sont traitées dans leur onglet.
Les fichiers sous modules/*/tests n'ont pas été relus. Les commentaires ont été relevés par recherche de motifs (cadratins, passifs, adverbes, jamais/tout), pas relus ligne à ligne.

## Onglet : Applications (/projets)

| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 383 |  modules/apps/scripts/apps.ts:127 | voix passive | `« ${label} » sera arrêtée et retirée de la liste.` | Passif futur dans une boîte de confirmation | `Le panel arrête « ${label} » et la retire de la liste. Ses fichiers restent dans son dossier sauf si vous cochez la case.` | haute | ✅ |
| 384 |  modules/apps/scripts/apps.ts:113 | voix passive | `« ${app.name} » est créée et démarre.` | Passif dans un toast | `Application « ${app.name} » créée, elle démarre.` | haute | ✅ |
| 385 |  modules/apps/pages/projets.astro:68 | adverbe | `elle démarre et reçoit une adresse automatiquement.` | Adverbe isolé | `elle démarre et reçoit une adresse.` | moyenne | ✅ |
| 386 |  modules/apps/uninstall.sh:6 | voix passive | `le relais /<id>/ est coupé.` | Passif dans le message de désinstallation | `Module Applications retiré. Le panel conserve services, projets et registre, et coupe le relais /<id>/.` | moyenne | ✅ |
| 387 |  modules/apps/server/projects.ts:7,43,64,166 | voix passive | `le panel doit refleter un service qui vient de tomber` / `Fichiers modifies non commites` | Passif et fausse agentivité (la page « doit refléter ») dans des commentaires | Réécrire avec sujet humain (`on veut voir ...`) | basse | ✅ |
| 388 |  modules/apps/server/apps.ts:121 | voix passive | `L’adresse /${id} est déjà prise.` | Passif d'état (erreur UI), motif léger | `Une autre application utilise déjà l’adresse /${id}.` | moyenne | ✅ |

## Onglet : Discord (/bot)

Sous-vues (salons) : console, serveurs, commandes, variables, mises-à-jour, sauvegardes, réglages, assistant de création.
| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 389 |  modules/discord-bot/pages/bot.astro:180 (salon variables) | voix passive / extrême | `ne sont jamais réaffichés : laissez le champ vide pour les garder.` | Passif et « jamais » | `Le panel masque les secrets (TOKEN, SECRET, KEY, PASSWORD) : laissez le champ vide pour les garder.` | haute | ✅ |
| 390 |  modules/discord-bot/pages/bot.astro:350 (assistant, étape 2) | voix passive / extrême | `Vérifié auprès de Discord par le serveur, puis gardé côté serveur : il n’est jamais réaffiché.` | Trois passifs et « jamais » | `Le serveur vérifie le jeton auprès de Discord, le garde de son côté et ne l’affiche plus.` | haute | ✅ |
| 391 |  modules/discord-bot/pages/bot.astro:166 (salon serveurs) | voix passive | `Le bot n’est encore invité nulle part` | Passif | `Aucun serveur n’a invité le bot : utilisez le lien d’invitation du panneau d’état.` | haute | ✅ |
| 392 |  modules/discord-bot/pages/bot.astro:207 (salon mises-à-jour) | adverbe / voix passive | `modifié(s) localement (une mise à jour qui les touche sera refusée)` | Adverbe « localement » et passif futur | `modifié(s) en local. Une mise à jour qui les touche échouera :` | haute | ✅ |
| 393 |  modules/discord-bot/pages/bot.astro:209 | voix passive | `Branches en avance sur la version en place, appliquées en avance rapide (hooks git désactivés), puis le bot redémarre.` | Participes passifs, sujet absent | `Le panel applique les branches en avance sur la version en place en avance rapide (hooks git désactivés), puis redémarre le bot.` | moyenne | ✅ |
| 394 |  modules/discord-bot/pages/bot.astro:236 (salon réglages) | adverbe / voix passive | `Appliquées tout de suite, sans redémarrer le bot. ... le bot est tué puis relancé selon la politique choisie.` | « tout de suite », passifs | `Le panel applique les limites sans redémarrer le bot. 0 = sans plafond. Au-delà du plafond mémoire, systemd tue le bot puis le relance selon la politique choisie.` | haute | ✅ |
| 395 |  modules/discord-bot/pages/bot.astro:251 | adverbe | `Dans le panel seulement ; le nom Discord se change sur le portail.` | Adverbe | `Visible dans le panel ; changez le nom Discord sur le portail.` | moyenne | ✅ |
| 396 |  modules/discord-bot/pages/bot.astro:342 (assistant, étape 1) | voix passive | `(il n’est montré qu’une fois)` | Passif | `(Discord ne le montre qu’une fois)` | moyenne | ✅ |
| 397 |  modules/discord-bot/pages/bot.astro:343 | adverbe / énumération en trois | `Toujours dans Bot, ... activez Presence, Server Members ou Message Content seulement si votre bot en a besoin.` | « Toujours » et « seulement » ; trois noms d'intents (noms officiels, à garder) | `Dans le même onglet Bot, section Privileged Gateway Intents : activez Presence, Server Members ou Message Content selon les besoins de votre bot.` | moyenne | ✅ |
| 398 |  modules/discord-bot/pages/bot.astro:358 (étape 3) | adverbe / voix passive | `Les intents privilégiés doivent aussi être activés sur le portail.` | Adverbe « aussi », infinitif passif | `Activez les intents privilégiés sur le portail.` | moyenne | ✅ |
| 399 |  modules/discord-bot/scripts/discord.ts:10 | voix passive / adverbe | `Le processus est tué sur-le-champ (SIGKILL), sans fermeture propre` | Passif | `SIGKILL tue le processus sur-le-champ, sans fermeture propre : réservez-le à un bot bloqué.` | haute | ✅ |
| 400 |  modules/discord-bot/scripts/discord.ts:129 | voix passive | `La ligne est retirée du fichier .env. Les autres modifications non enregistrées du formulaire sont perdues.` | Deux passifs | `Le panel retire la ligne du fichier .env. Vous perdez les autres modifications non enregistrées du formulaire.` | haute | ✅ |
| 401 |  modules/discord-bot/scripts/discord.ts:146 | voix passive | `Le bot, son unité et tout son dossier sont effacés. Irréversible.` / `Le bot et son unité sont effacés ; son dossier reste sur le disque.` | Passifs | `Le panel efface le bot, son unité et tout son dossier. Irréversible.` / `Le panel efface le bot et son unité ; son dossier reste sur le disque.` | haute | ✅ |
| 402 |  modules/discord-bot/scripts/discord.ts:164 | voix passive | `La base actuelle est remplacée par ${name}. Elle est d’abord sauvegardée, et le bot est arrêté le temps de l’opération.` | Trois passifs | `Le panel sauvegarde la base actuelle, arrête le bot le temps de l’opération, puis la remplace par ${name}.` | haute | ✅ |
| 403 |  modules/discord-bot/scripts/discord.ts:274 | adverbe | `Cliquez sur Suivant pour continuer quand même.` | Adverbe | `Cliquez sur Suivant pour continuer.` | moyenne | ✅ |
| 404 |  modules/discord-bot/server/bot.ts:198 | adverbe | `tapez exactement le nom du bot.` | Adverbe | `tapez le nom du bot à l’identique.` | moyenne | ✅ |
| 405 |  modules/discord-bot/server/wizard.ts:51 | adverbe | `https://github.com, gitlab.com ou codeberg.org uniquement, sans identifiants.` | Adverbe | `Dépôt refusé : le panel accepte https://github.com, gitlab.com ou codeberg.org, sans identifiants.` | moyenne | ✅ |
| 406 |  modules/discord-bot/install.sh:12 | voix passive | `il sera rangé dans ...` | Passif futur | `le panel le range dans ${ORVANE_DISCORD_BOTS_ROOT:-$HOME/bots}.` | moyenne | ✅ |
| 407 |  modules/discord-bot/module.json:58 | voix passive | `Créée par le panel au premier démarrage.` | Passif | `Le panel la crée au premier démarrage.` | moyenne | ✅ |
| 408 |  modules/discord-bot/module.json:78 | voix passive | `c'est lui qui est sauvegardé et restauré.` | Passif et tournure en « c'est ... qui » | `le panel sauvegarde et restaure ce dossier.` | moyenne | ✅ |
| 409 |  modules/discord-bot/pages/bot.astro:80,162,173,274,275,276,309 ; modules/discord-bot/scripts/discord.ts:98,99 ; modules/discord-bot/scripts/format.ts:5,12,16 (12 occurrences) | cadratin | `{status?.pid \|\| '—'}`, `<dd class="js-cpu">—</dd>` | Cadratin comme valeur vide affichée | tiret simple `-` ou `n/a` | basse | ✅ |
| 410 |  modules/discord-bot/server/git.ts:21 | cadratin | `le sujet du dernier commit — un seul process au lieu de trois` | Cadratin dans un commentaire | `... du dernier commit : un seul process au lieu de trois par branche.` | basse | ✅ |

## Onglet : GitHub (/github)

Sous-vues : Dépôts, Copies locales, Mon compte (/github?vue=...) ; pages de dépôt : code, fichier, branches, commits, commit, pull requests, issues, Actions.
| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 411 |  modules/github/pages/github.astro:187 (Mon compte) | voix passive / extrême | `Vérifié auprès de GitHub avant d’être enregistré sur le serveur, à votre seul usage. Il n’est jamais réaffiché.` | Trois passifs et « jamais » | `Le serveur vérifie le jeton auprès de GitHub, l’enregistre pour votre seul usage et ne l’affiche plus.` | haute | ✅ |
| 412 |  modules/github/pages/github.astro:169 (Mon compte) | voix passive | `Votre jeton personnel est supprimé du panel ; le jeton du serveur reprend sa place.` | Passif | `Le panel supprime votre jeton personnel ; le jeton du serveur reprend sa place.` | haute | ✅ |
| 413 |  modules/github/pages/github.astro:169 | voix passive / contraste binaire | `Votre jeton est supprimé du panel. Vos copies locales restent, mais vous ne verrez plus vos dépôts avant de reconnecter un compte.` | Passif et « X, mais Y » | `Le panel supprime votre jeton. Vos copies locales restent ; vos dépôts redeviennent visibles quand vous reconnectez un compte.` | haute | ✅ |
| 414 |  modules/github/pages/github.astro:202 | voix passive | `L’ancien jeton sera écrasé dans le fichier du panel.` | Passif futur | `Le panel écrase l’ancien jeton dans son fichier.` | haute | ✅ |
| 415 |  modules/github/pages/github.astro:146-147 (Copies locales) | fausse agentivité | `Sauvegarder commite tout sur une nouvelle branche ... Commiter reste sur la branche courante ; Pousser envoie ses commits ... Pull n’accepte qu’une avance rapide.` | Les boutons agissent ; « ne ... qu' » | `Sauvegarder : commit de tout sur une nouvelle branche sauvegarde/<date>, puis push (point de retour). Commiter : commit sur la branche courante. Pousser : envoi des commits vers GitHub. Pull : avance rapide uniquement.` | moyenne | ✅ |
| 416 |  modules/github/pages/github.astro:181 (Mon compte) | adverbe | `(ou seulement les dépôts voulus)` | Adverbe | `(ou une sélection de dépôts)` | moyenne | ✅ |
| 417 |  modules/github/components/Diff.astro:11 (commit, pull request) | cadratin | `{files.length >= 100 && <> — liste tronquée, <a ...>` | Cadratin visible dans la page | `. Liste tronquée, <a ...>voir tout sur GitHub</a>` | haute | ✅ |
| 418 |  modules/github/server/api.ts:105 | cadratin | `.filter(Boolean).join(' — ')` | Cadratin dans un message d'erreur affiché | `.join(' : ')` ou `.join('. ')` | haute | ✅ |
| 419 |  modules/github/pages/github.astro:122 (Dépôts) | voix passive | `Mis à jour ${ago(...)}` | Participe d'état, motif léger | `Dernier push ${ago(...)}` | basse | ⏭️ texte couvre pushed_at ou updated_at, « Dernier push » serait faux |
| 420 |  modules/github/module.json:35 | extrême paresseux | `Jamais visibles des autres comptes.` | « Jamais » en fin de description | `Les autres comptes ne les voient pas.` | moyenne | ✅ |

## Onglet : Mail (/mail)

Sous-vues : formulaire de configuration, liste de dossiers, liste de messages, lecture, composition, fenêtre Compte.
| # |  Fichier:ligne | Catégorie stop-slop | Extrait | Problème | Correction proposée | Sévérité | Statut |
|---|---|---|---|---|---|---|---|
| 421 |  modules/mail/scripts/live.ts:35 | cadratin | `Temps réel interrompu — reconnexion dans ${...} s` | Cadratin dans la bannière | `Temps réel interrompu : reconnexion dans ${...} s` | haute | ✅ |
| 422 |  modules/mail/scripts/live.ts:38 | cadratin | `'Temps réel interrompu — reconnexion en cours'` | Cadratin dans le texte pour lecteur d'écran | `'Temps réel interrompu : reconnexion en cours'` | haute | ✅ |
| 423 |  modules/mail/pages/mail.astro:90 | voix passive | `Ils sont testés avant d’être enregistrés.` | Deux passifs | `Le panel teste les identifiants avant de les enregistrer.` | haute | ✅ |
| 424 |  modules/mail/pages/mail.astro:97 | voix passive / adverbe / extrême | `lisible par le panel seulement). Le mot de passe n’est jamais renvoyé au navigateur.` | Adverbe, passif, « jamais » | `Les informations restent sur ce serveur, dans data/mail.json, que seul le panel peut lire. Le panel n’envoie pas le mot de passe au navigateur.` | haute | ✅ |
| 425 |  modules/mail/pages/mail.astro:93 | phrase interrogative | `title="Où trouver ces informations ?"` | Titre qui commence par un mot interrogatif | `Trouver ces informations` | moyenne | ✅ |
| 426 |  modules/mail/pages/mail.astro:97 | phrase interrogative | `title="Où c’est conservé"` | Titre qui commence par « Où » | `Emplacement de stockage` | moyenne | ✅ |
| 427 |  modules/mail/scripts/actions.ts:33 | voix passive | `Ce message sera supprimé sans possibilité de le récupérer.` | Passif futur | `Vous ne pourrez pas récupérer ce message.` | haute | ✅ |
| 428 |  modules/mail/scripts/composer.ts:130 | voix passive | `Le texte saisi sera perdu.` | Passif futur | `Vous perdez le texte saisi.` | haute | ✅ |
| 429 |  modules/mail/scripts/composer.ts:65 | adverbe | `· joint automatiquement` | Adverbe | `· joint au message` | moyenne | ✅ |
| 430 |  modules/mail/server/smtp.ts:38 | voix passive | `Un destinataire a été refusé par le serveur mail` | Passif | `Le serveur mail a refusé un destinataire` | haute | ✅ |
| 431 |  modules/mail/README.md:11 | adverbe / voix passive | `la messagerie est utilisable aussitôt, sans redémarrage` ; `rien n'est enregistré si l'une des deux échoue` | Adverbe, passif | `la messagerie fonctionne sans redémarrage` ; `le panel n'enregistre rien si l'une des deux échoue` | haute | ✅ |
| 432 |  modules/mail/README.md:15 | voix passive / adverbe / extrême | `Les valeurs sont écrites dans data/mail.json (mode 600, lisible par le panel seulement). Le mot de passe n'est jamais renvoyé au navigateur. ... prend effet tout de suite.` | Passif, « seulement », « jamais », « tout de suite » | `Le panel écrit les valeurs dans data/mail.json (mode 600, lisible par le panel uniquement)...` à réécrire en actif : `Seul le panel lit data/mail.json (mode 600). Il n'envoie pas le mot de passe au navigateur. Un changement fait dans l'onglet prend effet à l'enregistrement.` | haute | ✅ |
| 433 |  modules/mail/README.md:52 | adverbe | `Le panel vérifie toujours le certificat.` | Adverbe | `Le panel vérifie le certificat.` | moyenne | ✅ |
| 434 |  modules/mail/README.md:65 | voix passive | `Les pièces jointes sont plafonnées à 25 Mo par envoi.` | Passif | `Le panel plafonne les pièces jointes à 25 Mo par envoi.` | moyenne | ✅ |
| 435 |  modules/mail/README.md:17 | phrase interrogative | `**Où trouver ces informations**` | Titre qui commence par « Où » | `**Trouver ces informations**` | moyenne | ✅ |
| 436 |  modules/mail/README.md:80 | adverbe | `## Pas encore fait` | Titre avec adverbe | `## À faire` | basse | ✅ |
| 437 |  modules/mail/scripts/main.ts:140 | cadratin | `rechargement en place (temps reel) — la liste, la selection` | Cadratin dans un commentaire | `... (temps reel) : la liste, la selection ...` | basse | ✅ |
