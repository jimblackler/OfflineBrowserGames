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
};

export function createGameController(renderer: Renderer) {
  let gameState: GameState;
  const curves = new Map<number, Curve>();
  let lastCardMoved = -1;
  let cardHistory = new Map<string, number>();
  let riseStarted = Infinity;


  const cardPositions: [number, number, number][] = Array.from({length: NUMBER_CARDS}, () => [0, 0, 0]);
  let draggingCards: number[] = [];
  const dragStartPositions = new Map<number, [number, number, number]>();

  function setPosition(cardNumber: number, x: number, y: number, z: number) {
    cardPositions[cardNumber] = [x, y, z];
    renderer.positionCard(cardNumber, x, y, z);
  }

  const previouslySet = new Map<number, string>();

  function _placeCard(cardNumber: number, x: number, y: number, draggable: boolean, delay: number,
                      z: number) {
    const digest = JSON.stringify({x, y, delay, z});
    if (previouslySet.get(cardNumber) === digest) {
      renderer.setDraggable(cardNumber, draggable);
      return;
    }
    previouslySet.set(cardNumber, digest);
    const position = assertDefined(cardPositions[cardNumber]);
    const timeNow = Date.now();
    renderer.setDraggable(cardNumber, false);

    const distance = Math.sqrt((position[0] - x) ** 2 + (position[1] - y) ** 2);
    const flyHeight = FLY_HEIGHT * Math.min(distance, FLY_DISTANCE_MAX) / FLY_DISTANCE_MAX;

    const animationTime = ANIMATION_TIME * Math.min(distance, ANIMATION_DISTANCE_MAX) /
            ANIMATION_DISTANCE_MAX +
        ANIMATION_TIME_SUPPLEMENT;

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
    let depth = 0;
    for (const cardNumber of gameState.stock) {
      renderer.setFaceUp(cardNumber, false);
      depth++;
      _placeCard(cardNumber, STOCK_X, STOCK_Y, false, 0, depth * CARD_HEIGHT);
    }

    // Position waste cards.
    const wasteCardsVisible = Math.min(gameState.rules.cardsToDraw, gameState.waste.length);
    depth = 0;
    for (const [idx, cardNumber] of gameState.waste.entries()) {
      renderer.setFaceUp(cardNumber, true);
      const staggerOrder = Math.max(idx - gameState.waste.length + gameState.rules.cardsToDraw, 0);
      const delay = staggerOrder * WASTE_DRAW_STAGGER;
      const position = Math.max(0, idx + wasteCardsVisible - gameState.waste.length);
      depth++;
      _placeCard(cardNumber, WASTE_X + WASTE_X_SPACING * position, WASTE_Y,
          idx === gameState.waste.length - 1, delay, depth * CARD_HEIGHT);
    }

    // Position foundation cards.
    gameState.foundations.forEach((foundation, foundationIdx) => {
      depth = 0;
      for (const cardNumber of foundation) {
        renderer.setFaceUp(cardNumber, true);
        depth++;
        _placeCard(cardNumber,
            FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y, true, 0, depth * CARD_HEIGHT);
      }
    });

    // Position tableau cards.
    gameState.tableausFaceDown.forEach((tableauFaceDown, tableauIdx) => {
      depth = 0;
      const tableauX = TABLEAU_X + TABLEAU_X_SPACING * tableauIdx;
      for (const [position, cardNumber] of tableauFaceDown.entries()) {
        depth++;
        _placeCard(cardNumber, tableauX,
            TABLEAU_Y + TABLEAU_Y_SPACING_FACE_DOWN * position, false, 0, depth * CARD_HEIGHT);
        renderer.setFaceUp(cardNumber, false);
      }

      const tableauFaceUp = assertDefined(gameState.tableausFaceUp[tableauIdx]);
      for (const [position, cardNumber] of tableauFaceUp.entries()) {
        renderer.setFaceUp(cardNumber, true);
        depth++;
        _placeCard(cardNumber, tableauX,
            TABLEAU_Y + TABLEAU_Y_SPACING_FACE_DOWN * tableauFaceDown.length +
            TABLEAU_Y_SPACING_FACE_UP * position, true, 0, depth * CARD_HEIGHT);
      }
    });

    // Auto play
    if (gameState.stock.length === 0 && gameState.waste.length === 0) {
      const actionsFor = getActions(gameState);
      const anyFaceDown = gameState.tableausFaceDown.some((t) => t.length > 0);
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
      for (const cardNumber of draggingCards) {
        const startPos = assertDefined(dragStartPositions.get(cardNumber));
        const currentPos = assertDefined(cardPositions[cardNumber]);
        setPosition(cardNumber, currentPos[0], currentPos[1], startPos[2] + RAISE_HEIGHT * t);
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
      dragStartPositions.clear();
      draggingCards = cards;
      for (const c of cards) {
        previouslySet.delete(c);
        const pos = assertDefined(cardPositions[c]);
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
      const [cardNumber] = draggingCards;
      draggingCards = [];
      dragStartPositions.clear();

      if (cardNumber === undefined) {
        return;
      }
      if (lastCardMoved !== cardNumber) {
        cardHistory = new Map();
        lastCardMoved = cardNumber;
      }
      let actions = getActions(gameState).get(cardNumber);

      if (actions) {
        // if click ... priority is (age-> usefulness -> proximity)
        // otherwise it is proximity
        if (click) {
          // Filter actions to oldest actions.
          let oldest = Infinity;
          let oldestActions: Action[] = [];
          for (const action of actions) {
            const time = cardHistory.get(JSON.stringify(action)) ?? -Infinity;
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
