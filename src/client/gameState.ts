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

export type GameRules = {
  cardsToDraw: number;
};

type DrawAction = {
  moveType: 'draw';
};

type ToTableauAction = {
  moveType: 'toTableau';
  card: number;
  destinationIdx: number;
};

type ToFoundationAction = {
  moveType: 'toFoundation';
  card: number;
  destinationIdx: number;
};

export type Action = DrawAction | ToTableauAction | ToFoundationAction;

export type GameState = {
  stock: number[];
  rules: GameRules;
  tableausFaceDown: number[][];
  tableausFaceUp: number[][];
  waste: number[];
  foundations: number[][];
};

function _draw(gameState: GameState) {
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

function remove(gameState: GameState, cardNumber: number) {
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

function stackedUnder(gameState: GameState, cardNumber: number) {
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

function _moveToTableau(gameState: GameState, cardNumber: number, tableauIdx: number) {
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

function _moveToFoundation(gameState: GameState, cardNumber: number, foundationIdx: number) {
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

export function newGame(rules: GameRules): GameState {
  const gameState: GameState = {
    stock: [],
    rules,
    tableausFaceDown: [],
    tableausFaceUp: [],
    waste: [],
    foundations: [],
  };
  const deck: number[] = Array.from({length: Rules.NUMBER_CARDS}).map((_, idx) => idx);

  const random = alea(localStorage.getItem('seed'));

  shuffle(deck, random);

  // Tableaus.
  for (let tableau = 0; tableau !== Rules.NUMBER_TABLEAUS; tableau++) {
    gameState.tableausFaceDown.push(
      Array.from({length: tableau}).map(() => assertDefined(deck.pop()))
    );
    gameState.tableausFaceUp.push([assertDefined(deck.pop())]);
  }

  // Stock.
  gameState.stock = Array.from({length: deck.length}).map(() => assertDefined(deck.pop()));

  // Foundations
  gameState.foundations = Array.from({length: Rules.NUMBER_FOUNDATIONS}).map(() => []);

  return gameState;
}

export function execute(gameState: GameState, action: Action) {
  switch (action.moveType) {
    case 'draw':
      _draw(gameState);
      break;
    case 'toTableau':
      _moveToTableau(gameState, action.card, action.destinationIdx);
      break;
    case 'toFoundation':
      _moveToFoundation(gameState, action.card, action.destinationIdx);
      break;
    default:
      break;
  }
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

  const addAction = (action: ToTableauAction | ToFoundationAction) => {
    const {card} = action;
    let actions = actionsFor.get(card);
    if (!actions) {
      actions = new Set<Action>();
      actionsFor.set(card, actions);
    }
    actions.add(action);
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
        moveType: 'toFoundation',
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
        moveType: 'toTableau',
        destinationIdx: tableauIdx,
      });
    }
  }
  return actionsFor;
}
