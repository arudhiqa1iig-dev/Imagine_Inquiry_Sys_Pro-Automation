const { test, expect } = require('@playwright/test');
const { BasePage } = require('../pages/BasePage');
const routes = require('../data/routes');

/**
 * Smoke test: every module page reachable from the sidebar loads for the admin
 * with an OK status, stays authenticated and shows no server error.
 */
for (const [module, paths] of Object.entries(routes)) {
  test.describe(`Smoke: ${module}`, () => {
    for (const path of paths) {
      test(`GET ${path}`, async ({ page }) => {
        const base = new BasePage(page);
        const response = await base.open(path);
        expect(response, `no response for ${path}`).not.toBeNull();
        expect(response.status(), `HTTP status for ${path}`).toBeLessThan(400);
        await base.expectHealthyPage();
      });
    }
  });
}
