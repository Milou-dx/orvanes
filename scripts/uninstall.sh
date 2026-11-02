#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd -P)"
purge=0
yes=0
for arg in "$@"; do
  case "$arg" in
    --purge) purge=1 ;;
    --yes) yes=1 ;;
    *) echo "Option inconnue : $arg (--purge, --yes)" >&2; exit 2 ;;
  esac
done

echo "[1/2] Service"
unit="$HOME/.config/systemd/user/orvane.service"
if [ -f "$unit" ]; then
  export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
  systemctl --user disable -q --now orvane 2>/dev/null || true
  rm -f "$unit"
  rm -rf "$unit.d"
  systemctl --user daemon-reload 2>/dev/null || true
  echo "      Service orvane arrêté et supprimé"
else
  echo "      Aucun service orvane"
fi

echo "[2/2] Fichiers"
if [ "$purge" != 1 ]; then
  echo "      Dossier conservé : $root (configuration dans .env, données dans data/)."
  echo "      Pour tout supprimer : $root/scripts/uninstall.sh --purge"
  exit 0
fi
if [ ! -f "$root/serve.mjs" ] || [ ! -f "$root/package.json" ] || [ "$root" = / ] || [ "$root" = "$HOME" ]; then
  echo "      $root ne ressemble pas au dossier du panel : rien supprimé." >&2
  exit 1
fi
if [ "$yes" != 1 ]; then
  [ -r /dev/tty ] || { echo "Pas de terminal pour confirmer : ajoutez --yes." >&2; exit 1; }
  printf '      Supprimer définitivement %s (code, .env, data/) ? Tapez « oui » : ' "$root"
  read -r answer </dev/tty
  [ "$answer" = oui ] || { echo "      Annulé : rien supprimé."; exit 0; }
fi
key="$HOME/.ssh/orvane_terminal_ed25519"
if [ -f "$key.pub" ] && [ -f "$HOME/.ssh/authorized_keys" ]; then
  pub="$(awk '{ print $2 }' "$key.pub")"
  grep -vF "$pub" "$HOME/.ssh/authorized_keys" >"$HOME/.ssh/authorized_keys.tmp" || true
  chmod 600 "$HOME/.ssh/authorized_keys.tmp"
  mv "$HOME/.ssh/authorized_keys.tmp" "$HOME/.ssh/authorized_keys"
fi
rm -f "$key" "$key.pub"
cd /
rm -rf -- "$root"
echo "      $root supprimé, clé du terminal retirée."
