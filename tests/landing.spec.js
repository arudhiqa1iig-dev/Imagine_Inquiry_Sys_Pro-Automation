const { test, expect } = require('@playwright/test');

test.describe('Public landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Imagine SMIS/i);
  });

  test('header navigation anchors are present', async ({ page }) => {
    for (const name of ['Home', 'Features', 'Why Us', 'Integrations', 'Contact Us']) {
      await expect(page.getByRole('link', { name, exact: true }).first()).toBeAttached();
    }
  });

  test('"Sign In" link navigates to the login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign In', exact: true }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#email')).toBeVisible();
  });

  test('feature category tabs are rendered', async ({ page }) => {
    for (const name of ['Core Setup', 'Academic', 'Finance', 'Communication', 'HR & Staff']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
  });

  test('contact details are shown in the footer', async ({ page }) => {
    await expect(page.locator('a[href^="tel:"]').first()).toBeAttached();
    await expect(page.locator('a[href^="mailto:"]').first()).toBeAttached();
  });
});
