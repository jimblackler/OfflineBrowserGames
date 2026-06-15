/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

export const Rules = {
  NUMBER_CARDS: 52,
  NUMBER_TABLEAUS: 7,
  ACE_TYPE: 0,
  KING_TYPE: 12,
  NUMBER_CARDS_IN_SUIT: 13,
  NUMBER_FOUNDATIONS: 4,

  getSuit(cardNumber: number) {
    return Math.floor(cardNumber / Rules.NUMBER_CARDS_IN_SUIT);
  },
  getType(cardNumber: number) {
    return cardNumber % Rules.NUMBER_CARDS_IN_SUIT;
  },
  getCard(suit: number, type: number) {
    return suit * Rules.NUMBER_CARDS_IN_SUIT + type;
  },
  canPlaceOnInTableau(cardNumber: number | undefined) {
    if (cardNumber === undefined) {
      // Empty tableau ... will take Kings.
      return [Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
        Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE)];
    }
    const type = Rules.getType(cardNumber);
    if (type === Rules.ACE_TYPE) {
      return []; // Nothing goes on aces.
    }
    return Rules.getSuit(cardNumber) < 2
        ? [Rules.getCard(2, type - 1), Rules.getCard(3, type - 1)]
        : [Rules.getCard(0, type - 1), Rules.getCard(1, type - 1)];
  },

  canPlaceOnInFoundation(cardNumber: number | undefined) {
    if (cardNumber === undefined) {
      // Empty foundation ... will take Aces.
      return [Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
          Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE)];
    }
    const type = Rules.getType(cardNumber);
    if (type === Rules.KING_TYPE) {
      return []; // Nothing goes on kings.
    }
    return [Rules.getCard(Rules.getSuit(cardNumber), type + 1)];
  }
};
