import type { TemplateId } from './catalog';
import type { CvTemplate } from './types';

/**
 * Lazy loaders, so only the selected template's code, stylesheet and fonts are fetched.
 * The `Record` type makes a missing registration a compile error.
 */
const LOADERS: Record<TemplateId, () => Promise<{ default: CvTemplate }>> = {
  'modern-blue': () => import('./modern-blue'),
  'midnight-sidebar': () => import('./midnight-sidebar'),
  'editorial-serif': () => import('./editorial-serif'),
  aurora: () => import('./aurora'),
  'swiss-mono': () => import('./swiss-mono'),
};

export async function loadTemplate(id: TemplateId): Promise<CvTemplate> {
  return (await LOADERS[id]()).default;
}
