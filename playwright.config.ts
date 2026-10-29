import { cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PREVIEW_PORT = 4173;
const EDITOR_PORT = 5174;

/** The editor tests save through the API, so they get a scratch copy of data/, never data/. */
export const EDITOR_DATA_DIR = join(tmpdir(), 'cv-creator-e2e-data');
export const EDITOR_DATA_FILES = ['cv.en.json', 'cv.es.json', 'settings.json'];
mkdirSync(EDITOR_DATA_DIR, { recursive: true });
for (const file of EDITOR_DATA_FILES) cpSync(join('data', file), join(EDITOR_DATA_DIR, file));

export default defineConfig({
  testDir: 'tests/e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  use: { baseURL: `http://localhost:${PREVIEW_PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${PREVIEW_PORT} --strictPort`,
      port: PREVIEW_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      // The editor needs the dev server (its save API isn't part of builds).
      command: `npx vite --port ${EDITOR_PORT} --strictPort`,
      port: EDITOR_PORT,
      env: { CV_DATA_DIR: EDITOR_DATA_DIR },
      reuseExistingServer: false,
    },
  ],
});
