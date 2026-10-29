import { isMessage, type FromPreview, type ToPreview } from '../preview/protocol';
import type { Cv } from '../schema/cv.schema';
import type { TemplateId } from '../templates/catalog';

/** A4 width in CSS px (210mm at 96dpi). */
const SHEET_PX = 793.7;
const GUTTER_PX = 48;

export type ZoomMode = 'fit' | 'actual';

/**
 * Drives the preview iframe (`/?embed`): waits for its `cv:ready`, then sends the current
 * CV and template, at most once per frame. The iframe re-announces itself after reloads
 * (e.g. Vite reloading it when data/ changes), and gets the state again.
 */
export class PreviewFrame {
  private iframe?: HTMLIFrameElement;
  private ready = false;
  private queued = false;
  private sent?: { cv: Cv; template: TemplateId };
  private observer?: ResizeObserver;
  zoomMode: ZoomMode = 'fit';

  constructor(
    private readonly state: () => { cv: Cv; template: TemplateId },
    private readonly onError: (message?: string) => void,
  ) {
    window.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin || event.source !== this.iframe?.contentWindow) return;
      if (!isMessage<FromPreview>(event.data, ['cv:ready', 'cv:error'])) return;
      if (event.data.type === 'cv:ready') {
        this.ready = true;
        this.sent = undefined;
        this.sendZoom();
        this.update();
      } else {
        this.onError(event.data.message);
      }
    });
  }

  /** Called with the iframe element after each render (Lit `ref`). */
  attach = (element?: Element): void => {
    if (!(element instanceof HTMLIFrameElement) || element === this.iframe) return;
    this.iframe = element;
    this.ready = false;
    this.observer?.disconnect();
    this.observer = new ResizeObserver(() => this.sendZoom());
    this.observer.observe(element);
  };

  /** Sends the state if the CV or template changed since the last send. */
  update(): void {
    if (!this.ready || this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      const state = this.state();
      if (this.sent?.cv === state.cv && this.sent.template === state.template) return;
      this.sent = state;
      this.post({ type: 'cv:render', ...state });
      this.onError(undefined);
    });
  }

  setZoomMode(mode: ZoomMode): void {
    this.zoomMode = mode;
    this.sendZoom();
  }

  private sendZoom(): void {
    if (!this.ready || !this.iframe) return;
    const zoom =
      this.zoomMode === 'actual'
        ? 1
        : Math.min(1.25, Math.max(0.3, (this.iframe.clientWidth - GUTTER_PX) / SHEET_PX));
    this.post({ type: 'cv:zoom', zoom: Math.round(zoom * 1000) / 1000 });
  }

  private post(message: ToPreview): void {
    this.iframe?.contentWindow?.postMessage(message, location.origin);
  }
}
