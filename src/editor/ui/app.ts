import {
  faCheck,
  faCircleNotch,
  faFloppyDisk,
  faPen,
  faRotateLeft,
  faRotateRight,
  faStar,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { html, nothing, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { TEMPLATE_IDS, TEMPLATE_INFO } from '../../templates/catalog';
import type { ZoomMode } from '../preview';
import { keyOf, pathKey, type Path } from '../state/path';
import type { EditorStore } from '../state/store';
import { labelSuggestions } from './blocks';
import { iconButton } from './controls';
import { icon } from './icons';
import { contactsCard, documentCard, profileCard } from './profile';
import { addSectionButtons, sectionCard, sectionCardId } from './sections';

export interface AppContext {
  save(): void;
  makeDefault(): void;
  attachPreview(element?: Element): void;
  zoomMode: ZoomMode;
  setZoomMode(mode: ZoomMode): void;
  previewError?: string;
  /** Narrow screens show one pane at a time. */
  view: 'edit' | 'preview';
  setView(view: 'edit' | 'preview'): void;
  startResize(event: PointerEvent): void;
}

/** Expands whatever contains `path` and focuses its field after the next render. */
export function reveal(store: EditorStore, path: Path): void {
  const cv = store.cv;
  if (path[0] === 'sections' && typeof path[1] === 'number') {
    const section = cv.sections[path[1]];
    if (section) {
      store.collapsed.delete(keyOf(section));
      if (section.type === 'timeline' && path[2] === 'entries' && typeof path[3] === 'number') {
        const entry = section.entries[path[3]];
        if (entry) {
          store.expanded.add(keyOf(entry));
          const project = path[4] === 'projects' ? entry.projects[path[5] as number] : undefined;
          if (project) store.expanded.add(keyOf(project));
        }
      }
    }
  }
  store.pendingFocus = pathKey(path);
  store.notify();
}

export function revealFirstIssue(store: EditorStore): void {
  const first = store.issues.keys().next().value;
  if (first === undefined) return;
  reveal(
    store,
    first.split('.').map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment)),
  );
}

