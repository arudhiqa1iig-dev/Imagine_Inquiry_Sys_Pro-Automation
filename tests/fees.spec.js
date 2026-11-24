const { test, expect } = require('@playwright/test');
const { ListPage, tableCells, expectHeaders } = require('../pages/ListPage');
const { CollectFeesPage, money } = require('../pages/FeesPage');
const { MasterDataPage, qaName } = require('../pages/MasterDataPage');

/**
 * Finance & Fees module.
 * Safe by design: no payment is ever saved, no challan/due slip is generated and
 * nothing is sent. The only data written is a temporary "QA-AUTO" fee type that
 * the test deletes again.
 */



test.describe('Fees dashboard', () => {
  test('shows the due list and a Collect Fees shortcut', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/fees-dashboard');
    await expect(page).toHaveTitle('Fees Dashboard');
    await expectHeaders(page, ['Student Name', 'Adm. No', 'Class', 'Total Due']);
    await list.expectTableHasRows();
    await expect(page.getByRole('link', { name: 'Collect Fees' }).first()).toBeVisible();
  });
});

test.describe('Collect fees', () => {
  test('student list shows due amounts and a collect action', async ({ page }) => {
    const collect = new CollectFeesPage(page);
    await collect.goto();
    await expect(page).toHaveTitle('Collect Fees');
    await expectHeaders(page, ['Admission No', 'Student Name', 'Class (Section)', 'Total Due Amount']);
    await collect.expectTableHasRows();
    await expect(collect.rows.first().getByText('View & Collect')).toBeVisible();
  });

  test('class filter shows only students of that class', async ({ page }) => {
    const collect = new CollectFeesPage(page);
    await collect.goto();
    await collect.filterByClass('Class 5');
    await collect.expectTableHasRows();
    for (const cells of await tableCells(page)) {
      expect(cells[2], `row ${cells[0]}`).toMatch(/^Class 5\b(?!\d)/);
    }
  });

  test('student fee page: balance = assigned - paid - concession + fine', async ({ page }) => {
    const collect = new CollectFeesPage(page);
    await collect.goto();
    const admissionNo = await collect.openFirstStudent();
    await expect(page.locator('.content-wrapper')).toContainText(admissionNo);

    const s = await collect.readSummary();
    expect(s.balance).toBeCloseTo(s.assigned - s.paid - s.concession + s.fine, 2);
    await expect(page.getByText('Payment History')).toBeVisible();
  });

  test('collect modal asks for payment details and can be closed without saving', async ({ page }) => {
    const collect = new CollectFeesPage(page);
    await collect.goto();
    await collect.openFirstStudent();
    await collect.openCollectModal();

    const modal = collect.collectModal;
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[name="payment_date"]')).toHaveAttribute('required', '');
    await expect(modal.locator('select[name="payment_mode"]')).toHaveAttribute('required', '');
    await expect(modal.locator('select[name="target_bank_account_id"]')).toHaveAttribute('required', '');
    for (const mode of ['Cash', 'Card / POS', 'QR', 'Cheque', 'Bank Transfer']) {
      await expect(modal.locator('select[name="payment_mode"] option', { hasText: mode })).toHaveCount(1);
    }
    await expect(modal.getByRole('button', { name: 'Save Payment' })).toBeVisible();

    // Close WITHOUT saving: no payment is recorded.
    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(modal).toBeHidden();
  });

  test('KNOWN BUG: collect modal total has no currency symbol', async ({ page }) => {
    test.info().annotations.push({
      type: 'bug',
      description:
        'Collect Fees modal shows "Total Payable: 15100.00" without "₨". The page source contains the raw ' +
        'template code "config(\'school.currency_symbol\') . 0.00" instead of the symbol.',
    });
    // Expected to fail while the bug exists, so the suite stays green.
    // Playwright reports "expected to fail, but passed" once the bug is fixed.
    test.fail();

    const collect = new CollectFeesPage(page);
    await collect.goto();
    await collect.openFirstStudent();
    expect(await page.content(), 'raw template code in page source').not.toContain("config('school.currency_symbol')");
    await collect.openCollectModal();
    await expect(collect.collectModal).toContainText(/Total Payable:\s*₨/, { timeout: 3_000 });
  });
});

test.describe('Due fees report', () => {
  test('search by class lists students with correct due amounts', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/due-fees');
    await expect(page).toHaveTitle('Search Due Fees');
    await expect(page.locator('select#filter_type option')).toHaveText(
      ['Full Due (All Time)', 'Due This Month', 'Due This Quarter', 'Due Next 6 Months', /Custom/i],
    );

    await page.locator('select#class_id').selectOption({ label: 'Class 1' });
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await expect(page.locator('select#class_id option:checked')).toHaveText('Class 1');
    await expectHeaders(page, ['Admission No', 'Total Amount', 'Paid Amount', 'Discount', 'Due Amount']);
    await list.expectTableHasRows();

    // Columns: [check, #, adm no, student, parent, groups, due date, total, paid, discount, due]
    for (const c of await tableCells(page)) {
      const [total, paid, discount, due] = [c[7], c[8], c[9], c[10]].map(money);
      // Due can be higher than total - paid - discount because fines are added
      expect(due, `due amount for ${c[2]}`).toBeGreaterThanOrEqual(total - paid - discount - 0.01);
      expect(due, `due amount for ${c[2]}`).toBeGreaterThan(0);
    }
  });
});

