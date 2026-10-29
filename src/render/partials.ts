import type { BarsSection, Block, Contact, Cv, TimelineSection } from '../schema/cv.schema';
import { html, type SafeHtml } from './html';
import { contactIcon } from './icons';

// Markup shared by every template. Templates style these class names inside their own scope.

export function renderContact(contact: Contact): SafeHtml {
  const label = contact.href
    ? html`<a href="${contact.href}">${contact.label}</a>`
    : html`<span>${contact.label}</span>`;
  return html`<li class="contact contact--${contact.type}">
    ${contactIcon(contact.type)}${label}
  </li>`;
}

/** All contacts on one list, for templates that don't keep the JSON's row grouping. */
export function renderContactList(cv: Cv, className: string): SafeHtml {
  return html`<ul class="${className}">
    ${cv.header.contactRows.flat().map(renderContact)}
  </ul>`;
}

export function renderPhoto(cv: Cv, className: string): SafeHtml | undefined {
  const { photo } = cv.header;
  return photo && html`<img class="${className}" src="${photo.src}" alt="${photo.alt}" />`;
}

export function renderBlock(block: Block): SafeHtml {
  const label = block.label && html`<strong class="block__label">${block.label}</strong>: `;
  if ('bullets' in block) {
    return html`<div class="block">
      ${label && html`<p>${label}</p>`}
      <ul class="block__bullets">
        ${block.bullets.map((b) => html`<li>${b}</li>`)}
      </ul>
    </div>`;
  }
  return html`<p class="block">${label}${block.text}</p>`;
}

export function renderBlocks(blocks: Block[]): SafeHtml {
  return html`${blocks.map(renderBlock)}`;
}

/** Splits sections by kind, keeping the JSON order within each group. */
export function splitSections(cv: Cv): { bars: BarsSection[]; timelines: TimelineSection[] } {
  return {
    bars: cv.sections.filter((s) => s.type === 'bars'),
    timelines: cv.sections.filter((s) => s.type === 'timeline'),
  };
}

/** Maps a 0–100 level onto `count` discrete steps (dots, segments). */
export function filledSteps(level: number, count: number): number {
  return Math.round((level / 100) * count);
}

export function renderSteps(level: number, count: number, className: string): SafeHtml {
  const filled = filledSteps(level, count);
  return html`<span class="${className}" role="img" aria-label="${level}%">
    ${Array.from(
      { length: count },
      (_, i) => html`<span class="${className}-step${i < filled ? ' is-filled' : ''}"></span>`,
    )}
  </span>`;
}
