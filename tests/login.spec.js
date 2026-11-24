const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

const { SMIS_USERNAME, SMIS_PASSWORD } = process.env;

test.describe('Login', () => {
  /** @type {LoginPage} */ let login;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    await login.goto();
  });

  test('login form renders all controls', async () => {
    await expect(login.emailInput).toHaveAttribute('placeholder', /email or admission ID/i);
    await expect(login.passwordInput).toHaveAttribute('type', 'password');
    await expect(login.rememberMe).toBeAttached();
    await expect(login.submitButton).toHaveText(/Sign In to Dashboard/i);
    await expect(login.forgotPasswordLink).toBeVisible();
  });

  test('valid credentials log in to the dashboard', async ({ page }) => {
    await login.login(SMIS_USERNAME, SMIS_PASSWORD);
    await page.waitForURL(/\/school\/dashboard/);
    await new DashboardPage(page).expectLoaded();
  });

  test('wrong password shows credentials error', async ({ page }) => {
    await login.login(SMIS_USERNAME, 'wrong-password-123');
    await expect(page).toHaveURL(/\/login/);
    await expect(login.emailError).toHaveText('These credentials do not match our records.');
  });

  test('unknown user shows credentials error', async ({ page }) => {
    await login.login('no.such.user.qa@example.com', 'whatever123');
    await expect(page).toHaveURL(/\/login/);
    await expect(login.emailError).toContainText(/do not match/i);
  });

  test('empty form is blocked by required-field validation', async ({ page }) => {
    await login.submitButton.click();
    await expect(page).toHaveURL(/\/login/);
    expect(await login.emailInput.evaluate((el) => el.validity.valueMissing)).toBe(true);
  });

  test('empty password is blocked by required-field validation', async ({ page }) => {
    await login.emailInput.fill(SMIS_USERNAME);
    await login.submitButton.click();
    await expect(page).toHaveURL(/\/login/);
    expect(await login.passwordInput.evaluate((el) => el.validity.valueMissing)).toBe(true);
  });

  test('forgot password link opens reset page', async ({ page }) => {
    await login.forgotPasswordLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('protected page redirects anonymous user to login', async ({ page }) => {
    await page.goto('/school/students');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Logout', () => {
  // Uses its own fresh login so it never invalidates the shared stored session.
  test('user can log out and is denied access afterwards', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(SMIS_USERNAME, SMIS_PASSWORD);
    await page.waitForURL(/\/school\/dashboard/);

    await new DashboardPage(page).logout();
    await expect(page).not.toHaveURL(/\/school\//);

    await page.goto('/school/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
