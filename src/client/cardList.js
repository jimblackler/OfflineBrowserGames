/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

export class CardList {
  constructor(data) {
    if (data) {
      this.cards = data.cards;
    } else {
      this.cards = [];
    }
  }

  add(cardNumber) {
    this.cards.push(cardNumber);
  }

  pushFront(cardNumber) {
    return this.cards.splice(0, 0, cardNumber);
  }

  asArray() {
    return this.cards;
  }

  get(idx) {
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

  indexOf(cardNumber) {
    return this.cards.indexOf(cardNumber);
  }

  remove(cardNumber) {
    const idx = this.indexOf(cardNumber);
    if (idx === -1) {
      return false;
    } else {
      this.cards.splice(idx, 1);
      return true;
    }
  }

  shuffle(random) {
    const array = this.cards;
    let tmp;
    let current;
    let top = array.length;

    if (top) {
      while (--top) {
        current = Math.floor(random() * (top + 1));
        tmp = array[current];
        array[current] = array[top];
        array[top] = tmp;
      }
    }
  }
}
