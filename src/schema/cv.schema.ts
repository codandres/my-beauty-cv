import { z } from 'zod';

/**
 * The CV content contract. Every `data/cv.<language>.json` must satisfy this schema; the
 * editor JSON Schema (`data/cv.schema.json`) is generated from it by `npm run schema`.
 */

const text = z.string().min(1);

export const ContactTypeSchema = z.enum([
  'email',
  'phone',
  'location',
  'linkedin',
  'github',
  'website',
]);

export const ContactSchema = z
  .object({
    type: ContactTypeSchema.describe('Selects the icon shown before the label.'),
    label: text,
    href: z.string().optional().describe('Optional link target, e.g. "mailto:..." or a URL.'),
  })
  .strict();

export const HeaderSchema = z
  .object({
    name: text,
    headline: text
      .optional()
      .describe(
        'Role shown under the name, e.g. "Senior Software Engineer". Not shown by Modern Blue.',
      ),
    photo: z
      .object({
        src: text.describe('Path relative to public/, e.g. "profile.jpg".'),
        alt: z.string(),
      })
      .strict()
      .optional(),
    contactRows: z
      .array(z.array(ContactSchema))
      .describe('Each inner array is one line of contacts in the header.'),
    summary: z.string(),
    summaryTitle: text
      .optional()
      .describe('Heading above the summary, e.g. "Profile". Not shown by Modern Blue.'),
  })
  .strict();

export const RatedItemSchema = z
  .object({
    name: text,
    level: z.number().min(0).max(100).describe('Bar fill, in percent.'),
  })
  .strict();

export const BarsSectionSchema = z
  .object({
    type: z.literal('bars'),
    title: text,
    items: z.array(RatedItemSchema),
  })
  .strict();

/** "**Label**: text" or just "text" when no label is given. */
export const TextBlockSchema = z.object({ label: text.optional(), text: text }).strict();

/** "**Label**:" followed by one "• item" line per bullet. */
export const BulletsBlockSchema = z
  .object({ label: text.optional(), bullets: z.array(text).min(1) })
  .strict();

export const BlockSchema = z.union([TextBlockSchema, BulletsBlockSchema]);

/** One client or project inside a company entry: a node on the entry's child timeline. */
export const ProjectSchema = z
  .object({
    period: text
      .optional()
      .describe(
        'Shown like the company period, e.g. "Jul 2020 - Feb 2021". Omit if it matches the company.',
      ),
    title: text
      .optional()
      .describe(
        'Role on this client or project, e.g. "Key Engineer". Shown like the company role.',
      ),
    blocks: z.array(BlockSchema).min(1),
  })
  .strict();

export const TimelineEntrySchema = z
  .object({
    period: text.describe('Shown in the left column, e.g. "May 2022 - Present".'),
    title: text.describe('Role or degree.'),
    organization: text.describe('Company or institution, including location.'),
    blocks: z
      .array(BlockSchema)
      .default([])
      .describe('Details about the company itself, shown before its projects.'),
    projects: z
      .array(ProjectSchema)
      .default([])
      .describe('Clients or projects worked on for this company, drawn as a child timeline.'),
  })
  .strict();

export const TimelineSectionSchema = z
  .object({
    type: z.literal('timeline'),
    title: text,
    entries: z.array(TimelineEntrySchema),
  })
  .strict();

export const SectionSchema = z.discriminatedUnion('type', [
  BarsSectionSchema,
  TimelineSectionSchema,
]);

export const CvSchema = z
  .object({
    $schema: z.string().optional(),
    meta: z
      .object({
        lang: z.string().default('en'),
        documentTitle: text.describe('Browser tab title and default PDF file name.'),
      })
      .strict(),
    header: HeaderSchema,
    sections: z.array(SectionSchema),
  })
  .strict();

export type Cv = z.infer<typeof CvSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type ContactType = z.infer<typeof ContactTypeSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type BarsSection = z.infer<typeof BarsSectionSchema>;
export type TimelineSection = z.infer<typeof TimelineSectionSchema>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Project = z.infer<typeof ProjectSchema>;

/** Parses unknown input into a `Cv`, throwing a readable error listing every problem. */
export function parseCv(input: unknown): Cv {
  const result = CvSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid CV data:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
