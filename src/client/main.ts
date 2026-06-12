import {GameController} from './gameController';
import {type GameRules, GameState} from './gameState';
import {GameStore} from './gameStore';
import {Renderer} from './renderer';

declare global {
  interface Window {
    redraw(): void;
    newGame(rules: GameRules): void;
    undo(): void;
    autoPlay(): void;
  }
}

const gameState = new GameState();
const gameDiv = document.getElementById('gameDiv');
if (!gameDiv) {
  throw new Error('gameDiv not found');
}
const renderer = new Renderer(gameDiv);
const controller = new GameController(renderer, gameState);
renderer.setDragHandler(controller);

window.redraw = () => {
  const rulesStr = localStorage.getItem('rules');
  if (rulesStr) {
    gameState.newGame(JSON.parse(rulesStr) as GameRules);
  }
  controller.render();
  controller.draw();
  GameStore.store(gameState);
  controller.render();
};

window.newGame = rules => {
  localStorage.setItem('gamePosition', '0');
  localStorage.setItem('version', '2');
  localStorage.setItem('seed', String(Math.floor(Math.random() * 100000)));
  localStorage.setItem('rules', JSON.stringify(rules));
  window.redraw();
};

document.oncontextmenu = () => false;

if (GameStore.restore(gameState)) {
  controller.render(); // Render twice to not animate everything (only draw).
  controller.render();
} else {
  window.newGame({cardsToDraw: 3});
}

function canUndo() {
  const gamePositionStr = localStorage.getItem('gamePosition');
  const gamePosition = gamePositionStr ? parseInt(gamePositionStr, 10) : 0;
  return gamePosition > 1 &&
      localStorage.getItem(`gamePosition${gamePosition - 1}`) !== null;
}

window.undo = () => {
  if (canUndo()) {
    const gamePositionStr = localStorage.getItem('gamePosition');
    let gamePosition = gamePositionStr ? parseInt(gamePositionStr, 10) : 0;
    gamePosition--;
    localStorage.setItem('gamePosition', String(gamePosition));
    GameStore.restore(gameState);
    controller.render();
  }
};

window.autoPlay = () => {
  controller.autoPlay();
};

let menuFocused = false;

const menu = document.getElementById('menu');
const gears = document.getElementById('gears');

if (gears && menu) {
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
}

document.addEventListener('mouseover', evt => {
  let element = evt.target instanceof HTMLElement ? evt.target : null;
  while (element && element !== document.body) {
    if (element === menu || element === gears) {
      menuFocused = true;
      return;
    }
    element = element.parentNode instanceof HTMLElement ? element.parentNode : null;
  }
  if (menuFocused && menu) {
    menu.className = '';
  }

}, false);

document.addEventListener('keypress', evt => {
  if (evt.ctrlKey && (evt.key === 'z' || evt.key === 'Z')) {
    window.undo();
  }
}, false);
