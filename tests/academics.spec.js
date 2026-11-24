const { test, expect } = require('@playwright/test');
const { ListPage, tableCells } = require('../pages/ListPage');
const { MasterDataPage, qaName } = require('../pages/MasterDataPage');

/**
 * Academics module (plus the Students and Staff lists).
 * Safe by design: only a temporary "QA-AUTO" subject is created and then
 * deleted. Assignment pages and the event form are never saved.
 */


/** "10:15 AM" / "14:30" -> minutes since midnight */
const toMinutes = (time) => {
  const [, h, m, ampm] = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  let hours = Number(h);
  if (ampm) hours = (hours % 12) + (ampm.toUpperCase() === 'PM' ? 12 : 0);
  return hours * 60 + Number(m);
};

test.describe('Students', () => {
  test('student list shows a populated table with filters', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/students');
    await expect(page).toHaveTitle('Student List');
    await list.expectTableHasRows();
    await expect(page.locator('select[name="class_id"]')).toBeAttached();
    await expect(page.locator('select[name="section_id"]')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
  });

  test('add student page renders the admission form', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/students/create');
    await list.expectHealthyPage();
    await expect(page.locator('form[method="POST"], form[method="post"]').first()).toBeAttached();
  });
});

test.describe('Classes', () => {
  test('class list shows a table with reorder option', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/classes');
    await expect(page).toHaveTitle('Classes');
    await list.expectTableHasRows();
    await expect(page.getByRole('button', { name: 'Reorder' })).toBeVisible();
  });

  test('create class form requires a class name', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/classes/create');
    await expect(page).toHaveTitle('Add Class');
    const name = page.locator('input[name="name"]');
    await expect(name).toHaveAttribute('required', '');
    await page.getByRole('button', { name: 'Create Class' }).click();
    // Submission is blocked client-side: still on the create page, field flagged as missing
    await expect(page).toHaveURL(/\/school\/classes\/create/);
    expect(await name.evaluate((el) => el.validity.valueMissing)).toBe(true);
  });
});

test.describe('Staff', () => {
  test('staff directory shows a table and bulk upload', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/staff');
    await expect(page).toHaveTitle('Staff Directory');
    await list.expectTableHasRows();
    await expect(page.getByRole('button', { name: 'Bulk Upload' })).toBeVisible();
  });
});

test.describe('Academic sessions', () => {
  test('exactly one session is marked as current', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/academic-sessions');
    await expect(page).toHaveTitle('Academic Sessions');
    await list.expectTableHasRows();
    // Columns: [#, name, period, students, status, actions]
    const statuses = (await tableCells(page)).map((c) => c[4]);
    expect(statuses.filter((s) => /^Current$/i.test(s)), `statuses: ${statuses}`).toHaveLength(1);
  });

  test('new session cannot be saved without a name', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/academic-sessions/create');
    await expect(page).toHaveTitle('Add Academic Session');
    await expect(page.locator('input[name="start_date"]')).toBeVisible();
    await expect(page.locator('input[name="end_date"]')).toBeVisible();
    await page.getByRole('button', { name: 'Save Session' }).click();
    await expect(page).toHaveURL(/\/academic-sessions\/create$/);
    expect(await page.locator('input[name="name"]').evaluate((el) => el.validity.valueMissing)).toBe(true);
  });
});

test.describe('Sections', () => {
  test('section list shows the class each section belongs to', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/sections');
    await expect(page).toHaveTitle('Sections');
    await list.expectTableHasRows();
    // Columns: [id, section name, class, in-charge, actions]
    for (const c of await tableCells(page)) {
      expect(c[1], `section ${c[0]} name`).not.toBe('');
      expect(c[2], `section ${c[0]} class`).not.toBe('');
    }
  });
});

