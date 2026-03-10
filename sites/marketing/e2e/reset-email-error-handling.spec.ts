import { test, expect } from "@playwright/test";

const CENTRAL_RESET_PATTERN = "https://adamant-crow-705.convex.site/requestPasswordReset";

const APPS = [
  {
    name: "SafeTunes",
    origin: "https://getsafetunes.com",
    forgotPath: "/forgot-password",
    storageKey: "safetunes_reset_email",
  },
  {
    name: "SafeTube",
    origin: "https://getsafetube.com",
    forgotPath: "/forgot-password",
    storageKey: "safetube_reset_email",
  },
  {
    name: "SafeReads",
    origin: "https://getsafereads.com",
    forgotPath: "/forgot-password",
    storageKey: "safereads_reset_email",
  },
] as const;

const TEST_EMAIL = "error-flow@test.getsafefamily.com";

for (const app of APPS) {
  test.describe(`${app.name} reset email failure handling`, () => {
    test("forgot-password shows an error when reset email delivery fails", async ({
      page,
    }) => {
      await page.route(CENTRAL_RESET_PATTERN, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": "*",
          },
          body: JSON.stringify({
            success: false,
            error: "Failed to send password reset email. Please try again later.",
          }),
        });
      });

      await page.goto(`${app.origin}${app.forgotPath}`);
      await page.waitForLoadState("networkidle");

      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByRole("button", { name: /send|reset|submit|code/i }).click();

      await expect(
        page.getByText(/failed to send password reset email|something went wrong/i)
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: /check your email/i })
      ).not.toBeVisible();

      await expect(
        page.getByRole("button", { name: /enter reset code/i })
      ).not.toBeVisible();

      const storedEmail = await page.evaluate((storageKey) => {
        return window.localStorage.getItem(storageKey);
      }, app.storageKey);

      expect(storedEmail).toBeNull();
    });
  });
}
