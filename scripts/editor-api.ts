import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import * as prettier from 'prettier';
import type { Plugin } from 'vite';
import type { Cv } from '../src/schema/cv.schema.ts';

/**
 * Local API behind the editor (editor.html), served only by the Vite dev server:
 *   GET /__cv/api/state          → { languages, cvs: { <lang>: raw JSON }, settings }
 *   PUT /__cv/api/cv/<lang>      → validate, format and write data/cv.<lang>.json
 *   PUT /__cv/api/settings       → validate, format and write data/settings.json
 * Writes are limited to existing content files and settings.json, and always validated.
 */

export const API_PREFIX = '/__cv/api';
const MAX_BODY_BYTES = 1_000_000;

export interface ApiResponse {
  status: number;
  body: unknown;
}

export interface EditorApi {
  handle(method: string, url: string, body: string): Promise<ApiResponse>;
}

/** What gets written: canonical key order; entries without projects omit the list. */
export function toFileData(cv: Cv): unknown {
  return {
    $schema: './cv.schema.json',
    ...cv,
    sections: cv.sections.map((section) =>
      section.type === 'bars'
        ? section
        : {
            ...section,
            entries: section.entries.map(({ projects, ...entry }) =>
              projects.length > 0 ? { ...entry, projects } : entry,
            ),
          },
    ),
  };
}

/** App modules the API validates with; the dev server loads them (see cvEditorApi). */
export interface ApiDeps {
  parseCv(input: unknown): Cv;
  parseSettings(input: unknown, languages: readonly string[]): object;
  languageFromPath(path: string): string | undefined;
}

export function createEditorApi(dataDir: string, loadDeps: () => Promise<ApiDeps>): EditorApi {
  const dir = resolve(dataDir);
  let languageFromPath: ApiDeps['languageFromPath'] = () => undefined;
  const languages = () =>
    readdirSync(dir)
      .flatMap((file) => languageFromPath(file) ?? [])
      .sort();
  const readJson = (file: string): unknown => JSON.parse(readFileSync(join(dir, file), 'utf8'));

  async function writeJson(file: string, data: unknown): Promise<void> {
    const path = join(dir, file);
    const options = (await prettier.resolveConfig(path)) ?? {};
    // Indented input keeps objects expanded under Prettier, matching how data/ files are kept.
    const json = JSON.stringify(data, null, 2);
    writeFileSync(path, await prettier.format(json, { ...options, filepath: path }));
  }

  const fail = (status: number, message: string): ApiResponse => ({
    status,
    body: { error: message },
  });

  return {
    async handle(method, url, body) {
      const deps = await loadDeps();
      ({ languageFromPath } = deps);
      const { parseCv, parseSettings } = deps;
      const route = (url.split('?')[0] ?? '').slice(API_PREFIX.length);
      try {
        if (method === 'GET' && route === '/state') {
          const langs = languages();
          return {
            status: 200,
            body: {
              languages: langs,
              cvs: Object.fromEntries(langs.map((lang) => [lang, readJson(`cv.${lang}.json`)])),
              settings: existsSync(join(dir, 'settings.json')) ? readJson('settings.json') : {},
            },
          };
        }

        const cvRoute = /^\/cv\/([^/]+)$/.exec(route);
        if (method === 'PUT' && cvRoute) {
          const lang = decodeURIComponent(cvRoute[1] ?? '');
          if (!languages().includes(lang))
            return fail(404, `No content file data/cv.${lang}.json.`);
          const cv = parseCv(JSON.parse(body));
          if (cv.meta.lang !== lang) {
            return fail(400, `meta.lang is "${cv.meta.lang}" but this is cv.${lang}.json.`);
          }
          await writeJson(`cv.${lang}.json`, toFileData(cv));
          return { status: 200, body: { ok: true } };
        }

        if (method === 'PUT' && route === '/settings') {
          const settings = parseSettings(JSON.parse(body), languages());
          await writeJson('settings.json', { $schema: './settings.schema.json', ...settings });
          return { status: 200, body: { ok: true } };
        }

        return fail(404, `Unknown route ${method} ${route}`);
      } catch (error) {
        return fail(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) reject(new Error('Request body too large'));
      else chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Vite plugin: mounts the API on the dev server only (`apply: 'serve'`). The schemas are
 * loaded through the dev server, so vite.config.ts never imports app code and schema
 * changes apply without a restart.
 */
export function cvEditorApi(dataDir: string): Plugin {
  return {
    name: 'cv-editor-api',
    apply: 'serve',
    configureServer(server) {
      const api = createEditorApi(dataDir, async () => {
        const [cv, settings, files] = await Promise.all([
          server.ssrLoadModule('/src/schema/cv.schema.ts'),
          server.ssrLoadModule('/src/schema/settings.schema.ts'),
          server.ssrLoadModule('/src/content/files.ts'),
        ]);
        return {
          parseCv: cv.parseCv as ApiDeps['parseCv'],
          parseSettings: settings.parseSettings as ApiDeps['parseSettings'],
          languageFromPath: files.languageFromPath as ApiDeps['languageFromPath'],
        };
      });
      server.middlewares.use(API_PREFIX, (req, res: ServerResponse) => {
        readBody(req)
          .then((body) => api.handle(req.method ?? 'GET', `${API_PREFIX}${req.url ?? ''}`, body))
          .then(({ status, body }) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(body));
          })
          .catch((error: unknown) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(error) }));
          });
      });
    },
  };
}
