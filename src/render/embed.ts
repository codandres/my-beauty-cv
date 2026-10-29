import { isMessage, type FromPreview, type ToPreview } from '../preview/protocol';
import { renderCv, renderError } from '.';

/**
 * Embedded preview mode (`/?embed`): instead of reading data/, render whatever the parent
 * editor sends. Renders are sequenced so a slow template load can't overwrite a newer one.
 */
export function startEmbeddedPreview(win: Window): void {
  const doc = win.document;
  doc.documentElement.classList.add('is-embedded');
  let latest = 0;

  const send = (message: FromPreview) => win.parent.postMessage(message, win.location.origin);

  win.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (event.source !== win.parent || event.origin !== win.location.origin) return;
    if (!isMessage<ToPreview>(event.data, ['cv:render', 'cv:zoom'])) return;
    const message = event.data;

    if (message.type === 'cv:zoom') {
      doc.documentElement.style.zoom = String(message.zoom);
      return;
    }

    const run = ++latest;
    const scroll = { x: win.scrollX, y: win.scrollY };
    renderCv(doc, message.cv, message.template)
      .then(() => {
        if (run === latest) win.scrollTo(scroll.x, scroll.y);
      })
      .catch((error: unknown) => {
        if (run !== latest) return;
        renderError(doc, error);
        send({ type: 'cv:error', message: error instanceof Error ? error.message : String(error) });
      });
  });

  send({ type: 'cv:ready' });
}
