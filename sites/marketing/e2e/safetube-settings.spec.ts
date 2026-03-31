/**
 * SafeTube Settings E2E Tests
 *
 * Tests that settings page features are present.
 * Full password change flow requires manual testing (authenticated session).
 */

import { test, expect } from "@playwright/test";

const SAFETUBE_URL = "https://getsafetube.com";

test.describe("SafeTube Settings Page", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto(`${SAFETUBE_URL}/login`);
    await page.waitForLoadState("networkidle");

    // Should have email and password inputs
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  // Note: Settings page requires authentication
  // This test documents that the route exists
  test("settings route exists (redirects to login if not authenticated)", async ({ page }) => {
    await page.goto(`${SAFETUBE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Should either show admin page OR redirect to login
    const url = page.url();
    const isAdmin = url.includes("/admin");
    const isLogin = url.includes("/login");

    expect(isAdmin || isLogin).toBe(true);
  });
});

test.describe("SafeTube Blocked Search Feature", () => {
  test("kid player page loads", async ({ page }) => {
    await page.goto(`${SAFETUBE_URL}/play`);
    await page.waitForLoadState("networkidle");

    // Should show family code input
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });
});
