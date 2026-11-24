const { test, expect } = require('@playwright/test');
const { ListPage, expectHeaders, isMissing } = require('../pages/ListPage');
const { CasPage } = require('../pages/CasPage');
const { qaName } = require('../pages/MasterDataPage');

/**
 * CAS (Continuous Assessment System) and the Assessment (unit test) module.
 * Safe by design: only temporary "QA-AUTO" criteria, levels and rounds are
 * created, and all of them are deleted at the end. CAS Setup is never saved
 * (it switches CAS on for real classes). No assessment is created.
 */

test.describe('CAS pages', () => {
  test('dashboard shows the readiness checklist and the three setup steps', async ({ page }) => {
    const cas = new CasPage(page);
    await cas.open('/school/cas/dashboard');
    await expect(page).toHaveTitle('CAS Dashboard');
    await expect(page.getByText('Continuous Assessment System').first()).toBeVisible();
    await expect(page.getByText('Readiness')).toBeVisible();
    for (const step of ['1. Criteria & indicators', '2. Rounds & weights', '3. Marks entry']) {
      await expect(page.getByRole('link', { name: step })).toBeVisible();
    }
  });

  test('setup lists every class with a CAS switch and report options (not saved)', async ({ page }) => {
    const cas = new CasPage(page);
    await cas.open('/school/cas/setup');
    await expect(page).toHaveTitle('CAS Setup');
    await expect(page.locator('input[name="cas_classes[]"]').first()).toBeAttached();
    expect(await page.locator('input[name="cas_classes[]"]').count()).toBeGreaterThan(1);
    for (const f of ['grade_scale_id', 'report_template_id', 'report_font']) {
      await expect(page.locator(`select[name="${f}"]`)).toBeAttached();
    }
    await expect(page.getByRole('button', { name: 'Save setup' })).toBeVisible();
  });

  test('marks entry asks for a round before a criterion', async ({ page }) => {
    const cas = new CasPage(page);
    await cas.open('/school/cas/marks');
    await expect(page).toHaveTitle('CAS Marks Entry');
    for (const f of ['school_class_id', 'subject_id', 'cas_assessment_period_id', 'cas_criterion_id']) {
      await expect(page.locator(`select[name="${f}"]`)).toBeAttached();
    }
    await expect(page.locator('select[name="cas_criterion_id"]')).toContainText('Choose a round first');
  });

  test('strands and reports pages load with guidance', async ({ page }) => {
    const cas = new CasPage(page);
    await cas.open('/school/cas/strands');
    await expect(page).toHaveTitle('CAS Strands');
    await cas.expectHealthyPage();
    await expect(page.getByText('Strands & Sub-strands')).toBeVisible();

    await cas.open('/school/cas/reports');
    await expect(page).toHaveTitle('CAS Reports');
    await expect(page.getByText('What the report shows')).toBeVisible();
  });

  test('criterion, level and round names are required', async ({ page }) => {
    const cas = new CasPage(page);
    await cas.open('/school/cas/criteria');
    await cas.criterionForm.getByRole('button', { name: 'Add criterion' }).click();
    expect(await isMissing(cas.criterionForm.locator('[name="name"]'))).toBe(true);
    await cas.levelForm.getByRole('button', { name: 'Add level' }).click();
    expect(await isMissing(cas.levelForm.locator('[name="name"]'))).toBe(true);

    await cas.open('/school/cas/periods');
    await cas.roundForm.getByRole('button', { name: 'Add round' }).click();
    expect(await isMissing(cas.roundForm.locator('[name="name"]'))).toBe(true);
    await expect(cas.roundForm.locator('[name="total_marks"]')).toHaveAttribute('required', '');
  });
});

