const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

/**
 * CAS (Continuous Assessment System) record-book setup:
 * criteria (with indicators), benchmark levels and rounds (with weights).
 * Each criterion and round is shown as a card with its own Delete form.
 */
class CasPage extends BasePage {
  constructor(page) {
    super(page);
    this.criterionForm = page.locator('form[action$="/cas/criteria"]');
    this.levelForm = page.locator('form[action$="/cas/criteria/levels"]');
    this.roundForm = page.locator('form[action$="/cas/periods"]');
  }

  /** The card whose title contains this name (criterion or round). */
  card(name) {
    return this.page.locator('.tpl-card', { has: this.page.locator('.tpl-card-title', { hasText: name }) }).first();
  }

  /** Clicks a submit button and waits until the save request has answered and the page reloaded. */
  async clickAndWaitForSave(button) {
    await Promise.all([
      this.page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/school/cas/'), { timeout: 60_000 }),
      button.click(),
    ]);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  }

  async submit(form, buttonName) {
    await this.clickAndWaitForSave(form.getByRole('button', { name: buttonName }));
  }

  async addCriterion(name, mode = 'Marks (a number)') {
    await this.open('/school/cas/criteria');
    await this.criterionForm.locator('[name="name"]').fill(name);
    await this.criterionForm.locator('[name="scoring_mode"]').selectOption({ label: mode });
    await this.submit(this.criterionForm, 'Add criterion');
  }

  async addIndicator(criterion, name, maxMark) {
    const form = this.card(criterion).locator('form[action$="/indicators"]');
    await form.locator('[name="name"]').fill(name);
    await form.locator('[name="max_mark"]').fill(String(maxMark));
    await this.clickAndWaitForSave(form.locator('button').last());
  }

  async addLevel(name, point) {
    await this.open('/school/cas/criteria');
    await this.levelForm.locator('[name="name"]').fill(name);
    await this.levelForm.locator('[name="point"]').fill(String(point));
    await this.submit(this.levelForm, 'Add level');
  }

  async addRound(name, totalMarks) {
    await this.open('/school/cas/periods');
    await this.roundForm.locator('[name="name"]').fill(name);
    await this.roundForm.locator('[name="total_marks"]').fill(String(totalMarks));
    await this.submit(this.roundForm, 'Add round');
  }

  /** Sets the weight of one criterion inside one round and saves the weights. */
  async setWeight(round, criterion, weight) {
    const card = this.card(round);
    const input = card.locator('label', { hasText: criterion }).locator('xpath=following-sibling::input[1]');
    await input.fill(String(weight));
    await this.submit(card, 'Save weights');
  }

  /** Deletes every criterion, level and round whose name contains `prefix`. */
  async deleteAll(prefix = 'QA-AUTO') {
    this.page.on('dialog', (d) => d.accept().catch(() => {}));
    for (const path of ['/school/cas/periods', '/school/cas/criteria']) {
      await this.open(path);
      for (;;) {
        const cardDelete = this.page.locator('.tpl-card-head', { hasText: prefix }).locator('form button').first();
        const levelDelete = this.page.locator('tr', { hasText: prefix }).locator('form[action*="/levels/"] button').first();
        const target = (await cardDelete.count()) ? cardDelete : (await levelDelete.count()) ? levelDelete : null;
        if (!target) break;
        await this.clickAndWaitForSave(target);
      }
    }
  }

  /** The green/yellow message shown after a save, found by its text. */
  async expectFlash(text) {
    await expect(this.page.locator('.alert', { hasText: text }).first()).toBeVisible();
  }
}

module.exports = { CasPage };
