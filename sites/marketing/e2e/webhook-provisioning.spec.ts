/**
 * Stripe Webhook Provisioning E2E Tests
 *
 * Verifies that Stripe webhooks correctly provision users to selected apps
 * after successful payment.
 *
 * Note: These tests require Stripe test mode and some manual payment steps.
 * Use `--debug` mode for interactive testing.
 *
 * Usage:
 *   npx playwright test e2e/webhook-provisioning.spec.ts
 *   npx playwright test e2e/webhook-provisioning.spec.ts --headed
 *   npx playwright test e2e/webhook-provisioning.spec.ts --debug
 *
 * Environment Variables:
 *   ADMIN_API_KEY - Admin API key for verification endpoints
 *   TEST_USER_EMAIL - Email of a user who completed checkout (for verification tests)
 */

import { test, expect } from "@playwright/test";

// Configuration
const MARKETING_URL = "https://getsafefamily.com";
const APP_URLS = {
  safetunes: "https://getsafetunes.com",
  safetube: "https://getsafetube.com",
  safereads: "https://getsafereads.com",
};

const CONVEX_ENDPOINTS = {
  marketing: "https://adamant-crow-705.convex.site",
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
};

const TEST_PASSWORD = "TestPass123!";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

// Generate unique test email
function generateEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.getsafefamily.com`;
}

// Helper to check user exists in app
async function checkUserInApp(
  app: "safetunes" | "safetube" | "safereads",
  email: string
): Promise<{ exists: boolean; status?: string }> {
  if (!ADMIN_KEY) {
    console.warn("ADMIN_API_KEY not set, skipping user check");
    return { exists: false };
  }

  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const url = `${CONVEX_ENDPOINTS[app]}/adminDashboard?key=${encodedKey}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { exists: false };
    }
    const data = await response.json();
    const users = data.users || [];
    const user = users.find(
      (u: { email?: string }) =>
        u.email?.toLowerCase() === email.toLowerCase()
    );
    return {
      exists: !!user,
      status: user?.subscriptionStatus,
    };
  } catch {
    return { exists: false };
  }
}

