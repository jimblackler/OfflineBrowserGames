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
  DRAW: 1,
  TO_TABLEAU: 2,
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

  _draw() {
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

  stackedUnder(cardNumber) {
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

  getStack(cardNumber) {
    let card = cardNumber;
    const cards = [];
    while (card !== null) {
      cards.push(card);
      card = this.stackedUnder(card);
    }
    return cards;
  }

  _moveToTableau(cardNumber, tableauIdx) {
    let movingCard = cardNumber;

    do {
      const stackedOn = this.stackedUnder(movingCard);
      if (this.remove(movingCard)) {
        this.tableausFaceUp[tableauIdx].add(movingCard);
      }
      movingCard = stackedOn;
    } while (movingCard !== null);
  }

  _moveToFoundation(cardNumber, foundationIdx) {
    if (this.remove(cardNumber)) {
      this.foundations[foundationIdx].add(cardNumber);
    }
  }

  execute(action) {
    switch (action.moveType) {
      case MOVE_TYPE.DRAW:
        this._draw();
        break;
      case MOVE_TYPE.TO_TABLEAU:
        this._moveToTableau(action.card, action.destinationIdx);
        break;
      case MOVE_TYPE.TO_FOUNDATION:
        this._moveToFoundation(action.card, action.destinationIdx);
        break;
    }
  }

  isComplete() {
    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      if (this.foundations[foundationIdx].length() !== Rules.NUMBER_CARDS_IN_SUIT) {
        return false;
      }
    }
    return true;
  }

  getActions() {
    const actionsFor = new Map();
    const movableToTableau = new Set();
    const movableToFoundation = new Set();

    const wasteLength = this.waste.length();
    if (wasteLength !== 0) {
      const cardNumber = this.waste.get(wasteLength - 1);
      movableToTableau.add(cardNumber);
      movableToFoundation.add(cardNumber);
    }

    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      const foundation = this.foundations[foundationIdx];
      const foundationLength = foundation.length();
      if (foundationLength !== 0) {
        const cardNumber = foundation.get(foundationLength - 1);
        movableToTableau.add(cardNumber);
        movableToFoundation.add(cardNumber);
      }
    }

    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      const tableau = this.tableausFaceUp[tableauIdx];
      const tableauLength = tableau.length();
      for (let position = 0; position < tableauLength; position++) {
        const cardNumber = tableau.get(position);
        movableToTableau.add(cardNumber);
        if (position === tableauLength - 1) {
          movableToFoundation.add(cardNumber);
        }
      }
    }

    function addAction(action) {
      const card = action.card;
      let actions;
      if (actionsFor.has(card)) {
        actions = actionsFor.get(card);
      } else {
        actions = new Set();
        actionsFor.set(card, actions);
      }
      actions.add(action);
    }

    for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
      const foundation = this.foundations[foundationIdx];
      const foundationLength = foundation.length();
      let canPlaceOn;
      if (foundationLength === 0) {
        // Empty foundation ... will take Aces
        canPlaceOn = [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
          Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
      } else {
        const cardNumber = foundation.get(foundationLength - 1);
        canPlaceOn = Rules.canPlaceOnInFoundation(cardNumber);
      }
      for (const other of canPlaceOn) {
        if (!movableToFoundation.has(other)) {
          continue;
        }
        addAction({
          card: other,
          moveType: MOVE_TYPE.TO_FOUNDATION,
          destinationIdx: foundationIdx
        });
      }
    }

    // Position tableau cards.
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      const tableau = this.tableausFaceUp[tableauIdx];
      const tableauLength = tableau.length();
      let canPlaceOn;
      if (tableauLength === 0) {
        // Empty tableau ... will take Kings
        canPlaceOn = [Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
          Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE)];
      } else {
        const cardNumber = tableau.get(tableauLength - 1);
        canPlaceOn = Rules.canPlaceOnInTableau(cardNumber);
      }
      for (const other of canPlaceOn) {
        if (!movableToTableau.has(other)) {
          continue;
        }

        addAction({
          card: other,
          moveType: MOVE_TYPE.TO_TABLEAU,
          destinationIdx: tableauIdx,
        });
      }
    }
    return actionsFor;
  }

  getAllActions() {
    const actionsFor = this.getActions();
    const actions = new Set();
    actions.add({
      moveType: MOVE_TYPE.DRAW,
    });
    for (const entries of actionsFor.values()) {
      for (const action of entries) {
        actions.add(action);
      }
    }
    return actions;
  }

  normalKey() {
    const tableauStrings = [];
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      tableauStrings.push(JSON.stringify(this.tableausFaceDown[tableauIdx].cards) +
          JSON.stringify(this.tableausFaceUp[tableauIdx].cards));
    }
    tableauStrings.sort();
    return JSON.stringify(tableauStrings) + JSON.stringify(this.stock.cards) + JSON.stringify(this.waste.cards);
  }

  definitelyUncompletable() {
    const playable = new Set();

    // Stock.
    this.stock.asArray().forEach(card => playable.add(card));
    this.waste.asArray().forEach(card => playable.add(card));
    // Foundations
    for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
      this.foundations[idx].asArray().forEach(card => playable.add(card));
    }

    const maybePlayable = [];

    // Tableaus.
    for (let tableau = 0; tableau !== Rules.NUMBER_TABLEAUS; tableau++) {
      const list = [];
      maybePlayable.push(list);
      this.tableausFaceDown[tableau].asArray().forEach(card => list.push(card));
      const faceUp = this.tableausFaceUp[tableau].asArray();
      for (let idx = 0; idx < faceUp.length; idx++) {
        if (idx === 0) {
          list.push(faceUp[idx]);
        } else {
          playable.add(faceUp[idx]);
        }
      }
    }

    while (true) {
      let removedAnything = false;
      let anyCardsRemain = false;
      for (let idx0 = 0; idx0 < maybePlayable.length; idx0++) {

        const list = maybePlayable[idx0];
        for (let idx1 = list.length - 1; idx1 >= 0; idx1--) {
          anyCardsRemain = true;
          let isPlayable = false;
          const card = list[idx1];
          const others = Rules.canPlaceOnInTableau(card).concat(Rules.canPlaceOnInFoundation(card));
          for (const other of others) {
            if (playable.has(other)) {
              isPlayable = true;
              break;
            }
          }
          if (isPlayable) {
            removedAnything = true;
            playable.add(card);
            list.pop();
          } else {
            break;
          }
        }
      }
      if (!anyCardsRemain) {
        return false;
      }
      if (!removedAnything) {
        return true;
      }
    }
  }


}