test.describe('CAS record book setup', () => {
  // These tests write to the same CAS pages, so run them one after another.
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async ({ browser }) => {
    // Remove every QA-AUTO criterion, level and round, even if a test failed
    const context = await browser.newContext({ storageState: '.auth/admin.json' });
    await new CasPage(await context.newPage()).deleteAll('QA-AUTO');
    await context.close();
  });

  test('criterion form total = sum of its indicators', async ({ page }) => {
    const cas = new CasPage(page);
    const criterion = qaName('Criterion');

    await cas.addCriterion(criterion);
    await cas.expectFlash('Criterion added');
    await expect(cas.card(criterion)).toContainText('Form out of 0');

    await cas.addIndicator(criterion, 'QA indicator 1', 4);
    await cas.addIndicator(criterion, 'QA indicator 2', 6);
    await expect(cas.card(criterion)).toContainText('Form out of 10');
    await expect(cas.card(criterion)).toContainText('QA indicator 2');
  });

  test('round weights are saved and a total mismatch is reported', async ({ page }) => {
    const cas = new CasPage(page);
    const criterion = qaName('Criterion W');
    const round = qaName('Round');

    await cas.addCriterion(criterion);
    await expect(cas.card(criterion)).toContainText('Not weighted in any round yet');

    await cas.addRound(round, 24);
    await cas.expectFlash('Round added');
    await expect(cas.card(round)).toContainText('Out of 24');

    await cas.setWeight(round, criterion, 4);
    await cas.expectFlash('The weights add up to 4, not 24');
    await expect(cas.card(round)).toContainText('Weights total 4');
  });

  test('benchmark level can be added', async ({ page }) => {
    const cas = new CasPage(page);
    const level = qaName('Level');
    await cas.addLevel(level, 3);
    await cas.expectFlash('Benchmark level added');
    await expect(page.locator('tr', { hasText: level })).toContainText('3');
  });

  test('QA-AUTO criteria, levels and rounds can all be deleted', async ({ page }) => {
    const cas = new CasPage(page);
    await cas.deleteAll('QA-AUTO');
    await cas.open('/school/cas/periods');
    await expect(page.locator('.tpl-card-title', { hasText: 'QA-AUTO' })).toHaveCount(0);
    await cas.open('/school/cas/criteria');
    await expect(page.locator('.tpl-card-title', { hasText: 'QA-AUTO' })).toHaveCount(0);
    await expect(page.locator('tr', { hasText: 'QA-AUTO' })).toHaveCount(0);
  });
});

test.describe('Assessment (unit tests)', () => {
  test('assessment list shows type, subject, class and marks', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/assessment/assessments');
    await expect(page).toHaveTitle('Assessments');
    await expectHeaders(page, ['Title', 'Type', 'Subject', 'Class / Section', 'Marks', 'Sittings']);
    await expect(page.locator('select[name="type"] option')).toContainText(['All', 'Quiz', 'Test', 'Oral']);
    for (const f of ['class_id', 'subject_id', 'from', 'to']) await expect(page.locator(`[name="${f}"]`).first()).toBeAttached();
  });

  test('assessment detail shows marks, passing marks and sittings', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/assessment/assessments');
    await list.expectTableHasRows();
    await list.rows.first().locator('a').first().click();
    await expect(page).toHaveURL(/\/assessment\/assessments\/\d+$/);
    for (const label of ['Total marks', 'Passing', 'Recurrence', 'Sittings']) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('new assessment: required fields, and subjects load after choosing a class (not saved)', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/assessment/assessments/create');
    await expect(page).toHaveTitle('New Assessment');
    for (const f of ['title', 'type', 'school_class_id', 'subject_id', 'total_marks', 'frequency', 'scheduled_date']) {
      await expect(page.locator(`[name="${f}"]`)).toHaveAttribute('required', '');
    }
    await expect(page.locator('select[name="type"] option')).toHaveText(['Quiz', 'Test', 'Oral', 'Practical', 'Assignment', 'Other']);

    await page.locator('#assessment-class').selectOption({ label: 'Class 5' });
    await expect(page.locator('#assessment-subject option')).not.toHaveCount(1);

    await page.getByRole('button', { name: 'Create Assessment' }).click();
    await expect(page).toHaveURL(/\/assessments\/create$/);
    expect(await isMissing(page.locator('[name="title"]'))).toBe(true);
  });

  test('analytics needs a class before it can run', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/assessment/reports');
    await expect(page).toHaveTitle('Assessment Analytics');
    await page.getByRole('button', { name: 'Run' }).click();
    expect(await isMissing(page.locator('select[name="class_id"]'))).toBe(true);
  });
});
