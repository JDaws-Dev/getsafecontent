#!/bin/bash
#
# Unified Auth Integration Tests Runner
#
# This script runs the unified auth integration tests and provides
# clear instructions for manual verification steps.
#
# Usage:
#   ./scripts/test-unified-auth.sh           # Run API tests only
#   ./scripts/test-unified-auth.sh --e2e     # Run E2E tests with Playwright
#   ./scripts/test-unified-auth.sh --all     # Run both API and E2E tests
#
# Prerequisites:
#   1. Set ADMIN_API_KEY environment variable
#   2. For E2E tests: npm install -g playwright
#   3. For local testing: npm run dev (server must be running)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=============================================="
echo "  UNIFIED AUTH INTEGRATION TEST RUNNER"
echo "=============================================="
echo ""

# Check for required environment variables
if [ -z "$ADMIN_API_KEY" ]; then
  echo -e "${RED}ERROR: ADMIN_API_KEY environment variable is not set${NC}"
  echo ""
  echo "To get the admin key:"
  echo "  CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env list | grep ADMIN_KEY"
  echo ""
  echo "Then set it:"
  echo "  export ADMIN_API_KEY='your_key_here'"
  echo ""
  exit 1
fi

echo -e "${GREEN}ADMIN_API_KEY is set${NC}"

# Check for feature flag
if [ -z "$ENABLE_UNIFIED_AUTH" ]; then
  echo -e "${YELLOW}Note: ENABLE_UNIFIED_AUTH is not set (default: false)${NC}"
  echo "  To test new flow: export ENABLE_UNIFIED_AUTH=true"
  echo "  To test legacy flow: unset ENABLE_UNIFIED_AUTH or set to false"
else
  echo -e "ENABLE_UNIFIED_AUTH=$ENABLE_UNIFIED_AUTH"
fi

echo ""

# Determine test mode
MODE="${1:-api}"

case "$MODE" in
  --e2e)
    echo -e "${BLUE}Running E2E tests (Playwright)...${NC}"
    echo ""
    cd "$(dirname "$0")/.."
    npx playwright test e2e/unified-auth-flow.spec.ts "$@"
    ;;

  --all)
    echo -e "${BLUE}Running API integration tests...${NC}"
    echo ""
    cd "$(dirname "$0")/.."
    npx tsx src/__tests__/unified-auth.integration.ts

    echo ""
    echo -e "${BLUE}Running E2E tests (Playwright)...${NC}"
    echo ""
    npx playwright test e2e/unified-auth-flow.spec.ts
    ;;

  *)
    echo -e "${BLUE}Running API integration tests...${NC}"
    echo ""
    cd "$(dirname "$0")/.."
    npx tsx src/__tests__/unified-auth.integration.ts
    ;;
esac

echo ""
echo "=============================================="
echo "  TEST RUN COMPLETE"
echo "=============================================="
echo ""

# Cleanup reminder
echo -e "${YELLOW}CLEANUP REMINDER:${NC}"
echo "Test users created during this run have email pattern:"
echo "  test-*@test.getsafefamily.com"
echo ""
echo "To clean up test data, use the admin endpoints:"
echo "  curl \"https://[app].convex.site/deleteUser?email=EMAIL&key=KEY\""
echo ""
