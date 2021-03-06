/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

import {Rules} from "../commonScripts/rules.js";

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

export class Renderer {
  constructor(gameDiv) {
    this.gameDiv = gameDiv;
    this.cardImages = [];
    this.cardVPos = [];
    this.placeholdersDiv = document.createElement("div");
    this.gameDiv.appendChild(this.placeholdersDiv);
    this.cardsDiv = document.createElement("div");
    this.gameDiv.appendChild(this.cardsDiv);
    this.activeShadows = 0;
    this.draggingCards = [];

    for (let idx = 0; idx !== Rules.NUMBER_CARDS; idx++) {
      const cardImage = document.createElement("span");
      cardImage.style.width = CARD_WIDTH + "px";
      cardImage.style.height = CARD_HEIGHT + "px";
      cardImage.style.pointerEvents = "none";
      cardImage.className = "card";
      this.cardImages[idx] = cardImage;
      this.cardVPos[idx] = 0;
      this.cardsDiv.appendChild(cardImage);
    }

    const selectionIndicator = document.createElement("span");
    selectionIndicator.className = "indicator";
    selectionIndicator.style.width = INDICATOR_WIDTH + "px";
    selectionIndicator.style.height = INDICATOR_HEIGHT + "px";
    selectionIndicator.style.backgroundPosition = "-" + INDICATOR_X + "px " + "-" + INDICATOR_Y + "px";
    this.selectionIndicator = selectionIndicator;

    this.hideIndicator();
    this.gameDiv.append(this.selectionIndicator);
    document.addEventListener("mousemove", evt => {
      for (const card of this.draggingCards) {
        const position = this.getCardPosition(card);
        this.positionCard(card, position[0] + evt.clientX - this.mouseX,
            position[1] + evt.clientY - this.mouseY, position[2]);
      }
      this.click = false;
      this.mouseX = evt.clientX;
      this.mouseY = evt.clientY;
    });

    document.addEventListener("mouseup", () => {
      this.dragHandler.cardClickedOrDropped(this.draggingCards[0], this.click);
      this.draggingCards = [];
    });

  }

  placeHolder(x, y, onClick) {
    const image = document.createElement("span");
    image.style.width = CARD_WIDTH + "px";
    image.style.height = CARD_HEIGHT + "px";
    image.className = "placeholder";
    image.style.backgroundPosition = "-" + CARD_WIDTH * PLACEHOLDER_COLUMN + "px -" + CARD_HEIGHT * BLANK_ROW + "px";
    image.style.left = x + "px";
    image.style.top = y + "px";
    if (onClick) {
      this._setClickable(image, null, onClick);
    }
    this.placeholdersDiv.appendChild(image);
    return image;
  }

  hideIndicator() {
    this.selectionIndicator.style.display = "none";
  }

  faceDown(cardNumber) {
    const cardImage = this.cardImages[cardNumber];
    cardImage.style.backgroundPosition =
        CARD_WIDTH * CARDBACK_COLUMN + "px -" + CARD_HEIGHT * BLANK_ROW + "px";
  }

  faceUp(cardNumber) {
    const suit = Rules.getSuit(cardNumber);
    const type = Rules.getType(cardNumber);
    const cardImage = this.cardImages[cardNumber];
    cardImage.style.backgroundPosition = "-" + CARD_WIDTH * type + "px " + "-" + CARD_HEIGHT * suit + "px";
  }

  setDraggable(cardNumber, draggable) {
    const cardImage = this.cardImages[cardNumber];
    if (draggable) {
      this._setClickable(cardImage, () => {
        const cards = this.dragHandler.startDrag(cardNumber);
        this.click = true;
        this.hideIndicator();
        this.draggingCards = cards;
      }, null);
      cardImage.style.pointerEvents = "auto";
    } else {
      cardImage.onmousedown = null;
      cardImage.onmouseover = null;
      cardImage.onmouseup = null;
      cardImage.style.pointerEvents = "none";
    }
  }

  _setClickable(image, mouseDownFunction, clickFunction) {
    const highlight = () => {
      if (this.draggingCards.length) {
        return;
      }
      this.selectionIndicator.style.left = image.offsetLeft + INDICATOR_OFFSET_X + "px";
      this.selectionIndicator.style.top = image.offsetTop + INDICATOR_OFFSET_Y + "px";
      image.parentNode.insertBefore(this.selectionIndicator, image.nextSibling);
      this.selectionIndicator.style.display = "block";
      this.selectionIndicator.onmousedown = mouseDownFunction;
      image.onmousedown = mouseDownFunction;
      this.selectionIndicator.onclick = clickFunction;
      image.onclick = clickFunction;
      this.selectionIndicator.onmouseout = () => this.hideIndicator();
    };

    const rect = image.getBoundingClientRect();
    if (this.mouseX >= rect.left && this.mouseX <= rect.right &&
        this.mouseY >= rect.top && this.mouseY <= rect.bottom) {
      highlight();
    }
    image.onmouseover = highlight;
  }

  raiseCard(cardNumber) {
    const cardImage = this.cardImages[cardNumber];
    this.cardsDiv.removeChild(cardImage);
    this.cardsDiv.appendChild(cardImage);
  }

  getCardPosition(cardNumber) {
    const cardImage = this.cardImages[cardNumber];
    const vPos = this.cardVPos[cardNumber];
    return [cardImage.offsetLeft, cardImage.offsetTop + vPos, vPos];
  }

  positionCard(cardNumber, x, y, v) { // TODO: take vector not components ?
    const cardImage = this.cardImages[cardNumber];
    this.cardVPos[cardNumber] = v;
    cardImage.style.left = x + "px";
    cardImage.style.top = (y - v) + "px";
    if (v) {
      if (!cardImage.style.boxShadow) {
        this.activeShadows++;
      }
      cardImage.style.boxShadow =
          `rgba(0, 0, 0, 0.497656) 0 0 12px inset, rgba(0, 0, 0, ${0.4 / this.activeShadows}) 4px ${v}px 5px`;
      cardImage.style.zIndex = 1;
    } else {
      if (cardImage.style.boxShadow) {
        this.activeShadows--;
        cardImage.style.boxShadow = "";
      }
      cardImage.style.zIndex = 0;
    }
  }

  setDragHandler(dragHandler) {
    this.dragHandler = dragHandler;
  }
}
