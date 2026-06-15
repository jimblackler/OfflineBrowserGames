/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

export const NUMBER_CARDS = 52;
export const NUMBER_TABLEAUS = 7;
const ACE_TYPE = 0;
const KING_TYPE = 12;
const NUMBER_CARDS_IN_SUIT = 13;
export const NUMBER_FOUNDATIONS = 4;

function getCard(suit: number, type: number) {
  return suit * NUMBER_CARDS_IN_SUIT + type;
}

export function getSuit(cardNumber: number) {
  return Math.floor(cardNumber / NUMBER_CARDS_IN_SUIT);
}

export function getType(cardNumber: number) {
  return cardNumber % NUMBER_CARDS_IN_SUIT;
}

export function canPlaceOnInTableau(cardNumber: number | undefined) {
  if (cardNumber === undefined) {
    // Empty tableau ... will take Kings.
    return [getCard(0, KING_TYPE), getCard(1, KING_TYPE),
      getCard(2, KING_TYPE), getCard(3, KING_TYPE)];
  }
  const type = getType(cardNumber);
  if (type === ACE_TYPE) {
    return []; // Nothing goes on aces.
  }
  return getSuit(cardNumber) < 2
      ? [getCard(2, type - 1), getCard(3, type - 1)]
      : [getCard(0, type - 1), getCard(1, type - 1)];
}

export function canPlaceOnInFoundation(cardNumber: number | undefined) {
  if (cardNumber === undefined) {
    // Empty foundation ... will take Aces.
    return [getCard(0, ACE_TYPE), getCard(1, ACE_TYPE),
        getCard(2, ACE_TYPE), getCard(3, ACE_TYPE)];
  }
  const type = getType(cardNumber);
  if (type === KING_TYPE) {
    return []; // Nothing goes on kings.
  }
  return [getCard(getSuit(cardNumber), type + 1)];
}
