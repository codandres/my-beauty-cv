/**
 * Minimal safe templating. Every interpolated value is HTML-escaped unless it is
 * already `SafeHtml` (the output of another `html` call), so CV text from JSON can
 * never inject markup.
 */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

type Interpolation = string | number | SafeHtml | null | undefined | false | Interpolation[];

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

function stringify(value: Interpolation): string {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(stringify).join('');
  if (value instanceof SafeHtml) return value.value;
  return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: Interpolation[]): SafeHtml {
  let out = strings[0] ?? '';
  values.forEach((value, i) => {
    out += stringify(value) + (strings[i + 1] ?? '');
  });
  return new SafeHtml(out);
}

/** Marks a trusted, pre-built markup string (e.g. icon SVG paths) as safe. */
export function unsafeRaw(markup: string): SafeHtml {
  return new SafeHtml(markup);
}
