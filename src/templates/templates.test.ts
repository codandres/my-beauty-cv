import { describe, expect, it } from 'vitest';
import rawSettings from '../../data/settings.json';
import { LANGUAGES, loadCvData } from '../content/load';
import { parseCv, type Block, type Cv } from '../schema/cv.schema';
import { parseSettings } from '../schema/settings.schema';
import { TEMPLATE_IDS, toTemplateId } from './catalog';
import { loadTemplate } from './registry';

const cvs = Object.fromEntries(
  await Promise.all(
    LANGUAGES.map(async (lang) => [lang, parseCv(await loadCvData(lang))] as const),
  ),
);
const en = cvs.en!;

function blockTexts(block: Block): string[] {
  return [
    ...(block.label ? [block.label] : []),
    ...('text' in block ? [block.text] : block.bullets),
  ];
}

/** Every string a template must show for a CV. */
function contentStrings(cv: Cv): string[] {
  return cv.sections.flatMap((section) =>
    section.type === 'bars'
      ? [section.title, ...section.items.map((item) => item.name)]
      : [
          section.title,
          ...section.entries.flatMap((entry) => [
            entry.period,
            entry.title,
            entry.organization,
            ...entry.blocks.flatMap(blockTexts),
            ...entry.projects.flatMap((p) => [
              ...(p.period ? [p.period] : []),
              ...(p.title ? [p.title] : []),
              ...p.blocks.flatMap(blockTexts),
            ]),
          ]),
        ],
  );
}

/** Section/entry/project/bullet counts, to catch translations drifting apart. */
function shape(cv: Cv): unknown {
  return cv.sections.map((s) =>
    s.type === 'bars'
      ? s.items.length
      : s.entries.map((e) =>
          e.projects.map((p) => p.blocks.map((b) => ('bullets' in b ? b.bullets.length : 0))),
        ),
  );
}

describe('content files', () => {
  it('finds data/cv.en.json and data/cv.es.json', () => {
    expect(LANGUAGES).toEqual(['en', 'es']);
  });

  it.each(LANGUAGES)('cv.%s.json declares its own language', (lang) => {
    expect(cvs[lang]!.meta.lang).toBe(lang);
  });

  it.each(LANGUAGES)('cv.%s.json has the same structure as cv.en.json', (lang) => {
    expect(shape(cvs[lang]!)).toEqual(shape(en));
  });

  it('reports a missing language with the available ones', async () => {
    await expect(loadCvData('fr')).rejects.toThrow('Available languages: en, es');
  });
});

describe('settings', () => {
  it('data/settings.json is valid', () => {
    expect(() => parseSettings(rawSettings, LANGUAGES)).not.toThrow();
  });

  it('defaults to modern-blue in English', () => {
    expect(parseSettings({}, LANGUAGES)).toEqual({ template: 'modern-blue', language: 'en' });
  });

  it('rejects unknown templates and languages', () => {
    expect(() => parseSettings({ template: 'nope' }, LANGUAGES)).toThrow(/template/);
    expect(() => parseSettings({ language: 'fr' }, LANGUAGES)).toThrow(/language/);
    expect(() => toTemplateId('nope')).toThrow('Available templates: modern-blue');
  });
});

describe.each(TEMPLATE_IDS)('template %s', (id) => {
  async function render(data: Cv): Promise<Document> {
    document.body.innerHTML = (await loadTemplate(id)).render(data).toString();
    return document;
  }

  it('renders into a root scoped by its id', async () => {
    expect((await render(en)).querySelector(`.cv.cv--${id}`)).not.toBeNull();
  });

  it.each(LANGUAGES)('renders every piece of cv.%s.json content', async (lang) => {
    const text = (await render(cvs[lang]!)).body.textContent ?? '';
    for (const value of contentStrings(cvs[lang]!)) expect(text).toContain(value);
  });

  it('handles any number of items and projects, and missing optional fields', async () => {
    const data = structuredClone(en);
    delete data.header.photo;
    delete data.header.headline;
    delete data.header.summaryTitle;
    const skills = data.sections.find((s) => s.type === 'bars');
    const experience = data.sections.find((s) => s.type === 'timeline');
    if (skills?.type !== 'bars' || experience?.type !== 'timeline')
      throw new Error('fixture changed');
    skills.items = Array.from({ length: 13 }, (_, i) => ({ name: `Skill ${i}`, level: i * 8 }));
    experience.entries[0]!.projects = Array.from({ length: 4 }, (_, i) => ({
      period: `Period ${i}`,
      ...(i % 2 === 0 && { title: `Role ${i}` }),
      blocks: [{ label: 'Client', text: `Client ${i}` }],
    }));

    const text = (await render(data)).body.textContent ?? '';
    expect(document.querySelector('img')).toBeNull();
    for (let i = 0; i < 13; i++) expect(text).toContain(`Skill ${i}`);
    for (let i = 0; i < 4; i++) expect(text).toContain(`Period ${i}`);
    expect(text).toContain('Role 0');
    expect(text).toContain('Role 2');
  });

  it('escapes CV text', async () => {
    const data = structuredClone(en);
    data.header.name = '<img src=x onerror=alert(1)>';
    const doc = await render(data);
    expect(doc.querySelector('img[src="x"]')).toBeNull();
    expect(doc.body.textContent).toContain(data.header.name);
  });
});
