# Modules

Le guide des auteurs de modules est en ligne : <https://orvanes.tech/docs/creer-un-module>.

## Publication (mainteneur)

Les sources des modules sont dans le dépôt `orvane-magasin`.

- **Publier** : seulement depuis le serveur qui détient la clé privée, avec `npm run magasin -- publier <id>|--tous` ou le bouton « Publier » de la page Magasin. Il faut `ORVANE_MAGASIN_SOURCES`, `ORVANE_MAGASIN_PUBLIC` et `ORVANE_MAGASIN_KEY` (voir `.env.example`). Republier une version existante avec un autre contenu est refusé : il faut augmenter `version`.
