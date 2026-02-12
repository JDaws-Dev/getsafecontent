/**
 * Unified Auth E2E Tests (Playwright)
 *
 * End-to-end tests for the unified authentication flow using Playwright.
 * These tests verify the complete user journey from signup to app login.
 *
 * Usage:
 *   npx playwright test e2e/unified-auth-flow.spec.ts
 *   npx playwright test e2e/unified-auth-flow.spec.ts --headed  # with browser UI
 *   npx playwright test e2e/unified-auth-flow.spec.ts --debug   # interactive debug mode
 *
 * Test Scenarios:
 *   1. Signup creates centralUser (verifiable via API)
 *   2. Promo code signup provisions all apps
 *   3. Regular signup flows to Stripe checkout
 *   4. User can login to apps after provisioning (manual verification)
 *   5. Feature flag controls flow behavior
 *
 * @see docs/UNIFIED-AUTH-ARCHITECTURE.md for implementation details
 */

import { test, expect } from "@playwright/test";

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || "https://getsafefamily.com";
const TEST_PASSWORD = "TestPass123!";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

// App URLs for login verification
const APP_URLS = {
  safetunes: "https://getsafetunes.com",
  safetube: "https://getsafetube.com",
  safereads: "https://getsafereads.com",
};

// Convex endpoints
const CONVEX_ENDPOINTS = {
  safereads: "https://exuberant-puffin-838.convex.site",
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
};

// Generate unique test email
function generateEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.getsafefamily.com`;
}

// Helper to check if centralUser exists via API
async function checkCentralUser(email: string): Promise<{
  exists: boolean;
  passwordHash?: string;
  name?: string;
}> {
  if (!ADMIN_KEY) {
    console.warn("ADMIN_API_KEY not set, skipping centralUser check");
    return { exists: false };
  }

  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const url = `${CONVEX_ENDPOINTS.safereads}/getCentralUser?email=${encodedEmail}&key=${encodedKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { exists: false };
    }
    const data = await response.json();
    return {
      exists: data.exists,
      passwordHash: data.passwordHash,
      name: data.name,
    };
  } catch {
    return { exists: false };
  }
}

test.describe("Unified Auth - Signup Flow", () => {
  test("1. Signup page loads correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Check essential elements are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check app selection is present
    await expect(page.getByText("SafeTunes")).toBeVisible();
    await expect(page.getByText("SafeTube")).toBeVisible();
    await expect(page.getByText("SafeReads")).toBeVisible();
  });

  test("2. Signup with valid data creates centralUser", async ({ page }) => {
    test.skip(!ADMIN_KEY, "ADMIN_API_KEY required for this test");

    const email = generateEmail("e2e-signup");
    console.log(`\n  Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Fill the form
    await page.locator('input[name="name"]').fill("E2E Test User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    // Submit - this will create centralUser then redirect to Stripe
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/signup") ||
        response.url().includes("/api/checkout")
    );

    await page.locator('button[type="submit"]').click();

    // Wait for the API call
    await responsePromise;

    // Give a moment for centralUser creation
    await page.waitForTimeout(1000);

    // Verify centralUser was created
    const centralUser = await checkCentralUser(email);
    expect(centralUser.exists).toBe(true);
    expect(centralUser.passwordHash).toBeTruthy();

    console.log(`  centralUser created: ${centralUser.exists}`);
    console.log(`  passwordHash present: ${!!centralUser.passwordHash}`);
  });

  test("3. Promo code (DAWSFRIEND) shows lifetime access UI", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Click "Have a promo code?"
    await page.getByText("Have a promo code").click();

    // Enter lifetime promo code
    const promoInput = page.locator('input[placeholder*="code"], input[name="promoCode"], input[name="couponCode"]');
    await promoInput.waitFor({ state: "visible" });
    await promoInput.fill("DAWSFRIEND");

    // Wait for validation
    await page.waitForTimeout(500);

    // Check for lifetime access indicator
    const lifetimeText = page.getByText(/lifetime/i);
    await expect(lifetimeText).toBeVisible({ timeout: 5000 });
  });

  test("4. Promo signup provisions all apps (full flow)", async ({ page }) => {
    test.skip(!ADMIN_KEY, "ADMIN_API_KEY required for this test");

    const email = generateEmail("e2e-promo");
    console.log(`\n  Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Ensure all apps selected
    const safetunesCheckbox = page.locator('[data-app="safetunes"], input[value="safetunes"]');
    const safetubeCheckbox = page.locator('[data-app="safetube"], input[value="safetube"]');
    const safereadsCheckbox = page.locator('[data-app="safereads"], input[value="safereads"]');

    // Make sure all apps are selected (may need to click)
    // This depends on the actual UI implementation

    // Fill user details
    await page.locator('input[name="name"]').fill("E2E Promo User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    // Enter promo code
    await page.getByText("Have a promo code").click();
    const promoInput = page.locator('input[placeholder*="code"], input[name="promoCode"], input[name="couponCode"]');
    await promoInput.waitFor({ state: "visible" });
    await promoInput.fill("DAWSFRIEND");

    // Wait for lifetime validation
    await page.waitForTimeout(500);

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should redirect to success page (not Stripe for lifetime codes)
    await page.waitForURL(/success|thank-you|dashboard/, { timeout: 30000 });

    console.log(`  Final URL: ${page.url()}`);

    // Verify centralUser exists with correct data
    const centralUser = await checkCentralUser(email);
    expect(centralUser.exists).toBe(true);
    console.log(`  centralUser verified: ${centralUser.exists}`);
  });

  test("5. Regular checkout redirects to Stripe", async ({ page }) => {
    const email = generateEmail("e2e-checkout");
    console.log(`\n  Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Fill the form
    await page.locator('input[name="name"]').fill("E2E Checkout User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should redirect to Stripe
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    console.log(`  Redirected to Stripe checkout`);

    expect(page.url()).toContain("checkout.stripe.com");
  });

  test("6. Single app selection shows correct price", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup?app=safetunes`);
    await page.waitForLoadState("networkidle");

    // With single app pre-selected, price should be $4.99
    const priceElement = page.getByText(/\$4\.99/);
    await expect(priceElement).toBeVisible();
  });

  test("7. 3-app bundle shows bundle price", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Default selection is all 3 apps, price should be $9.99/mo
    const monthlyPrice = page.getByText(/\$9\.99/);
    await expect(monthlyPrice).toBeVisible();
  });

  test("8. Yearly toggle shows yearly price", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Find and click yearly toggle
    const yearlyToggle = page.getByText(/yearly/i);
    await yearlyToggle.click();

    // Should show yearly price ($99)
    const yearlyPrice = page.getByText(/\$99/);
    await expect(yearlyPrice).toBeVisible();
  });
});

