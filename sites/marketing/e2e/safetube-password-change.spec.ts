/**
 * SafeTube Password Change E2E Tests
 *
 * Verifies the password change functionality in SafeTube Settings.
 *
 * Usage:
 *   npx playwright test e2e/safetube-password-change.spec.ts
 *   npx playwright test e2e/safetube-password-change.spec.ts --headed
 *
 * Note: These tests verify UI elements are present. Full flow testing
 * requires authentication which is not covered in these basic tests.
 */

import { test, expect } from "@playwright/test";

const SAFETUBE_URL = "https://getsafetube.com";

test.describe("SafeTube Password Change", () => {
  test("login page has 'Forgot password?' link", async ({ page }) => {
    await page.goto(`${SAFETUBE_URL}/login`);

    // Should have forgot password link
    await expect(
      page.getByRole("link", { name: /forgot.*password/i })
    ).toBeVisible();
  });

  test("/forgot-password page loads correctly", async ({ page }) => {
    await page.goto(`${SAFETUBE_URL}/forgot-password`);

    // Should NOT redirect to homepage (404)
    await expect(page.locator("body")).not.toContainText("Something went wrong");

    // Check we're on the forgot-password page (not redirected to homepage)
    const url = page.url();
    expect(url).toContain("/forgot-password");

    // Should have email input for password reset
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();

    // Should have reset button
    await expect(
      page.getByRole("button", { name: /send.*code|reset|submit|code/i })
    ).toBeVisible();
  });

  test("/reset-password page redirects without email context", async ({ page }) => {
    // The reset-password page requires an email in localStorage (set during forgot-password flow)
    // Without it, it should redirect to forgot-password
    await page.goto(`${SAFETUBE_URL}/reset-password`);

    // Should redirect to forgot-password when no email context
    await page.waitForURL(/forgot-password/);
    const url = page.url();
    expect(url).toContain("/forgot-password");
  });

  test("forgot password form shows validation", async ({ page }) => {
    await page.goto(`${SAFETUBE_URL}/forgot-password`);

    // Try to submit without email
    const submitButton = page.getByRole("button", { name: /send.*code|reset|submit|code/i });
    await submitButton.click();

    // Form should not submit (either validation error or stay on same page)
    const url = page.url();
    expect(url).toContain("/forgot-password");
  });

  // Note: Full password change flow testing requires an authenticated session.
  // These tests verify the UI elements are present and accessible.

  test.describe("Settings Password Change UI (requires auth)", () => {
    test.skip(true, "Requires authenticated session");

    // These tests document expected behavior for manual verification
    // or future authenticated test setup

    test("Settings page shows Security section with Change Password button", async ({
      page,
    }) => {
      // After login, navigate to settings
      await page.goto(`${SAFETUBE_URL}/settings`);

      // Account tab should be visible
      await expect(page.getByRole("button", { name: "Account" })).toBeVisible();

      // Click Account tab
      await page.getByRole("button", { name: "Account" }).click();

      // Should see Security section
      await expect(page.getByText("Security")).toBeVisible();

      // Should see Change Password button
      await expect(
        page.getByRole("button", { name: "Change Password" })
      ).toBeVisible();
    });

    test("Change Password form shows validation errors", async ({ page }) => {
      // Navigate to settings and open password form
      await page.goto(`${SAFETUBE_URL}/settings`);
      await page.getByRole("button", { name: "Account" }).click();
      await page.getByRole("button", { name: "Change Password" }).click();

      // Try to submit empty form
      await page.getByRole("button", { name: "Update Password" }).click();

      // Should show validation error
      await expect(page.getByText(/required/i)).toBeVisible();
    });

    test("Change Password requires current password", async ({ page }) => {
      // Navigate to settings and open password form
      await page.goto(`${SAFETUBE_URL}/settings`);
      await page.getByRole("button", { name: "Account" }).click();
      await page.getByRole("button", { name: "Change Password" }).click();

      // Should have current password field
      await expect(
        page.getByPlaceholder(/current password/i)
      ).toBeVisible();
    });

    test("New password must be at least 8 characters", async ({ page }) => {
      await page.goto(`${SAFETUBE_URL}/settings`);
      await page.getByRole("button", { name: "Account" }).click();
      await page.getByRole("button", { name: "Change Password" }).click();

      // Fill with short password
      await page.getByPlaceholder(/current password/i).fill("testpass");
      await page.getByPlaceholder(/at least 8/i).fill("short");
      await page.getByPlaceholder(/re-enter/i).fill("short");

      await page.getByRole("button", { name: "Update Password" }).click();

      // Should show length validation error
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test("Passwords must match", async ({ page }) => {
      await page.goto(`${SAFETUBE_URL}/settings`);
      await page.getByRole("button", { name: "Account" }).click();
      await page.getByRole("button", { name: "Change Password" }).click();

      // Fill with mismatched passwords
      await page.getByPlaceholder(/current password/i).fill("testpass");
      await page.getByPlaceholder(/at least 8/i).fill("newpassword1");
      await page.getByPlaceholder(/re-enter/i).fill("newpassword2");

      await page.getByRole("button", { name: "Update Password" }).click();

      // Should show mismatch error
      await expect(page.getByText(/do not match/i)).toBeVisible();
    });

    test("Cancel button closes form and clears fields", async ({ page }) => {
      await page.goto(`${SAFETUBE_URL}/settings`);
      await page.getByRole("button", { name: "Account" }).click();
      await page.getByRole("button", { name: "Change Password" }).click();

      // Fill some fields
      await page.getByPlaceholder(/current password/i).fill("testpass");

      // Click cancel
      await page.getByRole("button", { name: "Cancel" }).click();

      // Form should be hidden
      await expect(
        page.getByPlaceholder(/current password/i)
      ).not.toBeVisible();

      // Change Password button should be visible again
      await expect(
        page.getByRole("button", { name: "Change Password" })
      ).toBeVisible();
    });
  });
});
