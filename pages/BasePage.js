const { expect } = require('@playwright/test');

const SERVER_ERROR_PATTERNS = /Server Error|Whoops, looks like something went wrong|SQLSTATE|Page Expired|404 \| Not Found|403 \| Forbidden|500 \| Server Error/i;

class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  async open(path) {
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    return response;
  }

  /** Asserts the current page is a real, rendered app page (not login, not an error page). */
  async expectHealthyPage() {
    await expect(this.page).not.toHaveURL(/\/login(\?|$)/);
    await expect(this.page.locator('body')).not.toContainText(SERVER_ERROR_PATTERNS);
    await expect(this.page).toHaveTitle(/\S+/);
  }
}

module.exports = { BasePage, SERVER_ERROR_PATTERNS };
