import { describe, expect, it } from 'vitest';
import { html } from './html';

describe('html', () => {
  it('escapes interpolated strings', () => {
    expect(html`<p>${'<b>"x" & y</b>'}</p>`.toString()).toBe(
      '<p>&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;</p>',
    );
  });

  it('does not double-escape nested templates and joins arrays', () => {
    const items = ['a', 'b'].map((x) => html`<li>${x}</li>`);
    // prettier-ignore
    const list = html`<ul>${items}</ul>`;
    expect(list.toString()).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('renders nothing for null, undefined and false', () => {
    expect(html`${null}${undefined}${false}`.toString()).toBe('');
  });
});
