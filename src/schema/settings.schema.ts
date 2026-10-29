import { z } from 'zod';
import { DEFAULT_TEMPLATE, TEMPLATE_IDS, TEMPLATE_INFO } from '../templates/catalog';

/**
 * `data/settings.json`: which template and which content file to render. Kept apart
 * from the content so every language shares one template choice.
 */

export const TemplateIdSchema = z.enum(TEMPLATE_IDS).meta({
  description: `Visual template. ${TEMPLATE_IDS.map((id) => `"${id}" = ${TEMPLATE_INFO[id].name}`).join(', ')}.`,
  // Read by VS Code to describe each value in autocomplete.
  markdownEnumDescriptions: TEMPLATE_IDS.map(
    (id) => `**${TEMPLATE_INFO[id].name}**: ${TEMPLATE_INFO[id].description}`,
  ),
});

export const DEFAULT_LANGUAGE = 'en';

/** `languages` are the codes of the existing data/cv.<code>.json files. */
export function settingsSchema(languages: readonly string[]) {
  return z
    .object({
      $schema: z.string().optional(),
      template: TemplateIdSchema.default(DEFAULT_TEMPLATE),
      language: z
        .enum(languages as [string, ...string[]])
        .default(DEFAULT_LANGUAGE)
        .describe('Content file to render: "es" renders data/cv.es.json.'),
    })
    .strict();
}

export type Settings = z.infer<ReturnType<typeof settingsSchema>>;

export function parseSettings(input: unknown, languages: readonly string[]): Settings {
  const result = settingsSchema(languages).safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid data/settings.json:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
