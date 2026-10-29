import { z } from 'zod';
import { CvSchema, type Cv } from '../../schema/cv.schema';
import type { TemplateId } from '../../templates/catalog';
import { pathKey, setIn, type Path } from './path';

/** Edits to the same field within this window merge into one undo step. */
const COALESCE_MS = 700;
const HISTORY_LIMIT = 200;

interface LanguageDoc {
  saved: Cv;
  current: Cv;
  undo: Cv[];
  redo: Cv[];
  lastEdit?: { field: string; at: number };
}

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'error'; message: string };

export interface Settings {
  template: TemplateId;
  language: string;
}

/**
 * All editor state: one document per language (with its own undo history), the previewed
 * template, the saved defaults and UI flags. Views read it and call its methods; every
 * change notifies subscribers, which re-render.
 */
export class EditorStore {
  readonly languages: string[];
  language: string;
  template: TemplateId;
  defaults: Settings;
  status: SaveStatus = { kind: 'idle' };
  /** Keys (see keyOf) of collapsed sections and of expanded entries/projects. */
  readonly collapsed = new Set<number>();
  readonly expanded = new Set<number>();
  /** Key of an element to focus after the next render (e.g. a just-added item). */
  pendingFocus?: string;
  toast?: { message: string; undo?: boolean; id: number };

  private readonly docs = new Map<string, LanguageDoc>();
  private readonly listeners = new Set<() => void>();
  private validated?: { cv: Cv; issues: Map<string, string> };

  constructor(cvs: Record<string, Cv>, defaults: Settings) {
    this.languages = Object.keys(cvs).sort();
    for (const [lang, cv] of Object.entries(cvs)) {
      this.docs.set(lang, { saved: cv, current: cv, undo: [], redo: [] });
    }
    this.defaults = defaults;
    this.language = this.docs.has(defaults.language)
      ? defaults.language
      : (this.languages[0] ?? '');
    this.template = defaults.template;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(): void {
    for (const listener of this.listeners) listener();
  }

  private docFor(lang: string): LanguageDoc {
    const doc = this.docs.get(lang);
    if (!doc) throw new Error(`No CV loaded for language "${lang}"`);
    return doc;
  }

  private get doc(): LanguageDoc {
    return this.docFor(this.language);
  }

  get cv(): Cv {
    return this.doc.current;
  }

  /** Sets one field. Consecutive edits of the same field coalesce into one undo step. */
  set(path: Path, value: unknown): void {
    const field = pathKey(path);
    const now = Date.now();
    const doc = this.doc;
    const coalesce = doc.lastEdit?.field === field && now - doc.lastEdit.at < COALESCE_MS;
    this.commit(setIn(doc.current, path, value), !coalesce);
    doc.lastEdit = { field, at: now };
  }

  /** Applies a structural change (add, remove, move…) as its own undo step. */
  change(update: (cv: Cv) => Cv): void {
    this.commit(update(this.doc.current), true);
    this.doc.lastEdit = undefined;
  }

  private commit(next: Cv, newStep: boolean): void {
    const doc = this.doc;
    if (next === doc.current) return;
    if (newStep) {
      doc.undo.push(doc.current);
      if (doc.undo.length > HISTORY_LIMIT) doc.undo.shift();
    }
    doc.redo = [];
    doc.current = next;
    this.notify();
  }

  get canUndo(): boolean {
    return this.doc.undo.length > 0;
  }

  get canRedo(): boolean {
    return this.doc.redo.length > 0;
  }

  undo(): void {
    const doc = this.doc;
    const previous = doc.undo.pop();
    if (!previous) return;
    doc.redo.push(doc.current);
    doc.current = previous;
    doc.lastEdit = undefined;
    this.notify();
  }

  redo(): void {
    const doc = this.doc;
    const next = doc.redo.pop();
    if (!next) return;
    doc.undo.push(doc.current);
    doc.current = next;
    doc.lastEdit = undefined;
    this.notify();
  }

  /** Puts the last saved version back (itself undoable). */
  revert(): void {
    this.change(() => this.doc.saved);
  }

  isDirty(lang = this.language): boolean {
    const doc = this.docFor(lang);
    return doc.current !== doc.saved;
  }

  get dirtyLanguages(): string[] {
    return this.languages.filter((lang) => this.isDirty(lang));
  }

  current(lang: string): Cv {
    return this.docFor(lang).current;
  }

  markSaved(lang: string, cv: Cv): void {
    this.docFor(lang).saved = cv;
  }

  /** Validation issues of the current language, keyed by field path ("sections.0.title"). */
  get issues(): Map<string, string> {
    const cv = this.cv;
    if (this.validated?.cv !== cv) {
      const result = CvSchema.safeParse(cv);
      const issues = new Map<string, string>();
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = pathKey(issue.path as Path);
          if (!issues.has(key)) issues.set(key, friendlyMessage(issue));
        }
      }
      this.validated = { cv, issues };
    }
    return this.validated.issues;
  }

  /** Issues in every language, for the save gate. */
  issueCount(lang: string): number {
    const result = CvSchema.safeParse(this.current(lang));
    return result.success ? 0 : result.error.issues.length;
  }

  setLanguage(lang: string): void {
    if (!this.docs.has(lang) || lang === this.language) return;
    this.language = lang;
    this.notify();
  }

  setTemplate(template: TemplateId): void {
    this.template = template;
    this.notify();
  }

  toggle(set: Set<number>, key: number): void {
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.notify();
  }

  private toastId = 0;
  showToast(message: string, undo = false): void {
    const id = ++this.toastId;
    this.toast = { message, undo, id };
    this.notify();
    setTimeout(() => {
      if (this.toast?.id === id) {
        this.toast = undefined;
        this.notify();
      }
    }, 5000);
  }
}

function friendlyMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === 'too_small' && issue.origin === 'string') return 'Required';
  if (issue.code === 'too_small' && issue.origin === 'array') return 'Add at least one item';
  return issue.message;
}
