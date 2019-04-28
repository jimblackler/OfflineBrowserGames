/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

import {GameController} from "../commonScripts/gameController.js";
import {GameState} from "../commonScripts/gameState.js";
import {GameStore} from "../commonScripts/gameStore.js";
import {Renderer} from "./renderer.js";
import {MOVE_TYPE} from "../commonScripts/gameState.js";

const renderer = new Renderer(document.getElementById("gameDiv"));
const controller = new GameController(renderer);

window.redraw = () => {
  const gameState = new GameState();
  gameState.newGame(JSON.parse(localStorage["rules"]));
  controller.render(gameState); // Render twice to not animate everything (only draw).
  gameState.execute({
        moveType: MOVE_TYPE.DRAW,
      });
  // Initial draw.
  GameStore.store(gameState);
  controller.render(gameState);
};


window.newGame = rules => {
  localStorage["gamePosition"] = 0;
  localStorage["version"] = 2;
  localStorage["seed"] = Math.floor(Math.random() * 100000);
  localStorage["rules"] = JSON.stringify(rules);
  window.redraw();
};

document.oncontextmenu = () => {
  return false;
};

const gameState = new GameState();
let initializedOK = false;
try {
  if ("gamePosition" in localStorage &&
      gameState.restore(JSON.parse(localStorage["gamePosition" + localStorage["gamePosition"]]))) {
    controller.render(gameState); // Render twice to not animate everything (only draw).
    controller.render(gameState);
    initializedOK = true;
  }
} catch(err) {
  console.log(err);
}

if (!initializedOK) {
  window.newGame({"cardsToDraw":3});
}

function canUndo() {
  return localStorage["gamePosition"] > 1 &&
      localStorage["gamePosition" + (localStorage["gamePosition"] - 1)];
}

window.undo = function() {
  if (canUndo()) {
    localStorage["gamePosition"]--;
    const gameState = new GameState();
    gameState.restore(JSON.parse(localStorage["gamePosition" + localStorage["gamePosition"]]));
    controller.render(gameState);
  }
};

window.autoPlay = () => {
  controller.autoPlay(gameState);
};

let menuFocused = false;

const menu = document.getElementById('menu');
const gears = document.getElementById('gears');
gears.onmouseover = () => {
  if (menu.className !== "visible") {
    const undoItem = document.getElementById('undoItem');
    if (canUndo()) {
      undoItem.style.display = "block";
    } else {
      undoItem.style.display = "none";
    }

    menu.className = "visible";
    menuFocused = false;
  }
};

document.addEventListener("mouseover", evt => {
  let element = evt.target;
  while (element && element !== document.body) {
    if (element === menu || element === gears) {
      menuFocused = true;
      return;
    }
    element = element.parentNode;
  }
  if (menuFocused) {
    menu.className = "";
  }

}, false);

document.addEventListener("keypress", evt => {
  if (evt.ctrlKey && evt.which === 26) {
    window.undo();
  }
}, false);
