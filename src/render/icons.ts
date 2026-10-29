import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import {
  faEnvelope,
  faGlobe,
  faHouse,
  faPhone,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import type { ContactType } from '../schema/cv.schema';
import { html, unsafeRaw, type SafeHtml } from './html';

const CONTACT_ICONS: Record<ContactType, IconDefinition> = {
  email: faEnvelope,
  phone: faPhone,
  location: faHouse,
  linkedin: faLinkedin,
  github: faGithub,
  website: faGlobe,
};

export function contactIconDefinition(type: ContactType): IconDefinition {
  return CONTACT_ICONS[type];
}

/** Inline SVG so icons print crisply and need no icon font. */
export function contactIcon(type: ContactType): SafeHtml {
  const [width, height, , , path] = CONTACT_ICONS[type].icon;
  const d = Array.isArray(path) ? path.join(' ') : path;
  return html`<svg
    class="icon"
    viewBox="0 0 ${width} ${height}"
    aria-hidden="true"
    focusable="false"
  >
    <path fill="currentColor" d="${unsafeRaw(d)}" />
  </svg>`;
}