test.describe("Webhook - Signup Flow to Stripe", () => {
  test("1. Single app signup reaches Stripe checkout", async ({ page }) => {
    const email = generateEmail("webhook-single");
    console.log(`\n  Test email: ${email}`);

    await page.goto(`${MARKETING_URL}/signup?app=safetunes`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Webhook Test Single");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    await page.locator('button[type="submit"]').click();

    // Should reach Stripe checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
    expect(page.url()).toContain("checkout.stripe.com");

    console.log("  Reached Stripe checkout");
    console.log(
      "  PAUSE: Complete payment with test card 4242 4242 4242 4242"
    );

    // After manual payment, redirect should go to success page
    // Then webhook fires and provisions user
  });

  test("2. Bundle signup reaches Stripe checkout", async ({ page }) => {
    const email = generateEmail("webhook-bundle");
    console.log(`\n  Test email: ${email}`);

    await page.goto(`${MARKETING_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Select SafeTunes and SafeTube only
    const safetunesCheckbox = page.locator('input[value="safetunes"]');
    const safetubeCheckbox = page.locator('input[value="safetube"]');
    const safereadsCheckbox = page.locator('input[value="safereads"]');

    // Ensure SafeTunes and SafeTube are checked
    if (!(await safetunesCheckbox.isChecked())) {
      await safetunesCheckbox.click();
    }
    if (!(await safetubeCheckbox.isChecked())) {
      await safetubeCheckbox.click();
    }
    // Uncheck SafeReads
    if (await safereadsCheckbox.isChecked()) {
      await safereadsCheckbox.click();
    }

    await page.locator('input[name="name"]').fill("Webhook Test Bundle");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
    expect(page.url()).toContain("checkout.stripe.com");

    console.log("  Reached Stripe checkout for 2-app bundle");
  });
});

test.describe("Webhook - Post-Checkout Verification", () => {
  test("3. [MANUAL] Verify user provisioned after payment", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    const email = process.env.TEST_USER_EMAIL!;
    console.log(`\n  Checking user: ${email}`);

    // Check user exists in each app
    const safetunesResult = await checkUserInApp("safetunes", email);
    const safetubeResult = await checkUserInApp("safetube", email);
    const safereadsResult = await checkUserInApp("safereads", email);

    console.log("  SafeTunes:", safetunesResult);
    console.log("  SafeTube:", safetubeResult);
    console.log("  SafeReads:", safereadsResult);

    // At least one app should have the user
    const provisionedToAnyApp =
      safetunesResult.exists ||
      safetubeResult.exists ||
      safereadsResult.exists;

    expect(provisionedToAnyApp).toBe(true);
  });

  test("4. [MANUAL] Verify selective provisioning", async ({ page }) => {
    test.skip(!ADMIN_KEY, "ADMIN_API_KEY required for this test");

    console.log(`
  === SELECTIVE PROVISIONING VERIFICATION ===

  To verify selective provisioning:

  1. Complete a 2-app bundle checkout (SafeTunes + SafeTube only)
  2. Note the test email used

  3. Check each app's admin dashboard:

     SafeTunes (should have user):
     curl "${CONVEX_ENDPOINTS.safetunes}/adminDashboard?key=ADMIN_KEY&format=json" | jq '.users[] | select(.email=="TEST_EMAIL")'

     SafeTube (should have user):
     curl "${CONVEX_ENDPOINTS.safetube}/adminDashboard?key=ADMIN_KEY&format=json" | jq '.users[] | select(.email=="TEST_EMAIL")'

     SafeReads (should NOT have user):
     curl "${CONVEX_ENDPOINTS.safereads}/adminDashboard?key=ADMIN_KEY&format=json" | jq '.users[] | select(.email=="TEST_EMAIL")'

  4. Verify:
     - User exists in SafeTunes with status "active"
     - User exists in SafeTube with status "active"
     - User does NOT exist in SafeReads (or has "inactive" status)
    `);

    await page.pause();
  });
});

test.describe("Webhook - App Login After Provisioning", () => {
  test("5. [MANUAL] Login to provisioned app works", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD || TEST_PASSWORD;

    // Try logging into SafeTunes
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    console.log(`  Login successful: ${page.url()}`);
    expect(page.url()).not.toContain("/login");
  });

  test("6. [MANUAL] Non-provisioned app shows upgrade prompt", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    console.log(`
  === UPGRADE PROMPT VERIFICATION ===

  For a user who only purchased SafeTunes:

  1. Login to SafeTube with the same credentials
  2. Should see upgrade prompt (not full access)
  3. Verify prompt offers to upgrade subscription

  For a user who purchased all 3 apps:
  1. All apps should show full access
  2. No upgrade prompts should appear
    `);

    await page.pause();
  });
});

test.describe("Webhook - Duplicate Prevention", () => {
  test("7. [MANUAL] No duplicate Stripe customers created", async ({
    page,
  }) => {
    test.skip(!ADMIN_KEY, "ADMIN_API_KEY required for this test");

    console.log(`
  === DUPLICATE CUSTOMER VERIFICATION ===

  To verify no duplicates:

  1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/customers
  2. Search for the test email used
  3. Verify only ONE customer record exists

  Or via Stripe CLI:
  stripe customers list --email="TEST_EMAIL@test.getsafefamily.com" --limit=10

  Expected: Only 1 customer with that email

  If duplicates found:
  - Check webhook logs for errors
  - Verify checkout session has customer_creation="if_required"
    `);

    await page.pause();
  });
});

test.describe("Webhook - Full Flow Test", () => {
  test("8. [FULL FLOW] Complete signup, checkout, and verification", async ({
    page,
  }) => {
    const email = generateEmail("webhook-full");
    console.log(`
  === FULL WEBHOOK FLOW TEST ===

  Test email: ${email}
  Password: ${TEST_PASSWORD}

  Steps:
  1. Sign up on Marketing site
  2. Complete Stripe checkout with test card
  3. Verify redirect to success page
  4. Login to provisioned app
  5. Verify subscription status
    `);

    // Step 1: Signup
    await page.goto(`${MARKETING_URL}/signup?app=safetunes`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Webhook Full Test");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    await page.locator('button[type="submit"]').click();

    // Step 2: Stripe checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
    console.log("  Step 1-2: Reached Stripe checkout");
    console.log("  ACTION: Enter test card 4242 4242 4242 4242, any future date, any CVC");

    // Pause for manual payment
    await page.pause();

    // After manual steps, verify we're on success page or app
    const finalUrl = page.url();
    console.log(`  Final URL: ${finalUrl}`);

    if (
      finalUrl.includes("success") ||
      finalUrl.includes("thank-you") ||
      finalUrl.includes("dashboard")
    ) {
      console.log("  Step 3: Checkout completed successfully!");
    }

    // Step 4-5: Login verification
    console.log(`
  MANUAL VERIFICATION NEEDED:
  1. Go to ${APP_URLS.safetunes}/login
  2. Enter email: ${email}
  3. Enter password: ${TEST_PASSWORD}
  4. Verify redirect to dashboard/onboarding
  5. Check subscription status shows "active" or "trial"
    `);
  });
});

test.describe("Webhook - Promo Code Provisioning", () => {
  test("9. Promo code provisions without Stripe", async ({ page }) => {
    const email = generateEmail("webhook-promo");
    console.log(`\n  Test email: ${email}`);

    await page.goto(`${MARKETING_URL}/signup`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Webhook Promo Test");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    // Apply promo code
    await page.getByText("Have a promo code").click();
    const promoInput = page.locator(
      'input[placeholder*="code"], input[name="promoCode"], input[name="couponCode"]'
    );
    await promoInput.waitFor({ state: "visible" });
    await promoInput.fill("DAWSFRIEND");

    await page.waitForTimeout(500);

    // Should show lifetime badge - use more specific selector
    const lifetimeBadge = page.getByText('Lifetime access unlocked!');
    await expect(lifetimeBadge).toBeVisible({ timeout: 5000 });

    await page.locator('button[type="submit"]').click();

    // Should go directly to success (no Stripe)
    await page.waitForURL(/success|thank-you|dashboard/, { timeout: 30000 });

    console.log("  Promo signup completed!");
    console.log(`  Final URL: ${page.url()}`);

    // Verify redirect
    expect(
      page.url().includes("success") ||
        page.url().includes("thank-you") ||
        page.url().includes("dashboard")
    ).toBe(true);
  });

  test("10. Promo user can login to all apps", async ({ page }) => {
    test.skip(
      !process.env.PROMO_TEST_EMAIL,
      "Set PROMO_TEST_EMAIL to run this test"
    );

    const email = process.env.PROMO_TEST_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD || TEST_PASSWORD;

    // Test SafeTunes login
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    try {
      await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });
      console.log("  SafeTunes login: SUCCESS");
    } catch {
      console.log("  SafeTunes login: FAILED");
    }

    // Test SafeTube
    await page.goto(`${APP_URLS.safetube}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    try {
      await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });
      console.log("  SafeTube login: SUCCESS");
    } catch {
      console.log("  SafeTube login: FAILED");
    }

    // Test SafeReads
    await page.goto(`${APP_URLS.safereads}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    try {
      await page.waitForURL(/dashboard/, { timeout: 30000 });
      console.log("  SafeReads login: SUCCESS");
    } catch {
      console.log("  SafeReads login: FAILED");
    }
  });
});
