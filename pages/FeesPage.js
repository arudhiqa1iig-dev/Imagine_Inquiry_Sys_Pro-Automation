const { expect } = require('@playwright/test');
const { ListPage } = require('./ListPage');

/** "₨15,100.00" -> 15100 */
const money = (text) => Number(String(text).replace(/[^\d.-]/g, '')) || 0;

class CollectFeesPage extends ListPage {
  constructor(page) {
    super(page);
    this.classFilter = page.locator('select#class_id');
    this.filterButton = page.getByRole('button', { name: 'Filter' });
    this.collectSelected = page.getByRole('button', { name: 'Collect Selected' });
    this.collectModal = page.locator('#collectFeeModal');
  }

  async goto() {
    await this.open('/school/collect-fees');
  }

  async filterByClass(label) {
    await this.classFilter.selectOption({ label });
    await Promise.all([this.page.waitForURL(/class_id=/, { waitUntil: 'domcontentloaded' }), this.filterButton.click()]);
    await this.page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  }

  /** Opens the fee page of the first student in the list and returns their admission number. */
  async openFirstStudent() {
    const firstRow = this.rows.first();
    const admissionNo = (await firstRow.locator('td').first().innerText()).trim();
    await Promise.all([
      this.page.waitForURL(/admission_no=/, { waitUntil: 'domcontentloaded' }),
      firstRow.getByText('View & Collect').click(),
    ]);
    await this.page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    return admissionNo;
  }

  /** Ticks the first unpaid fee row and opens the Collect Fees modal (nothing is saved). */
  async openCollectModal() {
    await this.page.locator('.fee-item-checkbox').first().check();
    await expect(this.collectSelected).toBeEnabled();
    await this.collectSelected.click();
    await expect(this.collectModal).toBeVisible();
  }

  /** Reads the money summary cards on a student's fee page. */
  async readSummary() {
    const text = await this.page.locator('.content-wrapper').innerText();
    const get = (label) => {
      const m = text.match(new RegExp(`${label}\\s*₨\\s*([\\d,]+(?:\\.\\d+)?)`, 'i'));
      expect(m, `summary value "${label}" not found`).not.toBeNull();
      return money(m[1]);
    };
    return {
      assigned: get('Total Assigned'),
      paid: get('Total Paid'),
      concession: get('Concession'),
      fine: get('Fine'),
      balance: get('Balance Due'),
    };
  }
}

module.exports = { CollectFeesPage, money };
