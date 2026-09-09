#!/usr/bin/env bash
# Run the one-site stack locally AGAINST PRODUCTION BACKENDS, for a real
# sign-in-once walkthrough before anything goes live. Reads each project's
# production env from files pulled with `vercel env pull` into ENV_DIR (kept
# outside the repo — never commit them).
#   ENV_DIR=/path/to/pulled-envs scripts/one-site-dev-prod.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${ENV_DIR:?set ENV_DIR to the folder holding safetube.env, safetunes.env, safeseek.env, safereads.env, safespark.env, marketing.env}"
pids=()
cleanup(){ for p in "${pids[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM
getv(){ grep -E "^$2=" "$ENV_DIR/$1.env" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
start_vite(){ # app-dir port envfile
  (cd "$ROOT/$1" && env VITE_DEV_PORT="$2" VITE_CONVEX_URL="$(getv "$3" VITE_CONVEX_URL)" VITE_YOUTUBE_API_KEY="$(getv "$3" VITE_YOUTUBE_API_KEY)" VITE_MUSICKIT_DEVELOPER_TOKEN="$(getv "$3" VITE_MUSICKIT_DEVELOPER_TOKEN)" VITE_MUSICKIT_APP_NAME="$(getv "$3" VITE_MUSICKIT_APP_NAME)" NODE_OPTIONS= npx vite --port "$2" --strictPort >"/tmp/one-site-$3.log" 2>&1) & pids+=($!)
}
start_next(){ # app-dir port envfile
  (cd "$ROOT/$1" && env NEXT_PUBLIC_CONVEX_URL="$(getv "$3" NEXT_PUBLIC_CONVEX_URL)" NEXT_PUBLIC_APP_URL="http://localhost:3000" NEXT_PUBLIC_BASE_URL="http://localhost:3000" NEXT_PUBLIC_CONVEX_SITE_URL="$(getv "$3" NEXT_PUBLIC_CONVEX_SITE_URL)" NODE_OPTIONS= npx next dev -p "$2" >"/tmp/one-site-$3.log" 2>&1) & pids+=($!)
}
start_vite apps/safetube 5175 safetube
start_vite apps/safetunes 5174 safetunes
start_vite apps/safeseek 5176 safeseek
start_next apps/safereads 5177 safereads
start_next apps/safespark 5178 safespark
echo "apps: tube 5175 · tunes 5174 · study 5176 · reads 5177 · spark 5178 (logs /tmp/one-site-*.log)"
echo "hub : http://localhost:3000  (production backends — sign in as yourself)"
cd "$ROOT/sites/marketing" && env \
  ONE_SITE_ORIGIN_TUBE=http://localhost:5175 ONE_SITE_ORIGIN_TUNES=http://localhost:5174 ONE_SITE_ORIGIN_STUDY=http://localhost:5176 \
  ONE_SITE_ORIGIN_READS=http://localhost:5177 ONE_SITE_ORIGIN_SPARK=http://localhost:5178 \
  NEXT_PUBLIC_CONVEX_URL="$(getv marketing NEXT_PUBLIC_CONVEX_URL)" CONVEX_DEPLOYMENT="$(getv marketing CONVEX_DEPLOYMENT)" \
  ADMIN_API_KEY="$(getv marketing ADMIN_API_KEY)" NEXT_PUBLIC_URL="http://localhost:3000" \
  JWT_SECRET="$(getv marketing JWT_SECRET)" SITE_URL="http://localhost:3000" \
  NODE_OPTIONS= npx next dev -p 3000
