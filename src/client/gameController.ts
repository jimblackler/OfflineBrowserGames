import {assertDefined} from '../common/check/defined';
import {type Action, execute, getActions, getStack, type GameState} from './gameState';
import {store, erase} from './gameStore';
import {toT, tInRange} from './mathUtils';
import type {Renderer} from './renderer';
import {NUMBER_CARDS, NUMBER_FOUNDATIONS, NUMBER_TABLEAUS} from './rules';

const STOCK_X = 42;
const STOCK_Y = 42;
const TABLEAU_X = STOCK_X;
const TABLEAU_Y = 210;
const TABLEAU_X_SPACING = 115;
const TABLEAU_Y_SPACING_FACE_DOWN = 25;
const TABLEAU_Y_SPACING_FACE_UP = 25;
const FOUNDATION_X = 386;
const FOUNDATION_X_SPACING = 115;
const FOUNDATION_Y = STOCK_Y;
const WASTE_X = 196;
const WASTE_X_SPACING = 22;
const WASTE_Y = STOCK_Y;
const RAISE_DURATION = 80;
const RAISE_HEIGHT = 8;
const ANIMATION_TIME = 400;
const ANIMATION_DISTANCE_MAX = 800;
const ANIMATION_TIME_SUPPLEMENT = 125;
const WASTE_DRAW_STAGGER = 20;
const ANIMATION_TEST_SLOWDOWN = 1;
const FLY_HEIGHT = 30;
const FLY_DISTANCE_MAX = 800;

type Curve = {
  startTime: number;
  endTime: number;
  start: [number, number, number];
  endX: number;
  endY: number;
  flyHeight: number;
  draggable: boolean;
  destinationUndercard?: number;
};

