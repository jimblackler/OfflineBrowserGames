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
      return assertDefined(tableau[idx + 1]);
    }
  }
  return undefined;
}

export function getStack(gameState: GameState, cardNumber: number) {
  let card: number | undefined = cardNumber;
  const cards: number[] = [];
  while (card !== undefined) {
    cards.push(card);
    card = stackedUnder(gameState, card);
  }
  return cards;
}

export function newGame(rules: GameRules): GameState {
  const deck: number[] = Array.from({length: Rules.NUMBER_CARDS}).map((_, idx) => idx);
  shuffle(deck, alea(localStorage.getItem('seed')));

  return {
    rules,
    tableausFaceDown: Array.from({length: Rules.NUMBER_TABLEAUS}).map((_, tableau) =>
        Array.from({length: tableau}).map(() => assertDefined(deck.pop()))
    ),
    tableausFaceUp: Array.from({length: Rules.NUMBER_TABLEAUS}).map(() => [
      assertDefined(deck.pop())
    ]),
    waste: [],
    foundations: Array.from({length: Rules.NUMBER_FOUNDATIONS}).map(() => []),
    stock: deck
  };
}

export function execute(gameState: GameState, action: Action) {
  switch (action.moveType) {
    case 'draw':
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
      break;
    case 'toTableau': {
      let movingCard: number | undefined = action.card;
      const tableau = assertDefined(gameState.tableausFaceUp[action.destinationIdx]);
      do {
        const stackedOn = stackedUnder(gameState, movingCard);
        if (remove(gameState, movingCard)) {
          tableau.push(movingCard);
        }
        movingCard = stackedOn;
      } while (movingCard !== undefined);
      break;
    }
    case 'toFoundation':
      if (remove(gameState, action.card)) {
        const foundation = assertDefined(gameState.foundations[action.destinationIdx]);
        foundation.push(action.card);
      }
      break;
    default:
      throw Error('Unknown action move type');
  }
}

export function getActions(gameState: GameState) {
  const actionsFor = new Map<number, Set<Action>>();
  const movableToTableau = new Set<number>();
  const movableToFoundation = new Set<number>();

  const wasteCard = gameState.waste.at(-1);
  if (wasteCard !== undefined) {
    movableToTableau.add(wasteCard);
    movableToFoundation.add(wasteCard);
  }

  for (const foundation of gameState.foundations) {
    const foundationCard = foundation.at(-1);
    if (foundationCard !== undefined) {
      movableToTableau.add(foundationCard);
      movableToFoundation.add(foundationCard);
    }
  }

  for (const tableau of gameState.tableausFaceUp) {
    for (const cardNumber of tableau) {
      movableToTableau.add(cardNumber);
    }
    const lastCard = tableau.at(-1);
    if (lastCard !== undefined) {
      movableToFoundation.add(lastCard);
    }
  }

  function addAction(action: ToTableauAction | ToFoundationAction) {
    const {card} = action;
    let actions = actionsFor.get(card);
    if (!actions) {
      actions = new Set<Action>();
      actionsFor.set(card, actions);
    }
    actions.add(action);
  }

  for (let foundationIdx = 0; foundationIdx !== Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
    const foundation = assertDefined(gameState.foundations[foundationIdx]);
    const cardNumber = foundation.at(-1);
    let canPlaceOn: number[];
    if (cardNumber === undefined) {
      // Empty foundation ... will take Aces
      canPlaceOn = [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
        Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
    } else {
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
    const cardNumber = tableau.at(-1);
    let canPlaceOn: number[];
    if (cardNumber === undefined) {
      // Empty tableau ... will take Kings
      canPlaceOn = [Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
        Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE)];
    } else {
      canPlaceOn = Rules.canPlaceOnInTableau(cardNumber);
    }
    for (const other of canPlaceOn) {
      if (!movableToTableau.has(other)) {
        continue;
      }

      addAction({
        card: other,
        moveType: 'toTableau',
        destinationIdx: tableauIdx
      });
    }
  }
  return actionsFor;
}
