/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

import alea from 'alea';
import {assertDefined} from '../common/check/defined';
import {type CardList, createCardList} from './cardList';
import {Rules} from './rules';

export const MOVE_TYPE = {
  DRAW: 1,
  TO_TABLEAU: 2,
  TO_FOUNDATION: 3,
} as const;

export type MoveType = typeof MOVE_TYPE[keyof typeof MOVE_TYPE];

export type GameRules = {
  cardsToDraw: number;
};

export type SerializedGameState = {
  deck: { cards: number[] };
  stock: { cards: number[] };
  rules: GameRules;
  tableausFaceDown: { cards: number[] }[];
  tableausFaceUp: { cards: number[] }[];
  waste: { cards: number[] };
  foundations: { cards: number[] }[];
};

export type Action = {
  moveType: typeof MOVE_TYPE.DRAW;
} | {
  moveType: typeof MOVE_TYPE.TO_TABLEAU | typeof MOVE_TYPE.TO_FOUNDATION;
  card: number;
  destinationIdx: number;
};

export type GameState = {
  deck: CardList;
  stock: CardList;
  rules: GameRules;
  tableausFaceDown: CardList[];
  tableausFaceUp: CardList[];
  waste: CardList;
  foundations: CardList[];

  restore(data: SerializedGameState): boolean;
  newGame(rules: GameRules): void;
  execute(action: Action): void;
  isComplete(): boolean;
  getActions(): Map<number, Set<Action>>;
  getAllActions(): Set<Action>;
  normalKey(): string;
  definitelyUncompletable(): boolean;
  getStack(cardNumber: number): number[];
}

