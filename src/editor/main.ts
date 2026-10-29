import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './editor.scss';
import { render } from 'lit';
import { parseCv, type Cv } from '../schema/cv.schema';
import { parseSettings } from '../schema/settings.schema';
import { DEFAULT_TEMPLATE, TEMPLATE_INFO } from '../templates/catalog';
import { loadState, saveCv, saveSettings } from './api';
import { PreviewFrame } from './preview';
import { EditorStore } from './state/store';
import { appView, loadErrorView, revealFirstIssue, type AppContext } from './ui/app';
import { autosizeAll } from './ui/fields';

const root = document.getElementById('editor') ?? document.body;
const WIDTH_KEY = 'cv-editor:width';

function storedWidth(): number | undefined {
  try {
    const value = Number(localStorage.getItem(WIDTH_KEY));
    return value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

async function boot(): Promise<EditorStore> {
  const raw = await loadState();
  const cvs: Record<string, Cv> = {};
  for (const lang of raw.languages) {
    try {
      cvs[lang] = parseCv(raw.cvs[lang]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`data/cv.${lang}.json: ${message}`, { cause: error });
    }
  }
  let settings;
  try {
    settings = parseSettings(raw.settings, raw.languages);
  } catch {
    settings = { template: DEFAULT_TEMPLATE, language: raw.languages[0] ?? 'en' };
  }
  return new EditorStore(cvs, settings);
}

function start(store: EditorStore): void {
  const workspaceWidth = () => document.querySelector<HTMLElement>('.workspace');
  let previewError: string | undefined;
  let editorWidth = storedWidth();

  const preview = new PreviewFrame(
    () => ({ cv: store.cv, template: store.template }),
    (message) => {
      if (message === previewError) return;
      previewError = message;
      schedule();
    },
  );

  async function save(): Promise<void> {
    const dirty = store.dirtyLanguages;
    if (dirty.length === 0 || store.status.kind === 'saving') return;
    const invalid = dirty.find((lang) => store.issueCount(lang) > 0);
    if (invalid) {
      store.setLanguage(invalid);
      revealFirstIssue(store);
      store.showToast('Fix the highlighted fields before saving.');
      return;
    }
    store.status = { kind: 'saving' };
    store.notify();
    try {
      for (const lang of dirty) {
        const cv = store.current(lang);
        await saveCv(lang, cv);
        store.markSaved(lang, cv);
      }
      store.status = { kind: 'saved', at: new Date() };
    } catch (error) {
      store.status = {
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
    store.notify();
  }

  async function makeDefault(): Promise<void> {
    const settings = { template: store.template, language: store.language };
    try {
      await saveSettings(settings);
      store.defaults = settings;
      store.showToast(
        `Default set to ${TEMPLATE_INFO[settings.template].name} (${settings.language.toUpperCase()}).`,
      );
    } catch (error) {
      store.showToast(`Couldn't save settings: ${error instanceof Error ? error.message : error}`);
    }
  }

  function startResize(event: PointerEvent): void {
    const splitter = event.currentTarget as HTMLElement;
    splitter.setPointerCapture(event.pointerId);
    document.body.classList.add('is-resizing');
    const onMove = (e: PointerEvent) => {
      editorWidth = Math.min(Math.max(e.clientX, 380), window.innerWidth - 360);
      workspaceWidth()?.style.setProperty('--editor-width', `${editorWidth}px`);
    };
    const onUp = () => {
      document.body.classList.remove('is-resizing');
      splitter.removeEventListener('pointermove', onMove);
      try {
        if (editorWidth) localStorage.setItem(WIDTH_KEY, String(Math.round(editorWidth)));
      } catch {
        // Width just isn't remembered.
      }
    };
    splitter.addEventListener('pointermove', onMove);
    splitter.addEventListener('pointerup', onUp, { once: true });
  }

  const ctx: AppContext = {
    save: () => void save(),
    makeDefault: () => void makeDefault(),
    attachPreview: preview.attach,
    get zoomMode() {
      return preview.zoomMode;
    },
    setZoomMode: (mode) => {
      preview.setZoomMode(mode);
      schedule();
    },
    get previewError() {
      return previewError;
    },
    view: 'edit',
    setView: (view) => {
      ctx.view = view;
      schedule();
    },
    startResize,
  };

  let scheduled = false;
  function schedule(): void {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(draw);
  }

  function draw(): void {
    scheduled = false;
    render(appView(store, ctx), root);
    if (editorWidth) workspaceWidth()?.style.setProperty('--editor-width', `${editorWidth}px`);
    autosizeAll(root);
    if (store.pendingFocus) {
      const target = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[data-path="${CSS.escape(store.pendingFocus)}"]`,
      );
      store.pendingFocus = undefined;
      if (target) {
        target.focus();
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        const end = target.value.length;
        target.setSelectionRange?.(end, end);
      }
    }
    preview.update();
  }

  store.subscribe(schedule);

  window.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      void save();
    } else if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      store.undo();
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      store.redo();
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (store.dirtyLanguages.length > 0) event.preventDefault();
  });

  draw();
}

boot().then(start, (error: unknown) => {
  render(loadErrorView(error instanceof Error ? error.message : String(error)), root);
});
