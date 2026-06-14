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
import {remove as removeCard, shuffle} from './cardList';
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

export type Action = {
  moveType: typeof MOVE_TYPE.DRAW;
} | {
  moveType: typeof MOVE_TYPE.TO_TABLEAU | typeof MOVE_TYPE.TO_FOUNDATION;
  card: number;
  destinationIdx: number;
};

export type GameState = {
  stock: number[];
  rules: GameRules;
  tableausFaceDown: number[][];
  tableausFaceUp: number[][];
  waste: number[];
  foundations: number[][];
};

export function createGameState(): GameState {
  return {
    stock: [],
    rules: {cardsToDraw: 1},
    tableausFaceDown: [],
    tableausFaceUp: [],
    waste: [],
    foundations: [],
  };
}

export function _draw(gameState: GameState) {
  if (gameState.stock.length === 0) {
    while (gameState.waste.length > 0) {
      gameState.stock.push(assertDefined(gameState.waste.pop()));
    }
  } else {
    // X cards from stock to waste.
    for (let idx = 0; idx !== gameState.rules.cardsToDraw && gameState.stock.length > 0; idx++) {
      gameState.waste.push(assertDefined(gameState.stock.pop()));
    }
  }
}

export function remove(gameState: GameState, cardNumber: number) {
  // In tableau cards?
  for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
    const tableau = assertDefined(gameState.tableausFaceUp[tableauIdx]);
    if (removeCard(tableau, cardNumber)) {
      // Reveal undercard if needed.
      if (tableau.length === 0) {
        const tableauFaceDown = assertDefined(gameState.tableausFaceDown[tableauIdx]);
        if (tableauFaceDown.length > 0) {
          tableau.unshift(assertDefined(tableauFaceDown.pop()));
        }
      }
      return true;
    }
  }
  // In stock cards?
  if (removeCard(gameState.stock, cardNumber)) {
    return true;
  }

  // In waste cards?
  if (removeCard(gameState.waste, cardNumber)) {
    return true;
  }

  // Foundations
  for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
    const foundation = assertDefined(gameState.foundations[idx]);
    if (removeCard(foundation, cardNumber)) {
      return true;
    }
  }

  return false;
}

export function stackedUnder(gameState: GameState, cardNumber: number) {
  // In tableau cards?
  for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
    const tableau = assertDefined(gameState.tableausFaceUp[tableauIdx]);
    const idx = tableau.indexOf(cardNumber);
    if (idx !== -1 && idx < tableau.length - 1) {
      const val = assertDefined(tableau[idx + 1]);
      return val;
    }
  }
  return null;
}

export function _moveToTableau(gameState: GameState, cardNumber: number, tableauIdx: number) {
  let movingCard: number | null = cardNumber;
  const tableau = assertDefined(gameState.tableausFaceUp[tableauIdx]);
  do {
    const stackedOn = stackedUnder(gameState, movingCard);
    if (remove(gameState, movingCard)) {
      tableau.push(movingCard);
    }
    movingCard = stackedOn;
  } while (movingCard !== null);
}

export function _moveToFoundation(gameState: GameState, cardNumber: number, foundationIdx: number) {
  if (remove(gameState, cardNumber)) {
    const foundation = assertDefined(gameState.foundations[foundationIdx]);
    foundation.push(cardNumber);
  }
}

export function getStack(gameState: GameState, cardNumber: number) {
  let card: number | null = cardNumber;
  const cards: number[] = [];
  while (card !== null) {
    cards.push(card);
    card = stackedUnder(gameState, card);
  }
  return cards;
}

export function restore(gameState: GameState, data: GameState) {
  gameState.stock = [...data.stock];
  gameState.rules = data.rules;
  gameState.tableausFaceDown = data.tableausFaceDown.map(arr => [...arr]);
  gameState.tableausFaceUp = data.tableausFaceUp.map(arr => [...arr]);
  gameState.waste = [...data.waste];
  gameState.foundations = data.foundations.map(arr => [...arr]);
}

export function newGame(gameState: GameState, r: GameRules) {
  const deck: number[] = [];
  gameState.stock = [];
  gameState.tableausFaceDown = [];
  gameState.tableausFaceUp = [];
  gameState.waste = [];
  gameState.foundations = [];
  gameState.rules = r;

  // Add cards to deck
  for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
    deck.push(idx);
  }

  const random = alea(localStorage.getItem('seed'));

  shuffle(deck, random);

  // Tableaus.
  for (let tableau = 0; tableau !== Rules.NUMBER_TABLEAUS; tableau++) {
    const faceDownList: number[] = [];
    gameState.tableausFaceDown[tableau] = faceDownList;
    for (let position = 0; position <= tableau - 1; position++) {
      const card = assertDefined(deck.pop());
      faceDownList.push(card);
    }
    const faceUpList: number[] = [];
    gameState.tableausFaceUp[tableau] = faceUpList;
    const card = assertDefined(deck.pop());
    faceUpList.push(card);
  }

  // Stock.
  while (deck.length > 0) {
    const card = assertDefined(deck.pop());
    gameState.stock.push(card);
  }

  // Foundations
  for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
    gameState.foundations[idx] = [];
  }
}

