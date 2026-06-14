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

export function remove(cards: number[], cardNumber: number): boolean {
  const idx = cards.indexOf(cardNumber);
  if (idx === -1) {
    return false;
  }
  cards.splice(idx, 1);
  return true;
}

export function shuffle(cards: number[], random: () => number): void {
  let current: number;
  let top = cards.length;

  if (top) {
    while (--top) {
      current = Math.floor(random() * (top + 1));
      const tmp = assertDefined(cards[current]);
      cards[current] = assertDefined(cards[top]);
      cards[top] = tmp;
    }
  }
}
