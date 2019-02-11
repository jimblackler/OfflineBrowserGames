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

  getSuit: function(cardNumber) {
    return Math.floor(cardNumber / Rules.NUMBER_CARDS_IN_SUIT);
  },
  getType: function(cardNumber) {
    return cardNumber % Rules.NUMBER_CARDS_IN_SUIT;
  },
  getCard: function(suit, type) {
    return suit * Rules.NUMBER_CARDS_IN_SUIT + type;
  }
};