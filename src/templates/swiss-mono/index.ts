import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/500.css';
import '@fontsource/inter-tight/600.css';
import '@fontsource/inter-tight/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './style.scss';
import type { BarsSection, Cv, Project, Section, TimelineSection } from '../../schema/cv.schema';
import { html, type SafeHtml } from '../../render/html';
import { renderBlocks, renderContactList, renderPhoto, renderSteps } from '../../render/partials';
import type { CvTemplate } from '../types';

const SEGMENTS = 10;

/** Grid row: numbered label on the left (numbers come from a CSS counter), content right. */
function sectionRow(title: string, body: SafeHtml, modifier = ''): SafeHtml {
  return html`<section class="sm-section ${modifier}">
    <h2 class="sm-section__label">${title}</h2>
    <div class="sm-section__body">${body}</div>
  </section>`;
}

function renderBars(section: BarsSection): SafeHtml {
  return sectionRow(
    section.title,
    html`<ul class="sm-meters">
      ${section.items.map(
        (item) =>
          html`<li class="sm-meter">
            <span class="sm-meter__name">${item.name}</span>
            ${renderSteps(item.level, SEGMENTS, 'sm-seg')}
          </li>`,
      )}
    </ul>`,
  );
}

function renderProjects(projects: Project[]): SafeHtml | undefined {
  if (projects.length === 0) return undefined;
  return html`<div class="sm-projects">
    ${projects.map(
      (project) =>
        html`<div class="sm-project">
          ${project.period && html`<span class="sm-entry__period">${project.period}</span>`}
          ${project.title && html`<h4 class="sm-entry__title">${project.title}</h4>`}
          ${renderBlocks(project.blocks)}
        </div>`,
    )}
  </div>`;
}

function renderTimeline(section: TimelineSection): SafeHtml {
  return sectionRow(
    section.title,
    html`${section.entries.map(
      (entry) =>
        html`<article class="sm-entry">
          <header class="sm-entry__head">
            <h3 class="sm-entry__title">${entry.title}</h3>
            <span class="sm-entry__period">${entry.period}</span>
          </header>
          <p class="sm-entry__organization">${entry.organization}</p>
          ${renderBlocks(entry.blocks)} ${renderProjects(entry.projects)}
        </article>`,
    )}`,
  );
}

function renderSection(section: Section): SafeHtml {
  return section.type === 'bars' ? renderBars(section) : renderTimeline(section);
}

function render(cv: Cv): SafeHtml {
  const { header } = cv;
  const summary = html`<p class="sm-lead">${header.summary}</p>`;
  return html`<div class="cv cv--swiss-mono">
    <header class="sm-header">
      <div>
        ${header.headline && html`<p class="sm-header__headline">${header.headline}</p>`}
        <h1 class="sm-header__name">${header.name}</h1>
      </div>
      ${renderPhoto(cv, 'sm-header__photo')} ${renderContactList(cv, 'sm-contacts')}
    </header>
    ${
      header.summaryTitle
        ? sectionRow(header.summaryTitle, summary)
        : html`<div class="sm-section sm-section--plain">${summary}</div>`
    }
    ${cv.sections.map(renderSection)}
  </div>`;
}

const template: CvTemplate = { render };
export default template;
