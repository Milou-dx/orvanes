#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x .runtime/node/bin/node ]; then export PATH="$PWD/.runtime/node/bin:$PATH"; fi

KEEP=2
stamp="$(date +%Y%m%d-%H%M%S)"
out="releases/$stamp"

if [ "${ORVANE_SKIP_CHECK:-0}" != 1 ]; then npx astro check; fi
ORVANE_OUT_DIR="./$out" npx astro build
test -f "$out/server/entry.mjs" || { echo "Build incomplet : $out/server/entry.mjs absent" >&2; exit 1; }

if [ -d dist ] && [ ! -L dist ]; then
  mv dist "releases/legacy-$stamp"
fi
ln -sfn "$out" dist.tmp
mv -Tf dist.tmp dist
echo "Version active : $out"

active="$(readlink dist)"
serving=""
for f in .cache/serving-*; do
  [ -f "$f" ] || continue
  read -r pid dir < "$f" || continue
  kill -0 "$pid" 2>/dev/null && serving="$serving releases/$(basename "$dir")"
done
ls -1dt releases/*/ 2>/dev/null | sed 's:/$::' | tail -n +$((KEEP + 1)) | while read -r old; do
  [ "$old" = "$active" ] && continue
  case " $serving " in *" $old "*) continue ;; esac
  rm -rf -- "$old"
done

if [ "${1:-}" = "--restart" ]; then
  mkdir -p .cache
  touch .cache/restart-requested
  echo "Redemarrage demande : il aura lieu des qu'aucun tour Claude n'est en cours."
fi