function statusView(store: EditorStore): TemplateResult {
  const dirty = store.dirtyLanguages;
  const { status } = store;
  if (status.kind === 'saving') {
    return html`<span class="status">${icon(faCircleNotch, 'icon spin')} Saving…</span>`;
  }
  if (status.kind === 'error') {
    return html`<span class="status status--error" title=${status.message}
      >${icon(faTriangleExclamation)} Save failed: ${status.message}</span
    >`;
  }
  if (dirty.length > 0) {
    return html`<span class="status status--dirty"
      ><span class="dot"></span>Unsaved changes
      (${dirty.map((lang) => lang.toUpperCase()).join(', ')})</span
    >`;
  }
  return html`<span class="status status--saved"
    >${icon(faCheck)}
    ${
      status.kind === 'saved'
        ? `Saved at ${status.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'All changes saved'
    }</span
  >`;
}

function topbar(store: EditorStore, ctx: AppContext): TemplateResult {
  const issues = store.issues.size;
  const blocked = store.dirtyLanguages.some((lang) => store.issueCount(lang) > 0);
  const canSave = store.dirtyLanguages.length > 0 && store.status.kind !== 'saving';
  return html`<header class="topbar">
    <div class="brand">${icon(faPen)}<span>CV Editor</span></div>

    <div class="segmented" role="group" aria-label="Language">
      ${store.languages.map(
        (lang) =>
          html`<button
            type="button"
            class=${lang === store.language ? 'is-active' : ''}
            aria-pressed=${lang === store.language ? 'true' : 'false'}
            title=${`Edit cv.${lang}.json`}
            @click=${() => store.setLanguage(lang)}
          >
            ${lang.toUpperCase()}${store.isDirty(lang) ? html`<span class="dot"></span>` : nothing}
          </button>`,
      )}
    </div>

    <div class="topbar__group">
      ${iconButton(faRotateLeft, 'Undo (Ctrl+Z)', () => store.undo(), { disabled: !store.canUndo })}
      ${iconButton(faRotateRight, 'Redo (Ctrl+Shift+Z)', () => store.redo(), {
        disabled: !store.canRedo,
      })}
    </div>

    <div class="segmented view-switch" role="group" aria-label="View">
      ${(['edit', 'preview'] as const).map(
        (view) =>
          html`<button
            type="button"
            class=${ctx.view === view ? 'is-active' : ''}
            @click=${() => ctx.setView(view)}
          >
            ${view === 'edit' ? 'Edit' : 'Preview'}
          </button>`,
      )}
    </div>

    <div class="topbar__spacer"></div>

    ${statusView(store)}
    ${
      issues > 0
        ? html`<button
            type="button"
            class="issues-btn"
            title="Go to the first field that needs attention"
            @click=${() => revealFirstIssue(store)}
          >
            ${icon(faTriangleExclamation)} ${issues} ${issues === 1 ? 'issue' : 'issues'}
          </button>`
        : nothing
    }
    ${
      store.isDirty()
        ? html`<button type="button" class="btn btn--ghost" @click=${() => store.revert()}>
            Revert
          </button>`
        : nothing
    }
    <button
      type="button"
      class="btn btn--primary"
      ?disabled=${!canSave}
      title=${blocked ? 'Fix the highlighted fields first' : 'Save to data/ (Ctrl+S)'}
      @click=${ctx.save}
    >
      ${icon(faFloppyDisk)} Save
    </button>
  </header>`;
}

function jumpNav(store: EditorStore): TemplateResult {
  const go = (id: string) => () =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const issuesBySection = (index: number) =>
    [...store.issues.keys()].some((key) => key.startsWith(`sections.${index}.`));
  return html`<nav class="jump" aria-label="Jump to">
    <button type="button" class="jump__chip" @click=${go('card-profile')}>Profile</button>
    <button type="button" class="jump__chip" @click=${go('card-contacts')}>Contact</button>
    ${store.cv.sections.map(
      (section, i) =>
        html`<button
          type="button"
          class="jump__chip ${issuesBySection(i) ? 'has-issue' : ''}"
          @click=${go(sectionCardId(section))}
        >
          ${section.title || 'Untitled'}
        </button>`,
    )}
    <button type="button" class="jump__chip" @click=${go('card-document')}>Document</button>
  </nav>`;
}

function previewPane(store: EditorStore, ctx: AppContext): TemplateResult {
  const { defaults } = store;
  const isDefault = store.template === defaults.template && store.language === defaults.language;
  return html`<div class="pane pane--preview">
    <div class="preview-bar">
      <div class="templates" role="radiogroup" aria-label="Template">
        ${TEMPLATE_IDS.map((id) => {
          const info = TEMPLATE_INFO[id];
          const active = id === store.template;
          return html`<button
            type="button"
            role="radio"
            aria-checked=${active ? 'true' : 'false'}
            class="template-chip ${active ? 'is-active' : ''}"
            title=${info.description}
            @click=${() => store.setTemplate(id)}
          >
            <span
              class="swatch"
              style="--swatch-bg: ${info.swatch[0]}; --swatch-accent: ${info.swatch[1]}"
            ></span>
            ${info.name}
            ${
              id === defaults.template
                ? html`<span class="template-chip__default" title="Default template"
                    >${icon(faStar)}</span
                  >`
                : nothing
            }
          </button>`;
        })}
      </div>
      <div class="preview-bar__end">
        <div class="segmented segmented--small" role="group" aria-label="Zoom">
          <button
            type="button"
            class=${ctx.zoomMode === 'fit' ? 'is-active' : ''}
            @click=${() => ctx.setZoomMode('fit')}
          >
            Fit
          </button>
          <button
            type="button"
            class=${ctx.zoomMode === 'actual' ? 'is-active' : ''}
            @click=${() => ctx.setZoomMode('actual')}
          >
            100%
          </button>
        </div>
        ${
          isDefault
            ? nothing
            : html`<button
                type="button"
                class="btn btn--small"
                title="Save this template and language to data/settings.json"
                @click=${ctx.makeDefault}
              >
                ${icon(faStar)} Make default
              </button>`
        }
      </div>
    </div>
    <div class="preview-stage">
      <iframe
        class="preview-frame"
        title="CV preview"
        src="/?embed"
        ${ref(ctx.attachPreview)}
      ></iframe>
      ${
        ctx.previewError
          ? html`<div class="preview-error">
              ${icon(faTriangleExclamation)} ${ctx.previewError}
            </div>`
          : nothing
      }
    </div>
  </div>`;
}

export function appView(store: EditorStore, ctx: AppContext): TemplateResult {
  const { cv } = store;
  const allBlocks = cv.sections.flatMap((s) =>
    s.type === 'timeline'
      ? s.entries.flatMap((e) => [e.blocks, ...e.projects.map((p) => p.blocks)])
      : [],
  );
  return html`${topbar(store, ctx)}
    <div class="workspace view-${ctx.view}">
      <div class="pane pane--editor">
        ${jumpNav(store)}
        <div class="cards">
          ${profileCard(store)} ${contactsCard(store)}
          ${cv.sections.map((section, i) => sectionCard(store, section, i, cv.sections.length))}
          ${addSectionButtons(store)} ${documentCard(store)}
        </div>
        ${labelSuggestions(allBlocks)}
      </div>
      <div
        class="splitter"
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        @pointerdown=${ctx.startResize}
      ></div>
      ${previewPane(store, ctx)}
    </div>
    ${
      store.toast
        ? html`<div class="toast" role="status">
            <span>${store.toast.message}</span>
            ${
              store.toast.undo
                ? html`<button
                    type="button"
                    class="link-btn"
                    @click=${() => {
                      store.undo();
                      store.toast = undefined;
                      store.notify();
                    }}
                  >
                    Undo
                  </button>`
                : nothing
            }
          </div>`
        : nothing
    }`;
}

export function loadErrorView(message: string): TemplateResult {
  return html`<div class="load-error">
    <h1>${icon(faTriangleExclamation)} The editor couldn't load your CV</h1>
    <pre>${message}</pre>
    <p>Fix the file mentioned above, then reload this page.</p>
  </div>`;
}
