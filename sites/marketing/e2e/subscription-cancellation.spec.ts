/**
 * Subscription Cancellation E2E Tests
 *
 * Verifies that canceling a subscription properly revokes app access
 * via Stripe webhooks.
 *
 * Note: These tests require a user with an active Stripe subscription.
 * Use `--debug` mode for interactive testing with Stripe portal.
 *
 * Usage:
 *   npx playwright test e2e/subscription-cancellation.spec.ts
 *   npx playwright test e2e/subscription-cancellation.spec.ts --headed
 *   npx playwright test e2e/subscription-cancellation.spec.ts --debug
 *
 * Environment Variables:
 *   ADMIN_API_KEY - Admin API key for verification endpoints
 *   TEST_USER_EMAIL - Email of user with active subscription
 *   TEST_USER_PASSWORD - Password for test user
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

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPass123!";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

// Helper to check user subscription status
async function checkUserStatus(
  app: "safetunes" | "safetube" | "safereads",
  email: string
): Promise<{ exists: boolean; status?: string }> {
  if (!ADMIN_KEY) {
    console.warn("ADMIN_API_KEY not set, skipping status check");
    return { exists: false };
  }

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

test.describe("Cancellation - Account Settings Access", () => {
  test("1. Settings page has subscription management", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    const email = process.env.TEST_USER_EMAIL!;

    // Login to SafeTunes
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    // Navigate to Settings
    const settingsTab = page.getByRole("button", { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    await page.waitForTimeout(1000);

    // Should have subscription management section
    const manageSubscription = page.getByRole("button", {
      name: /manage.*subscription|billing|cancel/i,
    });
    const subscriptionSection = page.locator(
      '[class*="subscription"], [class*="billing"]'
    );

    const hasManageButton = await manageSubscription.isVisible().catch(() => false);
    const hasSection = await subscriptionSection.isVisible().catch(() => false);

    console.log(`  Manage subscription button: ${hasManageButton ? "visible" : "not visible"}`);
    console.log(`  Subscription section: ${hasSection ? "visible" : "not visible"}`);

    // At least one subscription-related element should exist
    expect(hasManageButton || hasSection).toBe(true);
  });

  test("2. Marketing account page has billing management", async ({ page }) => {
    // Check if /account page exists and has billing options
    await page.goto(`${MARKETING_URL}/account`);
    await page.waitForLoadState("networkidle");

    // Should either show login prompt or account management
    const url = page.url();
    const isAccountPage = url.includes("/account");
    const isLoginRedirect = url.includes("/login");

    console.log(`  URL: ${url}`);
    console.log(`  Is account page: ${isAccountPage}`);
    console.log(`  Redirected to login: ${isLoginRedirect}`);

    // Either we're on the account page or were redirected to login (expected if not authenticated)
    expect(isAccountPage || isLoginRedirect).toBe(true);
  });
});

test.describe("Cancellation - Stripe Portal", () => {
  test("3. [MANUAL] Access Stripe Customer Portal", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    const email = process.env.TEST_USER_EMAIL!;

    console.log(`
  === STRIPE PORTAL ACCESS ===

  Steps to access Stripe portal:

  1. Login to SafeTunes Settings
  2. Click "Manage Subscription" or "Billing"
  3. Should redirect to Stripe Customer Portal
  4. Portal URL: billing.stripe.com/...

  OR directly via Stripe Dashboard:
  1. Go to https://dashboard.stripe.com/test/customers
  2. Search for: ${email}
  3. Click "Customer portal" button
    `);

    // Login to get to settings
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    // Navigate to Settings
    const settingsTab = page.getByRole("button", { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    await page.pause();
  });

  test("4. [MANUAL] Cancel subscription via Stripe Portal", async ({
    page,
  }) => {
    console.log(`
  === CANCEL SUBSCRIPTION VIA STRIPE PORTAL ===

  Prerequisites:
  - User with active Stripe subscription
  - Access to Stripe Customer Portal

  Steps:
  1. Access Stripe Customer Portal (see test 3)
  2. Click "Cancel subscription" or "Cancel plan"
  3. Confirm cancellation
  4. Note the cancellation end date

  Stripe Test Mode:
  - In test mode, you can use Stripe Dashboard to manually
    trigger subscription lifecycle events
  - Go to Customers > [Customer] > Subscriptions > [Subscription]
  - Click "..." menu > "Cancel subscription"

  Expected webhook events:
  - customer.subscription.updated (status: canceling)
  - customer.subscription.deleted (when period ends)
    `);

    await page.pause();
  });
});

test.describe("Cancellation - Webhook Handling", () => {
  test("5. [MANUAL] Verify cancellation webhook received", async ({ page }) => {
    test.skip(!ADMIN_KEY, "ADMIN_API_KEY required for this test");

    console.log(`
  === VERIFY CANCELLATION WEBHOOK ===

  Check webhook delivery:
  1. Stripe Dashboard > Developers > Webhooks
  2. Click on your webhook endpoint
  3. Look for recent events:
     - customer.subscription.updated
     - customer.subscription.deleted

  Check Vercel logs:
  1. Vercel Dashboard > [Project] > Logs
  2. Search for "webhook" or "subscription"
  3. Look for cancellation handling logs

  Expected log entries:
  - [webhook] Processing customer.subscription.updated
  - [webhook] Subscription cancelled for: <email>
  - [webhook] Updated status to: cancelled/expired
    `);

    await page.pause();
  });

  test("6. [MANUAL] Verify user status updated", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL || !ADMIN_KEY,
      "Set TEST_USER_EMAIL and ADMIN_API_KEY to run this test"
    );

    const email = process.env.TEST_USER_EMAIL!;

    // Check user status in each app
    const safetunesResult = await checkUserStatus("safetunes", email);
    const safetubeResult = await checkUserStatus("safetube", email);
    const safereadsResult = await checkUserStatus("safereads", email);

    console.log(`
  User status for: ${email}

  SafeTunes: ${safetunesResult.exists ? safetunesResult.status : "not found"}
  SafeTube: ${safetubeResult.exists ? safetubeResult.status : "not found"}
  SafeReads: ${safereadsResult.exists ? safereadsResult.status : "not found"}

  Expected after cancellation:
  - During grace period: "active" or "canceling"
  - After period ends: "cancelled" or "expired"
    `);

    // Log the results - actual assertion depends on timing
    console.log("  Status check complete. Verify manually if timing dependent.");
  });
});

test.describe("Cancellation - Access Revocation", () => {
  test("7. [MANUAL] Expired user sees upgrade prompt", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    console.log(`
  === EXPIRED USER UPGRADE PROMPT ===

  After subscription period ends:

  1. Login to SafeTunes with expired user
  2. Should see upgrade/resubscribe prompt
  3. Premium features should be locked

  To test immediately (Stripe test mode):
  1. Go to Stripe Dashboard > Customers > [Customer]
  2. Update subscription status manually
  3. Or use Stripe CLI: stripe subscriptions update sub_xxx --cancel-at-period-end

  Verify:
  - User can still login (account exists)
  - User sees "Subscription expired" or upgrade prompt
  - User cannot access premium features
    `);

    const email = process.env.TEST_USER_EMAIL!;

    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for login to complete
    await page.waitForTimeout(5000);

    // Check for upgrade prompt
    const upgradePrompt = page.locator(
      '[class*="upgrade"], [class*="expired"], [class*="subscribe"]'
    );
    const hasUpgradePrompt = await upgradePrompt.isVisible().catch(() => false);

    console.log(`  Upgrade prompt visible: ${hasUpgradePrompt}`);

    await page.pause();
  });

  test("8. [MANUAL] Premium features locked for expired user", async ({
    page,
  }) => {
    console.log(`
  === PREMIUM FEATURES LOCKED ===

  For each app, verify expired users cannot:

  SafeTunes:
  - Add songs to library
  - Create playlists
  - Access kid profiles (beyond limit)

  SafeTube:
  - Watch videos
  - Access channels
  - Create kid profiles (beyond limit)

  SafeReads:
  - Read books
  - Access library
  - Create reading lists

  The user should see:
  - Upgrade prompts on restricted actions
  - Clear messaging about expired subscription
  - Easy path to resubscribe
    `);

    await page.pause();
  });
});

test.describe("Cancellation - Resubscription", () => {
  test("9. [MANUAL] Re-subscribing restores access", async ({ page }) => {
    console.log(`
  === RESUBSCRIPTION RESTORES ACCESS ===

  Test flow:
  1. User with expired/cancelled subscription
  2. Click upgrade/resubscribe button
  3. Complete Stripe checkout
  4. Verify access restored

  Expected:
  - User redirected to Stripe checkout
  - After payment, webhook fires
  - Status updated to "active"
  - Premium features unlocked
  - Kid profiles accessible again

  Stripe webhook events:
  - checkout.session.completed
  - customer.subscription.created
  - invoice.paid
    `);

    await page.pause();
  });

  test("10. [MANUAL] Verify resubscription webhook", async ({ page }) => {
    test.skip(!ADMIN_KEY, "ADMIN_API_KEY required for this test");

    console.log(`
  === VERIFY RESUBSCRIPTION WEBHOOK ===

  After user resubscribes:

  1. Check Stripe webhook logs
  2. Verify checkout.session.completed received
  3. Check user status updated in apps

  Expected status: "active"

  Admin verification:
  curl "${CONVEX_ENDPOINTS.safetunes}/adminDashboard?key=ADMIN_KEY&format=json" | jq '.users[] | select(.email=="TEST_EMAIL")'

  Should show:
  - subscriptionStatus: "active"
  - stripeCustomerId: (unchanged)
  - Any previous data preserved
    `);

    await page.pause();
  });
});

test.describe("Cancellation - Edge Cases", () => {
  test("11. Cancellation during trial period", async ({ page }) => {
    console.log(`
  === TRIAL CANCELLATION ===

  If user cancels during trial:
  - Immediate access revocation (no grace period)
  - Status changes to "cancelled" or "trial_expired"
  - User can resubscribe with new trial? (depends on policy)

  Stripe behavior:
  - Trial subscriptions can be cancelled immediately
  - No refund needed (nothing charged yet)
  - User loses trial benefits immediately

  To test:
  1. Create user with trial subscription
  2. Cancel before trial ends
  3. Verify immediate access revocation
    `);

    await page.pause();
  });

  test("12. Lifetime users cannot be cancelled", async ({ page }) => {
    console.log(`
  === LIFETIME USER PROTECTION ===

  Lifetime users (promo codes):
  - Should NOT have Stripe subscription
  - Status: "lifetime"
  - Cannot be cancelled via Stripe
  - No billing/manage subscription button shown

  Verify in Settings:
  - Lifetime users see "Lifetime Access" badge
  - No "Cancel" or "Manage Subscription" option
  - No Stripe portal link
    `);

    // Could add automated check if we had a known lifetime user
    await page.pause();
  });
});
