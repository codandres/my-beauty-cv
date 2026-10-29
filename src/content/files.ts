// Content files are named `cv.<language>.json` in data/ (e.g. cv.en.json, cv.es.json).
// Plain module (no Vite APIs) so Node scripts can share it.

const CV_FILE = /(?:^|\/)cv\.([a-z]{2,3}(?:-[A-Za-z0-9]+)?)\.json$/;

/** The language code of a content file path, or undefined for any other file. */
export function languageFromPath(path: string): string | undefined {
  return CV_FILE.exec(path)?.[1];
}
