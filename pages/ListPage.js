const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

/** Generic list/index page with a data table (students, classes, staff, ...). */
class ListPage extends BasePage {
  constructor(page) {
    super(page);
    this.table = page.locator('table').first();
    this.rows = this.table.locator('tbody tr');
  }

  async expectTableHasRows() {
    await expect(this.table).toBeVisible();
    await expect(this.rows.first()).toBeVisible();
  }
}

/** Returns the text of every cell of the first `limit` rows of the first table. */
const tableCells = (page, limit = 10) =>
  page.locator('table').first().locator('tbody tr').evaluateAll(
    (rows, n) => rows.slice(0, n).map((r) => [...r.querySelectorAll('td')].map((td) => td.innerText.trim())),
    limit,
  );

/** Checks the first table's header contains every given column name (case-insensitive). */
const expectHeaders = async (page, headers) => {
  const head = page.locator('table').first().locator('thead');
  for (const h of headers) await expect(head).toContainText(h, { ignoreCase: true });
};

/** True when a required form field is empty (the browser blocks the submit). */
const isMissing = (locator) => locator.evaluate((el) => el.validity.valueMissing);

module.exports = { ListPage, tableCells, expectHeaders, isMissing };
