import {assertNotNull} from '../common/check/null';
import {defaultPreferences, type ThreePreferences, type ThreeRenderer} from './rendererThree';

function getElement<T extends HTMLElement>(id: string, type: new () => T) {
  const element = assertNotNull(document.getElementById(id));
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
  let preferences = defaultPreferences;
  if (loadedPreferencesStr) {
    try {
      const parsed = JSON.parse(loadedPreferencesStr) as unknown;
      if (isObject(parsed)) {
        preferences = {
          cameraX: getNumber(parsed, 'cameraX', defaultPreferences.cameraX),
          cameraY: getNumber(parsed, 'cameraY', defaultPreferences.cameraY),
          cameraZ: getNumber(parsed, 'cameraZ', defaultPreferences.cameraZ),
          lookAtX: getNumber(parsed, 'lookAtX', defaultPreferences.lookAtX),
          lookAtY: getNumber(parsed, 'lookAtY', defaultPreferences.lookAtY),
          lookAtZ: getNumber(parsed, 'lookAtZ', defaultPreferences.lookAtZ)
        };
      }
    } catch {
      // Ignore parsing errors.
    }
  }
  return preferences;
}

export function setupPreferences(
  threeRenderer: ThreeRenderer,
  menu: HTMLElement,
  threePreferencesItem: HTMLElement
) {
  const preferences = loadPreferences();
  threeRenderer.receivePreferences(preferences);

  const dialog = getElement('preferencesDialog', HTMLDialogElement);
  const closeButton = getElement('closePreferences', HTMLButtonElement);

  const keys = ['cameraX', 'cameraY', 'cameraZ', 'lookAtX', 'lookAtY', 'lookAtZ'] as const;

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

      const newPreferences = {
        cameraX: getSliderValue('cameraX'),
        cameraY: getSliderValue('cameraY'),
        cameraZ: getSliderValue('cameraZ'),
        lookAtX: getSliderValue('lookAtX'),
        lookAtY: getSliderValue('lookAtY'),
        lookAtZ: getSliderValue('lookAtZ')
      };

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
