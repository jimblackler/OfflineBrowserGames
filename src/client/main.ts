import {assertNotNull} from '../common/check/null';
import {getStore, getValue, setValue} from './database';
import {createGameController} from './gameController';
import {type GameRules, type GameState, newGame} from './gameState';
import {restore, store} from './gameStore';
import {setupPreferences} from './preferences';
import type {Renderer} from './renderer';
import {createRendererDom} from './rendererDom';
import {createThreeRenderer} from './rendererThree';

let gameState: GameState;
async function init() {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker');
  });

  const gameDiv = document.getElementById('gameDiv');
  if (!gameDiv) {
    throw new Error('gameDiv not found');
  }
  const menu = assertNotNull(document.getElementById('menu'));
  const gears = assertNotNull(document.getElementById('gears'));

  let renderer: Renderer;
  const threePreferencesItem = assertNotNull(document.getElementById('threePreferencesItem'));

  if (new URLSearchParams(window.location.search).has('three')) {
    threePreferencesItem.style.display = 'block';
    const threeRenderer = await createThreeRenderer(gameDiv);
    await setupPreferences(threeRenderer, menu, threePreferencesItem);
    renderer = threeRenderer;

  } else {
    threePreferencesItem.style.display = 'none';
    renderer = createRendererDom(gameDiv);
  }
  const controller = createGameController(renderer);
  renderer.setDragHandler(controller);

  async function redraw() {
    const sessionStore = await getStore('session', 'readonly');
    const rules = await getValue<GameRules>(sessionStore, 'rules');
    if (!rules) {
      throw new Error('No rules found in database');
    }
    const seed = await getValue<number>(sessionStore, 'seed');
    if (seed === undefined) {
      throw new Error('No seed found in database');
    }
    gameState = newGame(rules, seed);
    controller.setGameState(gameState);
    controller.render();
    controller.draw();
    await store(gameState);
    controller.render();
  }

  async function startNewGame(rules: GameRules) {
    const sessionStore = await getStore('session', 'readwrite');
    await setValue(sessionStore, 'gamePosition', 0);
    await setValue(sessionStore, 'seed', Math.floor(Math.random() * 100000));
    await setValue(sessionStore, 'rules', rules);
    await redraw();
  }

  document.oncontextmenu = () => false;

  const restored = await restore();
  if (restored) {
    gameState = restored;
    controller.setGameState(gameState);
    controller.render(); // Render twice to not animate everything (only draw).
    controller.render();
  } else {
    await startNewGame({cardsToDraw: 3});
  }

  async function canUndo() {
    const sessionStore = await getStore('session', 'readonly');
    const gamePosition = await getValue<number>(sessionStore, 'gamePosition');
    if (gamePosition === undefined || gamePosition <= 1) {
      return false;
    }
    const historyStore = await getStore('history', 'readonly');
    return await getValue<GameState>(historyStore, gamePosition - 1) !== undefined;
  }

  async function undo() {
    if (await canUndo()) {
      const sessionStore = await getStore('session', 'readwrite');
      let gamePosition = await getValue<number>(sessionStore, 'gamePosition') ?? 0;
      gamePosition--;
      await setValue(sessionStore, 'gamePosition', gamePosition);
      const restoredState = await restore();
      if (restoredState) {
        gameState = restoredState;
        controller.setGameState(gameState);
      }
      controller.render();
    }
  }

  let menuFocused = false;

  gears.onmouseover = async () => {
    if (menu.className !== 'visible') {
      const undoItem = assertNotNull(document.getElementById('undoItem'));
      undoItem.style.display = await canUndo() ? 'block' : 'none';
      menu.className = 'visible';
      menuFocused = false;
    }
  };

  const newGame3 = assertNotNull(document.getElementById('newGame3'));
  newGame3.onclick = async () => {
    await startNewGame({cardsToDraw: 3});
    menu.className = '';
  };

  const newGame1 = assertNotNull(document.getElementById('newGame1'));
  newGame1.onclick = async () => {
    await startNewGame({cardsToDraw: 1});
    menu.className = '';
  };

  const redrawItem = assertNotNull(document.getElementById('redrawItem'));
  redrawItem.onclick = async () => {
    await redraw();
    menu.className = '';
  };

  const undoItem = assertNotNull(document.getElementById('undoItem'));
  undoItem.onclick = async () => {
    await undo();
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