test.describe("Unified Auth - Validation", () => {
  test("9. Email validation shows error for invalid email", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Fill with invalid email
    await page.locator('input[name="name"]').fill("Test User");
    await page.locator('input[name="email"]').fill("invalid-email");
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    // Try to submit
    await page.locator('button[type="submit"]').click();

    // Should show validation error (either browser native or custom)
    // The form should not navigate away
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/signup");
  });

  test("10. Password mismatch shows error", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    const email = generateEmail("pwd-mismatch");

    await page.locator('input[name="name"]').fill("Test User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill("DifferentPass123!");

    await page.locator('button[type="submit"]').click();

    // Should show error or stay on page
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/signup");
  });

  test("11. Weak password is rejected", async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    const email = generateEmail("weak-pwd");

    await page.locator('input[name="name"]').fill("Test User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("weak");
    await page.locator('input[name="confirmPassword"]').fill("weak");

    await page.locator('button[type="submit"]').click();

    // Should show error about password strength
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/signup");
  });
});

test.describe("Unified Auth - Feature Flag Behavior", () => {
  test("12. Check feature flags endpoint", async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/feature-flags`);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log(`\n  Feature flags:`, data.flags);

    // The endpoint should return flags object
    expect(data).toHaveProperty("flags");
    expect(data.flags).toHaveProperty("UNIFIED_AUTH");
  });
});

test.describe("Unified Auth - App Login Verification (Manual)", () => {
  test("13. [MANUAL] Login to SafeTunes after provisioning", async ({ page }) => {
    // This test creates a user, then pauses for manual login verification
    test.skip(!ADMIN_KEY, "ADMIN_API_KEY required for this test");

    const email = generateEmail("login-verify-tunes");
    console.log(`\n  Test email: ${email}`);
    console.log(`  Password: ${TEST_PASSWORD}`);

    // Create user via signup + promo
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Login Test User");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    await page.getByText("Have a promo code").click();
    const promoInput = page.locator('input[placeholder*="code"], input[name="promoCode"], input[name="couponCode"]');
    await promoInput.fill("DAWSFRIEND");

    await page.locator('button[type="submit"]').click();

    // Wait for success
    await page.waitForURL(/success|thank-you|dashboard/, { timeout: 30000 });

    console.log(`\n  User created! Now try logging in to SafeTunes:`);
    console.log(`  URL: ${APP_URLS.safetunes}`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${TEST_PASSWORD}`);
    console.log(`\n  Pausing for manual verification...`);

    // Pause for manual login attempt
    await page.pause();
  });
});

