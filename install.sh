#!/usr/bin/env bash

set -euo pipefail

ORVANE_REPO="${ORVANE_REPO:-https://github.com/Milou-dx/orvanes.git}"
ORVANE_BRANCH="${ORVANE_BRANCH:-master}"
ORVANE_DIR="${ORVANE_DIR:-$HOME/orvane}"
ORVANE_ADMIN="${ORVANE_ADMIN:-admin}"
ORVANE_NO_SERVICE="${ORVANE_NO_SERVICE:-0}"
NODE_MIN_MINOR=13
SERVICE=orvane
STEPS=9
step_no=0

step() { step_no=$((step_no + 1)); printf '\n[%d/%d] %s\n' "$step_no" "$STEPS" "$*"; }
info() { printf '      %s\n' "$*"; }
die() { printf '\nErreur : %s\n' "$*" >&2; exit 1; }

SUDO=""
need_sudo() {
  [ -n "$SUDO" ] && return 0
  command -v sudo >/dev/null || die "sudo est introuvable. Installez les paquets suivants en root puis relancez : $*"
  SUDO="sudo"
}

check_system() {
  step "Système"
  [ "$(id -u)" -ne 0 ] || die "lancez l'installation sous le compte qui fera tourner le panel, pas en root (créez-le avec adduser, donnez-lui sudo)."
  [ -r /etc/os-release ] || die "/etc/os-release absent : système non reconnu."
  . /etc/os-release
  local major="${VERSION_ID%%.*}"
  case "${ID:-}" in
    debian) [ "${major:-0}" -ge 12 ] 2>/dev/null || die "Debian ${VERSION_ID:-?} non prise en charge (12 ou plus)." ;;
    ubuntu) [ "${major:-0}" -ge 22 ] 2>/dev/null || die "Ubuntu ${VERSION_ID:-?} non prise en charge (22.04 ou plus)." ;;
    *) die "système ${PRETTY_NAME:-inconnu} non pris en charge : Debian 12+ ou Ubuntu 22.04+." ;;
  esac
  case "$(uname -m)" in
    x86_64) ARCH=x64 ;;
    aarch64 | arm64) ARCH=arm64 ;;
    *) die "architecture $(uname -m) non prise en charge (x86_64 ou aarch64)." ;;
  esac
  info "${PRETTY_NAME}, ${ARCH}, compte $(id -un)"
}

check_prerequisites() {
  step "Prérequis"
  local missing=()
  command -v curl >/dev/null || missing+=(curl)
  command -v git >/dev/null || missing+=(git)
  command -v xz >/dev/null || missing+=(xz-utils)
  command -v ssh-keygen >/dev/null || missing+=(openssh-client)
  [ -e /etc/ssl/certs/ca-certificates.crt ] || missing+=(ca-certificates)
  if [ "${#missing[@]}" -gt 0 ]; then
    need_sudo "${missing[*]}"
    info "Installation de : ${missing[*]}"
    { $SUDO apt-get update -qq && DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq "${missing[@]}"; } >/dev/null 2>&1 \
      || die "apt-get n'a pas pu installer : ${missing[*]}."
  fi
  if [ "$ORVANE_NO_SERVICE" != 1 ]; then
    [ -d /run/systemd/system ] || die "systemd ne tourne pas sur cette machine. Pour un essai sans service : ORVANE_NO_SERVICE=1."
  fi
  local parent free_kb
  parent="$(dirname "$ORVANE_DIR")"
  mkdir -p "$parent"
  free_kb="$(df -Pk "$parent" | awk 'NR == 2 { print $4 }')"
  [ "${free_kb:-0}" -ge 2097152 ] || die "moins de 2 Go libres dans $parent ($((free_kb / 1024)) Mo)."
  info "curl, git, xz, ssh-keygen présents ; $((free_kb / 1024 / 1024)) Go libres dans $parent"
}

