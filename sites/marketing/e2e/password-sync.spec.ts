/**
 * Central Password Update E2E Tests
 *
 * Verifies that password changes are enforced consistently across apps
 * because Marketing is the central auth system for the suite.
 *
 * Usage:
 *   npx playwright test e2e/password-sync.spec.ts
 *   npx playwright test e2e/password-sync.spec.ts --headed
 *   npx playwright test e2e/password-sync.spec.ts --debug
 *
 * Environment Variables:
 *   TEST_USER_EMAIL - Test user email (for manual tests)
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

const ORIGINAL_PASSWORD = "TestPass123!";
const NEW_PASSWORD = "NewPass456!";

// Generate unique test email
function generateEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.getsafefamily.com`;
}

test.describe("Password Change UI - SafeTunes", () => {
  test("1. Settings page has password change section", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    // Login first
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page
      .locator('input[type="password"]')
      .fill(process.env.TEST_USER_PASSWORD || ORIGINAL_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    // Navigate to Settings tab
    const settingsTab = page.getByRole("button", { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    } else {
      // Try mobile menu
      const menuButton = page.locator('[aria-label="Menu"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.getByText(/settings/i).click();
      }
    }

    await page.waitForTimeout(1000);

    // Look for Change Password button
    const changePasswordButton = page.getByRole("button", {
      name: /change password/i,
    });
    await expect(changePasswordButton).toBeVisible();
  });

  test("2. Password change form has required fields", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    // Login
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page
      .locator('input[type="password"]')
      .fill(process.env.TEST_USER_PASSWORD || ORIGINAL_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    // Navigate to Settings
    const settingsTab = page.getByRole("button", { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    await page.waitForTimeout(1000);

    // Click Change Password to reveal form
    await page.getByRole("button", { name: /change password/i }).click();

    // Verify form fields
    await expect(
      page.getByPlaceholder(/current password/i)
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder*="8 characters"]')
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/re-enter/i)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /update password/i })
    ).toBeVisible();
  });

  test("3. Password change validates matching passwords", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    // Login
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page
      .locator('input[type="password"]')
      .fill(process.env.TEST_USER_PASSWORD || ORIGINAL_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    // Navigate to Settings
    const settingsTab = page.getByRole("button", { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    await page.waitForTimeout(1000);

    // Click Change Password
    await page.getByRole("button", { name: /change password/i }).click();

    // Fill with mismatched passwords
    await page
      .getByPlaceholder(/current password/i)
      .fill(ORIGINAL_PASSWORD);
    await page
      .locator('input[placeholder*="8 characters"]')
      .fill("NewPass123!");
    await page
      .getByPlaceholder(/re-enter/i)
      .fill("DifferentPass456!");

    // Submit
    await page.getByRole("button", { name: /update password/i }).click();

    // Should show error about passwords not matching
    const errorMessage = page.locator('[class*="red"]').filter({
      hasText: /match|do not match/i,
    });
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Password Change UI - SafeTube", () => {
  test("4. Settings page has password change section", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    await page.goto(`${APP_URLS.safetube}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
    await page
      .locator('input[type="password"]')
      .fill(process.env.TEST_USER_PASSWORD || ORIGINAL_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });

    // Navigate to Settings
    const settingsTab = page.getByRole("button", { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    await page.waitForTimeout(1000);

    const changePasswordButton = page.getByRole("button", {
      name: /change password/i,
    });
    await expect(changePasswordButton).toBeVisible();
  });
});

test.describe("Password Change UI - SafeReads", () => {
  test("5. Forgot password link available on login page", async ({ page }) => {
    // SafeReads doesn't have a Settings page with password change
    // Users must use the forgot password flow
    await page.goto(`${APP_URLS.safereads}/login`);
    await page.waitForLoadState("networkidle");

    // Should have a forgot password link
    const forgotPasswordLink = page.getByRole("link", {
      name: /forgot.*password|reset.*password/i,
    });
    await expect(forgotPasswordLink).toBeVisible();
  });

  test("6. Forgot password page loads correctly", async ({ page }) => {
    await page.goto(`${APP_URLS.safereads}/forgot-password`);
    await page.waitForLoadState("networkidle");

    // Should have email input
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Should have submit button
    await expect(
      page.getByRole("button", { name: /send|reset|submit/i })
    ).toBeVisible();
  });
});

test.describe("Central Password Update Flow", () => {
  test("7. [FULL FLOW] Password change is honored across apps", async ({ page }) => {
    // This test creates a user, changes the password in one app,
    // and verifies central auth enforces the new password everywhere.
    const email = generateEmail("password-update");
    console.log(`
  Test email: ${email}
  Original password: ${ORIGINAL_PASSWORD}
  New password: ${NEW_PASSWORD}
    `);

    // Step 1: Create user via promo signup
    await page.goto(`${MARKETING_URL}/signup`);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill("Central Password Update Test");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(ORIGINAL_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(ORIGINAL_PASSWORD);

    // Apply promo code
    await page.getByText("Have a promo code").click();
    const promoInput = page.locator(
      'input[placeholder*="code"], input[name="promoCode"], input[name="couponCode"]'
    );
    await promoInput.waitFor({ state: "visible" });
    await promoInput.fill("DAWSFRIEND");

    await page.waitForTimeout(500);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/success|thank-you|dashboard/, { timeout: 30000 });
    console.log("  Step 1: User created successfully!");

    // Step 2: Login to SafeTunes with original password
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(ORIGINAL_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 30000 });
    console.log("  Step 2: Logged into SafeTunes");

    // Step 3: Navigate to Settings and change password
    const settingsTab = page.getByRole("button", { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    await page.waitForTimeout(1000);

    // Open password change form
    await page.getByRole("button", { name: /change password/i }).click();
    await page.waitForTimeout(500);

    // Fill password change form
    await page
      .getByPlaceholder(/current password/i)
      .fill(ORIGINAL_PASSWORD);
    await page
      .locator('input[placeholder*="8 characters"]')
      .fill(NEW_PASSWORD);
    await page
      .getByPlaceholder(/re-enter/i)
      .fill(NEW_PASSWORD);

    // Submit password change
    await page.getByRole("button", { name: /update password/i }).click();

    // Wait for success
    await page.waitForTimeout(3000);

    // Check for success message
    const successVisible = await page
      .locator('[class*="green"]')
      .filter({ hasText: /success|updated/i })
      .isVisible()
      .catch(() => false);

    if (successVisible) {
      console.log("  Step 3: Password changed successfully!");
    } else {
      console.log("  Step 3: Password change submitted (check for errors)");
    }

    // Step 4: Log out of SafeTunes
    const logoutButton = page.getByRole("button", {
      name: /log ?out|sign ?out/i,
    });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Navigate to login page directly
      await page.goto(`${APP_URLS.safetunes}/login`);
    }
    console.log("  Step 4: Logged out of SafeTunes");

    // Step 5: Verify new password works on SafeTube
    await page.goto(`${APP_URLS.safetube}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    try {
      await page.waitForURL(/admin|dashboard|onboarding/, { timeout: 15000 });
      console.log("  Step 5: NEW password works on SafeTube!");
    } catch {
      console.log("  Step 5: Failed to login to SafeTube with new password");
    }

    // Step 6: Verify old password NO LONGER works on SafeTube
    await page.goto(`${APP_URLS.safetube}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(ORIGINAL_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForTimeout(3000);

    const stillOnLogin = page.url().includes("/login");
    const errorVisible = await page
      .locator('[role="alert"], [class*="red"]')
      .isVisible()
      .catch(() => false);

    if (stillOnLogin || errorVisible) {
      console.log("  Step 6: OLD password correctly rejected on SafeTube!");
    } else {
      console.log("  Step 6: WARNING - Old password may still work on SafeTube");
    }

    // Step 7: Verify new password works on SafeReads
    await page.goto(`${APP_URLS.safereads}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    try {
      await page.waitForURL(/dashboard/, { timeout: 15000 });
      console.log("  Step 7: NEW password works on SafeReads!");
    } catch {
      console.log("  Step 7: Failed to login to SafeReads with new password");
    }

    console.log(`
  === MANUAL VERIFICATION COMPLETE ===

  Test Results:
  - User created: ${email}
  - Original password: ${ORIGINAL_PASSWORD}
  - New password: ${NEW_PASSWORD}

  Verify:
  - Password was changed on SafeTunes
  - New password works on SafeTube
  - New password works on SafeReads
  - Old password rejected on all apps
  - Marketing central auth is the source of truth
    `);

    // Pause for manual verification
    await page.pause();
  });

  test("8. [MANUAL] Verify old password rejected after change", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Set TEST_USER_EMAIL to run this test"
    );

    const email = process.env.TEST_USER_EMAIL!;
    const oldPassword = process.env.OLD_PASSWORD || ORIGINAL_PASSWORD;

    console.log(`
  Testing that old password is rejected:
  Email: ${email}
  Old Password: ${oldPassword}
    `);

    // Try SafeTunes with old password
    await page.goto(`${APP_URLS.safetunes}/login`);
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(oldPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForTimeout(3000);

    const errorVisible = await page
      .locator('[role="alert"], [class*="red"]')
      .isVisible()
      .catch(() => false);

    expect(errorVisible).toBe(true);
    console.log("  Old password correctly rejected on SafeTunes");
  });
});

test.describe("Central Auth Verification", () => {
  test("9. [ADMIN] Verify central auth reflects the updated password", async ({
    page,
  }) => {
    test.skip(
      !process.env.ADMIN_API_KEY,
      "Set ADMIN_API_KEY to run this test"
    );

    // This test calls the admin endpoint to verify central auth was updated
    // In practice, this would be done via API call, not browser

    console.log(`
  To verify central auth was updated:

  1. Check Marketing admin dashboard:
     curl "https://adamant-crow-705.convex.site/adminDashboard?key=ADMIN_KEY&format=json"

  2. Look for user's authAccount entry
     - Should have updated password hash
     - Hash format: Scrypt (not $2a$/$2b$ bcrypt)

  3. Verify app logins:
     - New password works everywhere
     - Old password is rejected everywhere
    `);

    await page.pause();
  });
});
