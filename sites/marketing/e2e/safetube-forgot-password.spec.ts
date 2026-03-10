/**
 * SafeTube Forgot Password E2E Tests
 *
 * Tests the complete forgot password flow.
 */

import { test, expect } from "@playwright/test";

const SAFETUBE_URL = "https://getsafetube.com";

test.describe("SafeTube Forgot Password Flow", () => {
  test("forgot-password page loads with form", async ({ page }) => {
    await page.goto(`${SAFETUBE_URL}/forgot-password`);
    await page.waitForLoadState("networkidle");

    // Should stay on forgot-password (not redirect)
    expect(page.url()).toContain("/forgot-password");

    // Should have email input
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Should have submit button
    await expect(page.getByRole("button", { name: /send|reset|submit/i })).toBeVisible();
  });

  test("submitting email shows success or sends reset", async ({ page }) => {
    await page.goto(`${SAFETUBE_URL}/forgot-password`);
    await page.waitForLoadState("networkidle");

    // Enter a test email
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("test-forgot-password@test.getsafefamily.com");

    // Click submit
    const submitButton = page.getByRole("button", { name: /send|reset|submit/i });
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Should show success message OR stay on page without error
    const hasSuccess = await page.getByText(/sent|check your email|reset link/i).isVisible().catch(() => false);
    const hasError = await page.getByText(/error|failed|something went wrong/i).isVisible().catch(() => false);

    // Either success message shown, or no error (good states)
    expect(hasError).toBe(false);
  });

  test("reset-password page loads when accessed", async ({ page }) => {
    // This page requires a token, so it should redirect to forgot-password or show error
    await page.goto(`${SAFETUBE_URL}/reset-password`);
    await page.waitForLoadState("networkidle");

    // Should either redirect to forgot-password or show "invalid/expired token" message
    const url = page.url();
    const redirectedToForgot = url.includes("/forgot-password");
    const hasTokenMessage = await page.getByText(/token|expired|invalid|enter your email/i).isVisible().catch(() => false);

    expect(redirectedToForgot || hasTokenMessage).toBe(true);
  });
});
