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
import {Rules} from './rules';

const CARD_WIDTH = 103;
const CARD_HEIGHT = 143;
const INDICATOR_WIDTH = 109;
const INDICATOR_HEIGHT = 149;
const INDICATOR_X = 1;
const INDICATOR_Y = 716;
const INDICATOR_OFFSET_X = -4;
const INDICATOR_OFFSET_Y = -3;
const BLANK_ROW = 4;
const CARDBACK_COLUMN = 0;
const PLACEHOLDER_COLUMN = 1;

type DragHandler = {
  cardClickedOrDropped(card: number | undefined, click: boolean): void;
  startDrag(cardNumber: number): number[];
};

export type Renderer = ReturnType<typeof createRenderer>;

export function createRenderer(gameDiv: HTMLElement) {
  const cardImages: HTMLSpanElement[] = [];
  const cardVPos: number[] = [];
  const placeholdersDiv = document.createElement('div');
  gameDiv.appendChild(placeholdersDiv);
  const cardsDiv = document.createElement('div');
  gameDiv.appendChild(cardsDiv);
  let activeShadows = 0;
  let draggingCards: number[] = [];
  let click = false;
  let mouseX = 0;
  let mouseY = 0;
  let dragHandler: DragHandler;

  for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
    const cardImage = document.createElement('span');
    cardImage.style.width = `${CARD_WIDTH}px`;
    cardImage.style.height = `${CARD_HEIGHT}px`;
    cardImage.style.pointerEvents = 'none';
    cardImage.className = 'card';
    cardImages[idx] = cardImage;
    cardVPos[idx] = 0;
    cardsDiv.appendChild(cardImage);
  }

  const selectionIndicator = document.createElement('span');
  selectionIndicator.className = 'indicator';
  selectionIndicator.style.width = `${INDICATOR_WIDTH}px`;
  selectionIndicator.style.height = `${INDICATOR_HEIGHT}px`;
  selectionIndicator.style.backgroundPosition = `-${INDICATOR_X}px -${INDICATOR_Y}px`;

  function hideIndicator() {
    selectionIndicator.style.display = 'none';
  }

  hideIndicator();
  gameDiv.append(selectionIndicator);

  document.addEventListener('mousemove', evt => {
    for (const card of draggingCards) {
      const position = getCardPosition(card);
      positionCard(card, position[0] + evt.clientX - mouseX,
          position[1] + evt.clientY - mouseY, position[2]);
    }
    click = false;
    mouseX = evt.clientX;
    mouseY = evt.clientY;
  });

  document.addEventListener('mouseup', () => {
    if (draggingCards.length > 0) {
      dragHandler.cardClickedOrDropped(draggingCards[0], click);
    }
    draggingCards = [];
  });

  function _setClickable(
    image: HTMLSpanElement,
    mouseDownFunction: ((ev: MouseEvent) => void) | null,
    clickFunction: ((ev: MouseEvent) => void) | null
  ) {
    function highlight() {
      if (draggingCards.length) {
        return;
      }
      selectionIndicator.style.left = `${image.offsetLeft + INDICATOR_OFFSET_X}px`;
      selectionIndicator.style.top = `${image.offsetTop + INDICATOR_OFFSET_Y}px`;
      if (image.parentNode) {
        image.parentNode.insertBefore(selectionIndicator, image.nextSibling);
      }
      selectionIndicator.style.display = 'block';
      selectionIndicator.onmousedown = mouseDownFunction;
      image.onmousedown = mouseDownFunction;
      selectionIndicator.onclick = clickFunction;
      image.onclick = clickFunction;
      selectionIndicator.onmouseout = () => hideIndicator();
    };

    const rect = image.getBoundingClientRect();
    if (mouseX >= rect.left && mouseX <= rect.right &&
        mouseY >= rect.top && mouseY <= rect.bottom) {
      highlight();
    }
    image.onmouseover = highlight;
  }

  function getCardPosition(cardNumber: number): [number, number, number] {
    const cardImage = assertDefined(cardImages[cardNumber]);
    const vPos = cardVPos[cardNumber] ?? 0;
    return [cardImage.offsetLeft, cardImage.offsetTop + vPos, vPos];
  }

  function positionCard(cardNumber: number, x: number, y: number, v: number) {
    const cardImage = assertDefined(cardImages[cardNumber]);
    cardVPos[cardNumber] = v;
    cardImage.style.left = `${x}px`;
    cardImage.style.top = `${y - v}px`;
    if (v) {
      if (!cardImage.style.boxShadow) {
        activeShadows++;
      }
      cardImage.style.boxShadow =
          `rgba(0, 0, 0, 0.497656) 0 0 12px inset, rgba(0, 0, 0, ${0.4 / activeShadows}) 4px ${v}px 5px`;
      cardImage.style.zIndex = '1';
    } else {
      if (cardImage.style.boxShadow) {
        activeShadows--;
        cardImage.style.boxShadow = '';
      }
      cardImage.style.zIndex = '0';
    }
  }

  return {
    placeHolder(x: number, y: number, onClick: ((ev: MouseEvent) => void) | null) {
      const image = document.createElement('span');
      image.style.width = `${CARD_WIDTH}px`;
      image.style.height = `${CARD_HEIGHT}px`;
      image.className = 'placeholder';
      image.style.backgroundPosition =
          `-${CARD_WIDTH * PLACEHOLDER_COLUMN}px -${CARD_HEIGHT * BLANK_ROW}px`;
      image.style.left = `${x}px`;
      image.style.top = `${y}px`;
      if (onClick) {
        _setClickable(image, null, onClick);
      }
      placeholdersDiv.appendChild(image);
      return image;
    },

    hideIndicator,

    faceDown(cardNumber: number) {
      const cardImage = assertDefined(cardImages[cardNumber]);
      cardImage.style.backgroundPosition =
          `${CARD_WIDTH * CARDBACK_COLUMN}px -${CARD_HEIGHT * BLANK_ROW}px`;
    },

    faceUp(cardNumber: number) {
      const suit = Rules.getSuit(cardNumber);
      const type = Rules.getType(cardNumber);
      const cardImage = assertDefined(cardImages[cardNumber]);
      cardImage.style.backgroundPosition = `-${CARD_WIDTH * type}px -${CARD_HEIGHT * suit}px`;
    },

    setDraggable(cardNumber: number, draggable: boolean) {
      const cardImage = assertDefined(cardImages[cardNumber]);
      if (draggable) {
        _setClickable(cardImage, () => {
          const cards = dragHandler.startDrag(cardNumber);
          click = true;
          hideIndicator();
          draggingCards = cards;
        }, null);
        cardImage.style.pointerEvents = 'auto';
      } else {
        cardImage.onmousedown = null;
        cardImage.onmouseover = null;
        cardImage.onmouseup = null;
        cardImage.style.pointerEvents = 'none';
      }
    },

    raiseCard(cardNumber: number) {
      const cardImage = assertDefined(cardImages[cardNumber]);
      cardsDiv.removeChild(cardImage);
      cardsDiv.appendChild(cardImage);
    },

    getCardPosition,
    positionCard,

    setDragHandler(handler: DragHandler) {
      dragHandler = handler;
    }
  };
}
