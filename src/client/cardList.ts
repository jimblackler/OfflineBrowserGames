/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

import {assertDefined} from '../common/check/defined';

export class CardList {
  cards: number[];

  constructor(data?: { cards: number[] }) {
    this.cards = data ? data.cards : [];
  }

  add(cardNumber: number) {
    this.cards.push(cardNumber);
  }

  pushFront(cardNumber: number) {
    return this.cards.splice(0, 0, cardNumber);
  }

  asArray() {
    return this.cards;
  }

  get(idx: number) {
    return this.cards[idx];
  }

  length() {
    return this.cards.length;
  }

  pop() {
    return this.cards.pop();
  }

  top() {
    return this.cards[this.cards.length - 1];
  }

  indexOf(cardNumber: number) {
    return this.cards.indexOf(cardNumber);
  }

  remove(cardNumber: number) {
    const idx = this.indexOf(cardNumber);
    if (idx === -1) {
      return false;
    }
    this.cards.splice(idx, 1);
    return true;
  }

  shuffle(random: () => number) {
    const array = this.cards;
    let current: number;
    let top = array.length;

    if (top) {
      while (--top) {
        current = Math.floor(random() * (top + 1));
        const tmp = assertDefined(array[current]);
        array[current] = assertDefined(array[top]);
        array[top] = tmp;
      }
    }
  }
}
