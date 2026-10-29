/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { cvEditorApi } from './scripts/editor-api.ts';

export default defineConfig({
  // Relative base so the built dist/ can be opened or hosted from any path.
  base: './',
  // The editor's save API (dev server only). CV_DATA_DIR lets tests edit a scratch copy.
  plugins: [cvEditorApi(process.env.CV_DATA_DIR ?? 'data')],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'happy-dom',
  },
});
