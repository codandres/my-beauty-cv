import { nothing } from 'lit';
import { Directive, directive, PartType, type ElementPart, type PartInfo } from 'lit/directive.js';

/**
 * Drag-and-drop reordering for list rows: `<div ${sortable(listId, index, onMove)}>` plus a
 * `[data-drag-handle]` element inside. Dragging starts only from the handle, so text in the
 * row's inputs stays selectable, and drops are accepted only within the same list. The
 * directive never moves DOM itself; `onMove(from, to)` updates state and Lit re-renders.
 */

let dragging: { list: string; index: number } | undefined;

type OnMove = (from: number, to: number) => void;

class SortableDirective extends Directive {
  private element?: HTMLElement;
  private list = '';
  private index = 0;
  private onMove: OnMove = () => {};

  constructor(part: PartInfo) {
    super(part);
    if (part.type !== PartType.ELEMENT) throw new Error('sortable() must be used on an element');
  }

  render(_list: string, _index: number, _onMove: OnMove) {
    return nothing;
  }

  override update(part: ElementPart, [list, index, onMove]: [string, number, OnMove]) {
    this.list = list;
    this.index = index;
    this.onMove = onMove;
    if (this.element !== part.element) this.attach(part.element as HTMLElement);
    return nothing;
  }

  private attach(element: HTMLElement) {
    this.element = element;
    element.classList.add('sortable');

    element.addEventListener('pointerdown', (event) => {
      const handle = (event.target as HTMLElement).closest('[data-drag-handle]');
      element.draggable = Boolean(handle && element.contains(handle));
    });

    element.addEventListener('dragstart', (event) => {
      if (!element.draggable) return;
      event.stopPropagation();
      dragging = { list: this.list, index: this.index };
      event.dataTransfer?.setData('text/plain', '');
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      element.classList.add('is-dragging');
    });

    element.addEventListener('dragend', () => {
      dragging = undefined;
      element.draggable = false;
      element.classList.remove('is-dragging');
      clearIndicators();
    });

    element.addEventListener('dragover', (event) => {
      if (dragging?.list !== this.list) return;
      event.preventDefault();
      event.stopPropagation();
      clearIndicators();
      element.classList.add(this.isAfter(event) ? 'drop-after' : 'drop-before');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('drop-before', 'drop-after');
    });

    element.addEventListener('drop', (event) => {
      if (dragging?.list !== this.list) return;
      event.preventDefault();
      event.stopPropagation();
      const from = dragging.index;
      let to = this.index + (this.isAfter(event) ? 1 : 0);
      if (from < to) to -= 1;
      clearIndicators();
      dragging = undefined;
      if (from !== to) this.onMove(from, to);
    });
  }

  private isAfter(event: DragEvent): boolean {
    if (!this.element) return false;
    const box = this.element.getBoundingClientRect();
    return event.clientY > box.top + box.height / 2;
  }
}

function clearIndicators() {
  for (const el of document.querySelectorAll('.drop-before, .drop-after')) {
    el.classList.remove('drop-before', 'drop-after');
  }
}

export const sortable = directive(SortableDirective);