export function createGameState(): GameState {
  let deck: CardList;
  let stock: CardList;
  let rules: GameRules;
  let tableausFaceDown: CardList[] = [];
  let tableausFaceUp: CardList[] = [];
  let waste: CardList;
  let foundations: CardList[] = [];

  function _draw() {
    if (stock.length() === 0) {
      while (waste.length()) {
        const drawn = assertDefined(waste.pop());
        stock.add(drawn);
      }
    } else {
      // X cards from stock to waste.
      for (let idx = 0; idx !== rules.cardsToDraw && stock.length(); idx++) {
        const drawn = assertDefined(stock.pop());
        waste.add(drawn);
      }
    }
  }

  function remove(cardNumber: number) {
    // In tableau cards?
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      const tableau = assertDefined(tableausFaceUp[tableauIdx]);
      if (tableau.remove(cardNumber)) {
        // Reveal undercard if needed.
        if (tableau.length() === 0) {
          const tableauFaceDown = assertDefined(tableausFaceDown[tableauIdx]);
          if (tableauFaceDown.length() > 0) {
            const popped = assertDefined(tableauFaceDown.pop());
            tableau.pushFront(popped);
          }
        }
        return true;
      }
    }
    // In stock cards?
    if (stock.remove(cardNumber)) {
      return true;
    }

    // In waste cards?
    if (waste.remove(cardNumber)) {
      return true;
    }

    // Foundations
    for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
      const foundation = assertDefined(foundations[idx]);
      if (foundation.remove(cardNumber)) {
        return true;
      }
    }

    return false;
  }

  function stackedUnder(cardNumber: number) {
    // In tableau cards?
    for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
      const tableau = assertDefined(tableausFaceUp[tableauIdx]);
      const idx = tableau.indexOf(cardNumber);
      if (idx !== -1 && idx < tableau.length() - 1) {
        const val = assertDefined(tableau.get(idx + 1));
        return val;
      }
    }
    return null;
  }

  function _moveToTableau(cardNumber: number, tableauIdx: number) {
    let movingCard: number | null = cardNumber;
    const tableau = assertDefined(tableausFaceUp[tableauIdx]);
    do {
      const stackedOn = stackedUnder(movingCard);
      if (remove(movingCard)) {
        tableau.add(movingCard);
      }
      movingCard = stackedOn;
    } while (movingCard !== null);
  }

  function _moveToFoundation(cardNumber: number, foundationIdx: number) {
    if (remove(cardNumber)) {
      const foundation = assertDefined(foundations[foundationIdx]);
      foundation.add(cardNumber);
    }
  }

  return {
    get deck() { return deck; },
    set deck(val) { deck = val; },
    get stock() { return stock; },
    set stock(val) { stock = val; },
    get rules() { return rules; },
    set rules(val) { rules = val; },
    get tableausFaceDown() { return tableausFaceDown; },
    set tableausFaceDown(val) { tableausFaceDown = val; },
    get tableausFaceUp() { return tableausFaceUp; },
    set tableausFaceUp(val) { tableausFaceUp = val; },
    get waste() { return waste; },
    set waste(val) { waste = val; },
    get foundations() { return foundations; },
    set foundations(val) { foundations = val; },

    getStack(cardNumber: number) {
      let card: number | null = cardNumber;
      const cards: number[] = [];
      while (card !== null) {
        cards.push(card);
        card = stackedUnder(card);
      }
      return cards;
    },

    restore(data: SerializedGameState) {
      deck = createCardList(data.deck);
      stock = createCardList(data.stock);
      rules = data.rules;
      tableausFaceDown = [];
      for (let idx = 0; idx !== data.tableausFaceDown.length; idx++) {
        tableausFaceDown.push(createCardList(data.tableausFaceDown[idx]));
      }
      tableausFaceUp = [];
      for (let idx = 0; idx !== data.tableausFaceUp.length; idx++) {
        tableausFaceUp.push(createCardList(data.tableausFaceUp[idx]));
      }
      waste = createCardList(data.waste);
      foundations = [];
      for (let idx = 0; idx !== data.foundations.length; idx++) {
        foundations.push(createCardList(data.foundations[idx]));
      }
      return true;
    },

    newGame(r: GameRules) {
      deck = createCardList();
      stock = createCardList();
      tableausFaceDown = [];
      tableausFaceUp = [];
      waste = createCardList();
      foundations = [];
      rules = r;

      // Add cards to deck
      for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
        deck.add(idx);
      }

      const random = alea(localStorage.getItem('seed'));

      deck.shuffle(random);

      // Tableaus.
      for (let tableau = 0; tableau !== Rules.NUMBER_TABLEAUS; tableau++) {
        const faceDownList = createCardList();
        tableausFaceDown[tableau] = faceDownList;
        for (let position = 0; position <= tableau - 1; position++) {
          const card = assertDefined(deck.pop());
          faceDownList.add(card);
        }
        const faceUpList = createCardList();
        tableausFaceUp[tableau] = faceUpList;
        const card = assertDefined(deck.pop());
        faceUpList.add(card);
      }

      // Stock.
      while (deck.length() > 0) {
        const card = assertDefined(deck.pop());
        stock.add(card);
      }

      // Foundations
      for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
        foundations[idx] = createCardList();
      }
    },

    execute(action: Action) {
      switch (action.moveType) {
        case MOVE_TYPE.DRAW:
          _draw();
          break;
        case MOVE_TYPE.TO_TABLEAU:
          _moveToTableau(action.card, action.destinationIdx);
          break;
        case MOVE_TYPE.TO_FOUNDATION:
          _moveToFoundation(action.card, action.destinationIdx);
          break;
        default:
          break;
      }
    },

    isComplete() {
      for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
        const foundation = assertDefined(foundations[foundationIdx]);
        if (foundation.length() !== Rules.NUMBER_CARDS_IN_SUIT) {
          return false;
        }
      }
      return true;
    },

    getActions() {
      const actionsFor = new Map<number, Set<Action>>();
      const movableToTableau = new Set<number>();
      const movableToFoundation = new Set<number>();

      const wasteLength = waste.length();
      if (wasteLength !== 0) {
        const cardNumber = assertDefined(waste.get(wasteLength - 1));
        movableToTableau.add(cardNumber);
        movableToFoundation.add(cardNumber);
      }

      for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
        const foundation = assertDefined(foundations[foundationIdx]);
        const foundationLength = foundation.length();
        if (foundationLength !== 0) {
          const cardNumber = assertDefined(foundation.get(foundationLength - 1));
          movableToTableau.add(cardNumber);
          movableToFoundation.add(cardNumber);
        }
      }

      for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
        const tableau = assertDefined(tableausFaceUp[tableauIdx]);
        const tableauLength = tableau.length();
        for (let position = 0; position < tableauLength; position++) {
          const cardNumber = assertDefined(tableau.get(position));
          movableToTableau.add(cardNumber);
          if (position === tableauLength - 1) {
            movableToFoundation.add(cardNumber);
          }
        }
      }

      const addAction = (action: Action) => {
        if ('card' in action) {
          const {card} = action;
          let actions = actionsFor.get(card);
          if (!actions) {
            actions = new Set<Action>();
            actionsFor.set(card, actions);
          }
          actions.add(action);
        }
      };

      for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
        const foundation = assertDefined(foundations[foundationIdx]);
        const foundationLength = foundation.length();
        let canPlaceOn: number[];
        if (foundationLength === 0) {
          // Empty foundation ... will take Aces
          canPlaceOn = [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
            Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
        } else {
          const cardNumber = assertDefined(foundation.get(foundationLength - 1));
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
        const tableau = assertDefined(tableausFaceUp[tableauIdx]);
        const tableauLength = tableau.length();
        let canPlaceOn: number[];
        if (tableauLength === 0) {
          // Empty tableau ... will take Kings
          canPlaceOn = [Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
            Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE)];
        } else {
          const cardNumber = assertDefined(tableau.get(tableauLength - 1));
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
    },

    getAllActions() {
      const actionsFor = this.getActions();
      const actions = new Set<Action>();
      actions.add({
        moveType: MOVE_TYPE.DRAW,
      });
      for (const entries of actionsFor.values()) {
        for (const action of entries) {
          actions.add(action);
        }
      }
      return actions;
    },

    normalKey() {
      const tableauStrings: string[] = [];
      for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
        const faceDown = assertDefined(tableausFaceDown[tableauIdx]);
        const faceUp = assertDefined(tableausFaceUp[tableauIdx]);
        tableauStrings.push(JSON.stringify(faceDown.cards) + JSON.stringify(faceUp.cards));
      }
      tableauStrings.sort();
      return JSON.stringify(tableauStrings) + JSON.stringify(stock.cards) + JSON.stringify(waste.cards);
    },

    definitelyUncompletable() {
      const playable = new Set<number>();

      // Stock.
      for (const card of stock.asArray()) {
        playable.add(card);
      }
      for (const card of waste.asArray()) {
        playable.add(card);
      }
      // Foundations
      for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
        const foundation = assertDefined(foundations[idx]);
        for (const card of foundation.asArray()) {
          playable.add(card);
        }
      }

      const maybePlayable: number[][] = [];

      // Tableaus.
      for (let tableau = 0; tableau !== Rules.NUMBER_TABLEAUS; tableau++) {
        const list: number[] = [];
        maybePlayable.push(list);
        const faceDown = assertDefined(tableausFaceDown[tableau]);
        for (const card of faceDown.asArray()) {
          list.push(card);
        }
        const faceUp = assertDefined(tableausFaceUp[tableau]);
        const faceUpCards = faceUp.asArray();
        for (let idx = 0; idx < faceUpCards.length; idx++) {
          const card = assertDefined(faceUpCards[idx]);
          if (idx === 0) {
            list.push(card);
          } else {
            playable.add(card);
          }
        }
      }

      while (true) {
        let removedAnything = false;
        let anyCardsRemain = false;
        for (const list of maybePlayable) {
          for (let idx1 = list.length - 1; idx1 >= 0; idx1--) {
            anyCardsRemain = true;
            let isPlayable = false;
            const card = assertDefined(list[idx1]);
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
  };
}
