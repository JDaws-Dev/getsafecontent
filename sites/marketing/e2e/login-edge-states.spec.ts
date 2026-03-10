import { test, expect } from "@playwright/test";

const CENTRAL_LOGIN_PATTERN = "https://adamant-crow-705.convex.site/login";

const APPS = [
  {
    name: "SafeTunes",
    origin: "https://getsafetunes.com",
    loginPath: "/login",
    brandName: "SafeTunes",
    resetUi: "inline",
  },
  {
    name: "SafeTube",
    origin: "https://getsafetube.com",
    loginPath: "/login",
    brandName: "SafeTube",
    resetUi: "inline",
  },
  {
    name: "SafeReads",
    origin: "https://getsafereads.com",
    loginPath: "/login",
    brandName: "SafeReads",
    resetUi: "prompt",
  },
] as const;

const TEST_EMAIL = "edge-case@test.getsafefamily.com";
const TEST_PASSWORD = "BadPassword123!";

async function gotoLoginWithRetry(
  page: Parameters<typeof test>[0]["page"],
  url: string
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      return;
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof Error) ||
        (!error.message.includes("ERR_ABORTED") &&
          !error.message.includes("ERR_NETWORK_CHANGED") &&
          !error.message.includes("frame was detached"))
      ) {
        throw error;
      }
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }

  throw lastError;
}

async function expectResetRemediation(
  page: Parameters<typeof test>[0]["page"],
  message: RegExp
) {
  const upgradeHeading = page.getByText(/we've upgraded our login system/i);
  const resetButton = page.getByRole("button", { name: /send password reset email/i });
  const inlineMessage = page.getByText(message);
  const forgotPasswordLink = page.getByRole("link", { name: /forgot password\?/i });

  await Promise.race([
    upgradeHeading.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined),
    inlineMessage.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined),
  ]);

  if (await upgradeHeading.isVisible().catch(() => false)) {
    await expect(upgradeHeading).toBeVisible();
    await expect(resetButton).toBeVisible();
    return;
  }

  await expect(inlineMessage).toBeVisible();
  await expect(forgotPasswordLink).toBeVisible();
}

for (const app of APPS) {
  test.describe(`${app.name} login edge states`, () => {
    test("shows Google guidance for OAUTH_ONLY", async ({ page }) => {
      await page.route(CENTRAL_LOGIN_PATTERN, async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            code: "OAUTH_ONLY",
            error: "This account uses Google sign-in. Please use the Google sign-in option.",
          }),
        });
      });

      await gotoLoginWithRetry(page, `${app.origin}${app.loginPath}`);

      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(
        page.getByText(/this account uses google sign-in/i)
      ).toBeVisible();
    });

    test("shows migrated-user reset prompt for PASSWORD_RESET_REQUIRED", async ({
      page,
    }) => {
      await page.route(CENTRAL_LOGIN_PATTERN, async (route) => {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            code: "PASSWORD_RESET_REQUIRED",
            error: "Please reset your password by clicking 'Forgot password?'.",
          }),
        });
      });

      await gotoLoginWithRetry(page, `${app.origin}${app.loginPath}`);

      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.getByRole("button", { name: /sign in/i }).click();

      await expectResetRemediation(
        page,
        /please reset your password by clicking 'forgot password\?'/i
      );
    });

    test("shows setup/reset prompt for INCOMPLETE_SIGNUP", async ({ page }) => {
      await page.route(CENTRAL_LOGIN_PATTERN, async (route) => {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            code: "INCOMPLETE_SIGNUP",
            error: "Please complete your account setup by clicking 'Forgot password?'.",
          }),
        });
      });

      await gotoLoginWithRetry(page, `${app.origin}${app.loginPath}`);

      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.getByRole("button", { name: /sign in/i }).click();

      await expectResetRemediation(
        page,
        /please complete your account setup by clicking 'forgot password\?'/i
      );
    });

    test("shows upgrade prompt for NOT_ENTITLED", async ({ page }) => {
      await page.route(CENTRAL_LOGIN_PATTERN, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            token: "mock-token",
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            user: {
              email: TEST_EMAIL,
              name: "Edge Case User",
              subscriptionStatus: "inactive",
              entitledApps: [],
            },
          }),
        });
      });

      await gotoLoginWithRetry(page, `${app.origin}${app.loginPath}`);

      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(
        page.getByText(new RegExp(`Welcome to ${app.brandName}!`, "i"))
      ).toBeVisible();

      await expect(
        page.getByRole("link", { name: /upgrade now/i })
      ).toBeVisible();
    });
  });
}
