import {assertDefined} from '../common/check/defined';
import type {GameState} from './gameState';
import {type Action, createGameState, MOVE_TYPE, type SerializedGameState} from './gameState';
import {GameStore} from './gameStore';
import {MathUtils} from './mathUtils';
import type {DragHandler, Renderer} from './renderer';
import {Rules} from './rules';

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
};

export type GameController = {
  draw(): void;
  render(): void;
  autoPlay(): number[] | undefined;
} & DragHandler

export function create(renderer: Renderer, gameState: GameState): GameController {
  const curves = new Map<number, Curve>();
  let lastCardMoved = -1;
  let cardHistory = new Map<string, number>();
  let raisingCards: number[] | null = null;
  let riseStarted = 0;

  for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
    renderer.faceDown(idx);
  }

  // Placeholder; stock
  renderer.placeHolder(STOCK_X, STOCK_Y, () => draw());

  // Placeholder; tableau
  for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
    renderer.placeHolder(TABLEAU_X + TABLEAU_X_SPACING * tableauIdx, TABLEAU_Y, null);
  }

  // Placeholder; foundation
  for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
    renderer.placeHolder(FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y, null);
  }

  function _animate() {
    requestAnimationFrame(() => _animate());
    const timeNow = new Date().getTime();
    for (const [k, curve] of curves) {
      if (timeNow < curve.startTime) {
        continue;
      }
      const t = MathUtils.toT(curve.startTime, curve.endTime, timeNow);
      if (t > 1) {
        renderer.positionCard(k, curve.endX, curve.endY, 0);
        renderer.setDraggable(k, curve.draggable);
        curves.delete(k);
      } else {
        const multiplier1 = Math.sin(t * Math.PI / 2);
        let v;

        if (curve.start[2] < curve.flyHeight) {
          const start = Math.PI - Math.asin(curve.start[2] / curve.flyHeight);
          const a = MathUtils.tInRange(start, 0, t);
          v = Math.sin(a) * curve.flyHeight;
        } else {
          v = curve.start[2] * (1 - t);
        }

        renderer.positionCard(k, MathUtils.tInRange(curve.start[0], curve.endX, multiplier1),
            MathUtils.tInRange(curve.start[1], curve.endY, multiplier1), v);
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
        raisingCards = null;
      }
    }
  }

  requestAnimationFrame(() => _animate());

  function draw() {
    gameState.execute({
      moveType: MOVE_TYPE.DRAW,
    });
    GameStore.store(gameState);
    render();
  }

  function render() {
    // Stop all animations immediately
    for (const [k, curve] of curves) {
      renderer.positionCard(k, curve.endX, curve.endY, 0);
      curves.delete(k);
    }

    raisingCards = null;

    // Position stock cards.
    const stockLength = gameState.stock.length;
    for (let idx = 0; idx !== stockLength; idx++) {
      const cardNumber = assertDefined(gameState.stock[idx]);
      renderer.faceDown(cardNumber);
      _placeCard(cardNumber, STOCK_X, STOCK_Y, false, 0);
    }

    // Position waste cards.
    const wasteLength = gameState.waste.length;
    for (let idx = 0; idx !== wasteLength; idx++) {
      const cardNumber = assertDefined(gameState.waste[idx]);
      renderer.faceUp(cardNumber);
      const staggerOrder = Math.max(idx - wasteLength + gameState.rules.cardsToDraw, 0);
      const delay = staggerOrder * WASTE_DRAW_STAGGER * ANIMATION_TEST_SLOWDOWN;
      let position = idx - (wasteLength - Math.min(gameState.rules.cardsToDraw, wasteLength));
      if (position < 0) {
        position = 0;
      }
      _placeCard(cardNumber, WASTE_X + WASTE_X_SPACING * position, WASTE_Y, idx === wasteLength - 1, delay);
    }

    // Position foundation cards.
    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      const foundation = assertDefined(gameState.foundations[foundationIdx]);
      const foundationLength = foundation.length;

      for (let position = 0; position < foundationLength; position++) {
        const cardNumber = assertDefined(foundation[position]);
        renderer.faceUp(cardNumber);
        _placeCard(cardNumber, FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y, true, 0);
      }
    }

    // Position tableau cards.
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      const tableauFaceDown = assertDefined(gameState.tableausFaceDown[tableauIdx]);
      const faceDownLength = tableauFaceDown.length;
      for (let position = 0; position < faceDownLength; position++) {
        const cardNumber = assertDefined(tableauFaceDown[position]);
        _placeCard(cardNumber, TABLEAU_X + TABLEAU_X_SPACING * tableauIdx,
            TABLEAU_Y + TABLEAU_Y_SPACING_FACE_DOWN * position, false, 0);
        renderer.faceDown(cardNumber);
      }

      const tableauFaceUp = assertDefined(gameState.tableausFaceUp[tableauIdx]);
      const tableauLength = tableauFaceUp.length;

      for (let position = 0; position < tableauLength; position++) {
        const cardNumber = assertDefined(tableauFaceUp[position]);
        renderer.faceUp(cardNumber);
        _placeCard(cardNumber, TABLEAU_X + TABLEAU_X_SPACING * tableauIdx,
            TABLEAU_Y + TABLEAU_Y_SPACING_FACE_UP * position + TABLEAU_Y_SPACING_FACE_DOWN * faceDownLength, true, 0);
      }
    }

    // Auto play
    if (gameState.stock.length === 0 && gameState.waste.length === 0) {
      const actionsFor = gameState.getActions();
      let anyFaceDown = false;
      for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
        const tableau = assertDefined(gameState.tableausFaceDown[tableauIdx]);
        if (tableau.length > 0) {
          anyFaceDown = true;
          break;
        }
      }
      if (!anyFaceDown) {
        window.setTimeout(() => {
          for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
            const tableau = assertDefined(gameState.tableausFaceUp[tableauIdx]);
            if (tableau.length <= 0) {
              continue;
            }
            const position = tableau.length - 1;
            const cardNumber = assertDefined(tableau[position]);
            const actions = actionsFor.get(cardNumber);
            if (!actions) {
              continue;
            }
            for (const action of actions) {
              if (action.moveType === MOVE_TYPE.TO_TABLEAU) {
                continue;
              }
              gameState.execute(action);
              GameStore.store(gameState);
              render();
              return;
            }
          }
          // All complete. If the user hits refresh, start a new game.
          GameStore.erase();
        }, 400);
      }
    }
  }

  function _placeCard(cardNumber: number, x: number, y: number, draggable: boolean, delay: number) {
    const timeNow = new Date().getTime();
    renderer.raiseCard(cardNumber);
    renderer.setDraggable(cardNumber, false);

    const position = renderer.getCardPosition(cardNumber);

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
      draggable
    });
  }

  return {
    draw,
    render,

    startDrag(card: number) {
      const cards = gameState.getStack(card);
      riseStarted = new Date().getTime();
      raisingCards = cards;
      return cards;
    },

    cardClickedOrDropped(card: number | undefined, click: boolean) {
      if (card === undefined) {
        return;
      }
      const cards = gameState.getStack(card);
      const cardNumber = assertDefined(cards[0]);
      if (lastCardMoved !== cardNumber) {
        cardHistory = new Map();
        lastCardMoved = cardNumber;
      }
      const actionsFor = gameState.getActions();
      let actions = actionsFor.get(cardNumber);

      if (actions) {
        // if click ... priority is (age-> usefulness -> proximity)
        // otherwise it is proximity
        if (click) {
          // Filter actions to oldest actions.
          let oldest = Number.MAX_VALUE;
          let oldestActions: Action[] = [];
          for (const action of actions) {
            const actionKey = JSON.stringify(action);
            const time = cardHistory.get(actionKey) ?? Number.MIN_VALUE;
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
          let mostUseful = Number.MIN_VALUE;
          let mostUsefulActions: Action[] = [];
          for (const action of actions) {
            const useful = action.moveType;
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
        let closest = Number.MAX_VALUE;
        let closestAction: Action | undefined;
        for (const action of actions) {
          if (cards.length === 1 || action.moveType === MOVE_TYPE.TO_TABLEAU) {
            let x = 0;
            let y = 0;
            if (action.moveType === MOVE_TYPE.TO_TABLEAU) {
              const {destinationIdx} = action;
              x = TABLEAU_X + TABLEAU_X_SPACING * destinationIdx;
              y = TABLEAU_Y +
                  assertDefined(gameState.tableausFaceUp[destinationIdx]).length *
                  TABLEAU_Y_SPACING_FACE_DOWN +
                  assertDefined(gameState.tableausFaceDown[destinationIdx]).length *
                  TABLEAU_Y_SPACING_FACE_UP;
            } else if (action.moveType === MOVE_TYPE.TO_FOUNDATION) {
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
          gameState.execute(closestAction);
          GameStore.store(gameState);
        }
      }

      render();
    },

    autoPlay() {
      const considered = new Set<string>();
      let currentRound = new Set<[string, number[]]>();
      considered.add(gameState.normalKey());
      currentRound.add([JSON.stringify(gameState), []]);
      let roundNumber = 1;
      while (currentRound.size) {
        console.log(roundNumber, currentRound.size);
        const nextRound = new Set<[string, number[]]>();
        for (const data of currentRound) {
          const stringifiedState = data[0];
          const moves = data[1];
          let moveIndex = 0;
          const state = createGameState();
          state.restore(JSON.parse(stringifiedState) as SerializedGameState);

          for (const action of state.getAllActions()) {
            const cloned = createGameState();
            cloned.restore(JSON.parse(stringifiedState) as SerializedGameState);
            cloned.execute(action);
            if (cloned.definitelyUncompletable()) {
              continue;
            }
            const normalKey = cloned.normalKey();
            if (considered.has(normalKey)) {
              continue;
            }
            considered.add(normalKey);
            const clonedMoves = [...moves, moveIndex];
            if (cloned.isComplete()) {
              console.log(moves);
              return moves;
            }
            nextRound.add([JSON.stringify(cloned), clonedMoves]);
            moveIndex++;
          }
        }
        currentRound = nextRound;
        roundNumber++;
      }
      return undefined;
    }
  };
}
