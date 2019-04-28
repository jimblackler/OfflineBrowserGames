/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

import {Alea} from "./alea.js";
import {CardList} from "./cardList.js";
import {Rules} from "./rules.js";

export const MOVE_TYPE = {
  TO_TABLEU: 2,
  TO_FOUNDATION: 3,

};

export class GameState {
  restore(data) {
    this.deck = new CardList(data.deck);
    this.stock = new CardList(data.stock);
    this.rules = data.rules;
    this.tableausFaceDown = [];
    for (let idx = 0; idx !== data.tableausFaceDown.length; idx++) {
      this.tableausFaceDown.push(new CardList(data.tableausFaceDown[idx]));
    }
    this.tableausFaceUp = [];
    for (let idx = 0; idx !== data.tableausFaceUp.length; idx++) {
      this.tableausFaceUp.push(new CardList(data.tableausFaceUp[idx]));
    }
    this.waste = new CardList(data.waste);
    this.foundations = [];
    for (let idx = 0; idx !== data.foundations.length; idx++) {
      this.foundations.push(new CardList(data.foundations[idx]));
    }
    return true;
  }

  newGame(rules) {
    this.deck = new CardList();
    this.stock = new CardList();
    this.tableausFaceDown = [];
    this.tableausFaceUp = [];
    this.waste = new CardList();
    this.foundations = [];
    this.rules = rules;

    // Add cards to deck
    for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
      this.deck.add(idx);
    }

    const random = Alea(localStorage["seed"]);

    this.deck.shuffle(random);

    // Tableaus.
    for (let tableau = 0; tableau !== Rules.NUMBER_TABLEAUS; tableau++) {
      this.tableausFaceDown[tableau] = new CardList();
      for (let position = 0; position <= tableau - 1; position++) {
        this.tableausFaceDown[tableau].add(this.deck.pop());
      }
      this.tableausFaceUp[tableau] = new CardList();
      this.tableausFaceUp[tableau].add(this.deck.pop());
    }

    // Stock.
    while (this.deck.length() > 0) {
      this.stock.add(this.deck.pop());
    }

    // Foundations
    for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
      this.foundations[idx] = new CardList();
    }

  }

  draw() {
    if (this.stock.length() === 0) {
      while (this.waste.length()) {
        const drawn = this.waste.pop();
        this.stock.add(drawn);
      }
    } else {
      // X cards from stock to waste.
      for (let idx = 0; idx !== this.rules.cardsToDraw && this.stock.length(); idx++) {
        const drawn = this.stock.pop();
        this.waste.add(drawn);
      }
    }
  }

  remove(cardNumber) {
    // In tableau cards?
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      const tableau = this.tableausFaceUp[tableauIdx];
      if (tableau.remove(cardNumber)) {
        // Reveal undercard if needed.
        if (tableau.length() === 0) {
          const tableauFaceDown = this.tableausFaceDown[tableauIdx];
          if (tableauFaceDown.length() > 0) {
            tableau.pushFront(tableauFaceDown.pop());
          }
        }
        return true;
      }
    }
    // In stock cards?
    if (this.stock.remove(cardNumber)) {
      return true;
    }

    // In waste cards?
    if (this.waste.remove(cardNumber)) {
      return true;
    }

    // Foundations
    for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
      if (this.foundations[idx].remove(cardNumber)) {
        return true;
      }
    }

    return false;
  }

  stackedOn(cardNumber) {
    // In tableau cards?
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      const tableau = this.tableausFaceUp[tableauIdx];
      const idx = tableau.indexOf(cardNumber);
      if (idx !== -1 && idx < tableau.length() - 1) {
        return tableau.get(idx + 1);
      }
    }
    return null;
  }

  _moveToTableau(cardNumber, tableauIdx) {
    let movingCard = cardNumber;

    while (movingCard) {
      const stackedOn = this.stackedOn(movingCard);
      if (this.remove(movingCard)) {
        this.tableausFaceUp[tableauIdx].add(movingCard);
      }
      movingCard = stackedOn;
    }
  }

  _moveToFoundation(cardNumber, foundationIdx) {
    if (this.remove(cardNumber)) {
      this.foundations[foundationIdx].add(cardNumber);
    }
  }

  execute(action) {
    if (action.moveType === MOVE_TYPE.TO_TABLEU) {
      this._moveToTableau(action.card, action.destinationIdx);
    } else if (action.moveType === MOVE_TYPE.TO_FOUNDATION) {
      this._moveToFoundation(action.card, action.destinationIdx);
    }
  }

  getActions() {
    const actionsFor = new Map();

    function addAction(action) {
      let actions;
      const other = action.card;
      if (actionsFor.has(other)) {
        actions = actionsFor.get(other)
      } else {
        actions = new Set();
        actionsFor.set(other, actions);
      }
      actions.add(action);
    }

    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      const foundation = this.foundations[foundationIdx];
      const foundationLength = foundation.length();
      if (foundationLength === 0) {
        // Empty foundation ... will take Aces
        const canPlaceOn = [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
          Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
        for (const other of canPlaceOn) {
          addAction({
            card: other,
            moveType: MOVE_TYPE.TO_FOUNDATION,
            destinationIdx: foundationIdx
          });
        }
      } else {
        for (let position = 0; position < foundationLength; position++) {
          const cardNumber = foundation.get(position);

          let onArrive;
          if (position === foundationLength - 1) {
            const cards = [cardNumber];
            const canPlaceOn = Rules.canPlaceOnInFoundation(cardNumber);
            for (const other of canPlaceOn) {
              addAction({
                card: other,
                moveType: MOVE_TYPE.TO_FOUNDATION,
                destinationIdx: foundationIdx,
              });
            }
          }
        }
      }
    }

    // Position tableau cards.
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {

      let tableau = this.tableausFaceDown[tableauIdx];
      const faceDownLength = tableau.length();

      tableau = this.tableausFaceUp[tableauIdx];
      const tableauLength = tableau.length();
      if (tableauLength === 0) {
        // Empty tableau ... will take Kings
        const canPlaceOn = [Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
          Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE)];
        for (const other of canPlaceOn) {
          addAction({
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
              addAction({
                card: other,
                moveType: MOVE_TYPE.TO_TABLEU,
                destinationIdx: tableauIdx,
              });
            }
          }
        }
      }
    }
    return actionsFor;
  }
}
