import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'https://getsafefamily.com';
const TEST_PASSWORD = 'TestPass123!';

// Generate unique email for each test
function generateEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@test.getsafefamily.com`;
}

test.describe('E2E Checkout Tests', () => {

  test('1. SafeTunes Single App ($4.99/mo)', async ({ page }) => {
    const email = generateEmail('safetunes-test');
    console.log(`\n📧 Test email: ${email}`);

    // Navigate to signup with SafeTunes pre-selected
    await page.goto(`${BASE_URL}/signup?app=safetunes`);
    await page.waitForLoadState('networkidle');

    // Fill the form
    await page.locator('input[name="name"]').fill('Test User SafeTunes');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    console.log('✅ Form filled! Submitting...');

    // Submit - this will redirect to Stripe
    await page.locator('button[type="submit"]').click();

    // Wait for Stripe checkout page
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
    console.log('✅ Reached Stripe checkout');
    console.log('👉 USER ACTION REQUIRED: Enter card details and complete payment');

    // Pause for manual payment entry
    await page.pause();
  });

  test('2. SafeTube Single App ($4.99/mo)', async ({ page }) => {
    const email = generateEmail('safetube-test');
    console.log(`\n📧 Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup?app=safetube`);
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test User SafeTube');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

    console.log('✅ Form filled! Submitting...');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
    console.log('✅ Reached Stripe checkout');
    console.log('👉 USER ACTION REQUIRED: Enter card details and complete payment');

    await page.pause();
  });

  test('3. SafeReads Single App ($4.99/mo)', async ({ page }) => {
    const email = generateEmail('safereads-test');
    console.log(`\n📧 Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup?app=safereads`);
    await expect(page.locator('text=$4.99')).toBeVisible();

    await page.fill('input[name="name"]', 'Test User SafeReads');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    console.log('✅ Reached Stripe checkout');
    console.log('👉 USER ACTION REQUIRED: Enter card details and complete payment');

    await page.pause();
  });

  test('4. 2-App Bundle ($7.99/mo)', async ({ page }) => {
    const email = generateEmail('bundle2-test');
    console.log(`\n📧 Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup`);

    // Select only SafeTunes and SafeTube (deselect SafeReads if selected)
    const safereadsCheckbox = page.locator('input[value="safereads"]');
    if (await safereadsCheckbox.isChecked()) {
      await safereadsCheckbox.click();
    }

    // Verify 2-app price
    await expect(page.locator('text=$7.99')).toBeVisible();

    await page.fill('input[name="name"]', 'Test User 2-App');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    console.log('✅ Reached Stripe checkout for 2-app bundle');
    console.log('👉 USER ACTION REQUIRED: Enter card details and complete payment');

    await page.pause();
  });

  test('5. 3-App Bundle Monthly ($9.99/mo)', async ({ page }) => {
    const email = generateEmail('bundle3mo-test');
    console.log(`\n📧 Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup`);

    // Ensure all 3 apps selected
    const safetunesCheckbox = page.locator('input[value="safetunes"]');
    const safetubeCheckbox = page.locator('input[value="safetube"]');
    const safereadsCheckbox = page.locator('input[value="safereads"]');

    if (!await safetunesCheckbox.isChecked()) await safetunesCheckbox.click();
    if (!await safetubeCheckbox.isChecked()) await safetubeCheckbox.click();
    if (!await safereadsCheckbox.isChecked()) await safereadsCheckbox.click();

    // Verify 3-app monthly price
    await expect(page.locator('text=$9.99')).toBeVisible();

    await page.fill('input[name="name"]', 'Test User 3-App Monthly');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    console.log('✅ Reached Stripe checkout for 3-app monthly bundle');
    console.log('👉 USER ACTION REQUIRED: Enter card details and complete payment');

    await page.pause();
  });

  test('6. 3-App Bundle Yearly ($99/year)', async ({ page }) => {
    const email = generateEmail('bundle3yr-test');
    console.log(`\n📧 Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup`);

    // Ensure all 3 apps selected
    const safetunesCheckbox = page.locator('input[value="safetunes"]');
    const safetubeCheckbox = page.locator('input[value="safetube"]');
    const safereadsCheckbox = page.locator('input[value="safereads"]');

    if (!await safetunesCheckbox.isChecked()) await safetunesCheckbox.click();
    if (!await safetubeCheckbox.isChecked()) await safetubeCheckbox.click();
    if (!await safereadsCheckbox.isChecked()) await safereadsCheckbox.click();

    // Toggle to yearly
    await page.click('text=Yearly');

    // Verify yearly price
    await expect(page.locator('text=$99')).toBeVisible();

    await page.fill('input[name="name"]', 'Test User 3-App Yearly');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    console.log('✅ Reached Stripe checkout for 3-app yearly bundle');
    console.log('👉 USER ACTION REQUIRED: Enter card details and complete payment');

    await page.pause();
  });

  test('7. Promo Code DAWSFRIEND (Lifetime)', async ({ page }) => {
    const email = generateEmail('promo-test');
    console.log(`\n📧 Test email: ${email}`);

    await page.goto(`${BASE_URL}/signup`);

    // Ensure all 3 apps selected
    const safetunesCheckbox = page.locator('input[value="safetunes"]');
    const safetubeCheckbox = page.locator('input[value="safetube"]');
    const safereadsCheckbox = page.locator('input[value="safereads"]');

    if (!await safetunesCheckbox.isChecked()) await safetunesCheckbox.click();
    if (!await safetubeCheckbox.isChecked()) await safetubeCheckbox.click();
    if (!await safereadsCheckbox.isChecked()) await safereadsCheckbox.click();

    // Enter promo code
    await page.click('text=Have a promo code');
    await page.fill('input[name="promoCode"]', 'DAWSFRIEND');

    // Wait for lifetime badge
    await expect(page.locator('text=Lifetime access')).toBeVisible({ timeout: 5000 });

    await page.fill('input[name="name"]', 'Test User Promo');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');

    // For promo code, might go directly to success or Stripe with $0
    console.log('✅ Submitted with promo code');
    console.log('👉 Complete any checkout steps if shown');

    await page.pause();
  });
});
