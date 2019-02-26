/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

import {BaseRenderer} from "../commonScripts/baseRenderer.js";
import {MathUtils} from "./mathUtils.js";
import {Rules} from "./rules.js";

export class Renderer extends BaseRenderer {
  constructor(gameDiv) {
    super();
    this.gameDiv = gameDiv;
    this.STOCK_X = 42;
    this.STOCK_Y = 42;
    this.TABLEAU_X = this.STOCK_X;
    this.TABLEAU_Y = 210;
    this.TABLEAU_X_SPACING = 115;
    this.TABLEAU_Y_SPACING = 25;
    this.FOUNDATION_X = 386;
    this.FOUNDATION_X_SPACING = 115;
    this.FOUNDATION_Y = this.STOCK_Y;
    this.INDICATOR_WIDTH = 109;
    this.INDICATOR_HEIGHT = 149;
    this.INDICATOR_X = 1;
    this.INDICATOR_Y = 716;
    this.INDICATOR_OFFSET_X = -4;
    this.INDICATOR_OFFSET_Y = -3;
    this.WASTE_X = 196;
    this.WASTE_X_SPACING = 22;
    this.WASTE_Y = this.STOCK_Y;
    this.BLANK_ROW = 4;
    this.CARDBACK_COLUMN = 0;
    this.PLACEHOLDER_COLUMN = 1;
    this.CURVE_TIME = 250;

    this.cards = [];
    this.curves = new Map();
    this.cardHistory = new Map();

    this.placeholdersDiv = document.createElement("div");
    this.gameDiv.appendChild(this.placeholdersDiv);
    this.cardsDiv = document.createElement("div");
    this.gameDiv.appendChild(this.cardsDiv);
    this.overlaysDiv = document.createElement("div");
    this.gameDiv.appendChild(this.overlaysDiv);

    for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
      const cardImage = this.makeCard(idx);
      this.cards[idx] = cardImage;
      this.cardsDiv.appendChild(cardImage);
    }

    this.selectionIndicator = this.makeSelectionIndicator();

    const animate = () => {
      requestAnimationFrame(animate);
      const timeNow = new Date().getTime();
      for (const [k, curve] of this.curves) {
        const cardImage = this.cards[k];
        const t = MathUtils.toT(curve.startTime, curve.endTime, timeNow);
        if (t > 1) {
          cardImage.style.left = curve.endX + "px";
          cardImage.style.top = curve.endY + "px";
          this.arrived(cardImage, curve);
          this.curves.delete(k);
        } else {
          const multiplier0 = Math.sin(MathUtils.tInRange(Math.PI / 4, Math.PI / 2, t));
          const multiplier1 = MathUtils.toT(0.5, 1, multiplier0);

          cardImage.style.left = MathUtils.tInRange(curve.startX, curve.endX, multiplier1) + "px";
          cardImage.style.top = MathUtils.tInRange(curve.startY, curve.endY, multiplier1) + "px";
        }
      }
    };

    requestAnimationFrame(animate);

    // Placeholder; stock
    this.stockHolder = this.placeHolder(this.STOCK_X, this.STOCK_Y);
    this.stockOverlay = this.makeOverlay(this.STOCK_X, this.STOCK_Y);

