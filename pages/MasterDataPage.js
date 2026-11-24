const { expect } = require('@playwright/test');
const { ListPage } = require('./ListPage');

/**
 * A simple setup record (fee type, subject, ...) with a list page, a create
 * page and an edit page. Used for create -> edit -> delete tests.
 */
class MasterDataPage extends ListPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {{ listPath: string, createPath: string, saveButton: RegExp, updateButton: RegExp }} opts
   */
  constructor(page, opts) {
    super(page);
    this.opts = opts;
    // DataTables search box for the list (the navbar/sidebar search boxes have no aria-controls)
    this.searchBox = page.locator('input[type="search"][aria-controls]').first();
  }

  async gotoList() {
    await this.open(this.opts.listPath);
  }

  /** Fills inputs and textareas; picks dropdown options by their visible label. */
  async fillFields(fields) {
    for (const [name, value] of Object.entries(fields)) {
      const field = this.page.locator(`[name="${name}"]`);
      const tag = await field.evaluate((el) => el.tagName);
      if (tag === 'SELECT') await field.selectOption({ label: value });
      else await field.fill(value);
    }
  }

  async create(fields) {
    await this.open(this.opts.createPath);
    await this.fillFields(fields);
    await this.page.getByRole('button', { name: this.opts.saveButton }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Filters the list with the table search box and returns the row for this name.
   * Waits until the table has data and the filter has been applied, so a
   * "row count is 0" check can't pass just because the table was still loading.
   */
  async findRow(name) {
    await this.gotoList();
    await expect(this.rows.first()).toBeVisible();
    await this.searchBox.fill(name);
    await expect
      .poll(async () => (await this.rows.allInnerTexts()).every((text) => text.includes(name) || /No matching records/i.test(text)))
      .toBe(true);
    return this.rows.filter({ hasText: name });
  }

  async edit(name, fields) {
    const row = await this.findRow(name);
    await row.locator('a[href$="/edit"]').first().click();
    await this.page.waitForURL(/\/edit$/);
    await this.fillFields(fields);
    await this.page.getByRole('button', { name: this.opts.updateButton }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Deletes the row, accepting the browser "Are you sure?" confirm box. */
  async delete(name) {
    const row = await this.findRow(name);
    if ((await row.count()) === 0) return;
    this.page.once('dialog', (dialog) => dialog.accept());
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      row.locator('form button[type="submit"]').first().click(),
    ]);
  }

  async expectRowCount(name, count) {
    const row = await this.findRow(name);
    await expect(row).toHaveCount(count);
  }
}

/** Unique name for test records so they never clash with real data and are easy to spot. */
const qaName = (label) => `QA-AUTO ${label} ${Date.now().toString().slice(-6)}`;

module.exports = { MasterDataPage, qaName };
