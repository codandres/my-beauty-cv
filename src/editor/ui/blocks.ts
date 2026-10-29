import { faAlignLeft, faList, faXmark } from '@fortawesome/free-solid-svg-icons';
import { html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { Block } from '../../schema/cv.schema';
import { insertAt, keyOf, move, pathKey, removeAt, setIn, type Path } from '../state/path';
import type { EditorStore } from '../state/store';
import { addButton, dragHandle, iconButton, itemActions } from './controls';
import { textField } from './fields';
import { icon } from './icons';
import { sortable } from './sortable';

export const LABELS_LIST_ID = 'block-label-suggestions';

/** Strips list markers people paste along with bullet text ("• ", "- ", "* ", "1. "). */
function cleanBullet(line: string): string {
  return line.replace(/^\s*(?:[•*\-–—]|\d+[.)])\s*/, '').trim();
}

function bulletsEditor(store: EditorStore, path: Path, bullets: string[]): TemplateResult {
  const listId = pathKey(path);
  const focus = (index: number) => (store.pendingFocus = pathKey([...path, index]));

  const onKeydown = (index: number) => (event: KeyboardEvent) => {
    const input = event.target as HTMLTextAreaElement;
    if (event.key === 'Enter' && !event.shiftKey) {
      // Enter splits the bullet at the caret into two bullets.
      event.preventDefault();
      const before = input.value.slice(0, input.selectionStart);
      const after = input.value.slice(input.selectionEnd);
      store.change((cv) => {
        focus(index + 1);
        return insertAt(setIn(cv, [...path, index], before), path, index + 1, after);
      });
    } else if (event.key === 'Backspace' && input.value === '' && bullets.length > 1) {
      event.preventDefault();
      store.change((cv) => {
        focus(Math.max(0, index - 1));
        return removeAt(cv, path, index);
      });
    }
  };

  const onPaste = (index: number) => (event: ClipboardEvent) => {
    const lines = (event.clipboardData?.getData('text') ?? '')
      .split(/\r?\n/)
      .map(cleanBullet)
      .filter(Boolean);
    if (lines.length < 2) return;
    // Pasting several lines creates one bullet per line.
    event.preventDefault();
    store.change((cv) => {
      let next = bullets[index] === '' ? removeAt(cv, path, index) : cv;
      const at = bullets[index] === '' ? index : index + 1;
      lines.forEach((line, i) => (next = insertAt(next, path, at + i, line)));
      focus(at + lines.length - 1);
      return next;
    });
  };

  return html`<ul class="bullets">
    ${bullets.map(
      (bullet, index) =>
        html`<li
          class="bullet"
          ${sortable(listId, index, (from, to) => store.change((cv) => move(cv, path, from, to)))}
        >
          ${dragHandle()}
          <span class="bullet__dot" aria-hidden="true">•</span>
          ${textField(store, [...path, index], bullet, {
            multiline: true,
            placeholder: 'Describe an achievement…',
            onKeydown: onKeydown(index),
            onPaste: onPaste(index),
            className: 'bullet__field',
          })}
          ${iconButton(
            faXmark,
            'Remove bullet',
            () => store.change((cv) => removeAt(cv, path, index)),
            { className: 'bullet__remove', disabled: bullets.length === 1 },
          )}
        </li>`,
    )}
  </ul>`;
}

function toggleKind(store: EditorStore, path: Path, block: Block): void {
  const next: Block =
    'bullets' in block
      ? { ...(block.label && { label: block.label }), text: block.bullets.join(' ') }
      : { ...(block.label && { label: block.label }), bullets: [block.text] };
  store.change((cv) => setIn(cv, path, next));
}

/** Editable list of label + text/bullets blocks (Client, Project, Responsibilities, …). */
export function blocksEditor(store: EditorStore, path: Path, blocks: Block[]): TemplateResult {
  const listId = pathKey(path);
  return html`<div class="blocks">
    ${repeat(
      blocks,
      (block) => keyOf(block),
      (block, index) => {
        const blockPath = [...path, index];
        const isList = 'bullets' in block;
        return html`<div
          class="block-row"
          ${sortable(listId, index, (from, to) => store.change((cv) => move(cv, path, from, to)))}
        >
          <div class="block-row__head">
            ${dragHandle()}
            ${textField(store, [...blockPath, 'label'], block.label, {
              optional: true,
              placeholder: 'Label, e.g. Client',
              list: LABELS_LIST_ID,
              className: 'block-row__label',
            })}
            <div class="segmented segmented--small" role="group" aria-label="Block type">
              <button
                type="button"
                class=${isList ? '' : 'is-active'}
                title="Paragraph"
                @click=${() => isList && toggleKind(store, blockPath, block)}
              >
                ${icon(faAlignLeft)} Text
              </button>
              <button
                type="button"
                class=${isList ? 'is-active' : ''}
                title="Bullet list"
                @click=${() => !isList && toggleKind(store, blockPath, block)}
              >
                ${icon(faList)} List
              </button>
            </div>
            ${itemActions(store, path, index, blocks.length, 'block')}
          </div>
          ${
            isList
              ? bulletsEditor(store, [...blockPath, 'bullets'], block.bullets)
              : textField(store, [...blockPath, 'text'], block.text, {
                  multiline: true,
                  placeholder: 'Write the text…',
                })
          }
        </div>`;
      },
    )}
    ${blocks.length === 0 ? html`<p class="empty">No details yet.</p>` : nothing}
    <div class="add-row">
      ${addButton('Text block', () => {
        store.pendingFocus = pathKey([...path, blocks.length, 'label']);
        store.change((cv) => insertAt(cv, path, blocks.length, { text: '' }));
      })}
      ${addButton('Bullet list', () => {
        store.pendingFocus = pathKey([...path, blocks.length, 'label']);
        store.change((cv) => insertAt(cv, path, blocks.length, { bullets: [''] }));
      })}
    </div>
  </div>`;
}

/** Every label used in the CV, offered as suggestions in label fields. */
export function labelSuggestions(blocksIn: Block[][]): TemplateResult {
  const labels = [...new Set(blocksIn.flat().flatMap((b) => (b.label ? [b.label] : [])))].sort();
  return html`<datalist id=${LABELS_LIST_ID}>
    ${labels.map((label) => html`<option value=${label}></option>`)}
  </datalist>`;
}