test.describe('Fee setup', () => {
  test('fee groups list shows totals and an add button', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/fee-groups');
    await expect(page).toHaveTitle('Fee Groups');
    await expectHeaders(page, ['Name', 'Fee Types & Details', 'Total Amount']);
    await list.expectTableHasRows();
    await page.getByRole('link', { name: 'Add New Fee Group' }).click();
    await expect(page).toHaveURL(/\/school\/fee-groups\/create$/);
    await list.expectHealthyPage();
  });

  test('fee discounts list shows type and amount', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/fee-discounts');
    await expect(page).toHaveTitle('Fees Discounts');
    await expectHeaders(page, ['Name', 'Code', 'Type', 'Amount / Percentage']);
    await list.expectTableHasRows();
    await expect(page.getByRole('link', { name: 'Add New Discount' })).toHaveAttribute('href', /\/fee-discounts\/create$/);
  });

  test('new fee type cannot be saved without a name', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/fee-types/create');
    const name = page.locator('input[name="name"]');
    await expect(name).toHaveAttribute('required', '');
    await page.getByRole('button', { name: 'Create Fee Type' }).click();
    await expect(page).toHaveURL(/\/fee-types\/create$/);
    expect(await name.evaluate((el) => el.validity.valueMissing)).toBe(true);
  });

  test('fee type can be created, edited and deleted', async ({ page }) => {
    const feeTypes = new MasterDataPage(page, {
      listPath: '/school/fee-types',
      createPath: '/school/fee-types/create',
      saveButton: /Create Fee Type/,
      updateButton: /Update|Save/,
    });
    const name = qaName('Fee');
    const renamed = `${name} Edited`;

    try {
      await feeTypes.create({ name, fee_code: 'QAAUTO', description: 'Created by automated test' });
      await expect(page).toHaveURL(/\/school\/fee-types$/);
      await feeTypes.expectRowCount(name, 1);

      await feeTypes.edit(name, { name: renamed });
      await expect(page).toHaveURL(/\/school\/fee-types$/);
      await feeTypes.expectRowCount(renamed, 1);

      await feeTypes.delete(renamed);
      await feeTypes.expectRowCount(renamed, 0);
    } finally {
      // Clean up even if a step above failed
      await feeTypes.delete(renamed).catch(() => {});
      await feeTypes.delete(name).catch(() => {});
    }
  });
});

test.describe('Fee assignment and bulk entry', () => {
  test('assign fees: class is required, then students are listed', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/assign-fees');
    await expect(page).toHaveTitle('Manage Fee Assignments');
    const cls = page.locator('select#class_id');
    await expect(cls).toHaveAttribute('required', '');

    await cls.selectOption({ label: 'Class 1' });
    await Promise.all([page.waitForURL(/class_id=/, { waitUntil: 'domcontentloaded' }), page.getByRole('button', { name: 'Retrieve Students' }).click()]);
    await list.expectTableHasRows();
    await expect(list.rows.first()).toContainText(/ADM-\d+/);
  });

  test('bulk fee entry needs class, section and fee group', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/fees-carry-forward');
    await expect(page).toHaveTitle('Bulk Fee Entry');
    for (const id of ['class_id', 'section_id', 'fee_group_id']) {
      await expect(page.locator(`select#${id}`)).toHaveAttribute('required', '');
    }
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/fees-carry-forward$/);
    expect(await page.locator('select#class_id').evaluate((el) => el.validity.valueMissing)).toBe(true);
  });
});

test.describe('Due slips and challans', () => {
  test('due slip needs a month and a year', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/due-slips');
    await expect(page).toHaveTitle('Generate Due Slip');
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page).toHaveURL(/\/due-slips$/);
    expect(await page.locator('#sel_month').evaluate((el) => el.validity.valueMissing)).toBe(true);
    await expect(page.locator('#sel_year')).toHaveAttribute('required', '');
  });

  test('due slip history lists generated slips', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/due-slips/history');
    await expect(page).toHaveTitle('Due Slip History');
    await expectHeaders(page, ['Slip Code', 'Student', 'Month', 'Total Due', 'Generated On']);
    await list.expectTableHasRows();
    await expect(list.rows.first()).toContainText(/DS-\d+/);
  });

  test('fee challans list shows challan number and status', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/fee-challans');
    await expect(page).toHaveTitle('Fee Challans');
    await expectHeaders(page, ['Challan No', 'Student', 'Amount', 'Due Date', 'Status']);
    await list.expectTableHasRows();
    await expect(page.getByRole('button', { name: 'Generate Challan' }).first()).toBeVisible();
    // Columns: [#, challan no, student, adm no, class, type, amount, due date, status, actions]
    for (const c of await tableCells(page)) {
      expect(c[8], `status of ${c[1]}`).toMatch(/Paid|Unpaid|Pending|Partial|Cancelled|Overdue/i);
    }
  });
});

test.describe('Transactions', () => {
  test('all transactions: total paid = amount + gateway charge', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/transactions');
    await expect(page).toHaveTitle('All Transactions');
    await expectHeaders(page, ['Receipt', 'Student', 'Payment Mode', 'Amount', 'Gateway Charge', 'Total Paid', 'Status']);
    await list.expectTableHasRows();
    await expect(page.locator('#start_date')).toBeVisible();
    await expect(page.locator('#end_date')).toBeVisible();
    // Columns: [#, receipt, student, mode, amount, gateway, total, status, date, actions]
    for (const c of await tableCells(page)) {
      expect(money(c[6]), `total for ${c[1]}`).toBeCloseTo(money(c[4]) + money(c[5]), 2);
    }
  });

  test('online payments page loads its table', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/online-payments');
    await expect(page).toHaveTitle('Online Payment Transactions');
    await expectHeaders(page, ['Order Details', 'Student', 'Amount', 'Status']);
  });
});
