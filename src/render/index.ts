import { loadCvData } from '../content/load';
import { parseCv, type Cv } from '../schema/cv.schema';
import type { TemplateId } from '../templates/catalog';
import { loadTemplate } from '../templates/registry';
import { escapeHtml } from './html';

export interface RenderTarget {
  language: string;
  template: TemplateId;
}

function appRoot(doc: Document): HTMLElement {
  const app = doc.querySelector<HTMLElement>('#app');
  if (!app) throw new Error('Missing #app element');
  return app;
}

export function renderError(doc: Document, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  appRoot(doc).innerHTML = `<pre class="cv-error">${escapeHtml(message)}</pre>`;
}

/** Renders already-validated CV data with a template into `#app`. */
export async function renderCv(doc: Document, cv: Cv, templateId: TemplateId): Promise<void> {
  const template = await loadTemplate(templateId);
  doc.documentElement.lang = cv.meta.lang;
  doc.title = cv.meta.documentTitle;
  appRoot(doc).innerHTML = template.render(cv).toString();
}

/**
 * Loads and validates `data/cv.<language>.json`, loads the template and renders into
 * `#app`. Any failure (bad JSON, unknown language) is shown on the page.
 */
export async function renderRoot(doc: Document, target: RenderTarget | (() => RenderTarget)) {
  try {
    const { language, template } = typeof target === 'function' ? target() : target;
    const cv = parseCv(await loadCvData(language));
    await renderCv(doc, cv, template);
  } catch (error) {
    renderError(doc, error);
    throw error;
  }
}
