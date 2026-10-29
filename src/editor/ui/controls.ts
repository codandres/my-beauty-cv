import {
  faArrowDown,
  faArrowUp,
  faCopy,
  faGripVertical,
  faPlus,
  faTrashCan,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { html, nothing, type TemplateResult } from 'lit';
import { getIn, insertAt, move, removeAt, type Path } from '../state/path';
import type { EditorStore } from '../state/store';
import { icon } from './icons';

interface ButtonOptions {
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

export function iconButton(
  definition: IconDefinition,
  label: string,
  onClick: (event: Event) => void,
  options: ButtonOptions = {},
): TemplateResult {
  return html`<button
    type="button"
    class="icon-btn ${options.danger ? 'icon-btn--danger' : ''} ${options.className ?? ''}"
    title=${label}
    aria-label=${label}
    ?disabled=${options.disabled}
    @click=${onClick}
  >
    ${icon(definition)}
  </button>`;
}

export function addButton(label: string, onClick: () => void, className = ''): TemplateResult {
  return html`<button type="button" class="add-btn ${className}" @click=${onClick}>
    ${icon(faPlus)}<span>${label}</span>
  </button>`;
}

export function dragHandle(): TemplateResult {
  return html`<span class="drag-handle" data-drag-handle title="Drag to reorder"
    >${icon(faGripVertical)}</span
  >`;
}

/** Move up/down, optional duplicate, and delete (with an undo toast) for a list item. */
export function itemActions(
  store: EditorStore,
  listPath: Path,
  index: number,
  length: number,
  what: string,
  { duplicate = false } = {},
): TemplateResult {
  const stop = (fn: () => void) => (event: Event) => {
    event.stopPropagation();
    fn();
  };
  return html`<div class="item-actions">
    ${iconButton(
      faArrowUp,
      `Move ${what} up`,
      stop(() => store.change((cv) => move(cv, listPath, index, index - 1))),
      { disabled: index === 0 },
    )}
    ${iconButton(
      faArrowDown,
      `Move ${what} down`,
      stop(() => store.change((cv) => move(cv, listPath, index, index + 1))),
      { disabled: index === length - 1 },
    )}
    ${
      duplicate
        ? iconButton(
            faCopy,
            `Duplicate ${what}`,
            stop(() =>
              store.change((cv) =>
                insertAt(cv, listPath, index + 1, structuredClone(getIn(cv, [...listPath, index]))),
              ),
            ),
          )
        : nothing
    }
    ${iconButton(
      faTrashCan,
      `Delete ${what}`,
      stop(() => {
        store.change((cv) => removeAt(cv, listPath, index));
        store.showToast(`Deleted ${what}`, true);
      }),
      { danger: true },
    )}
  </div>`;
}

/** Adds an item at the end of a list and focuses `focusField` inside it. */
export function append(store: EditorStore, listPath: Path, item: unknown, focusField: Path = []) {
  store.change((cv) => {
    const length = (getIn(cv, listPath) as unknown[]).length;
    store.pendingFocus = [...listPath, length, ...focusField].join('.');
    return insertAt(cv, listPath, length, item);
  });
}
