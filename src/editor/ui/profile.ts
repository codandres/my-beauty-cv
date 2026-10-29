import { faAddressCard, faFileLines, faUser } from '@fortawesome/free-solid-svg-icons';
import { html, nothing, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { ContactTypeSchema, type Contact, type ContactType } from '../../schema/cv.schema';
import { insertAt, keyOf, move, pathKey, removeAt, setIn, type Path } from '../state/path';
import type { EditorStore } from '../state/store';
import { addButton, dragHandle, itemActions } from './controls';
import { textField } from './fields';
import { contactIcon, icon } from './icons';
import { sortable } from './sortable';

const CONTACT_LABELS: Record<ContactType, string> = {
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  website: 'Website',
};

const LINK_PLACEHOLDERS: Record<ContactType, string> = {
  email: 'mailto:you@example.com',
  phone: 'tel:+15551234567',
  location: 'Optional map link',
  linkedin: 'https://linkedin.com/in/…',
  github: 'https://github.com/…',
  website: 'https://…',
};

export function profileCard(store: EditorStore): TemplateResult {
  const { header } = store.cv;
  const photo = header.photo;
  const setPhotoSrc = (event: Event) => {
    const src = (event.target as HTMLInputElement).value;
    store.set(
      ['header', 'photo'],
      src === '' ? undefined : { src, alt: photo?.alt ?? header.name },
    );
  };
  return html`<section class="card" id="card-profile">
    <header class="card__head card__head--static">
      <span class="badge">${icon(faUser)}</span>
      <h2 class="card__title">Profile</h2>
    </header>
    <div class="card__body">
      <div class="profile">
        <div class="profile__photo">
          ${
            photo
              ? html`<img
                  src=${`/${photo.src}`}
                  alt=""
                  @error=${(e: Event) =>
                    ((e.target as HTMLImageElement).style.visibility = 'hidden')}
                  @load=${(e: Event) =>
                    ((e.target as HTMLImageElement).style.visibility = 'visible')}
                />`
              : html`<span class="profile__no-photo">${icon(faUser)}</span>`
          }
        </div>
        <div class="profile__fields">
          ${textField(store, ['header', 'name'], header.name, {
            label: 'Full name',
            placeholder: 'e.g. Jane Doe',
          })}
          ${textField(store, ['header', 'headline'], header.headline, {
            label: 'Headline',
            optional: true,
            placeholder: 'e.g. Senior Software Engineer',
            hint: 'Shown under the name (all templates except Modern Blue).',
          })}
        </div>
      </div>
      <div class="grid grid--2">
        <label class="field">
          <span class="field__label">Photo file<span class="field__optional">optional</span></span>
          <input
            class="control"
            .value=${live(photo?.src ?? '')}
            placeholder="profile.jpg"
            data-path="header.photo.src"
            @input=${setPhotoSrc}
          />
          <span class="field__hint">An image in the public/ folder. Empty = no photo.</span>
        </label>
        ${
          photo
            ? textField(store, ['header', 'photo', 'alt'], photo.alt, {
                label: 'Photo description',
                placeholder: 'Read by screen readers',
              })
            : nothing
        }
      </div>
      ${textField(store, ['header', 'summaryTitle'], header.summaryTitle, {
        label: 'Summary heading',
        optional: true,
        placeholder: 'e.g. Profile',
        hint: 'Not shown by Modern Blue.',
      })}
      ${textField(store, ['header', 'summary'], header.summary, {
        label: 'Summary',
        multiline: true,
        placeholder: 'Two or three sentences about you…',
        hint: `${header.summary.split(/\s+/).filter(Boolean).length} words`,
      })}
    </div>
  </section>`;
}

function contactRow(
  store: EditorStore,
  rowPath: Path,
  contact: Contact,
  index: number,
  count: number,
): TemplateResult {
  const path = [...rowPath, index];
  return html`<div
    class="contact-row"
    ${sortable(pathKey(rowPath), index, (from, to) =>
      store.change((cv) => move(cv, rowPath, from, to)),
    )}
  >
    ${dragHandle()}
    <label class="contact-type" title="Contact type">
      <span class="contact-type__icon">${contactIcon(contact.type)}</span>
      <select
        aria-label="Contact type"
        @change=${(e: Event) => store.set([...path, 'type'], (e.target as HTMLSelectElement).value)}
      >
        ${ContactTypeSchema.options.map(
          // `selected` per option: a `.value` on <select> would be set before its options exist.
          (type) =>
            html`<option value=${type} .selected=${live(type === contact.type)}>
              ${CONTACT_LABELS[type]}
            </option>`,
        )}
      </select>
    </label>
    ${textField(store, [...path, 'label'], contact.label, {
      placeholder: 'Shown text',
      className: 'contact-row__label',
    })}
    ${textField(store, [...path, 'href'], contact.href, {
      optional: true,
      placeholder: LINK_PLACEHOLDERS[contact.type],
      className: 'contact-row__href',
    })}
    ${itemActions(store, rowPath, index, count, 'contact')}
  </div>`;
}

export function contactsCard(store: EditorStore): TemplateResult {
  const rows = store.cv.header.contactRows;
  return html`<section class="card" id="card-contacts">
    <header class="card__head card__head--static">
      <span class="badge">${icon(faAddressCard)}</span>
      <h2 class="card__title">Contact</h2>
    </header>
    <div class="card__body">
      <p class="group__hint">
        Each line is a row of contacts in the header. Link is optional (e.g. mailto:, tel:,
        https://).
      </p>
      ${repeat(
        rows,
        (row) => keyOf(row),
        (row, r) => {
          const rowPath = ['header', 'contactRows', r];
          return html`<div class="contact-line">
            <div class="contact-line__head">
              <span class="contact-line__title">Line ${r + 1}</span>
              ${
                rows.length > 1
                  ? html`<button
                      type="button"
                      class="link-btn"
                      @click=${() => {
                        store.change((cv) => removeAt(cv, ['header', 'contactRows'], r));
                        store.showToast(`Deleted line ${r + 1}`, true);
                      }}
                    >
                      Remove line
                    </button>`
                  : nothing
              }
            </div>
            ${repeat(
              row,
              (contact) => keyOf(contact),
              (contact, i) => contactRow(store, rowPath, contact, i, row.length),
            )}
            <div class="add-row">
              ${addButton('Add contact', () => {
                store.pendingFocus = pathKey([...rowPath, row.length, 'label']);
                store.change((cv) =>
                  insertAt(cv, rowPath, row.length, { type: 'website', label: '' }),
                );
              })}
            </div>
          </div>`;
        },
      )}
      <div class="add-row">
        ${addButton('Add line', () =>
          store.change((cv) =>
            setIn(cv, ['header', 'contactRows'], [...cv.header.contactRows, []]),
          ),
        )}
      </div>
    </div>
  </section>`;
}

export function documentCard(store: EditorStore): TemplateResult {
  const { meta } = store.cv;
  return html`<section class="card" id="card-document">
    <header class="card__head card__head--static">
      <span class="badge">${icon(faFileLines)}</span>
      <h2 class="card__title">Document</h2>
    </header>
    <div class="card__body grid grid--2">
      ${textField(store, ['meta', 'documentTitle'], meta.documentTitle, {
        label: 'Document title',
        hint: 'Browser tab title and PDF file name.',
      })}
      <label class="field">
        <span class="field__label">Language code</span>
        <input class="control" .value=${meta.lang} readonly />
        <span class="field__hint">Fixed by the file name (cv.${meta.lang}.json).</span>
      </label>
    </div>
  </section>`;
}
