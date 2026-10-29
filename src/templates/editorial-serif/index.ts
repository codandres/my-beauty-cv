import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './style.scss';
import type { BarsSection, Cv, Project, Section, TimelineSection } from '../../schema/cv.schema';
import { html, type SafeHtml } from '../../render/html';
import { renderBlocks, renderContactList, renderPhoto, renderSteps } from '../../render/partials';
import type { CvTemplate } from '../types';

const DOTS = 5;

function sectionTitle(title: string): SafeHtml {
  return html`<h2 class="es-section__title"><span>${title}</span></h2>`;
}

function renderBars(section: BarsSection): SafeHtml {
  return html`<section class="es-section">
    ${sectionTitle(section.title)}
    <ul class="es-ratings">
      ${section.items.map(
        (item) =>
          html`<li class="es-rating">
            <span class="es-rating__name">${item.name}</span>
            ${renderSteps(item.level, DOTS, 'es-dots')}
          </li>`,
      )}
    </ul>
  </section>`;
}

/** A client/project row: period in the date column, like the company's. */
function renderProject(project: Project): SafeHtml {
  return html`<div class="es-row es-project">
    <p class="es-entry__period">${project.period}</p>
    <div class="es-project__body">
      ${project.title && html`<h4 class="es-entry__title">${project.title}</h4>`}
      ${renderBlocks(project.blocks)}
    </div>
  </div>`;
}

function renderTimeline(section: TimelineSection): SafeHtml {
  return html`<section class="es-section">
    ${sectionTitle(section.title)}
    ${section.entries.map(
      (entry) =>
        html`<article class="es-entry">
          <div class="es-row">
            <p class="es-entry__period">${entry.period}</p>
            <div>
              <h3 class="es-entry__title">${entry.title}</h3>
              <p class="es-entry__organization">${entry.organization}</p>
              ${renderBlocks(entry.blocks)}
            </div>
          </div>
          ${entry.projects.map(renderProject)}
        </article>`,
    )}
  </section>`;
}

function renderSection(section: Section): SafeHtml {
  return section.type === 'bars' ? renderBars(section) : renderTimeline(section);
}

function render(cv: Cv): SafeHtml {
  const { header } = cv;
  return html`<div class="cv cv--editorial-serif">
    <header class="es-header">
      <div class="es-header__text">
        ${header.headline && html`<p class="es-header__headline">${header.headline}</p>`}
        <h1 class="es-header__name">${header.name}</h1>
        ${renderContactList(cv, 'es-contacts')}
      </div>
      ${renderPhoto(cv, 'es-header__photo')}
    </header>
    <section class="es-section es-intro">
      ${header.summaryTitle && sectionTitle(header.summaryTitle)}
      <p class="es-summary">${header.summary}</p>
    </section>
    ${cv.sections.map(renderSection)}
  </div>`;
}

const template: CvTemplate = { render };
export default template;
