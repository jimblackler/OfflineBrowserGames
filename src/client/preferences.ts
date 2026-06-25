import {assertDefined} from '../common/check/defined';
import {defaultPreferences, type ThreePreferences, type ThreeRenderer} from './rendererThree';

function isPreference(key: string): key is keyof ThreePreferences {
  return key in defaultPreferences;
}

const keys = Object.keys(defaultPreferences).filter(isPreference);

const preferencesKeys = keys.map(key => {
  let min = -1000;
  let max = 1000;
  let step = 10;
  if (key.endsWith('X')) {
    min = -1000;
    max = 2000;
  } else if (key.endsWith('Y')) {
    min = -2000;
    max = 1000;
  } else if (key.endsWith('Z')) {
    if (key.startsWith('camera')) {
      min = 100;
      max = 2000;
    } else {
      min = -500;
      max = 500;
      step = 5;
    }
  }
  return {key, label: key, min, max, step};
});

function isObject(val: unknown): val is {[key: string]: unknown} {
  return typeof val === 'object' && val !== null;
}

function getNumber(o: {[key: string]: unknown}, key: string, fallback: number) {
  const {[key]: val} = o;
  return typeof val === 'number' ? val : fallback;
}

function loadPreferences(): ThreePreferences {
  const loadedPreferencesStr = localStorage.getItem('threePreferences');
  const preferences = { ...defaultPreferences };
  if (loadedPreferencesStr) {
    try {
      const parsed: unknown = JSON.parse(loadedPreferencesStr);
      if (isObject(parsed)) {
        for (const key of keys) {
          preferences[key] = getNumber(parsed, key, defaultPreferences[key]);
        }
      }
    } catch {
      // Ignore parsing errors.
    }
  }
  return preferences;
}

export function setupPreferences(
    threeRenderer: ThreeRenderer, menu: HTMLElement, threePreferencesItem: HTMLElement) {
  const preferences = loadPreferences();
  threeRenderer.receivePreferences(preferences);

  const dialog = document.createElement('dialog');
  dialog.setAttribute('id', 'preferencesDialog');
  document.body.append(dialog);

  const dialogTitle = document.createElement('h2');
  dialog.append(dialogTitle);
  dialogTitle.append('3D Renderer Preferences');

  const slidersContainer = document.createElement('div');
  dialog.append(slidersContainer);
  slidersContainer.setAttribute('class', 'sliders-grid');

  const inputs: {[key: string]: HTMLInputElement} = {};
  const valueSpans: {[key: string]: HTMLElement} = {};

  for (const preference of preferencesKeys) {
    const group = document.createElement('div');
    slidersContainer.append(group);
    group.setAttribute('class', 'slider-group');

    const labelContainer = document.createElement('div');
    group.append(labelContainer);
    labelContainer.setAttribute('class', 'slider-label-container');

    const labelSpan = document.createElement('span');
    labelContainer.append(labelSpan);
    labelSpan.setAttribute('class', 'slider-label');
    labelSpan.append(preference.label);

    const valSpan = document.createElement('span');
    labelContainer.append(valSpan);
    valSpan.setAttribute('id', `${preference.key}Val`);
    valSpan.setAttribute('class', 'slider-value');
    valSpan.append(String(preferences[preference.key]));
    valueSpans[preference.key] = valSpan;

    const input = document.createElement('input');
    group.append(input);
    input.setAttribute('type', 'range');
    input.setAttribute('id', preference.key);
    input.setAttribute('min', String(preference.min));
    input.setAttribute('max', String(preference.max));
    input.setAttribute('step', String(preference.step));
    input.setAttribute('value', String(preferences[preference.key]));
    input.setAttribute('class', 'slider-input');
    inputs[preference.key] = input;
  }

  const buttonsContainer = document.createElement('div');
  dialog.append(buttonsContainer);
  buttonsContainer.setAttribute('class', 'dialog-buttons');

  const closeButton = document.createElement('button');
  buttonsContainer.append(closeButton);
  closeButton.setAttribute('id', 'closePreferences');
  closeButton.append('Done');

  function getSliderValue(key: keyof ThreePreferences) {
    return assertDefined(inputs[key]).valueAsNumber;
  }

  for (const preference of preferencesKeys) {
    const {[preference.key]: slider} = inputs;
    assertDefined(slider).oninput = () => {
      assertDefined(valueSpans[preference.key]).textContent = assertDefined(slider).value;

      const newPreferences = { ...defaultPreferences };
      for (const key of keys) {
        newPreferences[key] = getSliderValue(key);
      }

      threeRenderer.receivePreferences(newPreferences);
      localStorage.setItem('threePreferences', JSON.stringify(newPreferences));
    };
  }

  closeButton.onclick = () => {
    dialog.close();
  };

  threePreferencesItem.onclick = () => {
    const currentPreferences = loadPreferences();
    for (const key of keys) {
      assertDefined(inputs[key]).value = String(currentPreferences[key]);
      assertDefined(valueSpans[key]).textContent = String(currentPreferences[key]);
    }
    dialog.showModal();
    menu.className = '';
  };
}