    // Placeholder; tableau
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      this.placeHolder(this.TABLEAU_X + this.TABLEAU_X_SPACING * tableauIdx, this.TABLEAU_Y);
    }

    // Placeholder; foundation
    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      this.placeHolder(this.FOUNDATION_X + this.FOUNDATION_X_SPACING * foundationIdx, this.FOUNDATION_Y);
    }
  }

  placeHolder(x, y) {
    const image = document.createElement("span");
    image.style.width = this.CARD_WIDTH + "px";
    image.style.height = this.CARD_HEIGHT + "px";
    image.className = "placeholder";
    image.style.backgroundPosition = "-" + this.CARD_WIDTH * this.PLACEHOLDER_COLUMN + "px -" +
        this.CARD_HEIGHT * this.BLANK_ROW + "px";
    image.style.left = x + "px";
    image.style.top = y + "px";
    this.placeholdersDiv.appendChild(image);
    return image;
  }

  makeOverlay(x, y) {
    const image = document.createElement("span");
    image.style.width = this.CARD_WIDTH + "px";
    image.style.height = this.CARD_HEIGHT + "px";
    image.className = "overlay";
    image.style.left = x + "px";
    image.style.top = y + "px";
    this.overlaysDiv.appendChild(image);
    return image;
  }

  makeCard(cardNumber) {
    const cardImage = document.createElement("span");
    cardImage.style.width = this.CARD_WIDTH + "px";
    cardImage.style.height = this.CARD_HEIGHT + "px";
    cardImage.className = "card";
    this.faceDown(cardImage);
    return cardImage;
  }

  hideIndicator() {
    this.selectionIndicator.style.display = "none";
  }

  makeSelectionIndicator() {
    const selectionIndicator = document.createElement("span");
    selectionIndicator.className = "indicator";
    selectionIndicator.style.width = this.INDICATOR_WIDTH + "px";
    selectionIndicator.style.height = this.INDICATOR_HEIGHT + "px";
    selectionIndicator.style.backgroundPosition = "-" + this.INDICATOR_X + "px " + "-" + this.INDICATOR_Y + "px";
    return selectionIndicator;
  }

  faceDown(cardImage) {
    cardImage.style.backgroundPosition =
        this.CARD_WIDTH * this.CARDBACK_COLUMN + "px -" + this.CARD_HEIGHT * this.BLANK_ROW + "px";
  }

  faceUp(cardImage, cardNumber) {
    const suit = Rules.getSuit(cardNumber);
    const type = Rules.getType(cardNumber);
    cardImage.style.backgroundPosition = "-" + this.CARD_WIDTH * type + "px " + "-" + this.CARD_HEIGHT * suit + "px";
  }

  placeCard(cardNumber, x, y, onArrive) {
    if (!this.cardHistory.has(cardNumber)) {
      this.cardHistory.set(cardNumber, new Map());
    }
    this.cardHistory.get(cardNumber).set([x, y], new Date().getTime());
    const cardImage = this.cards[cardNumber];
    this.setClickable(cardImage, null, null);
    if (Math.round(cardImage.offsetLeft) === Math.round(x) && Math.round(cardImage.offsetTop) === Math.round(y)) {
      cardImage.style.boxShadow = "none";
      cardImage.style.zIndex = 0;
      // There already!
      onArrive();
      return;
    }
    cardImage.style.zIndex = 1;
    const timeNow = new Date().getTime();
    this.curves.set(cardNumber, {
      startTime: timeNow,
      endTime: timeNow + this.CURVE_TIME,
      startX: cardImage.offsetLeft,
      startY: cardImage.offsetTop,
      endX: x,
      endY: y,
      onArrive
    });
  }


  startDrag(cards, gameState, evt) {
    this.firstClientX = evt.clientX;
    this.firstClientY = evt.clientY;

    // Remove all mouseover handlers.
    for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
      const cardImage = this.cards[idx];
      cardImage.onmousemove = null;
      cardImage.onclick = null;
    }
    this.hideIndicator();
    this.firstDrag = true;

    const mousemove = evt => {
      if (this.firstDrag) {
        this.firstDrag = false;
        for (const card of cards) {
          const cardImage = this.cards[card];
          cardImage.style.zIndex = 1;
          cardImage.style.boxShadow =
              "rgba(0, 0, 0, 0.497656) -3px -3px 12px inset, rgba(0, 0, 0, 0.398438) 4px 5px 5px";
        }
      } else {
        for (const card of cards) {
          const cardImage = this.cards[card];
          cardImage.style.left = cardImage.offsetLeft + evt.clientX - this.lastClientX + "px";
          cardImage.style.top = cardImage.offsetTop + evt.clientY - this.lastClientY + "px";
        }
      }
      this.lastClientX = evt.clientX;
      this.lastClientY = evt.clientY;
    };

    const mouseup = evt => {
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
      const click = (this.firstClientX === evt.clientX && this.firstClientY === evt.clientY);
      const cardNumber = cards[0];
      const cardImage = this.cards[cardNumber];
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
        const cx = cardImage.offsetLeft;
        const cy = cardImage.offsetTop;
        let closest = Number.MAX_VALUE;
        let closetSlot;
        for (const slot of slots) {
          if (cards.length === 1 || slot.takesTableauStack) {
            const distance = Math.pow(cx - slot.x, 2) + Math.pow(cy - slot.y, 2);
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
      this.store(gameState);
      this.render(gameState);
    };

    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }

  setClickable(image, mouseDownFunction, clickFunction) {
    if (clickFunction || mouseDownFunction) {
      image.onmousemove = evt => {
        this.selectionIndicator.style.left = image.offsetLeft + this.INDICATOR_OFFSET_X + "px";
        this.selectionIndicator.style.top = image.offsetTop + this.INDICATOR_OFFSET_Y + "px";
        image.parentNode.insertBefore(this.selectionIndicator, image.nextSibling);
        this.selectionIndicator.style.display = "block";
        this.selectionIndicator.onmousedown = mouseDownFunction;
        image.onmousedown = mouseDownFunction;
        this.selectionIndicator.onclick = clickFunction;
        image.onclick = clickFunction;
        this.selectionIndicator.onmouseout = evt => this.hideIndicator();
      };

    } else {
      image.onclick = null;
      image.onmousemove = null;
      image.onmousedown = null;
    }
  }

  raise(cardImage) {
    this.cardsDiv.removeChild(cardImage);
    this.cardsDiv.appendChild(cardImage);
  }

  arrived(cardImage, curve) {
    cardImage.style.boxShadow = "none";
    cardImage.style.zIndex = 0;
    curve.onArrive();
  }

  render(gameState) {
    this.slotsFor = new Map();

    // Stop all animations immediately (old onArrive functions are invalid)
    for (const [k, curve] of this.curves) {
      const cardImage = this.cards[k];
      cardImage.style.left = curve.endX + "px";
      cardImage.style.top = curve.endY + "px";
      this.arrived(cardImage, curve);
      this.curves.delete(k);
    }

    // Position foundation cards.
    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      const foundation = gameState.foundations[foundationIdx];
      const x = this.FOUNDATION_X + this.FOUNDATION_X_SPACING * foundationIdx;
      const foundationLength = foundation.length();
      if (foundationLength === 0) {
        // Empty foundation ... will take Aces
        const canPlaceOn = [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
          Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
        for (const other of canPlaceOn) {
          const slotsFor = this.slotsFor.has(other) ? this.slotsFor.get(other) : [];
          slotsFor.push({
            x: x,
            y: this.FOUNDATION_Y,
            action: () => gameState.moveToFoundation(other, foundationIdx),
            useful: 3,
            takesTableauStack: false
          });

          this.slotsFor.set(other, slotsFor);
        }
      } else {
        for (let position = 0; position < foundationLength; position++) {
          const cardNumber = foundation.get(position);
          const cardImage = this.cards[cardNumber];
          let onArrive;
          if (position === foundationLength - 1) {
            const cards = [cardNumber];

            onArrive = () => {
              this.faceUp(cardImage, cardNumber);
              this.setClickable(cardImage, evt => this.startDrag(cards, gameState, evt));
            };

            const canPlaceOn = Rules.canPlaceOnInFoundation(cardNumber);
            for (const other of canPlaceOn) {
              const slotsFor = this.slotsFor.has(other) ? this.slotsFor.get(other) : [];
              slotsFor.push({
                x,
                y: this.FOUNDATION_Y,
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

          this.placeCard(cardNumber, x, this.FOUNDATION_Y, onArrive);
          this.raise(cardImage);
        }
      }
    }

    // Position tableau cards.
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {

      let tableau = gameState.tableausFaceDown[tableauIdx];
      const faceDownLength = tableau.length();
      for (let position = 0; position < faceDownLength; position++) {
        const cardNumber = tableau.get(position);
        const cardImage = this.cards[cardNumber];
        this.placeCard(cardNumber, this.TABLEAU_X + this.TABLEAU_X_SPACING * tableauIdx,
            this.TABLEAU_Y + this.TABLEAU_Y_SPACING * position, () => {
            });
        this.faceDown(cardImage, cardNumber);
        this.raise(cardImage);
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
            x: this.TABLEAU_X + this.TABLEAU_X_SPACING * tableauIdx,
            y: this.TABLEAU_Y,
            action: () => gameState.moveToTableau(other, tableauIdx),
            useful: 2,
            takesTableauStack: true
          });
          this.slotsFor.set(other, slotsFor);
        }
      } else {
        for (let position = 0; position < tableauLength; position++) {
          const cardNumber = tableau.get(position);
          const cardImage = this.cards[cardNumber];
          const cards = tableau.asArray().slice(position);
          if (position === tableauLength - 1) {
            const canPlaceOn = Rules.canPlaceOnInTableau(cardNumber);
            for (const other of canPlaceOn) {
              const slotsFor = this.slotsFor.has(other) ? this.slotsFor.get(other) : [];
              slotsFor.push({
                x: this.TABLEAU_X + this.TABLEAU_X_SPACING * tableauIdx,
                y: this.TABLEAU_Y + this.TABLEAU_Y_SPACING * (position + faceDownLength + 1),
                action: () => gameState.moveToTableau(other, tableauIdx),
                useful: 2,
                takesTableauStack: true
              });
              this.slotsFor.set(other, slotsFor);
            }
          }

          const onArrive = () => {
            this.faceUp(cardImage, cardNumber);
            this.setClickable(cardImage, evt => this.startDrag(cards, gameState, evt));
          };

          this.placeCard(cardNumber, this.TABLEAU_X + this.TABLEAU_X_SPACING * tableauIdx,
              this.TABLEAU_Y + this.TABLEAU_Y_SPACING * (position + faceDownLength), onArrive);
          this.raise(cardImage);
        }
      }
    }

    // Position stock cards.
    const stockLength = gameState.stock.length();

    for (let idx = 0; idx !== stockLength; idx++) {
      const cardNumber = gameState.stock.get(idx);
      const cardImage = this.cards[cardNumber];
      this.faceDown(cardImage);
      this.raise(cardImage);
      this.placeCard(cardNumber, this.STOCK_X, this.STOCK_Y, () => {
      });
    }

    this.setClickable(this.stockOverlay, null, () => {
      gameState.draw();
      this.store(gameState);
      this.render(gameState);
    });

    // Position waste cards.
    const wasteLength = gameState.waste.length();
    for (let idx = 0; idx !== wasteLength; idx++) {
      const cardNumber = gameState.waste.get(idx);
      const cardImage = this.cards[cardNumber];
      let onArrive;
      if (idx === wasteLength - 1) {
        const cards = [];
        cards.push(cardNumber);
        onArrive = () => {
          this.setClickable(cardImage, evt => this.startDrag(cards, gameState, evt));
          this.faceUp(cardImage, cardNumber);
        };
      } else {
        onArrive = () => this.faceUp(cardImage, cardNumber);
      }
      this.raise(cardImage);
      let position = idx - (wasteLength - Math.min(gameState.rules.cardsToDraw, wasteLength));
      if (position < 0) {
        position = 0;
      }
      this.placeCard(cardNumber, this.WASTE_X + this.WASTE_X_SPACING * position, this.WASTE_Y, onArrive);
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
              this.store(gameState);
              this.render(gameState);
              return;
            }
          }
        }, 400);
      }
    }
  }

  store(gameState) {
    const MAX_UNDOS = 3;
    if (localStorage["gamePosition"] > MAX_UNDOS) { // max undos
      delete localStorage["gamePosition" + (localStorage["gamePosition"] - MAX_UNDOS)];
    }
    localStorage["gamePosition"]++;
    localStorage["gamePosition" + localStorage["gamePosition"]] = JSON.stringify(gameState);
  }
}
