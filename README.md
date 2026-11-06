<img src="docs/brand/orvanes-logo-clair.png" alt="Orvanes" width="220">

# Orvanes

Orvanes est un panel web d'administration pour un VPS Debian ou Ubuntu : état du système, processus, services systemd, réseau et pare-feu, fichiers, journaux et terminal. Des modules ajoutent d'autres onglets (Docker, Claude, Minecraft, mail…) ; vous installez ceux dont vous avez besoin depuis le panel.

## Installation

Sur Debian 12+ ou Ubuntu 22.04+, connecté en SSH avec le compte qui fera tourner le panel :

```bash
curl -fsSL https://orvanes.tech/install | bash
```

## Documentation

Toute la documentation est sur **[orvanes.tech/docs](https://orvanes.tech/docs)** : [installation](https://orvanes.tech/docs/installation), [premier accès](https://orvanes.tech/docs/premier-acces), [spécifications techniques](https://orvanes.tech/docs/specifications), [variables](https://orvanes.tech/docs/variables), [API HTTP](https://orvanes.tech/docs/api) et [création de modules](https://orvanes.tech/docs/creer-un-module).

## Licence

[AGPL-3.0](LICENSE). Failles de sécurité : voir [SECURITY.md](SECURITY.md). Historique : [CHANGELOG.md](CHANGELOG.md).
