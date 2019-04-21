/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

import {GameController} from "../../commonScripts/gameController.js";
import {GameState} from "../../commonScripts/gameState.js";
import {V2Renderer} from './v2Renderer.js';

const renderer = new V2Renderer(document.getElementById("gameDiv"));
renderer.init().then(() => {
  const controller = new GameController(renderer);
  const gameState = new GameState();
  if (gameState.restore(JSON.parse(localStorage["gamePosition" + localStorage["gamePosition"]]))) {
    controller.render(gameState); // Render twice to not animate everything (only draw).
    controller.render(gameState);
  } else {
    window.newGame({"cardsToDraw": 3});
  }

});


