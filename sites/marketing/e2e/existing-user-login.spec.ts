/**
 * Existing User Login E2E Tests
 *
 * Verifies that existing users can log in to all Safe Family apps
 * with the same credentials via central auth.
 *
 * Usage:
 *   npx playwright test e2e/existing-user-login.spec.ts
 *   npx playwright test e2e/existing-user-login.spec.ts --headed
 *   npx playwright test e2e/existing-user-login.spec.ts --debug
 *
 * Environment Variables:
 *   TEST_USER_EMAIL - Test user email (default: uses promo signup)
 *   TEST_USER_PASSWORD - Test user password
 *   ADMIN_API_KEY - Admin API key for cleanup
 */

import { test, expect } from "@playwright/test";

// Configuration
const MARKETING_URL = "https://getsafefamily.com";
const APP_URLS = {
  safetunes: "https://getsafetunes.com",
  safetube: "https://getsafetube.com",
  safereads: "https://getsafereads.com",
};

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPass123!";

// Generate unique test email
function generateEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.getsafefamily.com`;
}

test.describe("Existing User Login - SafeTunes", () => {
  test("1. Login page loads with email/password form", async ({ page }) => {
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    // Verify login form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    // Verify Google OAuth option exists
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("2. Invalid credentials show error message", async ({ page }) => {
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    // Fill with invalid credentials
    await page.getByLabel(/email/i).fill("nonexistent@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");

    // Submit
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show error (central auth returns INVALID_CREDENTIALS)
    await page.waitForTimeout(2000);

    // Error message should appear
    const errorVisible = await page
      .locator('[role="alert"], .bg-red-50')
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBe(true);
  });

  test("3. [MANUAL] Login with valid credentials", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);

    console.log(`
  Logging in with:
  Email: ${process.env.TEST_USER_EMAIL}
  Password: ${TEST_PASSWORD}
    `);

    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to admin/dashboard
    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    console.log(`  Success! Redirected to: ${page.url()}`);
    expect(
      page.url().includes("admin") ||
        page.url().includes("dashboard") ||
        page.url().includes("onboarding")
    ).toBe(true);
  });
});

test.describe("Existing User Login - SafeTube", () => {
  test("4. Login page loads with email/password form", async ({ page }) => {
    await page.goto(`${APP_URLS.safetube}/login`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("5. Invalid credentials show error message", async ({ page }) => {
    await page.goto(`${APP_URLS.safetube}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill("nonexistent@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForTimeout(2000);

    const errorVisible = await page
      .locator('[role="alert"], .bg-red-50')
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBe(true);
  });

  test("6. [MANUAL] Login with valid credentials", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    await page.goto(`${APP_URLS.safetube}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);

    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    expect(
      page.url().includes("admin") ||
        page.url().includes("dashboard") ||
        page.url().includes("onboarding")
    ).toBe(true);
  });
});

test.describe("Existing User Login - SafeReads", () => {
  test("7. Login page loads with email/password form", async ({ page }) => {
    await page.goto(`${APP_URLS.safereads}/login`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("8. Invalid credentials show error message", async ({ page }) => {
    await page.goto(`${APP_URLS.safereads}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill("nonexistent@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForTimeout(2000);

    // SafeReads uses role="alert" for error messages
    const errorAlert = page.getByRole("alert").filter({ hasText: /failed|invalid|error/i });
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test("9. [MANUAL] Login with valid credentials", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    await page.goto(`${APP_URLS.safereads}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);

    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 30000 });

    expect(page.url()).toContain("dashboard");
  });
});

test.describe("Cross-App Login with Promo User", () => {
  // This test creates a user via promo code and then tests login on all apps
  test("10. [FULL FLOW] Create user and login across all apps", async ({
    page,
  }) => {
    const email = generateEmail("cross-app-login");
    console.log(`
  Test email: ${email}
  Password: ${TEST_PASSWORD}
    `);

    // Step 1: Create user via promo signup
    await page.goto(`${MARKETING_URL}/signup`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Cross-App Login Test");
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
    await page.locator('button[type="submit"]').click();

    // Wait for success
    await page.waitForURL(/success|thank-you|dashboard/, { timeout: 30000 });
    console.log("  User created successfully!");

    // Step 2: Pause for manual login testing
    console.log(`
  === MANUAL VERIFICATION ===
  User created! Now test login on each app:

  SafeTunes: ${APP_URLS.safetunes}/login
  SafeTube: ${APP_URLS.safetube}/login
  SafeReads: ${APP_URLS.safereads}/login

  Email: ${email}
  Password: ${TEST_PASSWORD}

  Verify:
  - Same password works on all 3 apps
  - Session persists after login
  - Logout works on each app
    `);

    await page.pause();
  });
});

test.describe("Session and Logout", () => {
  test("11. Logout link visible after login (requires TEST_USER_EMAIL)", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    // Login to SafeTunes
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    // Go to settings to find logout
    await page.goto(`${APP_URLS.safetunes}/settings`);
    await page.waitForLoadState("networkidle");

    // Should have logout option
    const logoutVisible = await page
      .getByRole("button", { name: /log ?out|sign ?out/i })
      .isVisible()
      .catch(() => false);

    expect(logoutVisible).toBe(true);
  });

  test("12. Session persists on page reload (requires TEST_USER_EMAIL)", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    // Login
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });
    const loggedInUrl = page.url();

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be logged in (not redirected to login)
    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain(loggedInUrl.split("?")[0].split("#")[0]);
  });
});
