import {assertNotNull} from '../common/check/null';
import {createGameController} from './gameController';
import {type GameRules, type GameState, newGame} from './gameState';
import {restore, store} from './gameStore';
import {createRenderer} from './renderer';

let gameState: GameState;
const gameDiv = document.getElementById('gameDiv');
if (!gameDiv) {
  throw new Error('gameDiv not found');
}
const renderer = createRenderer(gameDiv);
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
    const restored = restore();
    if (restored) {
      gameState = restored;
      controller.setGameState(gameState);
    }
    controller.render();
  }
}

let menuFocused = false;

const menu = assertNotNull(document.getElementById('menu'));
const gears = assertNotNull(document.getElementById('gears'));

gears.onmouseover = () => {
  if (menu.className !== 'visible') {
    const undoItem = document.getElementById('undoItem');
    if (undoItem) {
      if (canUndo()) {
        undoItem.style.display = 'block';
      } else {
        undoItem.style.display = 'none';
      }
    }

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
