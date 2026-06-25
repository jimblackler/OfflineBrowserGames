import {assertDefined} from '../common/check/defined';
import type {Renderer, DragHandler} from './renderer';
import {getSuit, getType, NUMBER_CARDS} from './rules';
import {BLANK_ROW, CARDBACK_COLUMN, CARD_HEIGHT, CARD_WIDTH, INDICATOR_HEIGHT, INDICATOR_WIDTH, INDICATOR_X, INDICATOR_Y, PLACEHOLDER_COLUMN} from './spriteConstants';

const INDICATOR_OFFSET_X = -4;
const INDICATOR_OFFSET_Y = -3;
const HEIGHT_EFFECT = 0.5;

export function createRendererDom(gameDiv: HTMLElement): Renderer {
  const cardImages: HTMLSpanElement[] = [];
  const placeholdersDiv = document.createElement('div');
  gameDiv.appendChild(placeholdersDiv);
  const cardsDiv = document.createElement('div');
  gameDiv.appendChild(cardsDiv);
  let activeShadows = 0;
  let isDragging = false;
  let click = false;
  let mouseX = 0;
  let mouseY = 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragHandler: DragHandler;

  function positionCard(cardNumber: number, x: number, y: number, z: number) {
    const cardImage = assertDefined(cardImages[cardNumber]);
    cardsDiv.appendChild(cardImage);
    cardImage.style.left = `${x}px`;
    cardImage.style.top = `${y - z * HEIGHT_EFFECT}px`;
    if (z) {
      if (!cardImage.style.boxShadow) {
        activeShadows++;
      }
      cardImage.style.boxShadow =
          `rgba(0, 0, 0, 0.497656) 0 0 12px inset, rgba(0, 0, 0, ${0.4 / activeShadows}) 4px ${z}px 5px`;
      cardImage.style.zIndex = String(Math.floor(z * 100));
    } else {
      if (cardImage.style.boxShadow) {
        activeShadows--;
        cardImage.style.boxShadow = '';
      }
      cardImage.style.zIndex = '0';
    }
  }

  for (let idx = 0; idx !== NUMBER_CARDS; idx++) {
    const cardImage = document.createElement('span');
    cardImage.style.width = `${CARD_WIDTH}px`;
    cardImage.style.height = `${CARD_HEIGHT}px`;
    cardImage.style.pointerEvents = 'none';
    cardImage.className = 'card';
    cardImages[idx] = cardImage;
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
    if (isDragging) {
      dragHandler.drag(evt.clientX - dragStartX, evt.clientY - dragStartY);
    }
    click = false;
    mouseX = evt.clientX;
    mouseY = evt.clientY;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      dragHandler.endDrag(click);
      isDragging = false;
    }
  });

  function _setClickable(
      image: HTMLSpanElement,
      mouseDownFunction: ((ev: MouseEvent) => void) | null,
      clickFunction: ((ev: MouseEvent) => void) | null
  ) {
    function highlight() {
      if (isDragging) {
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
    }

    const rect = image.getBoundingClientRect();
    if (mouseX >= rect.left && mouseX <= rect.right &&
        mouseY >= rect.top && mouseY <= rect.bottom) {
      highlight();
    }
    image.onmouseover = highlight;
  }

  return {
    placeHolder(x, y, onClick) {
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
    },

    setFaceUp(cardNumber, faceUp) {
      const cardImage = assertDefined(cardImages[cardNumber]);
      if (faceUp) {
        const suit = getSuit(cardNumber);
        const type = getType(cardNumber);
        cardImage.style.backgroundPosition = `-${CARD_WIDTH * type}px -${CARD_HEIGHT * suit}px`;
      } else {
        cardImage.style.backgroundPosition =
            `${CARD_WIDTH * CARDBACK_COLUMN}px -${CARD_HEIGHT * BLANK_ROW}px`;
      }
    },

    setDraggable(cardNumber, draggable) {
      const cardImage = assertDefined(cardImages[cardNumber]);
      if (draggable) {
        _setClickable(cardImage, ev => {
          dragHandler.startDrag(cardNumber);
          click = true;
          hideIndicator();
          isDragging = true;
          dragStartX = ev.clientX;
          dragStartY = ev.clientY;
        }, null);
        cardImage.style.pointerEvents = 'auto';
      } else {
        cardImage.onmousedown = null;
        cardImage.onmouseover = null;
        cardImage.onmouseup = null;
        cardImage.style.pointerEvents = 'none';
      }
    },

    positionCard,

    setDragHandler(handler) {
      dragHandler = handler;
    }
  };
}
