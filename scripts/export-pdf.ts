import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium, type Browser } from '@playwright/test';
import { preview } from 'vite';
import { languageFromPath } from '../src/content/files';
import { parseCv } from '../src/schema/cv.schema';
import {
  TEMPLATE_IDS,
  TEMPLATE_INFO,
  toTemplateId,
  type TemplateId,
} from '../src/templates/catalog';

// Serves the production build and prints every language × template with Chromium to
// out/<language>/<documentTitle> (<Template Name>).pdf. Narrow it down with:
//   npm run pdf -- --lang es
//   npm run pdf -- --template aurora
//   npm run pdf -- --lang en --template swiss-mono
const { values } = parseArgs({
  options: { lang: { type: 'string' }, template: { type: 'string' } },
});

const dataDir = new URL('../data/', import.meta.url);
const allLanguages = readdirSync(dataDir)
  .flatMap((file) => languageFromPath(file) ?? [])
  .sort();
if (values.lang && !allLanguages.includes(values.lang)) {
  throw new Error(
    `No data/cv.${values.lang}.json. Available languages: ${allLanguages.join(', ')}.`,
  );
}
const languages = values.lang ? [values.lang] : allLanguages;
const templates = values.template ? [toTemplateId(values.template)] : [...TEMPLATE_IDS];

function documentTitle(language: string): string {
  const raw: unknown = JSON.parse(readFileSync(new URL(`cv.${language}.json`, dataDir), 'utf8'));
  return parseCv(raw).meta.documentTitle;
}

async function exportPdf(browser: Browser, baseUrl: string, language: string, id: TemplateId) {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}?lang=${language}&template=${id}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (errors.length > 0)
    throw new Error(`${language}/${id} failed to render:\n${errors.join('\n')}`);

  mkdirSync(`out/${language}`, { recursive: true });
  const path = `out/${language}/${documentTitle(language)} (${TEMPLATE_INFO[id].name}).pdf`;
  await page.pdf({ path, preferCSSPageSize: true, printBackground: true });
  await page.close();
  console.log(`Wrote ${path}`);
}

const server = await preview({ preview: { port: 0, open: false } });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('vite preview did not report a URL');

const browser = await chromium.launch();
try {
  for (const language of languages) {
    for (const id of templates) await exportPdf(browser, url, language, id);
  }
} finally {
  await browser.close();
  await server.close();
}
