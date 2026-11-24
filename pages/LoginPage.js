const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.rememberMe = page.locator('#remember_me');
    this.submitButton = page.locator('#loginBtn');
    this.emailError = page.locator('[data-error-for="email"]');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });
  }

  async goto() {
    await this.open('/login');
    await expect(this.emailInput).toBeVisible();
  }

  async login(email, password, { remember = false } = {}) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    // The real checkbox is hidden (display:none) behind a styled toggle, so set it directly.
    if (remember) await this.rememberMe.evaluate((el) => { el.checked = true; });
    await this.submitButton.click();
  }
}

module.exports = { LoginPage };
