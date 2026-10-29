import type { Cv } from '../schema/cv.schema';
import type { TemplateId } from '../templates/catalog';

/**
 * Messages between the editor (parent window) and the CV page embedded in its preview
 * iframe (`/?embed`). Both sides only accept messages from their own origin.
 */

/** Editor → preview. */
export type ToPreview =
  { type: 'cv:render'; cv: Cv; template: TemplateId } | { type: 'cv:zoom'; zoom: number };

/** Preview → editor. `cv:ready` asks the editor to (re)send its current state. */
export type FromPreview = { type: 'cv:ready' } | { type: 'cv:error'; message: string };

export function isMessage<T extends { type: string }>(
  data: unknown,
  types: T['type'][],
): data is T {
  return (
    typeof data === 'object' &&
    data !== null &&
    types.includes((data as { type?: unknown }).type as T['type'])
  );
}
