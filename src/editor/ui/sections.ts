import { faChartSimple, faChevronDown, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { html, nothing, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import type {
  BarsSection,
  Project,
  Section,
  TimelineEntry,
  TimelineSection,
} from '../../schema/cv.schema';
import { keyOf, move, pathKey, type Path } from '../state/path';
import type { EditorStore } from '../state/store';
import { blocksEditor } from './blocks';
import { addButton, append, dragHandle, itemActions } from './controls';
import { textField } from './fields';
import { icon } from './icons';
import { sortable } from './sortable';

const reorder = (store: EditorStore, path: Path) => (from: number, to: number) =>
  store.change((cv) => move(cv, path, from, to));

function excerpt(text: string, max = 70): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// ---------- Bars (Languages, Skills) ----------

function barsBody(store: EditorStore, path: Path, section: BarsSection): TemplateResult {
  const itemsPath = [...path, 'items'];
  return html`<div class="bars-editor">
    ${repeat(
      section.items,
      (item) => keyOf(item),
      (item, index) => {
        const itemPath = [...itemsPath, index];
        const setLevel = (event: Event) =>
          store.set([...itemPath, 'level'], Number((event.target as HTMLInputElement).value));
        return html`<div
          class="bar-row"
          ${sortable(pathKey(itemsPath), index, reorder(store, itemsPath))}
        >
          ${dragHandle()}
          ${textField(store, [...itemPath, 'name'], item.name, {
            placeholder: 'e.g. TypeScript',
            className: 'bar-row__name',
          })}
          <div class="level" title="Level: ${item.level}%">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              aria-label="Level"
              .value=${live(String(item.level))}
              @input=${setLevel}
            />
            <input
              type="number"
              class="control level__number"
              min="0"
              max="100"
              aria-label="Level in percent"
              .value=${live(String(item.level))}
              @input=${setLevel}
            />
            <span class="level__unit">%</span>
          </div>
          ${itemActions(store, itemsPath, index, section.items.length, 'item')}
        </div>`;
      },
    )}
    ${section.items.length === 0 ? html`<p class="empty">No items yet.</p>` : nothing}
    <div class="add-row">
      ${addButton('Add item', () => append(store, itemsPath, { name: '', level: 80 }, ['name']))}
    </div>
  </div>`;
}

// ---------- Timeline (Experience, Education) ----------

function projectSummary(project: Project): string {
  if (project.title) return excerpt(project.title);
  const first = project.blocks[0];
  const text = first ? ('text' in first ? first.text : (first.bullets[0] ?? '')) : '';
  return excerpt(first?.label ? `${first.label}: ${text}` : text) || 'Empty project';
}

function projectCard(
  store: EditorStore,
  listPath: Path,
  project: Project,
  index: number,
  count: number,
): TemplateResult {
  const key = keyOf(project);
  const open = store.expanded.has(key);
  const path = [...listPath, index];
  return html`<div
    class="subcard ${open ? 'is-open' : ''}"
    ${sortable(pathKey(listPath), index, reorder(store, listPath))}
  >
    <div class="subcard__head" @click=${() => store.toggle(store.expanded, key)}>
      ${dragHandle()}
      <span class="chevron">${icon(faChevronDown)}</span>
      <span class="subcard__dot" aria-hidden="true"></span>
      <span class="subcard__title">${projectSummary(project)}</span>
      ${project.period ? html`<span class="chip chip--soft">${project.period}</span>` : nothing}
      ${itemActions(store, listPath, index, count, 'project', { duplicate: true })}
    </div>
    ${
      open
        ? html`<div class="subcard__body">
            ${textField(store, [...path, 'period'], project.period, {
              label: 'Period',
              optional: true,
              placeholder: 'e.g. Jul 2020 - Feb 2021',
              hint: 'Leave empty when it matches the company period.',
            })}
            ${textField(store, [...path, 'title'], project.title, {
              label: 'Role',
              optional: true,
              placeholder: 'e.g. Key Engineer',
            })}
            ${blocksEditor(store, [...path, 'blocks'], project.blocks)}
          </div>`
        : nothing
    }
  </div>`;
}

function entryCard(
  store: EditorStore,
  listPath: Path,
  entry: TimelineEntry,
  index: number,
  count: number,
): TemplateResult {
  const key = keyOf(entry);
  const open = store.expanded.has(key);
  const path = [...listPath, index];
  const projectsPath = [...path, 'projects'];
  return html`<div
    class="entry ${open ? 'is-open' : ''}"
    ${sortable(pathKey(listPath), index, reorder(store, listPath))}
  >
    <div class="entry__head" @click=${() => store.toggle(store.expanded, key)}>
      ${dragHandle()}
      <span class="chevron">${icon(faChevronDown)}</span>
      <span class="entry__marker" aria-hidden="true"></span>
      <span class="entry__heading">
        <span class="entry__title">${entry.title || 'Untitled'}</span>
        <span class="entry__org">${entry.organization}</span>
      </span>
      ${entry.period ? html`<span class="chip">${entry.period}</span>` : nothing}
      ${
        entry.projects.length > 0
          ? html`<span class="count" title="Clients / projects">${entry.projects.length}</span>`
          : nothing
      }
      ${itemActions(store, listPath, index, count, 'entry', { duplicate: true })}
    </div>
    ${
      open
        ? html`<div class="entry__body">
            <div class="grid grid--2">
              ${textField(store, [...path, 'title'], entry.title, {
                label: 'Role / degree',
                placeholder: 'e.g. Senior Software Engineer',
              })}
              ${textField(store, [...path, 'period'], entry.period, {
                label: 'Period',
                placeholder: 'e.g. May 2022 - Present',
              })}
            </div>
            ${textField(store, [...path, 'organization'], entry.organization, {
              label: 'Company / institution',
              placeholder: 'e.g. Acme Inc., Remote',
            })}
            <div class="group">
              <h4 class="group__title">Company details</h4>
              <p class="group__hint">Shown under the company, before its clients/projects.</p>
              ${blocksEditor(store, [...path, 'blocks'], entry.blocks)}
            </div>
            <div class="group">
              <h4 class="group__title">
                Clients & projects <span class="count">${entry.projects.length}</span>
              </h4>
              <p class="group__hint">Each one is a node on this company's child timeline.</p>
              <div class="subcards">
                ${repeat(
                  entry.projects,
                  (project) => keyOf(project),
                  (project, i) =>
                    projectCard(store, projectsPath, project, i, entry.projects.length),
                )}
              </div>
              <div class="add-row">
                ${addButton('Add client / project', () => {
                  const project = { blocks: [{ text: '' }] };
                  // New items open straight away.
                  store.expanded.add(keyOf(project));
                  append(store, projectsPath, project, ['period']);
                })}
              </div>
            </div>
          </div>`
        : nothing
    }
  </div>`;
}

function timelineBody(store: EditorStore, path: Path, section: TimelineSection): TemplateResult {
  const entriesPath = [...path, 'entries'];
  return html`<div class="timeline-editor">
    ${repeat(
      section.entries,
      (entry) => keyOf(entry),
      (entry, index) => entryCard(store, entriesPath, entry, index, section.entries.length),
    )}
    ${section.entries.length === 0 ? html`<p class="empty">No entries yet.</p>` : nothing}
    <div class="add-row">
      ${addButton('Add entry', () => {
        const entry = { period: '', title: '', organization: '', blocks: [], projects: [] };
        store.expanded.add(keyOf(entry));
        append(store, entriesPath, entry, ['title']);
      })}
    </div>
  </div>`;
}

// ---------- Section cards ----------

export function sectionCardId(section: Section): string {
  return `card-${keyOf(section)}`;
}

export function sectionCard(
  store: EditorStore,
  section: Section,
  index: number,
  count: number,
): TemplateResult {
  const key = keyOf(section);
  const collapsed = store.collapsed.has(key);
  const path = ['sections', index];
  const isBars = section.type === 'bars';
  const size = isBars ? section.items.length : section.entries.length;
  return html`<section
    class="card ${collapsed ? 'is-collapsed' : ''}"
    id=${sectionCardId(section)}
    ${sortable('sections', index, reorder(store, ['sections']))}
  >
    <header class="card__head">
      ${dragHandle()}
      <span class="badge badge--${section.type}" title=${isBars ? 'Skill bars' : 'Timeline'}>
        ${icon(isBars ? faChartSimple : faTimeline)}
      </span>
      ${textField(store, [...path, 'title'], section.title, {
        placeholder: 'Section title',
        className: 'card__title-field',
      })}
      <span class="count" title=${isBars ? 'Items' : 'Entries'}>${size}</span>
      ${itemActions(store, ['sections'], index, count, 'section')}
      <button
        type="button"
        class="icon-btn chevron-btn"
        aria-label=${collapsed ? 'Expand section' : 'Collapse section'}
        aria-expanded=${collapsed ? 'false' : 'true'}
        @click=${() => store.toggle(store.collapsed, key)}
      >
        <span class="chevron">${icon(faChevronDown)}</span>
      </button>
    </header>
    ${
      collapsed
        ? nothing
        : html`<div class="card__body">
            ${isBars ? barsBody(store, path, section) : timelineBody(store, path, section)}
          </div>`
    }
  </section>`;
}

export function addSectionButtons(store: EditorStore): TemplateResult {
  const add = (section: Section) => append(store, ['sections'], section, ['title']);
  return html`<div class="add-section">
    ${addButton('Skill bars section', () => add({ type: 'bars', title: '', items: [] }), 'add-btn--large')}
    ${addButton('Timeline section', () => add({ type: 'timeline', title: '', entries: [] }), 'add-btn--large')}
  </div>`;
}