test.describe('Subjects', () => {
  test('subject list shows the type of every subject', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/subjects');
    await expect(page).toHaveTitle('Subjects');
    await list.expectTableHasRows();
    // Columns: [id, name, code, type, group, actions]
    for (const c of await tableCells(page)) expect(c[3], `type of ${c[1]}`).toMatch(/compulsory|elective/i);
  });

  test('new subject cannot be saved without a name', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/subjects/create');
    await expect(page).toHaveTitle('Add New Subject');
    await expect(page.locator('select[name="type"] option')).toHaveText([/Compulsory/, /Elective/]);
    await page.getByRole('button', { name: 'Save Subject' }).click();
    await expect(page).toHaveURL(/\/subjects\/create$/);
    expect(await page.locator('input[name="name"]').evaluate((el) => el.validity.valueMissing)).toBe(true);
  });

  test('subject can be created, edited and deleted', async ({ page }) => {
    const subjects = new MasterDataPage(page, {
      listPath: '/school/subjects',
      createPath: '/school/subjects/create',
      saveButton: /Save Subject/,
      updateButton: /Update Subject/,
    });
    const name = qaName('Subject');
    const renamed = `${name} Edited`;

    try {
      await subjects.create({ name, subject_code: 'QA-AUTO' });
      await expect(page).toHaveURL(/\/school\/subjects$/);
      await subjects.expectRowCount(name, 1);

      await subjects.edit(name, { name: renamed });
      await expect(page).toHaveURL(/\/school\/subjects$/);
      await subjects.expectRowCount(renamed, 1);

      await subjects.delete(renamed);
      await subjects.expectRowCount(renamed, 0);
    } finally {
      // Clean up even if a step above failed
      await subjects.delete(renamed).catch(() => {});
      await subjects.delete(name).catch(() => {});
    }
  });
});

test.describe('Periods and timetable', () => {
  test('every period ends after it starts', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/time-slots');
    await expect(page).toHaveTitle('Manage Periods');
    await list.expectTableHasRows();
    // Columns: [id, name, type, start, end, actions]
    for (const c of await tableCells(page)) {
      expect(toMinutes(c[4]), `${c[1]}: ${c[3]} - ${c[4]}`).toBeGreaterThan(toMinutes(c[3]));
    }
  });

  test('timetable loads the sections of the chosen class', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/timetable');
    await expect(page).toHaveTitle('Class Timetable');
    await page.locator('select#class_id').selectOption({ label: 'Class 1' });
    // Sections are fetched after the class is chosen
    await expect(page.locator('select#section_id option')).not.toHaveCount(1);
    await expect(page.locator('select#section_id')).toContainText('A');
  });
});

test.describe('Subject and teacher assignment', () => {
  test('assign subjects page lists subjects per class (not saved)', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/assign-subjects');
    await expect(page).toHaveTitle('Assign Subjects to Classes');
    await expect(page.locator('input[type="checkbox"][name^="assignments["]').first()).toBeAttached();
    await expect(page.getByRole('button', { name: 'Save All Assignments' }).first()).toBeVisible();
  });

  test('assign subject teacher page has a save button per class (not saved)', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/assign-class-teacher');
    await expect(page).toHaveTitle('Assign Subject Teacher');
    await expect(page.locator('select[name^="assignments["]').first()).toBeAttached();
    await expect(page.getByRole('button', { name: /Save Nursery/ })).toBeVisible();
  });
});

test.describe('Events and holidays', () => {
  test('events list shows type, audience and dates', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/events');
    await expect(page).toHaveTitle('Events & Holidays');
    const head = page.locator('table').first().locator('thead');
    for (const h of ['Title', 'Type', 'Audience', 'Start Date', 'End Date']) {
      await expect(head).toContainText(h, { ignoreCase: true });
    }
  });

  test('new event requires title and dates (not saved)', async ({ page }) => {
    const list = new ListPage(page);
    await list.open('/school/events/create');
    await expect(page).toHaveTitle('Add Event/Holiday');
    for (const field of ['title', 'type', 'start_date', 'end_date', 'audience_type']) {
      await expect(page.locator(`[name="${field}"]`)).toHaveAttribute('required', '');
    }
    await expect(page.locator('select[name="type"] option')).toHaveText(['Event', 'Holiday']);
    await page.getByRole('button', { name: 'Create Event' }).click();
    await expect(page).toHaveURL(/\/events\/create$/);
    expect(await page.locator('input[name="title"]').evaluate((el) => el.validity.valueMissing)).toBe(true);
  });
});
