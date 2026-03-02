# Unified Auth Integration Tests

This directory contains integration tests for the unified authentication flow across Safe Family apps.

## Overview

The unified auth system allows users to:
1. Create a single account on the marketing site
2. Use the same credentials to log into all entitled apps (SafeTunes, SafeTube, SafeReads)
3. Manage their subscription across all apps from one place

## Test Files

### API Integration Tests (`unified-auth.integration.ts`)

Direct API tests that verify:
- Central user creation
- Password hashing (Scrypt format)
- App provisioning with password hash
- Promo code signup flow
- Account conflict handling
- Authorization (admin key validation)
- Input validation

### E2E Tests (`../e2e/unified-auth-flow.spec.ts`)

Playwright browser tests that verify:
- Signup page UI
- Form validation
- Promo code recognition
- Stripe checkout redirect
- Feature flag behavior

## Prerequisites

1. **Environment Variables**

   ```bash
   # Required for API tests
   export ADMIN_API_KEY='your_admin_key_here'

   # Optional - controls which flow is tested
   export ENABLE_UNIFIED_AUTH='true'  # or 'false' for legacy

   # Optional - for local testing
   export TEST_MARKETING_URL='http://localhost:3000'
   export TEST_BASE_URL='http://localhost:3000'
   ```

   To get the admin key:
   ```bash
   CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex env list | grep ADMIN_KEY
   ```

2. **Install Dependencies**

   ```bash
   cd sites/marketing
   npm install
   npx playwright install  # For E2E tests only
   ```

## Running Tests

### NPM Scripts (Recommended)

```bash
# Run API tests only
npm run test:api

# Run E2E tests only
npm run test:e2e

# Run E2E tests with browser UI visible
npm run test:e2e:headed

# Run E2E tests in debug mode (interactive)
npm run test:e2e:debug

# Run all tests
npm run test:all
```

### Direct Commands

```bash
# API tests
npx tsx src/__tests__/unified-auth.integration.ts

# E2E tests
npx playwright test e2e/unified-auth-flow.spec.ts

# E2E with specific browser
npx playwright test e2e/unified-auth-flow.spec.ts --project=chromium

# E2E with report
npx playwright test e2e/unified-auth-flow.spec.ts --reporter=html
```

### Shell Script

```bash
chmod +x scripts/test-unified-auth.sh

# Run API tests
./scripts/test-unified-auth.sh

# Run E2E tests
./scripts/test-unified-auth.sh --e2e

# Run all tests
./scripts/test-unified-auth.sh --all
```

## Test Categories

### 1. Central User Creation (API)
- Valid user creation
- Duplicate email rejection
- Signup API endpoint

### 2. App Provisioning (API)
- SafeTunes provisioning
- SafeTube provisioning
- SafeReads provisioning
- Multi-app provisioning
- Idempotent provisioning

### 3. Promo Signup Flow (API + E2E)
- Lifetime code recognition (DAWSFRIEND, DEWITT)
- All apps provisioned
- Invalid code rejection

### 4. Account Conflicts (API)
- Existing user password preservation
- Conflict flag in response

### 5. Authorization (API)
- Admin key validation
- Unauthorized access rejection

### 6. Input Validation (API + E2E)
- Missing required fields
- Password strength validation
- Email format validation

### 7. Feature Flag Behavior (E2E)
- Flag endpoint response
- Flow switching based on flag

### 8. Login Verification (Manual)
- E2E test pauses for manual app login verification

## Test Data Cleanup

Tests create users with emails matching pattern:
```
test-{timestamp}-{prefix}@test.getsafefamily.com
```

To clean up test data:
```bash
# URL-encode the admin key
KEY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('YOUR_KEY'))")

# Delete from each app
curl "https://formal-chihuahua-623.convex.site/deleteUser?email=EMAIL&key=$KEY"
curl "https://rightful-rabbit-333.convex.site/deleteUser?email=EMAIL&key=$KEY"
curl "https://exuberant-puffin-838.convex.site/deleteUser?email=EMAIL&key=$KEY"
```

## Troubleshooting

### "ADMIN_API_KEY not set"
Set the environment variable before running tests.

### "Cannot find module 'lucia'"
Run `npm install` to install dependencies.

### E2E tests timing out
- Check if the target site is accessible
- Use `--headed` to see what's happening
- Increase timeout in playwright.config.ts

### Tests failing on CI
- Ensure secrets are configured in CI environment
- E2E tests may need browser installation: `npx playwright install`

## Architecture Reference

See `/docs/UNIFIED-AUTH-ARCHITECTURE.md` for detailed documentation of:
- Data flow diagrams
- API specifications
- Database schema
- Security considerations
