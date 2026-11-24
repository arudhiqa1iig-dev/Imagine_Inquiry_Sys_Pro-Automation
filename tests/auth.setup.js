const { test: setup, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { STORAGE_STATE } = require('../playwright.config');

setup('authenticate as school admin', async ({ page }) => {
  const { SMIS_USERNAME, SMIS_PASSWORD } = process.env;
  if (!SMIS_USERNAME || !SMIS_PASSWORD) throw new Error('Set SMIS_USERNAME and SMIS_PASSWORD in .env');

  const login = new LoginPage(page);
  await login.goto();
  await login.login(SMIS_USERNAME, SMIS_PASSWORD, { remember: true });
  await page.waitForURL(/\/school\/dashboard/, { timeout: 45_000 });
  await expect(page).toHaveURL(/\/school\/dashboard/);
  await page.context().storageState({ path: STORAGE_STATE });
});