export function execute(gameState: GameState, action: Action) {
  switch (action.moveType) {
    case MOVE_TYPE.DRAW:
      _draw(gameState);
      break;
    case MOVE_TYPE.TO_TABLEAU:
      _moveToTableau(gameState, action.card, action.destinationIdx);
      break;
    case MOVE_TYPE.TO_FOUNDATION:
      _moveToFoundation(gameState, action.card, action.destinationIdx);
      break;
    default:
      break;
  }
}

export function isComplete(gameState: GameState) {
  for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
    const foundation = assertDefined(gameState.foundations[foundationIdx]);
    if (foundation.length !== Rules.NUMBER_CARDS_IN_SUIT) {
      return false;
    }
  }
  return true;
}

export function getActions(gameState: GameState) {
  const actionsFor = new Map<number, Set<Action>>();
  const movableToTableau = new Set<number>();
  const movableToFoundation = new Set<number>();

  const wasteLength = gameState.waste.length;
  if (wasteLength !== 0) {
    const cardNumber = assertDefined(gameState.waste[wasteLength - 1]);
    movableToTableau.add(cardNumber);
    movableToFoundation.add(cardNumber);
  }

  for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
    const foundation = assertDefined(gameState.foundations[foundationIdx]);
    const foundationLength = foundation.length;
    if (foundationLength !== 0) {
      const cardNumber = assertDefined(foundation[foundationLength - 1]);
      movableToTableau.add(cardNumber);
      movableToFoundation.add(cardNumber);
    }
  }

  for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
    const tableau = assertDefined(gameState.tableausFaceUp[tableauIdx]);
    const tableauLength = tableau.length;
    for (let position = 0; position < tableauLength; position++) {
      const cardNumber = assertDefined(tableau[position]);
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
    const foundation = assertDefined(gameState.foundations[foundationIdx]);
    const foundationLength = foundation.length;
    let canPlaceOn: number[];
    if (foundationLength === 0) {
      // Empty foundation ... will take Aces
      canPlaceOn = [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
        Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
    } else {
      const cardNumber = assertDefined(foundation[foundationLength - 1]);
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
    const tableau = assertDefined(gameState.tableausFaceUp[tableauIdx]);
    const tableauLength = tableau.length;
    let canPlaceOn: number[];
    if (tableauLength === 0) {
      // Empty tableau ... will take Kings
      canPlaceOn = [Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
        Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE)];
    } else {
      const cardNumber = assertDefined(tableau[tableauLength - 1]);
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

export function getAllActions(gameState: GameState) {
  const actionsFor = getActions(gameState);
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
}

export function normalKey(gameState: GameState) {
  const tableauStrings: string[] = [];
  for (let tableauIdx = 0; tableauIdx !== Rules.NUMBER_TABLEAUS; tableauIdx++) {
    const faceDown = assertDefined(gameState.tableausFaceDown[tableauIdx]);
    const faceUp = assertDefined(gameState.tableausFaceUp[tableauIdx]);
    tableauStrings.push(JSON.stringify(faceDown) + JSON.stringify(faceUp));
  }
  tableauStrings.sort();
  return JSON.stringify(tableauStrings) + JSON.stringify(gameState.stock) + JSON.stringify(gameState.waste);
}

export function definitelyUncompletable(gameState: GameState) {
  const playable = new Set<number>();

  // Stock.
  for (const card of gameState.stock) {
    playable.add(card);
  }
  for (const card of gameState.waste) {
    playable.add(card);
  }
  // Foundations
  for (let idx = 0; idx !== Rules.NUMBER_FOUNDATIONS; idx++) {
    const foundation = assertDefined(gameState.foundations[idx]);
    for (const card of foundation) {
      playable.add(card);
    }
  }

  const maybePlayable: number[][] = [];

  // Tableaus.
  for (let tableau = 0; tableau !== Rules.NUMBER_TABLEAUS; tableau++) {
    const list: number[] = [];
    maybePlayable.push(list);
    const faceDown = assertDefined(gameState.tableausFaceDown[tableau]);
    for (const card of faceDown) {
      list.push(card);
    }
    const faceUpCards = assertDefined(gameState.tableausFaceUp[tableau]);
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