export function createGameController(renderer: Renderer) {
  let gameState: GameState;
  const curves = new Map<number, Curve>();
  let lastCardMoved = -1;
  let cardHistory = new Map<string, number>();
  let raisingCards: number[] | undefined;
  let riseStarted = 0;

  function _placeCard(cardNumber: number, x: number, y: number, draggable: boolean, delay: number,
                      undercard: number | undefined) {
    const position = renderer.getCardPosition(cardNumber);
    if (position[0] === x && position[1] === y && position[2] === 0) {
      renderer.setDraggable(cardNumber, draggable);
      return;
    }

    const timeNow = new Date().getTime();
    renderer.setDraggable(cardNumber, false);

    const deltaX = position[0] - x;
    const deltaY = position[1] - y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const flyDistance = Math.min(distance, FLY_DISTANCE_MAX);
    const flyHeight = FLY_HEIGHT * flyDistance / FLY_DISTANCE_MAX;
    const animationDistance = Math.min(distance, ANIMATION_DISTANCE_MAX);

    const animationTime = ANIMATION_TEST_SLOWDOWN *
        (ANIMATION_TIME * animationDistance / ANIMATION_DISTANCE_MAX + ANIMATION_TIME_SUPPLEMENT);

    curves.set(cardNumber, {
      startTime: timeNow + delay,
      endTime: timeNow + animationTime + delay,
      start: position,
      endX: x,
      endY: y,
      flyHeight,
      draggable,
      destinationUndercard: undercard
    });
  }

  function render() {
    // Stop all animations immediately
    for (const [k, curve] of curves) {
      renderer.positionCard(k, curve.endX, curve.endY, 0);
      curves.delete(k);
    }

    raisingCards = undefined;

    // Position stock cards.
    let undercard: number | undefined;
    for (const cardNumber of gameState.stock) {
      renderer.setFaceUp(cardNumber, false);
      _placeCard(cardNumber, STOCK_X, STOCK_Y, false, 0, undercard);
      undercard = cardNumber;
    }

    // Position waste cards.
    const wasteCardsVisible = Math.min(gameState.rules.cardsToDraw, gameState.waste.length);
    undercard = undefined;
    for (const [idx, cardNumber] of gameState.waste.entries()) {
      renderer.setFaceUp(cardNumber, true);
      const staggerOrder = Math.max(idx - gameState.waste.length + gameState.rules.cardsToDraw, 0);
      const delay = staggerOrder * WASTE_DRAW_STAGGER * ANIMATION_TEST_SLOWDOWN;
      const position = Math.max(0, idx + wasteCardsVisible - gameState.waste.length);
      _placeCard(cardNumber, WASTE_X + WASTE_X_SPACING * position, WASTE_Y,
          idx === gameState.waste.length - 1, delay, undercard);
      undercard = cardNumber;
    }

    // Position foundation cards.
    gameState.foundations.forEach((foundation, foundationIdx) => {
      undercard = undefined;
      for (const cardNumber of foundation) {
        renderer.setFaceUp(cardNumber, true);
        _placeCard(cardNumber,
            FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y, true, 0, undercard);
        undercard = cardNumber;
      }
    });

    // Position tableau cards.
    gameState.tableausFaceDown.forEach((tableauFaceDown, tableauIdx) => {
      undercard = undefined;
      const tableauX = TABLEAU_X + TABLEAU_X_SPACING * tableauIdx;
      for (const [position, cardNumber] of tableauFaceDown.entries()) {
        _placeCard(cardNumber, tableauX,
            TABLEAU_Y + TABLEAU_Y_SPACING_FACE_DOWN * position, false, 0, undercard);
        renderer.setFaceUp(cardNumber, false);
        undercard = cardNumber;
      }

      const tableauFaceUp = assertDefined(gameState.tableausFaceUp[tableauIdx]);
      const faceDownOffset = TABLEAU_Y_SPACING_FACE_DOWN * tableauFaceDown.length;
      for (const [position, cardNumber] of tableauFaceUp.entries()) {
        renderer.setFaceUp(cardNumber, true);
        _placeCard(cardNumber, tableauX,
            TABLEAU_Y + faceDownOffset + TABLEAU_Y_SPACING_FACE_UP * position, true, 0, undercard);
        undercard = cardNumber;
      }
    });

    // Auto play
    if (gameState.stock.length === 0 && gameState.waste.length === 0) {
      const actionsFor = getActions(gameState);
      let anyFaceDown = false;
      for (let tableauIdx = 0; tableauIdx !== NUMBER_TABLEAUS; tableauIdx++) {
        const tableau = assertDefined(gameState.tableausFaceDown[tableauIdx]);
        if (tableau.length > 0) {
          anyFaceDown = true;
          break;
        }
      }
      if (!anyFaceDown) {
        window.setTimeout(() => {
          for (let tableauIdx = 0; tableauIdx !== NUMBER_TABLEAUS; tableauIdx++) {
            const tableau = assertDefined(gameState.tableausFaceUp[tableauIdx]);
            if (tableau.length <= 0) {
              continue;
            }
            const cardNumber = assertDefined(tableau.at(-1));
            const actions = actionsFor.get(cardNumber);
            if (!actions) {
              continue;
            }
            for (const action of actions) {
              if (action.moveType === 'toTableau') {
                continue;
              }
              execute(gameState, action);
              store(gameState);
              render();
              return;
            }
          }
          // All complete. If the user hits refresh, start a new game.
          erase();
        }, 400);
      }
    }
  }

  function draw() {
    execute(gameState, {
      moveType: 'draw'
    });
    store(gameState);
    render();
  }

  for (let idx = 0; idx !== NUMBER_CARDS; idx++) {
    renderer.setFaceUp(idx, false);
  }

  // Placeholder; stock
  renderer.placeHolder(STOCK_X, STOCK_Y, () => draw());

  // Placeholder; tableau
  for (let tableauIdx = 0; tableauIdx !== NUMBER_TABLEAUS; tableauIdx++) {
    renderer.placeHolder(TABLEAU_X + TABLEAU_X_SPACING * tableauIdx, TABLEAU_Y);
  }

  // Placeholder; foundation
  for (let foundationIdx = 0; foundationIdx !== NUMBER_FOUNDATIONS; foundationIdx++) {
    renderer.placeHolder(FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y);
  }

  function _animate() {
    requestAnimationFrame(() => _animate());
    const timeNow = new Date().getTime();
    for (const [k, curve] of curves) {
      if (timeNow < curve.startTime) {
        continue;
      }
      const t = toT(curve.startTime, curve.endTime, timeNow);
      if (t > 1) {
        renderer.positionCard(k, curve.endX, curve.endY, 0);
        renderer.setDraggable(k, curve.draggable);
        curves.delete(k);
      } else {
        const multiplier1 = Math.sin(t * Math.PI / 2);
        let z;

        if (curve.start[2] < curve.flyHeight) {
          const start = Math.PI - Math.asin(curve.start[2] / curve.flyHeight);
          const a = tInRange(start, 0, t);
          z = Math.sin(a) * curve.flyHeight;
        } else {
          z = curve.start[2] * (1 - t);
        }

        renderer.positionCard(k, tInRange(curve.start[0], curve.endX, multiplier1),
            tInRange(curve.start[1], curve.endY, multiplier1), z);
      }
    }
    if (raisingCards) {
      let t = (timeNow - riseStarted) / RAISE_DURATION;
      if (t > 1) {
        t = 1;
      }
      for (const cardNumber of raisingCards) {
        const position = renderer.getCardPosition(cardNumber);
        renderer.positionCard(cardNumber, position[0], position[1], RAISE_HEIGHT * t);
      }
      if (t === 1) {
        raisingCards = undefined;
      }
    }
  }

  requestAnimationFrame(() => _animate());

  return {
    draw,
    render,
    setGameState(newState: GameState) {
      gameState = newState;
    },

    startDrag(card: number) {
      const cards = getStack(gameState, card);
      riseStarted = new Date().getTime();
      raisingCards = cards;
      return cards;
    },

    cardClickedOrDropped(card: number | undefined, click: boolean) {
      if (card === undefined) {
        return;
      }
      const cards = getStack(gameState, card);
      const cardNumber = assertDefined(cards[0]);
      if (lastCardMoved !== cardNumber) {
        cardHistory = new Map();
        lastCardMoved = cardNumber;
      }
      const actionsFor = getActions(gameState);
      let actions = actionsFor.get(cardNumber);

      if (actions) {
        // if click ... priority is (age-> usefulness -> proximity)
        // otherwise it is proximity
        if (click) {
          // Filter actions to oldest actions.
          let oldest = Infinity;
          let oldestActions: Action[] = [];
          for (const action of actions) {
            const actionKey = JSON.stringify(action);
            const time = cardHistory.get(actionKey) ?? -Infinity;
            if (time === oldest) {
              oldestActions.push(action);
            } else if (time < oldest) {
              oldest = time;
              oldestActions = [action];
            }
          }
          if (oldestActions.length > 0) {
            actions = new Set(oldestActions);
          }

          // Filter actions to most useful actions.
          const actionPriority = {
            draw: 1,
            toTableau: 2,
            toFoundation: 3
          } as const;
          let mostUseful = -Infinity;
          let mostUsefulActions: Action[] = [];
          for (const action of actions) {
            const useful = actionPriority[action.moveType];
            if (useful === mostUseful) {
              mostUsefulActions.push(action);
            } else if (useful > mostUseful) {
              mostUseful = useful;
              mostUsefulActions = [action];
            }
          }
          if (mostUsefulActions.length > 0) {
            actions = new Set(mostUsefulActions);
          }
        }

        // Find closet action.
        const position = renderer.getCardPosition(cardNumber);
        let closest = Infinity;
        let closestAction: Action | undefined;
        for (const action of actions) {
          if (cards.length === 1 || action.moveType === 'toTableau') {
            let x = 0;
            let y = 0;
            if (action.moveType === 'toTableau') {
              const {destinationIdx} = action;
              x = TABLEAU_X + TABLEAU_X_SPACING * destinationIdx;
              y = TABLEAU_Y +
                  assertDefined(gameState.tableausFaceUp[destinationIdx]).length *
                  TABLEAU_Y_SPACING_FACE_DOWN +
                  assertDefined(gameState.tableausFaceDown[destinationIdx]).length *
                  TABLEAU_Y_SPACING_FACE_UP;
            } else if (action.moveType === 'toFoundation') {
              const {destinationIdx} = action;
              x = FOUNDATION_X + FOUNDATION_X_SPACING * destinationIdx;
              y = FOUNDATION_Y;
            }

            const distance = (position[0] - x) ** 2 + (position[1] - y) ** 2;
            if (distance < closest) {
              closest = distance;
              closestAction = action;
            }
          }
        }
        if (closestAction) {
          cardHistory.set(JSON.stringify(closestAction), new Date().getTime());
          execute(gameState, closestAction);
          store(gameState);
        }
      }

      render();
    }
  };
}
