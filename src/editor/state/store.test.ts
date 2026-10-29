import { describe, expect, it } from 'vitest';
import { LANGUAGES, loadCvData } from '../../content/load';
import { parseCv } from '../../schema/cv.schema';
import { EditorStore } from './store';

const cvs = Object.fromEntries(
  await Promise.all(LANGUAGES.map(async (lang) => [lang, parseCv(await loadCvData(lang))])),
);
const create = () => new EditorStore(cvs, { template: 'aurora', language: 'es' });

describe('EditorStore', () => {
  it('starts on the saved default language and template', () => {
    const store = create();
    expect(store.language).toBe('es');
    expect(store.template).toBe('aurora');
    expect(store.isDirty()).toBe(false);
  });

  it('merges typing in one field into a single undo step', () => {
    const store = create();
    store.set(['header', 'name'], 'J');
    store.set(['header', 'name'], 'Ja');
    store.set(['header', 'name'], 'Jane');
    expect(store.isDirty()).toBe(true);
    store.undo();
    expect(store.cv.header.name).toBe(cvs.es!.header.name);
    expect(store.isDirty()).toBe(false);
    store.redo();
    expect(store.cv.header.name).toBe('Jane');
  });

  it('keeps separate documents and histories per language', () => {
    const store = create();
    store.set(['header', 'name'], 'Spanish edit');
    store.setLanguage('en');
    expect(store.cv.header.name).toBe(cvs.en!.header.name);
    expect(store.canUndo).toBe(false);
    expect(store.dirtyLanguages).toEqual(['es']);
  });

  it('reports validation issues by field path', () => {
    const store = create();
    store.set(['sections', 0, 'title'], '');
    expect(store.issues.get('sections.0.title')).toBe('Required');
    expect(store.issueCount('es')).toBe(1);
  });

  it('reverts to the saved version as an undoable step', () => {
    const store = create();
    store.set(['header', 'name'], 'X');
    store.revert();
    expect(store.isDirty()).toBe(false);
    store.undo();
    expect(store.cv.header.name).toBe('X');
  });
});
