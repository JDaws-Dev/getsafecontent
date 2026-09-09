#!/usr/bin/env bash
# Run the one-site stack locally: the hub on :3000 proxies /tube etc. to each
# app's dev server. Start only the apps you pass (default: tube).
#   scripts/one-site-dev.sh              # hub + SafeTube
#   scripts/one-site-dev.sh tube study   # hub + SafeTube + SafeStudy
# (bash 3 compatible — macOS ships without associative arrays)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS=("$@"); [ ${#APPS[@]} -eq 0 ] && APPS=(tube)
app_dir()  { case "$1" in tube) echo apps/safetube;; tunes) echo apps/safetunes;; study) echo apps/safeseek;; reads) echo apps/safereads;; spark) echo apps/safespark;; *) echo "unknown app $1" >&2; exit 1;; esac; }
app_port() { case "$1" in tube) echo 5175;; tunes) echo 5174;; study) echo 5176;; reads) echo 5177;; spark) echo 5178;; esac; }
app_kind() { case "$1" in reads|spark) echo next;; *) echo vite;; esac; }
pids=()
cleanup(){ for p in "${pids[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM
ENVLINE=""
for a in "${APPS[@]}"; do
  d="$ROOT/$(app_dir "$a")"; port="$(app_port "$a")"
  if [ "$(app_kind "$a")" = vite ]; then
    (cd "$d" && VITE_DEV_PORT="$port" NODE_OPTIONS= npx vite --port "$port" --strictPort >"/tmp/one-site-$a.log" 2>&1) & pids+=($!)
  else
    (cd "$d" && NODE_OPTIONS= npx next dev -p "$port" >"/tmp/one-site-$a.log" 2>&1) & pids+=($!)
  fi
  ENVLINE="$ENVLINE ONE_SITE_ORIGIN_$(echo "$a" | tr a-z A-Z)=http://localhost:$port"
  echo "  /$a  -> http://localhost:$port  (log /tmp/one-site-$a.log)"
done
echo "hub  -> http://localhost:3000"
if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "hub already listening on :3000 — leaving it alone; app servers stay up until Ctrl-C"
  wait
else
  cd "$ROOT/sites/marketing" && env $ENVLINE NODE_OPTIONS= npx next dev -p 3000
fi
