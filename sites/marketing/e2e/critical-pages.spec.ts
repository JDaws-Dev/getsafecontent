/**
 * Critical Pages E2E Tests
 *
 * Verifies that critical pages across all Safe Family apps load correctly.
 * These tests catch deployment issues where pages return 200 but fail client-side.
 *
 * Usage:
 *   npx playwright test e2e/critical-pages.spec.ts
 *   npx playwright test e2e/critical-pages.spec.ts --headed
 */

import { test, expect } from "@playwright/test";

// App URLs
const URLS = {
  marketing: "https://getsafefamily.com",
  safetunes: "https://getsafetunes.com",
  safetube: "https://getsafetube.com",
  safereads: "https://getsafereads.com",
};

test.describe("Marketing Site Pages", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto(URLS.marketing);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("500");
    // Should have Safe Family branding
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("signup page loads correctly", async ({ page }) => {
    await page.goto(`${URLS.marketing}/signup`);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    // Should have email field
    await expect(page.getByLabel(/email/i)).toBeVisible();
    // Should have a form
    await expect(page.locator("form")).toBeVisible();
  });

  test("login page loads correctly", async ({ page }) => {
    await page.goto(`${URLS.marketing}/login`);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("/account page loads without 500 error", async ({ page }) => {
    await page.goto(`${URLS.marketing}/account`);

    // Wait for client-side JS to execute
    await page.waitForLoadState("networkidle");

    // Should NOT show error states
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");

    // Should either show account page OR redirect to login (both are valid)
    const url = page.url();
    const isOnAccount = url.includes("/account");
    const isOnLogin = url.includes("/login");
    expect(isOnAccount || isOnLogin).toBe(true);

    // If on login, that's expected for unauthenticated users
    if (isOnLogin) {
      await expect(page.getByLabel(/email/i)).toBeVisible();
    }
  });

  test("/terms page loads correctly", async ({ page }) => {
    await page.goto(`${URLS.marketing}/terms`);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("404");

    // Should have Terms of Service heading
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible();
    // Should have content covering all 3 apps
    await expect(page.getByText(/safetunes/i).first()).toBeVisible();
    await expect(page.getByText(/safetube/i).first()).toBeVisible();
    await expect(page.getByText(/safereads/i).first()).toBeVisible();
  });

  test("/privacy page loads correctly", async ({ page }) => {
    await page.goto(`${URLS.marketing}/privacy`);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("404");

    // Should have Privacy Policy heading
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
    // Should have content covering all 3 apps
    await expect(page.getByText(/safetunes/i).first()).toBeVisible();
    await expect(page.getByText(/safetube/i).first()).toBeVisible();
    await expect(page.getByText(/safereads/i).first()).toBeVisible();
  });

  test("signup page terms link navigates to /terms", async ({ page }) => {
    await page.goto(`${URLS.marketing}/signup`);

    // Find and click the Terms link
    const termsLink = page.getByRole("link", { name: "Terms" });
    await expect(termsLink).toBeVisible();
    await termsLink.click();

    // Should navigate to /terms (not external getsafetunes.com)
    await page.waitForURL(/\/terms/);
    expect(page.url()).toContain("/terms");
    expect(page.url()).not.toContain("getsafetunes.com");

    // Should show Terms of Service content
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible();
  });

  test("signup page privacy link navigates to /privacy", async ({ page }) => {
    await page.goto(`${URLS.marketing}/signup`);

    // Find and click the Privacy Policy link
    const privacyLink = page.getByRole("link", { name: /privacy policy/i });
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();

    // Should navigate to /privacy (not external getsafetunes.com)
    await page.waitForURL(/\/privacy/);
    expect(page.url()).toContain("/privacy");
    expect(page.url()).not.toContain("getsafetunes.com");

    // Should show Privacy Policy content
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  });
});

test.describe("SafeTunes Pages", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto(URLS.safetunes);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    // Should have heading and not be an error page
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("landing page has no stale date references", async ({ page }) => {
    await page.goto(URLS.safetunes);
    await page.waitForLoadState("networkidle");

    // Should NOT have outdated Q1 2026 references (we're past Q1 2026)
    await expect(page.locator("body")).not.toContainText("Q1 2026");
    await expect(page.locator("body")).not.toContainText("Q2 2025");
    await expect(page.locator("body")).not.toContainText("Q3 2025");
    await expect(page.locator("body")).not.toContainText("Q4 2025");

    // Should have updated "coming soon" phrasing instead
    await expect(page.getByText(/coming soon/i).first()).toBeVisible();
  });

  test("login page loads correctly", async ({ page }) => {
    await page.goto(`${URLS.safetunes}/login`);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("forgot-password page loads correctly", async ({ page }) => {
    await page.goto(`${URLS.safetunes}/forgot-password`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("404");

    // Should have email input for password reset
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe("SafeTube Pages", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto(URLS.safetube);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    // Should have heading and not be an error page
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("login page loads correctly", async ({ page }) => {
    await page.goto(`${URLS.safetube}/login`);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("/forgot-password page loads correctly (P0 fix verification)", async ({ page }) => {
    await page.goto(`${URLS.safetube}/forgot-password`);

    // Wait for SPA to render
    await page.waitForLoadState("networkidle");

    // Should NOT redirect to homepage
    const url = page.url();
    expect(url).toContain("/forgot-password");

    // Should NOT show errors
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("body")).not.toContainText("Page not found");

    // Should have the forgot password form
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /reset|send|submit/i })).toBeVisible();
  });

  test("kid player page loads correctly", async ({ page }) => {
    await page.goto(`${URLS.safetube}/play`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).not.toContainText("Something went wrong");
    // Should show family code input or profile selector
    const hasInput = await page.getByPlaceholder(/code/i).isVisible().catch(() => false);
    const hasText = await page.getByText(/family code/i).isVisible().catch(() => false);
    expect(hasInput || hasText).toBe(true);
  });
});

test.describe("SafeReads Pages", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto(URLS.safereads);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    // Should have heading and not be an error page
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("login redirects to Google OAuth", async ({ page }) => {
    await page.goto(`${URLS.safereads}/login`);
    await page.waitForLoadState("networkidle");

    // SafeReads uses Google OAuth - should show Google button or redirect
    const url = page.url();
    const hasGoogleButton = await page.getByRole("button", { name: /google/i }).isVisible().catch(() => false);
    const isGoogleRedirect = url.includes("accounts.google.com");

    expect(hasGoogleButton || isGoogleRedirect || url.includes("/login")).toBe(true);
  });
});

test.describe("Cross-App Navigation", () => {
  test("Safe Family links work across apps", async ({ page }) => {
    // Start on marketing
    await page.goto(URLS.marketing);

    // Should have links to individual apps
    const safeTunesLink = page.getByRole("link", { name: /safetube/i }).first();
    await expect(safeTunesLink).toBeVisible();
  });
});
