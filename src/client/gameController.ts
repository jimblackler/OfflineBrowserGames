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
const CARD_HEIGHT = 0.3;
const RAISE_HEIGHT = 20;
const ANIMATION_TIME = 400;
const ANIMATION_DISTANCE_MAX = 800;
const ANIMATION_TIME_SUPPLEMENT = 125;
const WASTE_DRAW_STAGGER = 20;
const ANIMATION_TEST_SLOWDOWN = 1;
const FLY_HEIGHT = 50;
const FLY_DISTANCE_MAX = 800;

type Curve = {
  startTime: number;
  endTime: number;
  start: [number, number, number];
  endX: number;
  endY: number;
  endZ: number;
  flyHeight: number;
  draggable: boolean;
  destinationUndercard?: number;
};

export function createGameController(renderer: Renderer) {
  let gameState: GameState;
  const curves = new Map<number, Curve>();
  let lastCardMoved = -1;
  let cardHistory = new Map<string, number>();
  const raisingCards = new Map<number, [number, number, number]>();
  let riseStarted = Infinity;
  const undercards = new Map<number, number>();
  const cardPositions: [number, number, number][] = Array.from({length: NUMBER_CARDS}, () => [0, 0, 0]);
  let draggingCards: number[] = [];
  const dragStartPositions = new Map<number, [number, number, number]>();

  function setPosition(cardNumber: number, x: number, y: number, z: number) {
    cardPositions[cardNumber] = [x, y, z];
    renderer.positionCard(cardNumber, x, y, z);
  }

  function getZ(cardNumber: number) {
    let z = 0;
    while (cardNumber !== -1) {
      cardNumber = assertDefined(undercards.get(cardNumber));
      z += CARD_HEIGHT;
    }
    return z;
  }

  const previouslySet = new Map<number, string>();

  function _placeCard(cardNumber: number, x: number, y: number, draggable: boolean, delay: number,
                      undercard: number) {
    const digest = JSON.stringify({x, y, delay, undercard});
    const previouslySet0 = previouslySet.get(cardNumber);
    if (previouslySet0 === digest) {
      renderer.setDraggable(cardNumber, draggable);
      return;
    }
    previouslySet.set(cardNumber, digest);
    undercards.set(cardNumber, undercard);
    const z = getZ(cardNumber);
    const position = assertDefined(cardPositions[cardNumber]);
    const timeNow = Date.now();
    renderer.setDraggable(cardNumber, false);

    const deltaX = position[0] - x;
    const deltaY = position[1] - y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const flyHeight = FLY_HEIGHT * Math.min(distance, FLY_DISTANCE_MAX) / FLY_DISTANCE_MAX;

    const animationTime = ANIMATION_TEST_SLOWDOWN *
        (ANIMATION_TIME * Math.min(distance, ANIMATION_DISTANCE_MAX) / ANIMATION_DISTANCE_MAX + ANIMATION_TIME_SUPPLEMENT);

    curves.set(cardNumber, {
      startTime: timeNow + delay,
      endTime: timeNow + animationTime + delay,
      start: position,
      endX: x,
      endY: y,
      endZ: z,
      flyHeight,
      draggable
    });
  }

  function render() {
    // Stop all animations immediately
    for (const [k, curve] of curves) {
      setPosition(k, curve.endX, curve.endY, curve.endZ);
    }
    curves.clear();

    // Position stock cards.
    let undercard = -1;
    for (const cardNumber of gameState.stock) {
      renderer.setFaceUp(cardNumber, false);
      _placeCard(cardNumber, STOCK_X, STOCK_Y, false, 0, undercard);
      undercard = cardNumber;
    }

    // Position waste cards.
    const wasteCardsVisible = Math.min(gameState.rules.cardsToDraw, gameState.waste.length);
    undercard = -1;
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
      undercard = -1;
      for (const cardNumber of foundation) {
        renderer.setFaceUp(cardNumber, true);
        _placeCard(cardNumber,
            FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y, true, 0, undercard);
        undercard = cardNumber;
      }
    });

    // Position tableau cards.
    gameState.tableausFaceDown.forEach((tableauFaceDown, tableauIdx) => {
      undercard = -1;
      const tableauX = TABLEAU_X + TABLEAU_X_SPACING * tableauIdx;
      for (const [position, cardNumber] of tableauFaceDown.entries()) {
        _placeCard(cardNumber, tableauX,
            TABLEAU_Y + TABLEAU_Y_SPACING_FACE_DOWN * position, false, 0, undercard);
        renderer.setFaceUp(cardNumber, false);
        undercard = cardNumber;
      }

      const tableauFaceUp = assertDefined(gameState.tableausFaceUp[tableauIdx]);
      for (const [position, cardNumber] of tableauFaceUp.entries()) {
        renderer.setFaceUp(cardNumber, true);
        _placeCard(cardNumber, tableauX,
            TABLEAU_Y + TABLEAU_Y_SPACING_FACE_DOWN * tableauFaceDown.length +
            TABLEAU_Y_SPACING_FACE_UP * position, true, 0, undercard);
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
            const actions = actionsFor.get(assertDefined(tableau.at(-1)));
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
  renderer.placeHolder(STOCK_X, STOCK_Y, draw);

  // Placeholder; tableau
  for (let tableauIdx = 0; tableauIdx !== NUMBER_TABLEAUS; tableauIdx++) {
    renderer.placeHolder(TABLEAU_X + TABLEAU_X_SPACING * tableauIdx, TABLEAU_Y);
  }

  // Placeholder; foundation
  for (let foundationIdx = 0; foundationIdx !== NUMBER_FOUNDATIONS; foundationIdx++) {
    renderer.placeHolder(FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y);
  }

  function _animate() {
    requestAnimationFrame(_animate);
    const timeNow = Date.now();
    for (const [card, curve] of curves) {
      if (timeNow < curve.startTime) {
        continue;
      }
      const t = toT(curve.startTime, curve.endTime, timeNow);
      if (t > 1) {
        setPosition(card, curve.endX, curve.endY, curve.endZ);
        renderer.setDraggable(card, curve.draggable);
        curves.delete(card);
      } else {
        const multiplier = Math.sin(t * Math.PI / 2);
        setPosition(card, tInRange(curve.start[0], curve.endX, multiplier),
            tInRange(curve.start[1], curve.endY, multiplier),
            tInRange(curve.start[2], curve.endZ, multiplier) +
            Math.sin(t * Math.PI) * curve.flyHeight);
      }
    }
    if (riseStarted !== Infinity) {
      const t = Math.min(1, (timeNow - riseStarted) / RAISE_DURATION);
      if (t === 1) {
        riseStarted = Infinity;
      }
      for (const [cardNumber, [, , z]] of raisingCards) {
        const currentPos = assertDefined(cardPositions[cardNumber]);
        setPosition(cardNumber, currentPos[0], currentPos[1], z + RAISE_HEIGHT * t);
      }
    }
  }

  requestAnimationFrame(_animate);

  return {
    draw,
    render,
    setGameState(newState: GameState) {
      gameState = newState;
    },

    startDrag(card: number) {
      const cards = getStack(gameState, card);
      riseStarted = Date.now();
      raisingCards.clear();
      dragStartPositions.clear();
      draggingCards = cards;
      for (const c of cards) {
        previouslySet.delete(c);
        const pos = assertDefined(cardPositions[c]);
        raisingCards.set(c, pos);
        dragStartPositions.set(c, pos);
      }
    },

    drag(dx: number, dy: number) {
      for (const card of draggingCards) {
        const startPosition = assertDefined(dragStartPositions.get(card));
        const currentPosition = assertDefined(cardPositions[card]);
        setPosition(card, startPosition[0] + dx, startPosition[1] + dy, currentPosition[2]);
      }
    },

    endDrag(click: boolean) {
      const cardNumber = draggingCards[0];
      draggingCards = [];
      dragStartPositions.clear();

      if (cardNumber === undefined) {
        return;
      }
      const cards = getStack(gameState, cardNumber);
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
          let mostUseful = -Infinity;
          let mostUsefulActions: Action[] = [];
          for (const action of actions) {
            const useful = action.moveType === 'toFoundation'
                ? 3 : action.moveType === 'toTableau' ? 2 : 1;
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
        const position = assertDefined(cardPositions[cardNumber]);
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
          cardHistory.set(JSON.stringify(closestAction), Date.now());
          execute(gameState, closestAction);
          store(gameState);
        }
      }

      render();
    }
  };
}
