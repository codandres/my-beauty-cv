// @vitest-environment node
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { languageFromPath } from '../src/content/files';
import { parseCv } from '../src/schema/cv.schema';
import { parseSettings } from '../src/schema/settings.schema';
import { API_PREFIX, createEditorApi, type EditorApi } from './editor-api';

const deps = async () => ({ parseCv, parseSettings, languageFromPath });

let dir: string;
let api: EditorApi;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cv-editor-api-'));
  for (const file of ['cv.en.json', 'cv.es.json', 'settings.json']) {
    cpSync(join('data', file), join(dir, file));
  }
  api = createEditorApi(dir, deps);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

const state = async () =>
  (await api.handle('GET', `${API_PREFIX}/state`, '')).body as {
    languages: string[];
    cvs: Record<string, { header: { name: string }; meta: { lang: string } }>;
    settings: { template: string };
  };

describe('editor API', () => {
  it('returns every language and the settings', async () => {
    const body = await state();
    expect(body.languages).toEqual(['en', 'es']);
    expect(body.cvs.es!.meta.lang).toBe('es');
    expect(body.settings.template).toBeTypeOf('string');
  });

  it('round-trips a CV byte-for-byte when nothing changed', async () => {
    const before = readFileSync(join(dir, 'cv.en.json'), 'utf8');
    const { cvs } = await state();
    const res = await api.handle('PUT', `${API_PREFIX}/cv/en`, JSON.stringify(cvs.en));
    expect(res.status).toBe(200);
    expect(readFileSync(join(dir, 'cv.en.json'), 'utf8')).toBe(before);
  });

  it('writes valid edits', async () => {
    const { cvs } = await state();
    cvs.en!.header.name = 'Jane Doe';
    await api.handle('PUT', `${API_PREFIX}/cv/en`, JSON.stringify(cvs.en));
    expect(JSON.parse(readFileSync(join(dir, 'cv.en.json'), 'utf8')).header.name).toBe('Jane Doe');
  });

  it('rejects invalid CVs without touching the file', async () => {
    const before = readFileSync(join(dir, 'cv.en.json'), 'utf8');
    const { cvs } = await state();
    cvs.en!.header.name = '';
    const res = await api.handle('PUT', `${API_PREFIX}/cv/en`, JSON.stringify(cvs.en));
    expect(res.status).toBe(400);
    expect(String((res.body as { error: string }).error)).toMatch(/Invalid CV data/);
    expect(readFileSync(join(dir, 'cv.en.json'), 'utf8')).toBe(before);
  });

  it('only writes existing language files, matching their meta.lang', async () => {
    const { cvs } = await state();
    expect((await api.handle('PUT', `${API_PREFIX}/cv/fr`, JSON.stringify(cvs.en))).status).toBe(
      404,
    );
    expect((await api.handle('PUT', `${API_PREFIX}/cv/..%2Fx`, '{}')).status).toBe(404);
    expect((await api.handle('PUT', `${API_PREFIX}/cv/es`, JSON.stringify(cvs.en))).status).toBe(
      400,
    );
  });

  it('validates and writes settings', async () => {
    expect((await api.handle('PUT', `${API_PREFIX}/settings`, '{"template":"nope"}')).status).toBe(
      400,
    );
    const ok = await api.handle(
      'PUT',
      `${API_PREFIX}/settings`,
      '{"template":"aurora","language":"es"}',
    );
    expect(ok.status).toBe(200);
    expect(JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))).toMatchObject({
      template: 'aurora',
      language: 'es',
    });
  });
});
