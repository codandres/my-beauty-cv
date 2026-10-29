import type { Cv } from '../schema/cv.schema';
import type { SafeHtml } from '../render/html';

/** A template turns validated CV data into markup scoped under `.cv--<id>`. */
export interface CvTemplate {
  render(cv: Cv): SafeHtml;
}
