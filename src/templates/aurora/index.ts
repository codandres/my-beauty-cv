import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import './style.scss';
import type { BarsSection, Cv, Project, TimelineSection } from '../../schema/cv.schema';
import { html, type SafeHtml } from '../../render/html';
import { renderBlocks, renderContactList, renderPhoto, splitSections } from '../../render/partials';
import type { CvTemplate } from '../types';

function sectionTitle(title: string): SafeHtml {
  return html`<h2 class="au-title">${title}</h2>`;
}

function renderBars(section: BarsSection): SafeHtml {
  return html`<section class="au-side-section">
    ${sectionTitle(section.title)}
    <ul class="au-skills">
      ${section.items.map(
        (item) =>
          html`<li class="au-skill">
            <span class="au-skill__name">${item.name}</span>
            <span class="au-skill__track"
              ><span class="au-skill__fill" style="width: ${item.level}%"></span
            ></span>
          </li>`,
      )}
    </ul>
  </section>`;
}

function renderProjects(projects: Project[]): SafeHtml | undefined {
  if (projects.length === 0) return undefined;
  return html`<div class="au-projects">
    ${projects.map(
      (project) =>
        html`<div class="au-project">
          ${project.period && html`<span class="au-entry__period">${project.period}</span>`}
          ${project.title && html`<h4 class="au-entry__title">${project.title}</h4>`}
          ${renderBlocks(project.blocks)}
        </div>`,
    )}
  </div>`;
}

function renderTimeline(section: TimelineSection): SafeHtml {
  return html`<section class="au-section">
    ${sectionTitle(section.title)}
    ${section.entries.map(
      (entry) =>
        html`<article class="au-entry">
          <span class="au-entry__period">${entry.period}</span>
          <h3 class="au-entry__title">${entry.title}</h3>
          <p class="au-entry__organization">${entry.organization}</p>
          ${renderBlocks(entry.blocks)} ${renderProjects(entry.projects)}
        </article>`,
    )}
  </section>`;
}

function render(cv: Cv): SafeHtml {
  const { header } = cv;
  const { bars, timelines } = splitSections(cv);
  return html`<div class="cv cv--aurora">
    <header class="au-hero">
      <div class="au-hero__text">
        <h1 class="au-hero__name">${header.name}</h1>
        ${header.headline && html`<p class="au-hero__headline">${header.headline}</p>`}
        ${renderContactList(cv, 'au-contacts')}
      </div>
      ${renderPhoto(cv, 'au-hero__photo')}
    </header>
    <section class="au-summary">
      ${header.summaryTitle && html`<h2 class="au-summary__title">${header.summaryTitle}</h2>`}
      <p>${header.summary}</p>
    </section>
    <div class="au-body">
      <main>${timelines.map(renderTimeline)}</main>
      <aside class="au-side">${bars.map(renderBars)}</aside>
    </div>
  </div>`;
}

const template: CvTemplate = { render };
export default template;