fetch_code() {
  step "Code ($ORVANE_REPO, branche $ORVANE_BRANCH)"
  if [ -d "$ORVANE_DIR/.git" ]; then
    # Ancienne adresse du dépôt : ce nom de compte n'existe plus, on ne le suit pas.
    if git -C "$ORVANE_DIR" remote get-url origin | grep -q 'Drasewave/orvanes'; then git -C "$ORVANE_DIR" remote set-url origin "$ORVANE_REPO"; fi
    git -C "$ORVANE_DIR" fetch -q origin "$ORVANE_BRANCH"
    git -C "$ORVANE_DIR" checkout -q "$ORVANE_BRANCH"
    git -C "$ORVANE_DIR" merge -q --ff-only "origin/$ORVANE_BRANCH" \
      || die "$ORVANE_DIR contient des commits locaux qui divergent de origin/$ORVANE_BRANCH : réglez-les à la main."
    info "Mis à jour : $(git -C "$ORVANE_DIR" log -1 --format='%h %s')"
  elif [ -e "$ORVANE_DIR" ] && [ -n "$(ls -A "$ORVANE_DIR")" ]; then
    die "$ORVANE_DIR existe et n'est pas un dépôt git du panel. Choisissez un autre ORVANE_DIR."
  else
    git clone -q --branch "$ORVANE_BRANCH" "$ORVANE_REPO" "$ORVANE_DIR"
    info "Cloné dans $ORVANE_DIR"
  fi
}

node_ok() {
  local v
  v="$("$1" -p 'process.versions.node' 2>/dev/null)" || return 1
  local major="${v%%.*}" rest="${v#*.}"
  [ "$major" -gt 22 ] || { [ "$major" -eq 22 ] && [ "${rest%%.*}" -ge "$NODE_MIN_MINOR" ]; }
}

install_node() {
  step "Node.js 22"
  local runtime="$ORVANE_DIR/.runtime/node"
  if [ -x "$runtime/bin/node" ] && node_ok "$runtime/bin/node"; then
    NODE="$runtime/bin/node"
  elif command -v node >/dev/null && node_ok "$(command -v node)"; then
    NODE="$(command -v node)"
  else
    local base="https://nodejs.org/dist/latest-v22.x" tmp file sum
    tmp="$(mktemp -d)"
    curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
    file="$(awk -v a="linux-$ARCH.tar.xz" '$2 ~ a"$" { print $2 }' "$tmp/SHASUMS256.txt")"
    [ -n "$file" ] || die "binaire Node introuvable pour linux-$ARCH."
    sum="$(awk -v f="$file" '$2 == f { print $1 }' "$tmp/SHASUMS256.txt")"
    info "Téléchargement de $file"
    curl -fsSL "$base/$file" -o "$tmp/$file"
    echo "$sum  $tmp/$file" | sha256sum -c --quiet - || die "empreinte SHA-256 de $file incorrecte."
    mkdir -p "$tmp/node"
    tar -xJf "$tmp/$file" -C "$tmp/node" --strip-components=1
    rm -rf "$runtime"
    mkdir -p "$(dirname "$runtime")"
    mv "$tmp/node" "$runtime"
    rm -rf "$tmp"
    NODE="$runtime/bin/node"
  fi
  PATH="$(dirname "$NODE"):$PATH"
  export PATH
  info "node $("$NODE" --version) ($NODE)"
}

install_dependencies() {
  step "Dépendances npm"
  cd "$ORVANE_DIR"
  NODE_ENV=development npm ci --include=dev --no-audit --no-fund --no-update-notifier --loglevel=error </dev/null >/dev/null
  info "node_modules installé depuis package-lock.json"
}

set_env() {
  local out
  out="$(mktemp "$1.XXXXXX")"
  VALUE="$3" awk -v name="$2" 'index($0, name "=") == 1 { print name "=" ENVIRON["VALUE"]; next } { print }' "$1" >"$out"
  mv "$out" "$1"
}

configure() {
  step "Configuration (.env)"
  cd "$ORVANE_DIR"
  if [ -f .env ]; then
    info ".env existant conservé"
  else
    local tmp
    tmp="$(mktemp "$ORVANE_DIR/.env.XXXXXX")"
    cp .env.example "$tmp"
    local var
    for var in PANEL_HOST PANEL_PORT PANEL_PUBLIC_URL; do
      if [ -n "${!var:-}" ]; then set_env "$tmp" "$var" "${!var}"; fi
    done
    chmod 600 "$tmp"
    mv "$tmp" .env
    info ".env créé depuis .env.example"
  fi
  HOST="${PANEL_HOST:-$(sed -n 's/^PANEL_HOST=//p' .env | tail -1)}"
  PORT="${PANEL_PORT:-$(sed -n 's/^PANEL_PORT=//p' .env | tail -1)}"
  HOST="${HOST:-127.0.0.1}"
  PORT="${PORT:-4321}"
  mkdir -p data
  chmod 700 data
}

