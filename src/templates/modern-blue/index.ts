import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import './style.scss';
import type { BarsSection, Cv, Project, Section, TimelineEntry } from '../../schema/cv.schema';
import { html, type SafeHtml } from '../../render/html';
import { renderBlocks, renderContact, renderPhoto } from '../../render/partials';
import type { CvTemplate } from '../types';

// Reproduces docs/CV_Template. Intentionally ignores `headline` and `summaryTitle`,
// which the reference has no slot for.

function renderHeader(cv: Cv): SafeHtml {
  const { header } = cv;
  return html`<header class="mb-header">
    <div>
      <h1 class="mb-header__name">${header.name}</h1>
      ${header.contactRows.map(
        (row) =>
          html`<ul class="mb-header__contacts">
            ${row.map(renderContact)}
          </ul>`,
      )}
    </div>
    ${renderPhoto(cv, 'mb-header__photo')}
    <p class="mb-header__summary">${header.summary}</p>
  </header>`;
}

/**
 * Items fill two independent columns in reading order (left, right, left, …),
 * matching the reference where the columns don't share row heights.
 */
function renderBars(section: BarsSection): SafeHtml {
  const columns = [0, 1].map((col) => section.items.filter((_, i) => i % 2 === col));
  return html`<div class="mb-bars">
    ${columns.map(
      (items) =>
        html`<ul class="mb-bars__column">
          ${items.map(
            (item) =>
              html`<li class="mb-bar">
                <span class="mb-bar__label">${item.name}</span>
                <span class="mb-bar__track"
                  ><span class="mb-bar__fill" style="width: ${item.level}%"></span
                ></span>
              </li>`,
          )}
        </ul>`,
    )}
  </div>`;
}

/** A client/project row: its period sits in the aside like the company's period. */
function renderProject(project: Project): SafeHtml {
  return html`<div class="mb-row mb-project">
    <div class="mb-row__aside mb-entry__period">${project.period}</div>
    <div class="mb-row__main">
      <div class="mb-project__body">
        ${project.title && html`<h4 class="mb-entry__title">${project.title}</h4>`}
        ${renderBlocks(project.blocks)}
      </div>
    </div>
  </div>`;
}

function renderEntry(entry: TimelineEntry): SafeHtml {
  return html`<article class="mb-entry">
    <div class="mb-row">
      <div class="mb-row__aside mb-entry__period">${entry.period}</div>
      <div class="mb-row__main">
        <h3 class="mb-entry__title">${entry.title}</h3>
        <p class="mb-entry__organization">${entry.organization}</p>
        ${renderBlocks(entry.blocks)}
      </div>
    </div>
    ${entry.projects.map(renderProject)}
  </article>`;
}

function renderSection(section: Section): SafeHtml {
  switch (section.type) {
    case 'bars':
      return html`<section class="mb-section mb-row">
        <h2 class="mb-row__aside mb-section__title">${section.title}</h2>
        <div class="mb-row__main">${renderBars(section)}</div>
      </section>`;
    case 'timeline':
      return html`<section class="mb-section mb-section--timeline">
        <div class="mb-row"><h2 class="mb-row__aside mb-section__title">${section.title}</h2></div>
        ${section.entries.map(renderEntry)}
      </section>`;
  }
}

const template: CvTemplate = {
  render: (cv) =>
    html`<div class="cv cv--modern-blue">
      ${renderHeader(cv)}
      <main class="mb-body">${cv.sections.map(renderSection)}</main>
    </div>`,
};

export default template;
