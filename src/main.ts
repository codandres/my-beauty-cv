import './styles/main.scss';
import rawSettings from '../data/settings.json';
import { LANGUAGES } from './content/load';
import { renderRoot } from './render';
import { startEmbeddedPreview } from './render/embed';
import { parseSettings } from './schema/settings.schema';
import { toTemplateId } from './templates/catalog';

const params = new URLSearchParams(location.search);

if (params.has('embed')) {
  // Live preview inside the editor (editor.html): data arrives by postMessage.
  startEmbeddedPreview(window);
} else {
  // data/settings.json picks the template and language. `?template=<id>` and `?lang=<code>`
  // override it for previewing, without editing any file.
  await renderRoot(document, () => {
    const settings = parseSettings(rawSettings, LANGUAGES);
    const template = params.get('template');
    return {
      template: template === null ? settings.template : toTemplateId(template),
      language: params.get('lang') ?? settings.language,
    };
  });
}
