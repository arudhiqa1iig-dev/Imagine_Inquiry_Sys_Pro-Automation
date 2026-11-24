const { test, expect } = require('@playwright/test');
const { ListPage, tableCells, expectHeaders, isMissing } = require('../pages/ListPage');
const { MasterDataPage, qaName } = require('../pages/MasterDataPage');

/**
 * Offline Examinations module.
 * Safe by design: the only data written is a temporary "QA-AUTO" exam and
 * exam type, both deleted again. Marks entry auto-saves, so the tests never
 * type into it. Schedules, marks, remarks, grades and uploads are never saved.
 */

// Class with subjects, a section and students on staging
const CLASS = 'Class 5';
const EXAM = 'First Terminal';

/** "15 Oct, 2026" -> Date */
const toDate = (text) => new Date(text.replace(',', ''));

test.describe('Exam dashboard and exams', () => {
  test('exam dashboard links to Manage Exams and Enter Marks', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/exams-dashboard');
    await expect(page).toHaveTitle('Exam Dashboard');
    await expect(page.getByRole('link', { name: 'Manage Exams' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Enter Marks' }).first()).toBeVisible();
  });

  test('exam list: every exam ends on or after its start date', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/exams');
    await expect(page).toHaveTitle('Manage Exams');
    await expectHeaders(page, ['Exam Name', 'Session', 'Start Date', 'End Date']);
    await list.expectTableHasRows();
    // Columns: [name, session, start, end, actions]
    for (const c of await tableCells(page)) {
      expect(toDate(c[3]).getTime(), `${c[0]}: ${c[2]} - ${c[3]}`).toBeGreaterThanOrEqual(toDate(c[2]).getTime());
    }
    const first = list.rows.first();
    for (const action of ['Admit Cards', 'Result Settings', 'Edit']) await expect(first.getByText(action)).toBeVisible();
  });

  test('new exam needs name, session and dates', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/exams/create');
    await expect(page).toHaveTitle('Add Exam');
    for (const f of ['name', 'academic_session_id', 'start_date', 'end_date']) {
      await expect(page.locator(`[name="${f}"]`)).toHaveAttribute('required', '');
    }
    await page.getByRole('button', { name: 'Save Exam' }).click();
    await expect(page).toHaveURL(/\/exams\/create$/);
    expect(await isMissing(page.locator('[name="name"]'))).toBe(true);
  });

  test('exam can be created, edited and deleted', async ({ page }) => {
    const exams = new MasterDataPage(page, {
      listPath: '/school/exams',
      createPath: '/school/exams/create',
      saveButton: /Save Exam/,
      updateButton: /Update Exam/,
    });
    // The list shows the current session, so create the exam there
    await exams.open('/school/exams/create');
    const session = (await page.locator('[name="academic_session_id"] option').nth(1).innerText()).trim();
    const name = qaName('Exam');
    const renamed = `${name} Edited`;

    try {
      await exams.create({ name, academic_session_id: session, start_date: '2026-12-20', end_date: '2026-12-24' });
      await expect(page).toHaveURL(/\/school\/exams$/);
      await exams.expectRowCount(name, 1);

      await exams.edit(name, { name: renamed });
      await expect(page).toHaveURL(/\/school\/exams$/);
      await exams.expectRowCount(renamed, 1);

      await exams.delete(renamed);
      await exams.expectRowCount(renamed, 0);
    } finally {
      await exams.delete(renamed).catch(() => {});
      await exams.delete(name).catch(() => {});
    }
  });
});

test.describe('Exam types and grades', () => {
  test('exam type can be created, edited and deleted', async ({ page }) => {
    const types = new MasterDataPage(page, {
      listPath: '/school/exam-types',
      createPath: '/school/exam-types/create',
      saveButton: /Create Exam Type/,
      updateButton: /Update|Save/,
    });
    const name = qaName('ExamType');
    const renamed = `${name} Edited`;

    try {
      await types.create({ name, abbreviation: 'QA' });
      await expect(page).toHaveURL(/\/school\/exam-types$/);
      await types.expectRowCount(name, 1);

      await types.edit(name, { name: renamed });
      await types.expectRowCount(renamed, 1);

      await types.delete(renamed);
      await types.expectRowCount(renamed, 0);
    } finally {
      await types.delete(renamed).catch(() => {});
      await types.delete(name).catch(() => {});
    }
  });

  test('grade bands cover 0-100% without gaps or overlaps', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/grades');
    await expect(page).toHaveTitle('Manage Grades');
    await expectHeaders(page, ['Grade Name', 'Percentage Range', 'Grade Point']);
    await list.expectTableHasRows();

    // Columns: [#, name, "90% 100%", point, description, actions]
    const bands = (await tableCells(page, 50))
      .map((c) => {
        const [min, max] = c[2].match(/[\d.]+/g).map(Number);
        return { name: c[1], min, max, point: Number(c[3]) };
      })
      .sort((a, b) => a.min - b.min);

    expect(bands[0].min, 'lowest band starts at 0%').toBe(0);
    expect(bands[bands.length - 1].max, 'highest band ends at 100%').toBe(100);
    for (let i = 1; i < bands.length; i++) {
      const [lower, upper] = [bands[i - 1], bands[i]];
      expect(upper.min, `${lower.name} -> ${upper.name}: no gap or overlap`).toBe(lower.max + 1);
      expect(upper.point, `${upper.name} has more grade points than ${lower.name}`).toBeGreaterThan(lower.point);
    }
  });

  test('new grade needs name and percentage range (not saved)', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/grades/create');
    for (const f of ['name', 'min_percentage', 'max_percentage']) {
      await expect(page.locator(`[name="${f}"]`)).toHaveAttribute('required', '');
    }
    await page.getByRole('button', { name: 'Save Grade' }).click();
    await expect(page).toHaveURL(/\/grades\/create$/);
    expect(await isMissing(page.locator('[name="name"]'))).toBe(true);
  });
});

