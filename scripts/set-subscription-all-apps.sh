#!/usr/bin/env bash
# Set a customer's subscription status on the CENTRAL account AND every app.
#
# Why this exists: setting status centrally does NOT immediately reach the apps.
# Each app pulls from central via its own verifyCentralAccess sync, which only
# runs while that customer has the app open — so a comp applied centrally can sit
# invisible for days while the customer stares at a locked door. That is exactly
# what happened to a customer on 2026-07-30: comped centrally, still "expired" on
# all four apps a week later.
#
# This pushes the value everywhere in one shot, then reads each app back so you
# see what actually landed rather than trusting the writes.
#
# Usage:
#   scripts/set-subscription-all-apps.sh <email> [status]
#
#   status defaults to "active". Useful values: trial | active | lifetime | expired
#
# Example:
#   scripts/set-subscription-all-apps.sh parent@example.com active
#
# Note: each app owns its own users table, so this is 5 writes, not 1. Targets
# every deployment explicitly by name — CONVEX_DEPLOYMENT silently misroutes
# non-deploy commands (see CLAUDE.md).
set -uo pipefail

EMAIL="${1:-}"
STATUS="${2:-active}"

if [[ -z "$EMAIL" ]]; then
  echo "usage: $(basename "$0") <email> [status]" >&2
  echo "  status: trial | active | lifetime | expired   (default: active)" >&2
  exit 1
fi

case "$STATUS" in
  trial|active|lifetime|expired) ;;
  *) echo "error: unrecognized status '$STATUS'" >&2; exit 1 ;;
esac

REPO="${SAFEFAMILY_REPO:-$HOME/Projects/safecontent}"
CONVEX="npx convex@latest"

# label : dir : deployment : mutation path
TARGETS=(
  "safetunes:apps/safetunes:formal-chihuahua-623:internal.users.setSubscriptionStatusByEmailInternal"
  "safetube:apps/safetube:rightful-rabbit-333:internal.users.setSubscriptionStatusByEmailInternal"
  "safereads:apps/safereads:exuberant-puffin-838:internal.subscriptions.setSubscriptionStatusByEmailInternal"
  "safestudy:apps/safeseek:strong-scorpion-227:internal.users.setSubscriptionStatusByEmailInternal"
)

echo "Setting '$EMAIL' -> '$STATUS' across central + 4 apps"
echo

failed=()

# --- Central first. It's the source of truth the apps pull from, so if this
# --- fails the app writes would just get reverted on the next sync.
echo "central (adamant-crow-705)"
if (cd "$REPO/sites/marketing" && $CONVEX run accounts:updateSubscription \
      "{\"email\":\"$EMAIL\",\"subscriptionStatus\":\"$STATUS\"}" \
      --deployment-name adamant-crow-705) >/dev/null 2>&1; then
  echo "  ok"
else
  echo "  FAILED"
  failed+=("central")
fi

for entry in "${TARGETS[@]}"; do
  IFS=':' read -r label dir deployment fn <<< "$entry"
  echo "$label ($deployment)"
  if (cd "$REPO/$dir" && $CONVEX run "$fn" \
        "{\"email\":\"$EMAIL\",\"status\":\"$STATUS\"}" \
        --deployment-name "$deployment") >/dev/null 2>&1; then
    echo "  ok"
  else
    echo "  FAILED"
    failed+=("$label")
  fi
done

echo
if (( ${#failed[@]} )); then
  echo "INCOMPLETE — these did not take: ${failed[*]}"
  echo "The customer may still be locked out. Re-run or fix by hand before"
  echo "telling them they're sorted."
  exit 1
fi

echo "All 5 written. Verify with the per-app admin dashboards before replying"
echo "to the customer — a write returning ok is not proof they can log in."