build() {
  step "Construction"
  cd "$ORVANE_DIR"
  mkdir -p .cache
  local log="$ORVANE_DIR/.cache/build.log"
  if ! bash scripts/release.sh >"$log" 2>&1 </dev/null; then
    tail -n 30 "$log" >&2
    die "construction échouée (journal complet : $log)."
  fi
  [ -f dist/server/entry.mjs ] || die "construction incomplète : dist/server/entry.mjs absent."
  info "$(grep 'Version active' "$log")"
}

secure() {
  step "Administrateur et terminal"
  cd "$ORVANE_DIR"
  ORVANE_ADMIN_PASSWORD="${ORVANE_ADMIN_PASSWORD:-}" "$NODE" scripts/admin.mjs init "$ORVANE_ADMIN" | sed 's/^/      /'
  local key="$HOME/.ssh/orvane_terminal_ed25519"
  if [ ! -f "$key" ]; then
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
    ssh-keygen -q -t ed25519 -N '' -C "orvane-terminal@$(hostname)" -f "$key" </dev/null
    printf 'from="127.0.0.1,::1" %s\n' "$(cat "$key.pub")" >>"$HOME/.ssh/authorized_keys"
    chmod 600 "$HOME/.ssh/authorized_keys"
    info "Clé du terminal créée ($key), autorisée depuis 127.0.0.1 seulement"
  else
    info "Clé du terminal existante conservée"
  fi
}

start_service() {
  step "Service systemd"
  cd "$ORVANE_DIR"
  if [ "$ORVANE_NO_SERVICE" = 1 ]; then
    info "ORVANE_NO_SERVICE=1 : pas de service. Démarrage à la main : cd $ORVANE_DIR && $NODE serve.mjs"
    return
  fi
  export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
  local unit_dir="$HOME/.config/systemd/user" unit
  unit="$unit_dir/$SERVICE.service"
  mkdir -p "$unit_dir"
  cat >"$unit.tmp" <<EOF
# Créé par install.sh. La configuration est dans $ORVANE_DIR/.env.
[Unit]
Description=Panel Orvanes
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$ORVANE_DIR
Environment=NODE_ENV=production
ExecStart=$NODE $ORVANE_DIR/serve.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF
  mv "$unit.tmp" "$unit"
  if [ "$(loginctl show-user "$(id -un)" -p Linger --value 2>/dev/null)" != yes ]; then
    need_sudo "systemd-logind"
    $SUDO loginctl enable-linger "$(id -un)"
  fi
  systemctl --user daemon-reload
  systemctl --user enable -q "$SERVICE"
  systemctl --user restart "$SERVICE"
  local code=000 _
  for _ in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://$HOST:$PORT/connexion" || true)"
    [ "$code" = 200 ] && break
    sleep 1
  done
  [ "$code" = 200 ] || die "le panel ne répond pas sur http://$HOST:$PORT (journalctl --user -u $SERVICE -n 50)."
  info "$SERVICE actif, http://$HOST:$PORT/connexion répond 200"
}

summary() {
  printf '\nPanel installé dans %s.\n' "$ORVANE_DIR"
  [ "$ORVANE_NO_SERVICE" = 1 ] && printf 'Démarrage : cd %s && %s serve.mjs\n' "$ORVANE_DIR" "$NODE"
  printf 'Adresse locale : http://%s:%s\n' "$HOST" "$PORT"
  # SSH_CONNECTION = "ip_client port_client ip_serveur port_serveur" quand on installe en SSH.
  local server; server="$(set -- ${SSH_CONNECTION:-}; echo "${3:-<serveur>}")"
  printf '\nOuvrir le panel tout de suite, depuis votre poste :\n  ssh -L %s:%s:%s %s@%s\n  puis http://localhost:%s\n\n' \
    "$PORT" "$HOST" "$PORT" "$(id -un)" "$server" "$PORT"
  printf 'Pour un accès permanent, exposez-le par un reverse proxy HTTPS ou Tailscale (https://orvanes.tech/docs/premier-acces),\n'
  printf 'puis renseignez PANEL_PUBLIC_URL dans %s/.env et lancez scripts/update.sh.\n' "$ORVANE_DIR"
  printf 'Mise à jour : %s/scripts/update.sh    Journal : journalctl --user -u %s -f\n' "$ORVANE_DIR" "$SERVICE"
}

main() {
  check_system
  check_prerequisites
  fetch_code
  install_node
  install_dependencies
  configure
  build
  secure
  start_service
  summary
}

main "$@"