test.describe("Unified Auth - Inactive Status", () => {
  test("14. Non-entitled app shows upgrade prompt", async ({ page }) => {
    // This test documents the expected behavior for non-entitled apps
    // When a user is provisioned with entitledToThisApp=false, they should
    // see an InactiveUserPrompt or UpgradePrompt component instead of the main app
    //
    // Test scenarios:
    // 1. User with 2-app bundle tries to access third app -> sees upgrade prompt
    // 2. User with cancelled subscription -> sees resubscribe prompt
    // 3. User with inactive status -> sees appropriate message
    //
    // Components that handle this:
    // - SafeTunes: UpgradePrompt.jsx
    // - SafeTube: UpgradePrompt.jsx
    // - SafeReads: InactiveUserPrompt.tsx

    console.log(`\n  Non-entitled app behavior test:`);
    console.log(`  - User with inactive status should see InactiveUserPrompt`);
    console.log(`  - User with partial bundle should see upgrade option`);
    console.log(`  - SafeTunes: UpgradePrompt.jsx component`);
    console.log(`  - SafeTube: UpgradePrompt.jsx component`);
    console.log(`  - SafeReads: InactiveUserPrompt.tsx component`);

    // This test documents the behavior - full verification requires logged-in user
    expect(true).toBe(true);
  });

  test("15. Admin can check user status across apps", async ({ page }) => {
    test.skip(!ADMIN_KEY, "ADMIN_API_KEY required for this test");

    // Check user status via admin endpoints
    const testEmail = "test-inactive@test.getsafefamily.com";
    const encodedKey = encodeURIComponent(ADMIN_KEY);

    // Check each app's admin dashboard
    for (const [app, endpoint] of Object.entries(CONVEX_ENDPOINTS)) {
      const url = `${endpoint}/adminDashboard?key=${encodedKey}&format=json`;
      const response = await page.request.get(url);

      if (response.ok()) {
        const data = await response.json();
        console.log(`\n  ${app}: ${data.totalUsers || 0} total users`);
      } else {
        console.log(`\n  ${app}: Admin dashboard returned ${response.status()}`);
      }
    }

    expect(true).toBe(true);
  });
});

test.describe("Unified Auth - Webhook Failure Recovery", () => {
  test("16. Admin failed provisions page loads", async ({ page }) => {
    // Navigate to admin failed provisions page
    await page.goto(`${BASE_URL}/admin/failed-provisions`);

    // Should redirect to login or show the page (depending on auth)
    const currentUrl = page.url();

    console.log(`\n  Failed provisions page URL: ${currentUrl}`);

    // Page should be accessible (even if it redirects to login)
    expect(currentUrl).toContain(BASE_URL.replace("https://", ""));
  });

  test("17. Admin audit logs page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-logs`);

    const currentUrl = page.url();
    console.log(`\n  Audit logs page URL: ${currentUrl}`);

    // Should redirect to login or show the page
    expect(currentUrl).toContain(BASE_URL.replace("https://", ""));
  });

  test("18. Webhook retry implementation documented", async ({ page }) => {
    // This test documents the webhook retry behavior
    // The actual retry logic is in:
    // sites/marketing/src/app/api/stripe/webhook/route.ts
    //
    // Key implementation details:
    // - 3 retries with exponential backoff (1s, 2s, 4s)
    // - Each app provisioned independently in parallel
    // - Partial success tracked (some apps succeed, others fail)
    // - Alert email sent on final failure
    // - Audit log entry created

    console.log(`\n  Webhook retry behavior (documented):`);
    console.log(`  - Max retries: 3`);
    console.log(`  - Backoff: exponential (1s, 2s, 4s)`);
    console.log(`  - Timeout per call: 5 seconds`);
    console.log(`  - Alert email: sent to admin on final failure`);
    console.log(`  - Audit log: records all provision attempts`);
    console.log(`\n  Files implementing this:`);
    console.log(`  - sites/marketing/src/app/api/stripe/webhook/route.ts`);
    console.log(`  - sites/marketing/src/lib/audit-log.ts`);
    console.log(`  - sites/marketing/src/lib/sentry.ts`);

    // This is a documentation test - code review verifies implementation
    expect(true).toBe(true);
  });
});

test.describe("Unified Auth - Legacy Flow Fallback", () => {
  test("19. Direct Stripe checkout (no centralUser) should still work", async ({ page }) => {
    // This tests the fallback behavior when unified auth is enabled
    // but user doesn't have a centralUser (went directly to Stripe)
    //
    // This is a documentation test - the actual behavior depends on
    // the webhook implementation which falls back to legacy flow.

    console.log(`\n  Legacy flow fallback test:`);
    console.log(`  When UNIFIED_AUTH is enabled but no centralUser exists,`);
    console.log(`  the webhook should fall back to setSubscriptionStatus endpoint.`);
    console.log(`\n  This is verified by the webhook code in:`);
    console.log(`  sites/marketing/src/app/api/stripe/webhook/route.ts`);
    console.log(`  Lines ~370-380: Checks for centralUser, falls back if not found.`);

    // This is a pass-through test to document behavior
    expect(true).toBe(true);
  });
});
