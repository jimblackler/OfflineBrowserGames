import {GameStore} from "../commonScripts/gameStore.js";
import {MathUtils} from "../commonScripts/mathUtils.js";
import {Rules} from "../commonScripts/rules.js";
import {MOVE_TYPE} from "../commonScripts/gameState.js";

const STOCK_X = 42;
const STOCK_Y = 42;
const TABLEAU_X = STOCK_X;
const TABLEAU_Y = 210;
const TABLEAU_X_SPACING = 115;
const TABLEAU_Y_SPACING = 25;
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

export class GameController {
  constructor(renderer) {
    this.renderer = renderer;
    this.curves = new Map();
    this.cardHistory = new Map();

    for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
      renderer.faceDown(idx);
    }

    const animate = () => {
      requestAnimationFrame(animate);
      const timeNow = new Date().getTime();
      for (const [k, curve] of this.curves) {
        if (timeNow < curve.startTime) {
          continue;
        }
        const t = MathUtils.toT(curve.startTime, curve.endTime, timeNow);
        if (t > 1) {
          renderer.positionCard(k, curve.endX, curve.endY, 0);
          curve.onArrive();
          this.curves.delete(k);
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
    };

    requestAnimationFrame(animate);

    // Placeholder; stock
    this.stockHolder = renderer.placeHolder(STOCK_X, STOCK_Y);
    this.stockOverlay = renderer.makeOverlay(STOCK_X, STOCK_Y);

    // Placeholder; tableau
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      renderer.placeHolder(TABLEAU_X + TABLEAU_X_SPACING * tableauIdx, TABLEAU_Y);
    }

    // Placeholder; foundation
    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      renderer.placeHolder(FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y);
    }
  }

  render(gameState) {
    this.actionsFor = new Map();

    // Stop all animations immediately (old onArrive functions are invalid)
    for (const [k, curve] of this.curves) {
      this.renderer.positionCard(k, curve.endX, curve.endY, 0);
      curve.onArrive();
      this.curves.delete(k);
    }

    // Position stock cards.
    const stockLength = gameState.stock.length();

    for (let idx = 0; idx !== stockLength; idx++) {
      const cardNumber = gameState.stock.get(idx);
      this.renderer.faceDown(cardNumber);
      this.placeCard(cardNumber, STOCK_X, STOCK_Y, () => {
      }, 0);
    }

    this.renderer.setClick(this.stockOverlay, () => {
      gameState.draw();
      GameStore.store(gameState);
      this.render(gameState);
    });

    // Position waste cards.
    const wasteLength = gameState.waste.length();
    for (let idx = 0; idx !== wasteLength; idx++) {
      const cardNumber = gameState.waste.get(idx);
      let onArrive;
      this.renderer.faceUp(cardNumber);
      const staggerOrder = Math.max(idx - wasteLength + gameState.rules.cardsToDraw, 0);
      const delay = staggerOrder * WASTE_DRAW_STAGGER * ANIMATION_TEST_SLOWDOWN;
      if (idx === wasteLength - 1) {
        const cards = [];
        cards.push(cardNumber);
        onArrive = () => {
          this.renderer.setCardDraggable(cardNumber, cards, () => this.startDrag(cards, gameState));
        };
      } else {
        onArrive = () => {
        };
      }
      let position = idx - (wasteLength - Math.min(gameState.rules.cardsToDraw, wasteLength));
      if (position < 0) {
        position = 0;
      }
      this.placeCard(cardNumber, WASTE_X + WASTE_X_SPACING * position, WASTE_Y, onArrive, delay);
    }

    // Position foundation cards.
    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      const foundation = gameState.foundations[foundationIdx];
      const foundationLength = foundation.length();
      if (foundationLength === 0) {
        // Empty foundation ... will take Aces
        const canPlaceOn = [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
          Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
        for (const other of canPlaceOn) {
          let actions;
          if (this.actionsFor.has(other)) {
            actions = this.actionsFor.get(other)
          } else {
            actions = new Set();
            this.actionsFor.set(other, actions);
          }
          actions.add({
            card: other,
            moveType: MOVE_TYPE.TO_FOUNDATION,
            destinationIdx: foundationIdx
          });
        }
      } else {
        for (let position = 0; position < foundationLength; position++) {
          const cardNumber = foundation.get(position);
          this.renderer.faceUp(cardNumber);
          let onArrive;
          if (position === foundationLength - 1) {
            const cards = [cardNumber];
            onArrive = () => {
              this.renderer.setCardDraggable(cardNumber, cards, () => this.startDrag(cards, gameState));
            };

            const canPlaceOn = Rules.canPlaceOnInFoundation(cardNumber);
            for (const other of canPlaceOn) {
              let actions;
              if (this.actionsFor.has(other)) {
                actions = this.actionsFor.get(other)
              } else {
                actions = new Set();
                this.actionsFor
                    .set(other, actions);
              }
              actions.add({
                card: other,
                moveType: MOVE_TYPE.TO_FOUNDATION,
                destinationIdx: foundationIdx,
              });
            }
          } else {
            onArrive = () => {
            };
          }

          this.placeCard(cardNumber, FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx, FOUNDATION_Y, onArrive, 0);
        }
      }
    }

    // Position tableau cards.
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {

      let tableau = gameState.tableausFaceDown[tableauIdx];
      const faceDownLength = tableau.length();
      for (let position = 0; position < faceDownLength; position++) {
        const cardNumber = tableau.get(position);
        this.placeCard(cardNumber, TABLEAU_X + TABLEAU_X_SPACING * tableauIdx,
            TABLEAU_Y + TABLEAU_Y_SPACING * position, () => {
            }, 0);
        this.renderer.faceDown(cardNumber);
      }

      tableau = gameState.tableausFaceUp[tableauIdx];
      const tableauLength = tableau.length();
      if (tableauLength === 0) {
        // Empty tableau ... will take Kings
        const canPlaceOn = [Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
          Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE)];
        for (const other of canPlaceOn) {
          let actions;
          if (this.actionsFor.has(other)) {
            actions = this.actionsFor.get(other)
          } else {
            actions = new Set();
            this.actionsFor.set(other, actions);
          }
          actions.add({
            card: other,
            moveType: MOVE_TYPE.TO_TABLEU,
            destinationIdx: tableauIdx,
          });
        }
      } else {
        for (let position = 0; position < tableauLength; position++) {
          const cardNumber = tableau.get(position);
          const cards = tableau.asArray().slice(position);
          if (position === tableauLength - 1) {
            const canPlaceOn = Rules.canPlaceOnInTableau(cardNumber);
            for (const other of canPlaceOn) {
              let actions;
              if (this.actionsFor.has(other)) {
                actions = this.actionsFor.get(other)
              } else {
                actions = new Set();
                this.actionsFor.set(other, actions);
              }
              actions.add({

                card: other,
                moveType: MOVE_TYPE.TO_TABLEU,
                destinationIdx: tableauIdx,
              });
            }
          }
          this.renderer.faceUp(cardNumber);
          const onArrive = () => {
            this.renderer.setCardDraggable(cardNumber, cards, () => this.startDrag(cards, gameState));
          };

          this.placeCard(cardNumber, TABLEAU_X + TABLEAU_X_SPACING * tableauIdx,
              TABLEAU_Y + TABLEAU_Y_SPACING * (position + faceDownLength), onArrive, 0);
        }
      }
    }

    // Auto play
    if (gameState.stock.length() === 0 && gameState.waste.length() === 0) {
      let anyFaceDown = false;
      for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
        const tableau = gameState.tableausFaceDown[tableauIdx];
        if (tableau.length() > 0) {
          anyFaceDown = true;
          break;
        }
      }
      if (!anyFaceDown) {
        window.setTimeout(() => {
          for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
            const tableau = gameState.tableausFaceUp[tableauIdx];
            if (tableau.length() <= 0) {
              continue;
            }
            const position = tableau.length() - 1;
            const cardNumber = tableau.get(position);
            const actions = this.actionsFor.get(cardNumber);
            if (!actions) {
              continue;
            }
            for (const action of actions) {
              if (action.moveType === MOVE_TYPE.TO_TABLEU) {
                continue;
              }
              gameState.execute(action);
              GameStore.store(gameState);
              this.render(gameState);
              return;
            }
          }
          // All complete. If the user hits refresh, start a new game.
          GameStore.erase();
        }, 400);
      }
    }
  }

  placeCard(cardNumber, x, y, onArrive, delay) {
    const timeNow = new Date().getTime();
    if (!this.cardHistory.has(cardNumber)) {
      this.cardHistory.set(cardNumber, new Map());
    }
    this.cardHistory.get(cardNumber).set([x, y], timeNow);
    this.renderer.setCardNotDraggable(cardNumber);
    this.renderer.raiseCard(cardNumber);

    const position = this.renderer.getCardPosition(cardNumber);

    const deltaX = position[0] - x;
    const deltaY = position[1] - y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const flyDistance = Math.min(distance, FLY_DISTANCE_MAX);
    const flyHeight = FLY_HEIGHT * flyDistance / FLY_DISTANCE_MAX;
    const animationDistance = Math.min(distance, ANIMATION_DISTANCE_MAX);

    const animationTime = ANIMATION_TEST_SLOWDOWN *
        (ANIMATION_TIME * animationDistance / ANIMATION_DISTANCE_MAX + ANIMATION_TIME_SUPPLEMENT);

    this.curves.set(cardNumber, {
      startTime: timeNow + delay,
      endTime: timeNow + animationTime + delay,
      start: position,
      endX: x,
      endY: y,
      flyHeight,
      onArrive
    });
  }

  startDrag(cards, gameState) {
    const timeNow = new Date().getTime();
    let aborted = false;

    const raise = () => {
      if (aborted) {
        return;
      }
      let t = (new Date().getTime() - timeNow) / RAISE_DURATION;
      if (t > 1) {
        t = 1;
      }
      for (const cardNumber of cards) {
        const position = this.renderer.getCardPosition(cardNumber);
        this.renderer.positionCard(cardNumber, position[0], position[1], RAISE_HEIGHT * t);
      }
      if (t < 1) {
        requestAnimationFrame(raise);
      }
    };
    requestAnimationFrame(raise);
    return (click) => {
      aborted = true;
      const cardNumber = cards[0];
      let actions = this.actionsFor.get(cardNumber);
      if (actions) {
        // if click ... priority is (age-> usefulness -> proximity)
        // otherwise it is proximity
        if (click) {
          let oldest = Number.MAX_VALUE;
          let oldestActions = [];
          for (const action of actions) {
            if (cards.length === 1 || action.moveType === MOVE_TYPE.TO_TABLEU) {
              const cardHistory = this.cardHistory.get(cardNumber);
              const key = [action.moveType, action.destinationIdx];
              const time = cardHistory.has(key) ? cardHistory.get(key) : Number.MIN_VALUE;
              if (time === oldest) {
                oldestActions.push(action);
              } else if (time < oldest) {
                oldest = time;
                oldestActions = [action];
              }
            }
          }
          if (oldestActions) {
            actions = oldestActions;
          }

          let mostUseful = Number.MIN_VALUE;
          let mostUsefulActions = [];
          for (const action of actions) {
            if (cards.length === 1 || action.moveType === MOVE_TYPE.TO_TABLEU) {
              const useful = action.moveType;
              if (useful === mostUseful) {
                mostUsefulActions.push(action);
              } else if (useful > mostUseful) {
                mostUseful = useful;
                mostUsefulActions = [action];
              }
            }
          }
          if (mostUsefulActions) {
            actions = mostUsefulActions;
          }
        }
        const position = this.renderer.getCardPosition(cardNumber);
        let closest = Number.MAX_VALUE;
        let closetAction;
        for (const action of actions) {
          if (cards.length === 1 || action.moveType === MOVE_TYPE.TO_TABLEU) {
            let x;
            let y;
            if (action.moveType === MOVE_TYPE.TO_TABLEU) {
              x = TABLEAU_X + TABLEAU_X_SPACING * action.destinationIdx;
              y = TABLEAU_Y + (gameState.tableausFaceUp[action.destinationIdx].length() +
                  gameState.tableausFaceDown[action.destinationIdx].length()) * TABLEAU_Y_SPACING;
            } else if (action.moveType === MOVE_TYPE.TO_FOUNDATION) {
              x = FOUNDATION_X + FOUNDATION_X_SPACING * action.destinationIdx;
              y = FOUNDATION_Y;
            }

            const distance = Math.pow(position[0] - x, 2) + Math.pow(position[1] - y, 2);
            if (distance < closest) {
              closest = distance;
              closetAction = action;
            }
          }
        }
        if (closetAction) {
          gameState.execute(closetAction);
        }
      }
      GameStore.store(gameState);
      this.render(gameState);
    };
  }
}
