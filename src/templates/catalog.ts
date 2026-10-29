/**
 * Every selectable template. Adding one: add its id and description here, create
 * `src/templates/<id>/index.ts` (+ stylesheet), and register its loader in `registry.ts`.
 */
export const TEMPLATE_IDS = [
  'modern-blue',
  'midnight-sidebar',
  'editorial-serif',
  'aurora',
  'swiss-mono',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE: TemplateId = 'modern-blue';

/** `swatch` = [background, accent], used by the editor's template picker. */
export const TEMPLATE_INFO: Record<
  TemplateId,
  { name: string; description: string; swatch: [string, string] }
> = {
  'modern-blue': {
    name: 'Modern Blue',
    description: 'The reference design: grey header, blue accents, two-column timeline.',
    swatch: ['#f5f5f5', '#3d94e3'],
  },
  'midnight-sidebar': {
    name: 'Midnight Sidebar',
    description: 'Dark navy sidebar with photo, contacts and skills; teal-accented timeline.',
    swatch: ['#0f172a', '#2dd4bf'],
  },
  'editorial-serif': {
    name: 'Editorial Serif',
    description: 'Magazine-style serif headings on warm paper, arch photo, terracotta accents.',
    swatch: ['#fbf8f3', '#b4532a'],
  },
  aurora: {
    name: 'Aurora',
    description: 'Vivid violet-to-pink gradient header, glass contact chips, skills side column.',
    swatch: ['#7c3aed', '#db2777'],
  },
  'swiss-mono': {
    name: 'Swiss Mono',
    description: 'Bold Swiss grid, monospace details, numbered sections, signal-orange accent.',
    swatch: ['#ffffff', '#ff4f00'],
  },
};

export function toTemplateId(value: string): TemplateId {
  if ((TEMPLATE_IDS as readonly string[]).includes(value)) return value as TemplateId;
  throw new Error(`Unknown template "${value}". Available templates: ${TEMPLATE_IDS.join(', ')}.`);
}
