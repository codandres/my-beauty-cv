import { cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { EDITOR_DATA_DIR, EDITOR_DATA_FILES } from '../../playwright.config';

const EDITOR_URL = 'http://localhost:5174/editor.html';

// Tests share the scratch data folder, so they run one at a time on a fresh copy.
test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
  for (const file of EDITOR_DATA_FILES) cpSync(join('data', file), join(EDITOR_DATA_DIR, file));
});

const savedCv = (lang: string) =>
  JSON.parse(readFileSync(join(EDITOR_DATA_DIR, `cv.${lang}.json`), 'utf8'));

async function openEditor(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(EDITOR_URL);
  const preview = page.frameLocator('.preview-frame');
  await expect(preview.locator('.cv h1')).toBeVisible();
  return { preview, errors };
}

test('edits update the live preview, in any template', async ({ page }) => {
  const { preview, errors } = await openEditor(page);

  await page.locator('[data-path="header.name"]').fill('Jane Doe');
  await expect(preview.locator('.cv h1')).toHaveText('Jane Doe');

  await page.getByRole('radio', { name: /Aurora/ }).click();
  await expect(preview.locator('.cv')).toHaveClass(/cv--aurora/);
  await expect(preview.locator('.cv h1')).toHaveText('Jane Doe');

  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await expect(preview.locator('html')).toHaveAttribute('lang', 'es');
  expect(errors).toEqual([]);
});

test('blocks saving invalid data, then saves valid edits to the file', async ({ page }) => {
  await openEditor(page);

  await page.locator('[data-path="sections.0.title"]').fill('');
  await expect(page.locator('.issues-btn')).toContainText('1 issue');
  await page.keyboard.press('Control+s');
  await expect(page.locator('.toast')).toContainText('Fix the highlighted fields');
  expect(savedCv('en').sections[0].title).toBe('Languages');

  await page.locator('[data-path="sections.0.title"]').fill('Spoken languages');
  await page.locator('.level__number').first().fill('55');
  await page.keyboard.press('Control+s');
  await expect(page.locator('.status')).toContainText('Saved');

  const cv = savedCv('en');
  expect(cv.sections[0].title).toBe('Spoken languages');
  expect(cv.sections[0].items[0].level).toBe(55);
});

test('bullet lists: Enter adds a bullet, undo removes it', async ({ page }) => {
  await openEditor(page);
  await page.locator('.entry__head').first().click();
  await page.locator('.subcard__head').first().click();

  const bullets = page.locator('[data-path^="sections.2.entries.0.projects.0.blocks.3.bullets."]');
  const before = await bullets.count();
  await bullets.first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('A brand new bullet');
  await expect(bullets).toHaveCount(before + 1);
  await expect(bullets.nth(1)).toHaveValue('A brand new bullet');

  await page.locator('.topbar').click({ position: { x: 400, y: 20 } });
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await expect(bullets).toHaveCount(before);
});
