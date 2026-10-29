import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import './style.scss';
import type { BarsSection, Cv, Project, TimelineSection } from '../../schema/cv.schema';
import { html, type SafeHtml } from '../../render/html';
import { renderBlocks, renderContactList, renderPhoto, splitSections } from '../../render/partials';
import type { CvTemplate } from '../types';

function renderBars(section: BarsSection): SafeHtml {
  return html`<section class="ms-side-section">
    <h2 class="ms-side-section__title">${section.title}</h2>
    <ul class="ms-skills">
      ${section.items.map(
        (item) =>
          html`<li class="ms-skill">
            <span class="ms-skill__name">${item.name}</span>
            <span class="ms-skill__track"
              ><span class="ms-skill__fill" style="width: ${item.level}%"></span
            ></span>
          </li>`,
      )}
    </ul>
  </section>`;
}

function renderProjects(projects: Project[]): SafeHtml | undefined {
  if (projects.length === 0) return undefined;
  return html`<div class="ms-projects">
    ${projects.map(
      (project) =>
        html`<div class="ms-project">
          ${project.period && html`<span class="ms-entry__period">${project.period}</span>`}
          ${project.title && html`<h4 class="ms-entry__title">${project.title}</h4>`}
          ${renderBlocks(project.blocks)}
        </div>`,
    )}
  </div>`;
}

function renderTimeline(section: TimelineSection): SafeHtml {
  return html`<section class="ms-section">
    <h2 class="ms-section__title">${section.title}</h2>
    <div class="ms-timeline">
      ${section.entries.map(
        (entry) =>
          html`<article class="ms-entry">
            <header class="ms-entry__head">
              <h3 class="ms-entry__title">${entry.title}</h3>
              <span class="ms-entry__period">${entry.period}</span>
            </header>
            <p class="ms-entry__organization">${entry.organization}</p>
            ${renderBlocks(entry.blocks)} ${renderProjects(entry.projects)}
          </article>`,
      )}
    </div>
  </section>`;
}

function render(cv: Cv): SafeHtml {
  const { header } = cv;
  const { bars, timelines } = splitSections(cv);
  return html`<div class="cv cv--midnight-sidebar">
    <aside class="ms-sidebar">
      ${renderPhoto(cv, 'ms-sidebar__photo')}
      <h1 class="ms-sidebar__name">${header.name}</h1>
      ${header.headline && html`<p class="ms-sidebar__headline">${header.headline}</p>`}
      ${renderContactList(cv, 'ms-contacts')} ${bars.map(renderBars)}
    </aside>
    <main class="ms-main">
      <section class="ms-section">
        ${header.summaryTitle && html`<h2 class="ms-section__title">${header.summaryTitle}</h2>`}
        <p class="ms-summary">${header.summary}</p>
      </section>
      ${timelines.map(renderTimeline)}
    </main>
  </div>`;
}

const template: CvTemplate = { render };
export default template;
