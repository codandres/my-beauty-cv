import { languageFromPath } from './files';

// Lazy, so only the selected language's file is fetched. Adding data/cv.<code>.json
// makes a new language available without code changes.
const files = import.meta.glob<unknown>('../../data/cv.*.json', { import: 'default' });

const loaders = new Map<string, () => Promise<unknown>>();
for (const [path, load] of Object.entries(files)) {
  const language = languageFromPath(path);
  if (language) loaders.set(language, load);
}

export const LANGUAGES: readonly string[] = [...loaders.keys()].sort();

/** Raw (unvalidated) content of `data/cv.<language>.json`. */
export async function loadCvData(language: string): Promise<unknown> {
  const load = loaders.get(language);
  if (!load) {
    throw new Error(
      `No content file data/cv.${language}.json. Available languages: ${LANGUAGES.join(', ')}.`,
    );
  }
  return load();
}
