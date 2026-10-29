import { expect, test } from '@playwright/test';
import { TEMPLATE_IDS } from '../../src/templates/catalog';

const LANGUAGES = { en: 'Experience', es: 'Experiencia' };

for (const [lang, experienceTitle] of Object.entries(LANGUAGES)) {
  for (const id of TEMPLATE_IDS) {
    test(`renders cv.${lang}.json with the ${id} template`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto(`/?lang=${lang}&template=${id}`);

      await expect(page.locator(`.cv--${id} h1`)).toHaveText('Andrés Felipe Escalante López');
      await expect(page.locator(`.cv--${id}`)).toContainText(experienceTitle);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('.cv-error')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}

test('shows an error for an unknown language', async ({ page }) => {
  await page.goto('/?lang=fr');
  await expect(page.locator('.cv-error')).toContainText('Available languages: en, es');
});

// Enable once the visual-fidelity pass lands, then run `npx playwright test --update-snapshots`
// to record the baseline from the matching render.
test.skip('modern-blue matches the visual baseline', async ({ page }) => {
  await page.emulateMedia({ media: 'print' });
  await page.goto('/?lang=en&template=modern-blue');
  await expect(page).toHaveScreenshot('modern-blue.png', { fullPage: true });
});
