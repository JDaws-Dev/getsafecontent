#!/usr/bin/env bash
# Local nightly backup of all Safe Family Convex PROD deployments.
# Uses the locally-authenticated Convex CLI — NO GitHub secrets, NO R2, NO deploy keys.
# Targets each prod deployment explicitly by name (avoids the CONVEX_DEPLOYMENT
# misroute, e.g. SafeTube's cross-project deployment).
#
# Backup location: $SAFEFAMILY_BACKUP_DIR (default ~/SafeFamilyBackups).
#   Point that at an iCloud/Dropbox/Drive folder for off-site copies.
# Retention: .zip files older than RETAIN_DAYS are deleted.
set -uo pipefail

# Make node/npx resolvable when run from launchd/cron (minimal env).
export PATH="$HOME/.npm-global/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

REPO="${SAFEFAMILY_REPO:-$HOME/Projects/safecontent}"
BACKUP_DIR="${SAFEFAMILY_BACKUP_DIR:-$HOME/SafeFamilyBackups}"
RETAIN_DAYS="${SAFEFAMILY_RETAIN_DAYS:-30}"
DATE="$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# label : app dir (relative to REPO) : prod deployment name
APPS=(
  "safetunes:apps/safetunes:formal-chihuahua-623"
  "safetube:apps/safetube:rightful-rabbit-333"
  "safereads:apps/safereads:exuberant-puffin-838"
  "safestudy:apps/safeseek:strong-scorpion-227"
  "safespark:apps/safespark:giddy-peacock-124"
  "marketing:sites/marketing:adamant-crow-705"
)

echo "[$(date '+%F %T')] Safe Family Convex backup -> $BACKUP_DIR"
FAILED=""
OK=0
for entry in "${APPS[@]}"; do
  IFS=':' read -r label dir deployment <<< "$entry"
  out="$BACKUP_DIR/${label}-${DATE}.zip"
  echo "  - exporting $label ($deployment) ..."
  if ( cd "$REPO/$dir" && npx convex@latest export --deployment-name "$deployment" --path "$out" >/dev/null 2>&1 ) && [ -s "$out" ]; then
    echo "    ok: $out ($(du -h "$out" | cut -f1))"
    OK=$((OK+1))
  else
    echo "    FAILED: $label"
    FAILED="$FAILED $label"
  fi
done

# Retention sweep
find "$BACKUP_DIR" -name '*.zip' -type f -mtime +"$RETAIN_DAYS" -delete 2>/dev/null

echo "[$(date '+%F %T')] done: $OK ok,${FAILED:- none} failed"
[ -z "$FAILED" ]
