import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { pathKey, type Path } from '../state/path';
import type { EditorStore } from '../state/store';

interface FieldOptions {
  label?: string;
  placeholder?: string;
  /** Optional field: clearing it removes the key from the JSON. */
  optional?: boolean;
  hint?: string;
  /** Multi-line, growing textarea. */
  multiline?: boolean;
  /** Suggestions shown while typing (rendered as a <datalist>). */
  list?: string;
  /** Id used by store.pendingFocus to focus this field after it is added. */
  focusId?: string;
  className?: string;
  onKeydown?: (event: KeyboardEvent) => void;
  onPaste?: (event: ClipboardEvent) => void;
}

/** A labelled text input or textarea bound to `path`, with its validation message. */
export function textField(
  store: EditorStore,
  path: Path,
  value: string | undefined,
  options: FieldOptions = {},
): TemplateResult {
  const issue = store.issues.get(pathKey(path));
  const onInput = (event: Event) => {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (input instanceof HTMLTextAreaElement) autosize(input);
    store.set(path, options.optional && input.value === '' ? undefined : input.value);
  };
  const control = options.multiline
    ? html`<textarea
        rows="1"
        class="control control--multiline"
        .value=${live(value ?? '')}
        placeholder=${ifDefined(options.placeholder)}
        data-focus-id=${ifDefined(options.focusId)}
        data-path=${pathKey(path)}
        aria-invalid=${issue ? 'true' : 'false'}
        @input=${onInput}
        @keydown=${options.onKeydown}
        @paste=${options.onPaste}
      ></textarea>`
    : html`<input
        class="control"
        .value=${live(value ?? '')}
        placeholder=${ifDefined(options.placeholder)}
        list=${ifDefined(options.list)}
        data-focus-id=${ifDefined(options.focusId)}
        data-path=${pathKey(path)}
        aria-invalid=${issue ? 'true' : 'false'}
        @input=${onInput}
        @keydown=${options.onKeydown}
      />`;

  if (!options.label) {
    return html`<div class="field ${options.className ?? ''}">
      ${control} ${issue ? html`<p class="field__error">${issue}</p>` : nothing}
    </div>`;
  }
  return html`<label class="field ${options.className ?? ''}">
    <span class="field__label"
      >${options.label}${
        options.optional ? html`<span class="field__optional">optional</span>` : nothing
      }</span
    >
    ${control}
    ${
      issue
        ? html`<span class="field__error">${issue}</span>`
        : options.hint
          ? html`<span class="field__hint">${options.hint}</span>`
          : nothing
    }
  </label>`;
}

/** Grows a textarea to fit its content (fallback where CSS field-sizing is unsupported). */
export function autosize(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight + 2}px`;
}

export function autosizeAll(root: ParentNode): void {
  if (CSS.supports('field-sizing', 'content')) return;
  for (const textarea of root.querySelectorAll<HTMLTextAreaElement>(
    'textarea.control--multiline',
  )) {
    autosize(textarea);
  }
}
