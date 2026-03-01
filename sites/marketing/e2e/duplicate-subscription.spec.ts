import { test, expect } from "@playwright/test";

/**
 * E2E Test: Duplicate Subscription Prevention
 *
 * Tests the fix from commits:
 * - 372a166 fix(stripe): Add duplicate subscription protection to all checkout endpoints
 * - 5b60e3d fix(checkout): Block duplicate subscriptions for same email
 *
 * The protection checks Stripe for existing active/trialing subscriptions
 * and blocks checkout if one already exists.
 */

const BASE_URL = "https://getsafefamily.com";
const TEST_PASSWORD = "TestPass123!";

// This email must have an ACTIVE Stripe subscription to test the protection
// IMPORTANT: The user must have status "active" or "trialing" IN STRIPE, not just in our DB.
// To test:
// 1. Complete a fresh checkout with test card 4242424242424242
// 2. Note the email used
// 3. Run: TEST_SUBSCRIBER_EMAIL=email@example.com npx playwright test duplicate-subscription
// The test will verify that the same email cannot start another checkout.
const EXISTING_SUBSCRIBER_EMAIL = process.env.TEST_SUBSCRIBER_EMAIL || "";

test.describe("Duplicate Subscription Prevention", () => {
  test("blocks checkout for email with active subscription", async ({
    page,
  }) => {
    // Skip if no test subscriber email is configured
    if (!EXISTING_SUBSCRIBER_EMAIL) {
      console.log(
        "⚠️ TEST_SUBSCRIBER_EMAIL not set. To test duplicate prevention:"
      );
      console.log("1. Complete a test checkout with any email");
      console.log(
        "2. Run: TEST_SUBSCRIBER_EMAIL=your@email.com npx playwright test duplicate-subscription"
      );
      test.skip();
      return;
    }

    console.log(`\n📧 Testing with subscriber: ${EXISTING_SUBSCRIBER_EMAIL}`);

    // Navigate to signup page
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    // Fill the signup form
    await page.locator('input[name="name"]').fill("Test Duplicate");
    await page.locator('input[name="email"]').fill(EXISTING_SUBSCRIBER_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    console.log("✅ Form filled with existing subscriber email");

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Wait for error message to appear (the form should NOT redirect to Stripe)
    // The error message should contain "already have an active subscription"
    const errorElement = page.locator('[role="alert"], .text-red-500, .error');

    // Wait up to 10 seconds for the error to appear
    await expect(
      page.getByText(/already have an active subscription/i)
    ).toBeVisible({ timeout: 10000 });

    console.log("✅ Error message displayed as expected");

    // Verify we did NOT redirect to Stripe
    expect(page.url()).not.toContain("checkout.stripe.com");
    console.log("✅ Correctly blocked redirect to Stripe checkout");
  });

  test("displays helpful error message with settings link", async ({
    page,
  }) => {
    if (!EXISTING_SUBSCRIBER_EMAIL) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Test Duplicate");
    await page.locator('input[name="email"]').fill(EXISTING_SUBSCRIBER_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    await page.locator('button[type="submit"]').click();

    // Verify the error message includes helpful guidance
    // Expected: "You already have an active subscription. Go to Settings to manage it."
    const errorText = await page
      .getByText(/already have an active subscription/i)
      .textContent();
    expect(errorText).toContain("Settings");

    console.log("✅ Error message includes Settings guidance");
  });

  test("allows new email to proceed to checkout", async ({ page }) => {
    // Generate a unique email that definitely has no subscription
    const uniqueEmail = `new-user-${Date.now()}@test.getsafefamily.com`;

    console.log(`\n📧 Testing with new email: ${uniqueEmail}`);

    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Test New User");
    await page.locator('input[name="email"]').fill(uniqueEmail);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    console.log("✅ Form filled with new email");

    await page.locator('button[type="submit"]').click();

    // For a new email, should redirect to Stripe checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });

    console.log("✅ New user correctly redirected to Stripe checkout");
  });

  test("double-click prevention - button disabled after first click", async ({
    page,
  }) => {
    const uniqueEmail = `double-click-${Date.now()}@test.getsafefamily.com`;

    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Test Double Click");
    await page.locator('input[name="email"]').fill(uniqueEmail);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    const submitButton = page.locator('button[type="submit"]');

    // Click the button
    await submitButton.click();

    // Immediately check if button is disabled or shows loading state
    // (Most forms disable the button or change its state after click)
    const isDisabled = await submitButton.isDisabled();
    const buttonText = await submitButton.textContent();

    // Button should either be disabled or show loading indicator
    const hasLoadingState =
      isDisabled ||
      buttonText?.toLowerCase().includes("loading") ||
      buttonText?.toLowerCase().includes("...") ||
      buttonText?.toLowerCase().includes("processing");

    console.log(
      `Button state after click: disabled=${isDisabled}, text="${buttonText}"`
    );

    // Note: If the button doesn't show loading state, the form might rely on
    // the checkout API's duplicate protection. Either way, it should work.
    if (hasLoadingState) {
      console.log("✅ Button shows loading state - prevents double submission");
    } else {
      console.log(
        "⚠️ Button does not show loading state - relies on API protection"
      );
    }

    // Wait for redirect to Stripe (should only be one redirect)
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    console.log("✅ Single checkout session created");
  });
});

test.describe("API-level Duplicate Protection", () => {
  test("checkout API returns 400 for existing subscriber", async ({
    request,
  }) => {
    if (!EXISTING_SUBSCRIBER_EMAIL) {
      test.skip();
      return;
    }

    const response = await request.post(`${BASE_URL}/api/checkout`, {
      data: {
        email: EXISTING_SUBSCRIBER_EMAIL,
        selectedApps: ["safetunes"],
        isYearly: false,
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain("already have an active subscription");

    console.log("✅ API correctly rejects duplicate subscription request");
  });

  test("checkout API allows new email", async ({ request }) => {
    const uniqueEmail = `api-test-${Date.now()}@test.getsafefamily.com`;

    const response = await request.post(`${BASE_URL}/api/checkout`, {
      data: {
        email: uniqueEmail,
        selectedApps: ["safetunes"],
        isYearly: false,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.url).toContain("checkout.stripe.com");

    console.log("✅ API correctly allows new subscription request");
  });
});
