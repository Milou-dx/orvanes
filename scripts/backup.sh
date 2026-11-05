#!/usr/bin/env bash
# Sauvegarde data/ et .env dans une archive privée. Le panel s'arrête quelques secondes pour que la base SQLite soit cohérente.
set -euo pipefail
cd "$(dirname "$0")/.."
dest="${1:-$HOME/orvane-sauvegardes}"
umask 077
mkdir -p "$dest"
file="$dest/orvane-$(date +%Y%m%d-%H%M%S).tar.gz"
data="${PANEL_DATA_DIR:-data}"
if systemctl --user is-active -q orvane 2>/dev/null; then
  trap 'systemctl --user start orvane' EXIT
  systemctl --user stop orvane
fi
tar -czf "$file" "$data" .env
echo "Sauvegarde : $file ($(du -h "$file" | cut -f1)). Elle contient vos secrets : gardez-la en lieu sûr, hors du serveur."
