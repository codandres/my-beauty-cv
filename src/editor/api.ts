import type { Cv } from '../schema/cv.schema';
import type { Settings } from './state/store';

// Client for the dev-server API in scripts/editor-api.ts.
const BASE = '/__cv/api';

export interface RawState {
  languages: string[];
  cvs: Record<string, unknown>;
  settings: unknown;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(
      data.error ??
        (response.status === 404
          ? 'The editor API is not available. Start the editor with `npm run editor`.'
          : `Request failed (${response.status})`),
    );
  }
  return data as T;
}

export const loadState = () => request<RawState>('GET', '/state');
export const saveCv = (lang: string, cv: Cv) =>
  request('PUT', `/cv/${encodeURIComponent(lang)}`, cv);
export const saveSettings = (settings: Settings) => request('PUT', '/settings', settings);
