import {GameStore} from "../commonScripts/gameStore.js";
import {MathUtils} from "../commonScripts/mathUtils.js";
import {Rules} from "../commonScripts/rules.js";

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
const CURVE_TIME = 250;
const RAISE_DURATION = 80;
const RAISE_HEIGHT = 8;
const FLY_DISTANCE_MAX = 1000;
const FLY_HEIGHT = 40;

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
        const t = MathUtils.toT(curve.startTime, curve.endTime, timeNow);
        if (t > 1) {
          renderer.positionCard(k, curve.endX, curve.endY, 0);
          curve.onArrive();
          this.curves.delete(k);
        } else {
          const multiplier1 = Math.sin(t * Math.PI / 2);
          let v;
          const deltaX = curve.startX - curve.endX;
          const deltaY = curve.startY - curve.endY;
          let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          if (distance > FLY_DISTANCE_MAX) {
            distance = FLY_DISTANCE_MAX;
          }
          const flyHeight = FLY_HEIGHT * distance / FLY_DISTANCE_MAX;
          if (curve.startV < flyHeight) {
            const start = Math.PI - Math.asin(curve.startV / flyHeight);
            const a = MathUtils.tInRange(start, 0, t);
            v = Math.sin(a) * flyHeight;
          } else {
            v = curve.startV * (1 - t);
          }

          renderer.positionCard(k, MathUtils.tInRange(curve.startX, curve.endX, multiplier1),
              MathUtils.tInRange(curve.startY, curve.endY, multiplier1), v);
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
    this.slotsFor = new Map();

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
      });
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
      if (idx === wasteLength - 1) {
        const cards = [];
        cards.push(cardNumber);
        onArrive = () => {
          this.renderer.setCardDraggable(cardNumber, cards, () => this.startDrag(cards, gameState));

        };
      } else {
        onArrive = () => {};
      }
      let position = idx - (wasteLength - Math.min(gameState.rules.cardsToDraw, wasteLength));
      if (position < 0) {
        position = 0;
      }
      this.placeCard(cardNumber, WASTE_X + WASTE_X_SPACING * position, WASTE_Y, onArrive);
    }

    // Position foundation cards.
    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      const foundation = gameState.foundations[foundationIdx];
      const x = FOUNDATION_X + FOUNDATION_X_SPACING * foundationIdx;
      const foundationLength = foundation.length();
      if (foundationLength === 0) {
        // Empty foundation ... will take Aces
        const canPlaceOn = [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
          Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
        for (const other of canPlaceOn) {
          const slotsFor = this.slotsFor.has(other) ? this.slotsFor.get(other) : [];
          slotsFor.push({
            x: x,
            y: FOUNDATION_Y,
            action: () => gameState.moveToFoundation(other, foundationIdx),
            useful: 3,
            takesTableauStack: false
          });

          this.slotsFor.set(other, slotsFor);
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
              const slotsFor = this.slotsFor.has(other) ? this.slotsFor.get(other) : [];
              slotsFor.push({
                x,
                y: FOUNDATION_Y,
                action: () => gameState.moveToFoundation(other, foundationIdx),
                useful: 3,
                takesTableauStack: false
              });
              this.slotsFor.set(other, slotsFor);
            }
          } else {
            onArrive = () => {
            };
          }

          this.placeCard(cardNumber, x, FOUNDATION_Y, onArrive);
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
            });
        this.renderer.faceDown(cardNumber);
      }

      tableau = gameState.tableausFaceUp[tableauIdx];
      const tableauLength = tableau.length();
      if (tableauLength === 0) {
        // Empty tableau ... will take Kings
        const canPlaceOn = [Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
          Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE)];
        for (const other of canPlaceOn) {
          const slotsFor = this.slotsFor.has(other) ? this.slotsFor.get(other) : [];
          slotsFor.push({
            x: TABLEAU_X + TABLEAU_X_SPACING * tableauIdx,
            y: TABLEAU_Y,
            action: () => gameState.moveToTableau(other, tableauIdx),
            useful: 2,
            takesTableauStack: true
          });
          this.slotsFor.set(other, slotsFor);
        }
      } else {
        for (let position = 0; position < tableauLength; position++) {
          const cardNumber = tableau.get(position);
          const cards = tableau.asArray().slice(position);
          if (position === tableauLength - 1) {
            const canPlaceOn = Rules.canPlaceOnInTableau(cardNumber);
            for (const other of canPlaceOn) {
              const slotsFor = this.slotsFor.has(other) ? this.slotsFor.get(other) : [];
              slotsFor.push({
                x: TABLEAU_X + TABLEAU_X_SPACING * tableauIdx,
                y: TABLEAU_Y + TABLEAU_Y_SPACING * (position + faceDownLength + 1),
                action: () => gameState.moveToTableau(other, tableauIdx),
                useful: 2,
                takesTableauStack: true
              });
              this.slotsFor.set(other, slotsFor);
            }
          }
          this.renderer.faceUp(cardNumber);
          const onArrive = () => {
            this.renderer.setCardDraggable(cardNumber, cards, () => this.startDrag(cards, gameState));
          };

          this.placeCard(cardNumber, TABLEAU_X + TABLEAU_X_SPACING * tableauIdx,
              TABLEAU_Y + TABLEAU_Y_SPACING * (position + faceDownLength), onArrive);
        }
      }
    }



    // Auto play
    if (gameState.stock.length() === 0 && gameState.waste.length() <= 1) {
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
            const slots = this.slotsFor.get(cardNumber);
            if (!slots) {
              continue;
            }
            for (const slot of slots) {
              if (slot.takesTableauStack) {
                continue;
              }
              slot.action();
              GameController.store(gameState);
              this.render(gameState);
              return;
            }
          }
        }, 400);
      }
    }
  }

  placeCard(cardNumber, x, y, onArrive) {
    const timeNow = new Date().getTime();
    if (!this.cardHistory.has(cardNumber)) {
      this.cardHistory.set(cardNumber, new Map());
    }
    this.cardHistory.get(cardNumber).set([x, y], timeNow);
    this.renderer.setCardNotDraggable(cardNumber);
    this.renderer.raiseCard(cardNumber);

    const position = this.renderer.getCardPosition(cardNumber);
    this.curves.set(cardNumber, {
      startTime: timeNow,
      endTime: timeNow + CURVE_TIME,
      startX: position[0],
      startY: position[1],
      startV: position[2], // TODO .. just store the vector
      endX: x,
      endY: y,
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
    return (click) => {aborted = true; return this.release(cards, click, gameState)};
  }

  release(cards, click, gameState) {
    const cardNumber = cards[0];
    let slots = this.slotsFor.get(cardNumber);
    if (slots) {
      // if click ... priority is (age-> usefulness -> proximity)
      // otherwise it is proximity
      if (click) {
        let oldest = Number.MAX_VALUE;
        let oldestSlots = [];
        for (const slot of slots) {
          if (cards.length === 1 || slot.takesTableauStack) {
            const cardHistory = this.cardHistory.get(cardNumber);
            const key = [slot.x, slot.y];
            const time = cardHistory.has(key) ? cardHistory.get(key) : Number.MIN_VALUE;
            if (time === oldest) {
              oldestSlots.push(slot);
            } else if (time < oldest) {
              oldest = time;
              oldestSlots = [slot];
            }
          }
        }
        if (oldestSlots) {
          slots = oldestSlots;
        }

        let mostUseful = Number.MIN_VALUE;
        let mostUsefulSlots = [];
        for (const slot of slots) {
          if (cards.length === 1 || slot.takesTableauStack) {
            const useful = slot.useful;
            if (useful === mostUseful) {
              mostUsefulSlots.push(slot);
            } else if (useful > mostUseful) {
              mostUseful = useful;
              mostUsefulSlots = [slot];
            }
          }
        }
        if (mostUsefulSlots) {
          slots = mostUsefulSlots;
        }
      }
      const position = this.renderer.getCardPosition(cardNumber);
      let closest = Number.MAX_VALUE;
      let closetSlot;
      for (const slot of slots) {
        if (cards.length === 1 || slot.takesTableauStack) {
          const distance = Math.pow(position[0] - slot.x, 2) + Math.pow(position[1] - slot.y, 2);
          if (distance < closest) {
            closest = distance;
            closetSlot = slot;
          }
        }
      }
      if (closetSlot) {
        closetSlot.action();
      }
    }
    GameStore.store(gameState);
    this.render(gameState);
  }
}
