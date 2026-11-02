#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x .runtime/node/bin/node ]; then PATH="$PWD/.runtime/node/bin:$PATH"; export PATH; fi
command -v node >/dev/null || { echo "node introuvable : relancez install.sh." >&2; exit 1; }

branch="$(git branch --show-current)"
[ -n "$branch" ] || { echo "HEAD détachée : placez-vous sur une branche." >&2; exit 1; }

echo "[1/4] Code"
before="$(git rev-parse HEAD)"
active="$(readlink dist 2>/dev/null || true)"
git pull -q --ff-only origin "$branch"
if [ -n "$active" ] && [ ! -L dist ]; then ln -sfn "$active" dist; fi
echo "      $(git log -1 --format='%h %s')"

echo "[2/4] Dépendances"
if [ ! -d node_modules ] || ! git diff --quiet "$before" HEAD -- package-lock.json; then
  NODE_ENV=development npm ci --include=dev --no-audit --no-fund --no-update-notifier --loglevel=error </dev/null >/dev/null
  echo "      npm ci terminé"
else
  echo "      package-lock.json inchangé"
fi

echo "[3/4] Construction"
bash scripts/release.sh </dev/null | tail -n 1 | sed 's/^/      /'

echo "[4/4] Redémarrage"
if systemctl --user cat orvane >/dev/null 2>&1; then
  systemctl --user restart orvane
  echo "      orvane redémarré (journalctl --user -u orvane -f)"
else
  echo "      Pas de service orvane : redémarrez le panel à la main."
fi
