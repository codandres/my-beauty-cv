# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node 24+, npm. Vite + TypeScript + SCSS (no CSS framework), Vitest, Playwright.

- `npm run dev`: dev server with HMR; editing anything in `data/` reloads the page. Add `?template=<id>` and/or `?lang=<code>` to the URL to preview other combinations without editing `data/settings.json`.
- `npm run editor`: the interactive editor at `/editor.html` (dev server only): form editor on the left, live preview on the right, saves to `data/`.
- `npm run build`: typecheck (`tsc`) and production build to `dist/` (the CV page only; the editor isn't built).
- `npm run pdf`: build, then print every language × template with Playwright Chromium to `out/<lang>/<meta.documentTitle> (<Template Name>).pdf` (2 languages × 5 templates = 10 PDFs). Narrow it with `-- --lang es` and/or `-- --template aurora`.
- `npm test`: unit tests (Vitest, happy-dom). Single file: `npx vitest run src/templates/templates.test.ts`. Single test: add `-t "test name"`.
- `npm run test:e2e`: Playwright tests in `tests/e2e/`: CV tests against `vite preview` (port 4173), editor tests against a dev server (port 5174) whose save API points at a scratch copy of `data/` in the OS temp dir (`CV_DATA_DIR`), so tests never write the real files. Single test: `npx playwright test -g "test name"`.
- `npm run lint` (ESLint + Prettier check), `npm run format`, `npm run typecheck`.
- `npm run schema`: regenerate `data/cv.schema.json` and `data/settings.schema.json` from the zod schemas. Runs automatically before `dev` and `build`.

## Architecture

- `data/cv.<lang>.json` (`cv.en.json`, `cv.es.json`): the only place CV content lives, one file per language. Adding a `cv.<code>.json` file adds a language with no code change: `src/content/files.ts` matches file names, and `src/content/load.ts` lazy-loads them with `import.meta.glob`. `public/` holds assets they reference (e.g. `profile.jpg`).
- Language files should keep the same structure; `templates.test.ts` compares their section, entry, project and bullet counts against `cv.en.json`.
- `data/settings.json`: `{ "template", "language" }`, the template and language to render, shared by all languages. URL `?template=`/`?lang=` override it (`src/main.ts`).
- `src/schema/cv.schema.ts` and `src/schema/settings.schema.ts`: the zod schemas are the single source of truth for the JSON contracts. Types come from `z.infer`, and the editor JSON Schemas in `data/*.schema.json` are generated from them (don't hand-edit those files). Change a schema here first, then the renderer. The settings schema's `language` enum comes from the content files that exist.
- `src/render/`: shared rendering. `html.ts` is the `html` tagged template, which escapes every interpolation, so never build markup by string concatenation and only use `unsafeRaw` for trusted constants such as icon paths. `partials.ts` holds markup every template reuses: contacts, photo, entry blocks, `splitSections`, and step ratings (`renderSteps`). `index.ts` validates the JSON, loads the template and renders it.
- Sections are a discriminated union on `type` (`bars` | `timeline`). The JSON chooses the order and titles. A block is `{label?, text}` or `{label?, bullets}`.
- A timeline entry is a company (or institution). Its `blocks` describe the company itself. Its `projects` are the clients or projects worked on there, each with optional `period`, optional `title` (the role on that project) and `blocks`; every template draws them as a child timeline nested in the entry, showing a project's period and title in the same place and style as the company's, a step softer.
- **Templates** (`src/templates/`): `"template"` in `data/settings.json` picks one (default `modern-blue`).
  - `catalog.ts` lists the ids, display names and descriptions; the schema enum is built from it.
  - `registry.ts` lazy-loads each template, so only the chosen template's CSS and fonts are fetched.
  - Each `<id>/index.ts` default-exports a `CvTemplate` (`render(cv) → SafeHtml`) whose root is `<div class="cv cv--<id>">`. It imports its own `@fontsource` fonts and `style.scss`, and every rule in that stylesheet is nested under `.cv--<id>`.
  - Templates may lay sections out differently (for example bars in a sidebar), but must render every piece of content from the JSON. `templates.test.ts` checks this for every template.
  - `header.headline` and `header.summaryTitle` are optional. Every template except Modern Blue shows them; Modern Blue has no slot for them in the reference.
  - Adding a template: add it to `catalog.ts`, create `<id>/index.ts` and `<id>/style.scss`, and register it in `registry.ts` (the `Record` type flags a missing entry).
- Modern Blue reproduces the reference. It splits bar items into two independent columns by index (even → left, odd → right).
- `src/styles/`: global SCSS: the reset (`_base.scss`) and the A4 sheet and print rules (`_sheet.scss`), plus `_timeline.scss`, which templates `@use` for `timeline.cap(...)`. Every vertical timeline line that ends (child lines, and company lines except Modern Blue's full-page divider) closes with that short horizontal cap. Template colors and measurements live as SCSS variables at the top of each template's `style.scss`.
- Project periods use the company-period class inside the project, overridden to be a step softer (smaller, lighter weight, paler color) than the company period.
- Backgrounds that must appear on every printed page (such as a sidebar color) go on the `.cv` root as a hard-edged gradient. A column's own background stops at the first page break. In print the root ends with the content, so a full-height stripe also needs a `position: fixed` element (Chromium repeats it on every page) replacing the gradient in `@media print`; see Midnight Sidebar.
- **Editor** (`editor.html`, `src/editor/`), built with Lit (`lit-html`), loaded on the editor page only:
  - `scripts/editor-api.ts` is a Vite plugin (`apply: 'serve'`) mounting `/__cv/api`: `GET /state`, `PUT /cv/<lang>`, `PUT /settings`. It validates with the zod schemas (loaded via `server.ssrLoadModule`, so `vite.config.ts` imports no app code), formats with Prettier from 2-space-indented JSON (byte-identical round trip on unchanged data: empty `blocks` are kept, empty `projects` omitted, keys in schema order), and only writes existing `cv.<lang>.json` files and `settings.json`. `CV_DATA_DIR` overrides the folder.
  - The preview is the real CV page in an iframe (`/?embed`, `src/render/embed.ts`); the editor sends `{ cv, template }` and zoom by `postMessage` (`src/preview/protocol.ts`). The iframe sends `cv:ready` on every load (Vite reloads it when `data/` changes) and gets the state again. Never import `data/` (or `src/content/load.ts`) from editor code: a save would then reload the editor page.
  - `state/path.ts`: immutable updates by path; copies inherit the original's `keyOf` key, so list items keep their identity (focus, expanded state, `repeat` keys, drag and drop) across edits. `state/store.ts`: one document per language with undo/redo (typing in one field coalesces into one step), validation issues keyed by path (`"sections.0.title"`), UI state. Fields carry `data-path`, used for focusing (`store.pendingFocus`) and in tests.
  - The editor's chrome text is English UI, not CV content; new items start empty and the validation gate (save disabled, inline "Required") makes the user fill them.
- Tooling must not touch `.agents/`, `.claude/`, `docs/`, `README.md` or `CLAUDE.md`. They are listed in `.prettierignore` and the ESLint ignores.

## Open decisions

- **Pagination** isn't solved yet, and it affects every template. Right now the CV is one continuous A4-wide sheet, printed with `@page { size: A4; margin: 0 }`, so continuation pages start flush with the top edge, and a few millimetres of overflow can produce a nearly empty last page (Midnight Sidebar does this with the current content). The reference needs a top gap on continuation pages, the divider running the full height of every page, and a blue marker where a split entry continues. Two options: pure print CSS (fixed-position divider, `@page` margins), or a small JS paginator that moves blocks into explicit `.page` boxes. The paginator would also give an on-screen page preview. Splitting between blocks and bullets is enough for the reference.
- **Visual baseline**: `tests/e2e/cv.spec.ts` has a skipped screenshot test. Enable it once the fidelity pass is done.

## Goal (from README.md)

Build a CV generator in **TypeScript / HTML / SCSS** that copies the look of the reference CV in `docs/CV_Template/`.

- **All text and every section come from a JSON file.** The HTML is built from that JSON, so no CV content is hard-coded in templates or code.
- The user edits the JSON to change the CV, including adding or removing entries (more or fewer jobs, skills, languages, bullets and so on). The renderer must handle any number of items in every list.
- The rendered UI must match the reference visually.

## Design reference

- `docs/CV_Template/CV_Goal_Template_Images_PDF/CV_Goal_Template.pdf` is the source of truth: 3 pages, A4 (595.28 × 841.89 pt), Montserrat font.
- `docs/CV_Template/CV_Goal_Template_Images_PNG/`: one PNG per page. **`Page_2.png` is a byte-for-byte copy of `Page_1.png`**, so use the PDF for how page 2 should look.

Layout to reproduce:
- **Header** on a light-grey background. It has the full name in large, bold blue, contact lines with icons (email, phone, city, LinkedIn), a round profile photo at top right, and a summary paragraph below.
- **Body** in two columns, split by a thin vertical grey line that runs the full height of each page.
  - The left column holds section titles in blue (Languages, Skills, Experience, Education) and date ranges in bold black (e.g. "May 2022 - Present").
  - The right column holds the section content.
- **Languages / Skills**: a two-column grid of bold labels. Each label sits above a proficiency bar: a blue fill on a pale-blue track, with variable fill width, so each entry needs a level value in the JSON.
- **Experience / Education**: a timeline. A small blue square sits on the divider line beside each entry. Each entry shows a bold role or degree title, then the company or institution with its location in blue bold. After that come labelled rich-text blocks: **Client**, **Project**, **Responsibilities** (a "•" bullet list), **Tools and Technologies** and **Team**. The label is bold and the text after it is regular.
- Entries flow across page breaks: an experience entry can start on one page and continue on the next. The output must print or export cleanly to A4 PDF.