test.describe('Schedule and marks entry', () => {
  test('exam schedule lists the class subjects with date and time fields (not saved)', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/exam-schedule');
    await expect(page).toHaveTitle('Exam Schedule & Marks Setup');
    await page.locator('select[name="exam_id"]').selectOption({ label: EXAM });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.locator('select[name="class_id"]').selectOption({ label: CLASS });
    await page.waitForURL(/exam_id=\d+&class_id=\d+/, { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(`Setup configuration for ${CLASS}`)).toBeVisible();
    await expectHeaders(page, ['Subject', 'Marks Distribution', 'Exam Date & Time']);
    await expect(page.locator('input[name$="[exam_date]"]').first()).toBeVisible();
    await expect(page.locator('input[name$="[start_time]"]').first()).toBeVisible();
    await expect(page.locator('input[name$="[end_time]"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Save All Setup/ })).toBeVisible();
  });

  test('marks entry: class -> section -> subject, then students load (nothing typed)', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/exam-marks/entry');
    await expect(page).toHaveTitle('Enter Exam Marks');
    for (const id of ['exam_id', 'class_id', 'section_id', 'subject_id']) {
      await expect(page.locator(`#${id}`)).toHaveAttribute('required', '');
    }

    await page.locator('#exam_id').selectOption({ label: EXAM });
    await page.locator('#class_id').selectOption({ label: CLASS });
    // Sections and then subjects are loaded after each choice
    await expect(page.locator('#section_id option')).not.toHaveCount(1);
    await page.locator('#section_id').selectOption({ index: 1 });
    await expect(page.locator('#subject_id option')).not.toHaveCount(1);
    const subject = (await page.locator('#subject_id option').nth(1).innerText()).trim();
    await page.locator('#subject_id').selectOption({ index: 1 });

    await Promise.all([
      page.waitForURL(/subject_id=\d+/, { waitUntil: 'domcontentloaded' }),
      page.getByRole('button', { name: 'Load Students' }).click(),
    ]);
    await expect(page.getByText(`Enter Marks (Subject: ${subject})`)).toBeVisible();
    // Marks are auto-saved, so this test only reads the grid
    await expect(page.getByText('Auto-saving enabled')).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toContainText(/Adm: ADM-\d+/);
    await expect(page.getByRole('button', { name: 'Finalise & Lock' })).toBeVisible();
  });
});

test.describe('Marksheets and remarks', () => {
  test('generate marksheet lists the students of a section', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/marksheet');
    await expect(page).toHaveTitle('Generate Marksheet');
    await page.locator('#report_card_setup_id').selectOption({ index: 1 });
    await page.locator('#class_id').selectOption({ label: CLASS });
    await expect(page.locator('#section_id option')).not.toHaveCount(1);
    await page.locator('#section_id').selectOption({ index: 1 });
    await Promise.all([
      page.waitForURL(/section_id=\d+/, { waitUntil: 'domcontentloaded' }),
      page.getByRole('button', { name: 'Search' }).click(),
    ]);
    await expectHeaders(page, ['Roll No', 'Admission No', 'Student Name']);
    await list.expectTableHasRows();
    await expect(list.rows.first()).toContainText(/ADM-\d+/);
    await expect(list.rows.first().getByText('Generate Report Card')).toBeVisible();
  });

  test('report card remarks and cocurricular grades need a class', async ({ page }) => {
    const list = new ListPage(page);
    for (const [path, title] of [['/school/marksheet-remarks', 'Enter Report Card Remarks'], ['/school/cocurricular-grades', 'Enter Cocurricular Grades']]) {
      await list.open(path);
      await expect(page).toHaveTitle(title);
      await page.getByRole('button', { name: 'Search Students' }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      expect(await isMissing(page.locator('#class_id')), `${path} class required`).toBe(true);
    }
  });

  test('marksheet upload requires student, exam, title and a file (not uploaded)', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/marksheet/upload');
    await expect(page).toHaveTitle('Upload Marksheet');
    for (const f of ['class_id', 'section_id', 'student_id', 'exam_id', 'title', 'marksheet_file']) {
      await expect(page.locator(`[name="${f}"]`)).toHaveAttribute('required');
    }
    await expect(page.locator('[name="marksheet_file"]')).toHaveAttribute('type', 'file');
  });

  test('report card setups and cocurricular areas are listed', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/report-card-setups');
    await expect(page).toHaveTitle('Report Card Setups');
    await expectHeaders(page, ['Name', 'Template Used', 'Exams & Weightage', 'Visible to Parents']);
    await list.expectTableHasRows();

    await list.open('/school/cocurricular-areas');
    await expect(page).toHaveTitle('Manage Cocurricular Areas');
    await expectHeaders(page, ['Area Name', 'Assigned Classes']);
    await list.expectTableHasRows();
  });
});
