const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    this.greeting = page.getByText(/Good (Morning|Afternoon|Evening)/i).first();
    this.logoutForm = page.locator('#pw-logout-form');
    this.userMenuLogout = page.locator('.pw-logout-item');
  }

  async goto() {
    await this.open('/school/dashboard');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/school\/dashboard/);
    await this.expectHealthyPage();
  }

  /** Logs out via the same hidden form the user-menu "Logout" link submits. */
  async logout() {
    await Promise.all([
      this.page.waitForURL((url) => !url.pathname.startsWith('/school'), { timeout: 30_000 }),
      this.logoutForm.evaluate((form) => form.submit()),
    ]);
  }
}

module.exports = { DashboardPage };
