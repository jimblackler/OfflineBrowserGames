import {assertNotNull} from '../common/check/null';
import {defaultPreferences, type ThreePreferences, type ThreeRenderer} from './rendererThree';

const keys = Object.keys(defaultPreferences) as (keyof ThreePreferences)[];

function getElement<T extends HTMLElement>(id: string, type: new () => T) {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`${id} is not an instance of ${type.name}`);
  }
  return element;
}

function getNumber(o: {[key: string]: unknown}, key: string, fallback: number) {
  const {[key]: val} = o;
  return typeof val === 'number' ? val : fallback;
}

function isObject(val: unknown): val is {[key: string]: unknown} {
  return typeof val === 'object' && val !== null;
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

  const dialog = getElement('preferencesDialog', HTMLDialogElement);
  const closeButton = getElement('closePreferences', HTMLButtonElement);

  function getSliderValue(id: string) {
    return getElement(id, HTMLInputElement).valueAsNumber;
  }

  for (const key of keys) {
    const slider = getElement(key, HTMLInputElement);
    const valueSpan = assertNotNull(document.getElementById(`${key}Val`));
    slider.value = String(preferences[key]);
    valueSpan.textContent = String(preferences[key]);

    slider.oninput = () => {
      valueSpan.textContent = slider.value;

      const newPreferences = { ...defaultPreferences };
      for (const k of keys) {
        newPreferences[k] = getSliderValue(k);
      }

      threeRenderer.receivePreferences(newPreferences);
      localStorage.setItem('threePreferences', JSON.stringify(newPreferences));
    };
  }

  threePreferencesItem.onclick = () => {
    const currentPreferences = loadPreferences();
    for (const key of keys) {
      const slider = getElement(key, HTMLInputElement);
      const valueSpan = assertNotNull(document.getElementById(`${key}Val`));
      slider.value = String(currentPreferences[key]);
      valueSpan.textContent = String(currentPreferences[key]);
    }
    dialog.showModal();
    menu.className = '';
  };

  closeButton.onclick = () => {
    dialog.close();
  };
}
