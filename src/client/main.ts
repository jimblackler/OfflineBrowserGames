import {assertNotNull} from '../common/check/null';
import {createGameController} from './gameController';
import {type GameRules, type GameState, newGame} from './gameState';
import {restore, store} from './gameStore';
import type {Renderer} from './renderer';
import {createRendererDom} from './rendererDom';
import {createThreeRenderer, defaultPreferences} from './rendererThree';

let gameState: GameState;
async function init() {
  const gameDiv = document.getElementById('gameDiv');
  if (!gameDiv) {
    throw new Error('gameDiv not found');
  }
  const menu = assertNotNull(document.getElementById('menu'));
  const gears = assertNotNull(document.getElementById('gears'));

  const urlParams = new URLSearchParams(window.location.search);
  let renderer: Renderer;
  const threePreferencesItem = assertNotNull(document.getElementById('threePreferencesItem'));

  if (urlParams.has('three')) {
    threePreferencesItem.style.display = 'block';

    function getElement<T extends HTMLElement>(id: string, type: new () => T): T {
      const element = assertNotNull(document.getElementById(id));
      if (!(element instanceof type)) {
        throw new Error(`${id} is not an instance of ${type.name}`);
      }
      return element;
    }

    function getNumber(o: {[key: string]: unknown}, key: string, fallback: number): number {
      const {[key]: val} = o;
      return typeof val === 'number' ? val : fallback;
    }

    const loadedPreferencesStr = localStorage.getItem('threePreferences');
    let preferences = defaultPreferences;
    if (loadedPreferencesStr) {
      try {
        const parsed = JSON.parse(loadedPreferencesStr) as unknown;
        if (parsed && typeof parsed === 'object') {
          const o = parsed as unknown as {[key: string]: number};
          preferences = {
            cameraX: getNumber(o, 'cameraX', defaultPreferences.cameraX),
            cameraY: getNumber(o, 'cameraY', defaultPreferences.cameraY),
            cameraZ: getNumber(o, 'cameraZ', defaultPreferences.cameraZ),
            lookAtX: getNumber(o, 'lookAtX', defaultPreferences.lookAtX),
            lookAtY: getNumber(o, 'lookAtY', defaultPreferences.lookAtY),
            lookAtZ: getNumber(o, 'lookAtZ', defaultPreferences.lookAtZ)
          };
        }
      } catch {
        // Ignore parsing errors.
      }
    }
    const threeRenderer = await createThreeRenderer(gameDiv);
    threeRenderer.receivePreferences(preferences);
    renderer = threeRenderer;

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
      const currentPreferencesStr = localStorage.getItem('threePreferences');
      if (currentPreferencesStr) {
        try {
          const parsed = JSON.parse(currentPreferencesStr) as unknown;
          if (parsed && typeof parsed === 'object') {
            const o = parsed as unknown as {[key: string]: unknown};
            const currentPreferences = {
              cameraX: getNumber(o, 'cameraX', defaultPreferences.cameraX),
              cameraY: getNumber(o, 'cameraY', defaultPreferences.cameraY),
              cameraZ: getNumber(o, 'cameraZ', defaultPreferences.cameraZ),
              lookAtX: getNumber(o, 'lookAtX', defaultPreferences.lookAtX),
              lookAtY: getNumber(o, 'lookAtY', defaultPreferences.lookAtY),
              lookAtZ: getNumber(o, 'lookAtZ', defaultPreferences.lookAtZ)
            };
            for (const key of keys) {
              const slider = getElement(key, HTMLInputElement);
              const valueSpan = assertNotNull(document.getElementById(`${key}Val`));
              slider.value = String(currentPreferences[key]);
              valueSpan.textContent = String(currentPreferences[key]);
            }
          }
        } catch {
          // Ignore parsing errors.
        }
      }
      dialog.showModal();
      menu.className = '';
    };

    closeButton.onclick = () => {
      dialog.close();
    };

  } else {
    threePreferencesItem.style.display = 'none';
    renderer = createRendererDom(gameDiv);
  }
  const controller = createGameController(renderer);
  renderer.setDragHandler(controller);

  function redraw() {
    const rulesStr = localStorage.getItem('rules');
    if (!rulesStr) {
      throw new Error('No rules found in localStorage');
    }
    gameState = newGame(JSON.parse(rulesStr) as GameRules);
    controller.setGameState(gameState);
    controller.render();
    controller.draw();
    store(gameState);
    controller.render();
  }

  function startNewGame(rules: GameRules) {
    localStorage.setItem('gamePosition', '0');
    localStorage.setItem('version', '3');
    localStorage.setItem('seed', String(Math.floor(Math.random() * 100000)));
    localStorage.setItem('rules', JSON.stringify(rules));
    redraw();
  }

  document.oncontextmenu = () => false;

  const restored = restore();
  if (restored) {
    gameState = restored;
    controller.setGameState(gameState);
    controller.render(); // Render twice to not animate everything (only draw).
    controller.render();
  } else {
    startNewGame({cardsToDraw: 3});
  }

  function canUndo() {
    const gamePositionStr = localStorage.getItem('gamePosition');
    const gamePosition = Number(gamePositionStr);
    return gamePosition > 1 && localStorage.getItem(`gamePosition${gamePosition - 1}`) !== null;
  }

  function undo() {
    if (canUndo()) {
      const gamePositionStr = localStorage.getItem('gamePosition');
      let gamePosition = gamePositionStr ? parseInt(gamePositionStr, 10) : 0;
      gamePosition--;
      localStorage.setItem('gamePosition', String(gamePosition));
      const restoredState = restore();
      if (restoredState) {
        gameState = restoredState;
        controller.setGameState(gameState);
      }
      controller.render();
    }
  }

  let menuFocused = false;

  gears.onmouseover = () => {
    if (menu.className !== 'visible') {
      const undoItem = assertNotNull(document.getElementById('undoItem'));
      undoItem.style.display = canUndo() ? 'block' : 'none';
      menu.className = 'visible';
      menuFocused = false;
    }
  };

  const newGame3 = assertNotNull(document.getElementById('newGame3'));
  newGame3.onclick = () => {
    startNewGame({cardsToDraw: 3});
    menu.className = '';
  };

  const newGame1 = assertNotNull(document.getElementById('newGame1'));
  newGame1.onclick = () => {
    startNewGame({cardsToDraw: 1});
    menu.className = '';
  };

  const redrawItem = assertNotNull(document.getElementById('redrawItem'));
  redrawItem.onclick = () => {
    redraw();
    menu.className = '';
  };

  const undoItem = assertNotNull(document.getElementById('undoItem'));
  undoItem.onclick = () => {
    undo();
    menu.className = '';
  };

  document.addEventListener('mouseover', evt => {
    let element = evt.target instanceof HTMLElement ? evt.target : null;
    while (element && element !== document.body) {
      if (element === menu || element === gears) {
        menuFocused = true;
        return;
      }
      element = element.parentNode instanceof HTMLElement ? element.parentNode : null;
    }
    if (menuFocused) {
      menu.className = '';
    }

  }, false);

  document.addEventListener('keypress', evt => {
    if (evt.ctrlKey && (evt.key === 'z' || evt.key === 'Z')) {
      undo();
    }
  }, false);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
init();
