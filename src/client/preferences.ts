import {assertDefined} from '../common/check/defined';
import {getStore, getValue, setValue} from './database';
import {defaultPreferences, type ThreePreferences, type ThreeRenderer} from './rendererThree';

const keys = Object.keys(defaultPreferences).filter(
    (key): key is keyof ThreePreferences => key in defaultPreferences);

async function loadPreferences() {
  const preferenceStore = await getStore('preferences', 'readonly');
  const loadedPreferences = await getValue<ThreePreferences>(preferenceStore, 'threePreferences');
  const preferences = { ...defaultPreferences };
  if (loadedPreferences) {
    for (const key of keys) {
      const val = loadedPreferences[key];
      preferences[key] = typeof val === 'number' ? val : defaultPreferences[key];
    }
  }
  return preferences;
}

export async function setupPreferences(
    threeRenderer: ThreeRenderer, menu: HTMLElement, threePreferencesItem: HTMLElement) {
  const preferences = await loadPreferences();
  threeRenderer.receivePreferences(preferences);

  threePreferencesItem.onclick = () => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('id', 'preferencesDialog');
    document.body.append(dialog);

    const dialogTitle = document.createElement('h2');
    dialog.append(dialogTitle);
    dialogTitle.append('3D Renderer Preferences');

    const slidersContainer = document.createElement('div');
    dialog.append(slidersContainer);
    slidersContainer.setAttribute('class', 'sliders-grid');

    const inputs: { [key: string]: HTMLInputElement } = {};
    const valueSpans: { [key: string]: HTMLElement } = {};

    for (const key of keys) {
      const group = document.createElement('div');
      slidersContainer.append(group);
      group.setAttribute('class', 'slider-group');

      const labelContainer = document.createElement('div');
      group.append(labelContainer);
      labelContainer.setAttribute('class', 'slider-label-container');

      const labelSpan = document.createElement('span');
      labelContainer.append(labelSpan);
      labelSpan.setAttribute('class', 'slider-label');
      labelSpan.append(key);

      const valSpan = document.createElement('span');
      labelContainer.append(valSpan);
      valSpan.setAttribute('id', `${key}Val`);
      valSpan.setAttribute('class', 'slider-value');
      valSpan.append(String(preferences[key]));
      valueSpans[key] = valSpan;

      const input = document.createElement('input');
      group.append(input);
      input.setAttribute('type', 'range');
      input.setAttribute('id', key);
      input.setAttribute('min', '-1000');
      input.setAttribute('max', '1000');
      input.setAttribute('step', '10');
      input.setAttribute('value', String(preferences[key]));
      input.setAttribute('class', 'slider-input');
      inputs[key] = input;
    }

    const buttonsContainer = document.createElement('div');
    dialog.append(buttonsContainer);
    buttonsContainer.setAttribute('class', 'dialog-buttons');

    const closeButton = document.createElement('button');
    buttonsContainer.append(closeButton);
    closeButton.setAttribute('id', 'closePreferences');
    closeButton.append('Done');

    for (const key of keys) {
      const slider = assertDefined(inputs[key]);
      slider.oninput = async () => {
        assertDefined(valueSpans[key]).textContent = slider.value;

        for (const preferenceKey of keys) {
          preferences[preferenceKey] = assertDefined(inputs[preferenceKey]).valueAsNumber;
        }

        threeRenderer.receivePreferences(preferences);
        await setValue(
            await getStore('preferences', 'readwrite'), 'threePreferences', preferences);
      };
    }

    closeButton.onclick = () => {
      dialog.close();
    };

    dialog.onclose = () => {
      dialog.remove();
    };

    dialog.showModal();
    menu.className = '';
  };
}
