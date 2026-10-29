import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { svg, type TemplateResult } from 'lit';
import { contactIconDefinition } from '../../render/icons';
import type { ContactType } from '../../schema/cv.schema';

export function icon(definition: IconDefinition, className = 'icon'): TemplateResult {
  const [width, height, , , path] = definition.icon;
  const d = Array.isArray(path) ? path.join(' ') : path;
  return svg`<svg class=${className} viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false"><path fill="currentColor" d=${d}></path></svg>`;
}

export const contactIcon = (type: ContactType): TemplateResult => icon(contactIconDefinition(type));
