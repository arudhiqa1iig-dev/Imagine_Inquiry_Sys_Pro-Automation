const { test, expect } = require('@playwright/test');
const { DashboardPage } = require('../pages/DashboardPage');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await new DashboardPage(page).goto();
  });

  test('loads for the logged-in admin', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
    await expect(dashboard.greeting).toBeVisible();
  });

  test('sidebar exposes the core modules', async ({ page }) => {
    for (const href of ['/school/students', '/school/classes', '/school/staff', '/school/collect-fees', '/school/exams']) {
      await expect(page.locator(`a[href$="${href}"]`).first()).toBeAttached();
    }
  });

  test('user menu offers a logout action', async ({ page }) => {
    await expect(new DashboardPage(page).userMenuLogout).toBeAttached();
    await expect(page.locator('#pw-logout-form')).toHaveAttribute('action', /\/logout$/);
  });

  test('sidebar "Student List" link navigates to students', async ({ page }) => {
    const href = await page.locator('a[href$="/school/students"]').first().getAttribute('href');
    await page.goto(href);
    await expect(page).toHaveURL(/\/school\/students$/);
    await expect(page).toHaveTitle('Student List');
  });
});
