/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

var Renderer = function (gameDiv) {
  this.gameDiv = gameDiv;
  this.CARD_WIDTH = 103;
  this.CARD_HEIGHT = 143;
  this.STOCK_X = 42;
  this.STOCK_Y = 42;
  this.TABLEAU_X = this.STOCK_X;
  this.TABLEAU_Y = 210;
  this.TABLEAU_X_SPACING = 115;
  this.TABLEAU_Y_SPACING = 25;
  this.FOUNDATION_X = 386;
  this.FOUNDATION_X_SPACING = 115;
  this.FOUNDATION_Y = this.STOCK_Y;
  this.INDICATOR_WIDTH = 109;
  this.INDICATOR_HEIGHT = 149;
  this.INDICATOR_X = 1;
  this.INDICATOR_Y = 716;
  this.INDICATOR_OFFSET_X = -4;
  this.INDICATOR_OFFSET_Y = -3;
  this.WASTE_X = 196;
  this.WASTE_X_SPACING = 22;
  this.WASTE_Y = this.STOCK_Y;
  this.BLANK_ROW = 4;
  this.CARDBACK_COLUMN = 0;
  this.PLACEHOLDER_COLUMN = 1;
  this.CURVE_TIME = 250;
  this.ANIMATION_RATE = 60;

  this.cards = [];
  this.curves = {};
  this.cardHistory = {};

  this.placeholdersDiv = document.createElement("div");
  this.gameDiv.appendChild(this.placeholdersDiv);
  this.cardsDiv = document.createElement("div");
  this.gameDiv.appendChild(this.cardsDiv);
  this.overlaysDiv = document.createElement("div");
  this.gameDiv.appendChild(this.overlaysDiv);

  for (var idx = 0; idx != Rules.NUMBER_CARDS; idx++) {
    var cardImage = this.makeCard(idx);
    this.cards[idx] = cardImage;
    this.cardsDiv.appendChild(cardImage);
  }

  var outer = this;

  this.selectionIndicator = this.makeSelectionIndicator();
  
  function animate() {
    window.setTimeout(animate, 1000 / this.ANIMATION_RATE);
    var timeNow = new Date().getTime();
    for (k in outer.curves) {
      var curve = outer.curves[k];
      var cardImage = outer.cards[k];
      var t = MathUtils.toT(curve.startTime, curve.endTime, timeNow);
      if (t > 1) {
        cardImage.style.left = curve.endX + "px";
        cardImage.style.top = curve.endY + "px";
        outer.arrived(cardImage, curve);
        delete outer.curves[k];        
      } else {
        var mutliplier0 = Math.sin(MathUtils.tInRange(Math.PI / 4, Math.PI / 2, t));
        var multiplier1 = MathUtils.toT(0.5, 1, mutliplier0);

        cardImage.style.left = MathUtils.tInRange(curve.startX, curve.endX, multiplier1) + "px";
        cardImage.style.top = MathUtils.tInRange(curve.startY, curve.endY, multiplier1) + "px";
      }
    }
  }
  window.setTimeout(animate, 1000 / this.ANIMATION_RATE);
  
  // Placeholder; stock
  this.stockHolder = this.placeHolder(this.STOCK_X, this.STOCK_Y);
  this.stockOverlay = this.makeOverlay(this.STOCK_X, this.STOCK_Y);

  // Placeholder; tableau
  for (var tableauIdx = 0; tableauIdx != Rules.NUMBER_TABLEAUS; tableauIdx++) {
    this.placeHolder(this.TABLEAU_X + this.TABLEAU_X_SPACING * tableauIdx, outer.TABLEAU_Y);
  }
  
  // Placeholder; foundation
  for (var foundationIdx = 0; foundationIdx != Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
    this.placeHolder(this.FOUNDATION_X + this.FOUNDATION_X_SPACING * foundationIdx,
        outer.FOUNDATION_Y);
  }
};

Renderer.prototype.placeHolder = function (x, y) {
  var image = document.createElement("span");
  image.style.width = this.CARD_WIDTH + "px";
  image.style.height = this.CARD_HEIGHT + "px";
  image.className = "placeholder";
  image.style.backgroundPosition = "-" + this.CARD_WIDTH * this.PLACEHOLDER_COLUMN + "px -" +
      this.CARD_HEIGHT * this.BLANK_ROW + "px";
  image.style.left = x + "px";
  image.style.top = y + "px";        
  this.placeholdersDiv.appendChild(image);
  return image;
}

Renderer.prototype.makeOverlay = function (x, y) {
  var image = document.createElement("span");
  image.style.width = this.CARD_WIDTH + "px";
  image.style.height = this.CARD_HEIGHT + "px";
  image.className = "overlay";
  image.style.left = x + "px";
  image.style.top = y + "px";        
  this.overlaysDiv.appendChild(image);
  return image;
}


Renderer.prototype.makeCard = function (cardNumber) {
  var cardImage = document.createElement("span");
  cardImage.style.width = this.CARD_WIDTH + "px";
  cardImage.style.height = this.CARD_HEIGHT + "px";
  cardImage.className = "card";
  this.faceDown(cardImage);
  return cardImage;
}

Renderer.prototype.hideIndicator = function () {
  this.selectionIndicator.style.display = "none";
}

Renderer.prototype.makeSelectionIndicator = function () {
  var selectionIndicator = document.createElement("span");
  selectionIndicator.className = "indicator";
  selectionIndicator.style.width = this.INDICATOR_WIDTH + "px";
  selectionIndicator.style.height = this.INDICATOR_HEIGHT + "px";
  selectionIndicator.style.backgroundPosition = "-" + this.INDICATOR_X + "px " +
  "-" + this.INDICATOR_Y + "px";

  return selectionIndicator;
}

Renderer.prototype.faceDown = function (cardImage) {
  cardImage.style.backgroundPosition = this.CARD_WIDTH * this.CARDBACK_COLUMN + "px -" +
      this.CARD_HEIGHT * this.BLANK_ROW  + "px";
}

Renderer.prototype.faceUp = function (cardImage, cardNumber) {
  var suit = Rules.getSuit(cardNumber);
  var type = Rules.getType(cardNumber);
  cardImage.style.backgroundPosition = "-" + this.CARD_WIDTH * type + "px " +
      "-" + this.CARD_HEIGHT * suit + "px";
}

Renderer.prototype.placeCard = function (cardNumber, x, y, onArrive) {
  if (!this.cardHistory.hasOwnProperty(cardNumber)) {
    this.cardHistory[cardNumber] = {};
  }
  this.cardHistory[cardNumber][x + "/" + y] = new Date().getTime();
  var cardImage = this.cards[cardNumber];
  this.setClickable(cardImage, null, null);
  if (Math.round(cardImage.offsetLeft) == Math.round(x) &&
      Math.round(cardImage.offsetTop) == Math.round(y)) {
    cardImage.style.boxShadow = "none";
    cardImage.style.zIndex = 0;
    // There already!
    onArrive();
    return;
  }
  cardImage.style.zIndex = 1;
  var timeNow = new Date().getTime();
  var curve = {
    startTime: timeNow,
    endTime: timeNow + this.CURVE_TIME,
    startX: cardImage.offsetLeft,
    startY: cardImage.offsetTop,
    endX: x,
    endY: y,
    onArrive: onArrive
  };
  this.curves[cardNumber] = curve;
}

Renderer.prototype.startDrag = function (cards, gameState, evt) {  
  this.firstClientX = evt.clientX;
  this.firstClientY = evt.clientY;

  // Remove all mouseover handlers.
  for (var idx = 0; idx != Rules.NUMBER_CARDS; idx++) {
    var cardImage = this.cards[idx];
    cardImage.onmousemove = null;
    cardImage.onclick = null;
  }
  this.hideIndicator();
  this.firstDrag = true;
  var outer = this;
 
  document.onmousemove = function (evt) {
    if (outer.firstDrag) {
      outer.firstDrag = false;
      for (k in cards) {
        var cardImage = outer.cards[cards[k]];
        cardImage.style.zIndex = 1;
        cardImage.style.boxShadow =
            "rgba(0, 0, 0, 0.497656) -3px -3px 12px inset, rgba(0, 0, 0, 0.398438) 4px 5px 5px";
      }
    } else {
      for (k in cards) {
        var cardImage = outer.cards[cards[k]];
        cardImage.style.left = cardImage.offsetLeft + evt.clientX - outer.lastClientX + "px";
        cardImage.style.top = cardImage.offsetTop + evt.clientY - outer.lastClientY + "px";        
      }
    }
    outer.lastClientX = evt.clientX;
    outer.lastClientY = evt.clientY;
  };
  document.onmouseup = function (evt) {
    var click = (outer.firstClientX == evt.clientX && outer.firstClientY == evt.clientY);
    var cardNumber = cards[0];
    var cardImage = outer.cards[cardNumber];
    var slots = outer.slotsFor[cardNumber];
    if (slots) {
      // if click ... priority is (age-> usefulness -> proximity)
      // otherwise it is proximity
      if (click) {
        var oldest = Number.MAX_VALUE;
        var oldestSlots = [];
        for (k in slots) {
          var slot = slots[k];
          if (cards.length == 1 || slot.takesTableauStack) {
            var time = outer.cardHistory[cardNumber][slot.x + "/" + slot.y];
            if (!time) { 
              time = Number.MIN_VALUE;
            }
            if (time == oldest) {
              oldestSlots.push(slot);
            } else if (time < oldest) {
              oldest = time;
              oldestSlots = [slot];
            }
          }
        }
        if (oldestSlots) {
          slots = oldestSlots;
        }

        var mostUseful = Number.MIN_VALUE;
        var mostUsefulSlots = [];
        for (k in slots) {
          var slot = slots[k];
          if (cards.length == 1 || slot.takesTableauStack) {
            var useful = slot.useful;
            if (useful == mostUseful) {
              mostUsefulSlots.push(slot);
            } else if (useful > mostUseful) {
              mostUseful = useful;
              mostUsefulSlots = [slot];
            }
          }
        }
        if (mostUsefulSlots) {
          slots = mostUsefulSlots;
        }
      } 
      var cx = cardImage.offsetLeft;
      var cy = cardImage.offsetTop;
      var closest = Number.MAX_VALUE;
      var closetSlot;
      for (k in slots) {
        var slot = slots[k];
        if (cards.length == 1 || slot.takesTableauStack) {
          var distance = Math.pow(cx - slot.x, 2) + Math.pow(cy - slot.y, 2);
          if (distance < closest) {
            closest = distance;
            closestSlot = slot;
          }
        }
      }
      if (closestSlot) {
        closestSlot.action();
      }
    }
    document.onmousemove = null;
    document.onmouseup = null;
    outer.store(gameState);
    outer.render(gameState);
  };
}

Renderer.prototype.setClickable = function (image, mouseDownFunction, clickFunction) {
  if (clickFunction || mouseDownFunction) {
    var outer = this;
    image.onmousemove = function (evt) {
      outer.selectionIndicator.style.left = image.offsetLeft + outer.INDICATOR_OFFSET_X + "px";
      outer.selectionIndicator.style.top = image.offsetTop + outer.INDICATOR_OFFSET_Y + "px";
      image.parentNode.insertBefore(outer.selectionIndicator, image.nextSibling);
      outer.selectionIndicator.style.display = "block";
      outer.selectionIndicator.onmousedown = mouseDownFunction;
      image.onmousedown = mouseDownFunction;
      outer.selectionIndicator.onclick = clickFunction;
      image.onclick = clickFunction;
      outer.selectionIndicator.onmouseout = function (evt) {
        outer.hideIndicator();
      };
    };
 
  } else {
    image.onclick = null;
    image.onmousemove = null;
    image.onmousedown = null;
  }
}

Renderer.prototype.raise = function (cardImage) {
  this.cardsDiv.removeChild(cardImage);
  this.cardsDiv.appendChild(cardImage);
}

Renderer.prototype.arrived = function (cardImage, curve) {
  cardImage.style.boxShadow = "none";
  cardImage.style.zIndex = 0;
  curve.onArrive();
}

Renderer.prototype.render = function (gameState) {
  this.slotsFor = {};

  // Stop all animations immediately (old onArrive functions are invalid)
  for (k in this.curves) {
    var curve = this.curves[k];
    var cardImage = this.cards[k];
    cardImage.style.left = curve.endX + "px";
    cardImage.style.top = curve.endY + "px";
    this.arrived(cardImage, curve);
    delete this.curves[k];
  }
  
  // Position foundation cards.
  var outer = this;
  for (var foundationIdx = 0; foundationIdx != Rules.NUMBER_FOUNDATIONS; foundationIdx++) {
    var foundation = gameState["foundations"][foundationIdx];
    var x = this.FOUNDATION_X + this.FOUNDATION_X_SPACING * foundationIdx;
    var foundationLength = foundation.length();
    if (foundationLength == 0) {
      // Empty foundation ... will take Aces
      var canPlaceOn = gameState.aces();
      for (k in canPlaceOn) {
        var other = canPlaceOn[k];
        var slotsFor = this.slotsFor[other];
        if (slotsFor == null) {
          slotsFor = [];
        }
        new function (other, foundationIdx, x) {
          slotsFor.push({
            x: x,
            y: outer.FOUNDATION_Y,
            action: function () {
              gameState.moveToFoundation(other, foundationIdx);
            },
            useful: 3,
            takesTableauStack: false
          });
        }(other, foundationIdx, x);
        outer.slotsFor[other] = slotsFor;
      }
    } else for (var position = 0; position < foundationLength; position++) {
      var cardNumber = foundation.get(position);
      var cardImage = outer.cards[cardNumber];      
      var onArrive;
      if (position == foundationLength - 1) {
        var cards = [cardNumber];
        new function (cards, cardImage, cardNumber) {
          onArrive = function () {
            outer.faceUp(cardImage, cardNumber);
            outer.setClickable(cardImage, function (evt) {
              outer.startDrag(cards, gameState, evt);
            });
          };
        }(cards, cardImage, cardNumber);
        var canPlaceOn = gameState.canPlaceOnInFoundation(cardNumber);
        for (k in canPlaceOn) {
          var other = canPlaceOn[k];
          var slotsFor = outer.slotsFor[other];
          if (slotsFor == null) {
            slotsFor = [];
          }
          new function (other, foundationIdx) {
            slotsFor.push({
              x: x,
              y: outer.FOUNDATION_Y,
              action: function () {
                gameState.moveToFoundation(other, foundationIdx);
              },
              useful: 3,
              takesTableauStack: false
            });
          }(other, foundationIdx);
          outer.slotsFor[other] = slotsFor;
        }
      } else {
        onArrive = function (){};
      }
      
      outer.placeCard(cardNumber, x, outer.FOUNDATION_Y, onArrive);
      outer.raise(cardImage);
    }
  }
  
  // Position tableau cards.
  for (var tableauIdx = 0; tableauIdx != Rules.NUMBER_TABLEAUS; tableauIdx++) {
    var tableau = gameState["tableausFaceDown"][tableauIdx];
    var faceDownLength = tableau.length();
    for (var position = 0; position < faceDownLength; position++) {
      var cardNumber = tableau.get(position);
      var cardImage = outer.cards[cardNumber];
      outer.placeCard(cardNumber, outer.TABLEAU_X + outer.TABLEAU_X_SPACING * tableauIdx,
          outer.TABLEAU_Y + outer.TABLEAU_Y_SPACING * position, function(){});
      outer.faceDown(cardImage, cardNumber);
      outer.raise(cardImage);
    }
    var tableau = gameState["tableausFaceUp"][tableauIdx];
    var tableauLength = tableau.length();
    if (tableauLength == 0) {
      // Empty tableau ... will take Kings
      var canPlaceOn = gameState.kings();
      for (k in canPlaceOn) {
        var other = canPlaceOn[k];
        var slotsFor = outer.slotsFor[other];
        if (slotsFor == null) {
          slotsFor = [];
        }
        new function (other, tableauIdx, position) {
          slotsFor.push({
            x: outer.TABLEAU_X + outer.TABLEAU_X_SPACING * tableauIdx,
            y: outer.TABLEAU_Y + outer.TABLEAU_Y_SPACING * 0,
            action: function () {
              gameState.moveToTableau(other, tableauIdx);
            },
            useful: 2,
            takesTableauStack: true
          });
        }(other, tableauIdx, position);
        outer.slotsFor[other] = slotsFor;
      }
    } else for (var position = 0; position < tableauLength; position++) {
      var cardNumber = tableau.get(position);
      var cardImage = outer.cards[cardNumber];
      var onArrive;
      var cards = tableau.asArray().slice(position);
      if (position == tableauLength - 1) {
        var canPlaceOn = gameState.canPlaceOnInTableau(cardNumber);
        for (k in canPlaceOn) {
          var other = canPlaceOn[k];
          var slotsFor = outer.slotsFor[other];
          if (slotsFor == null) {
            slotsFor = [];
          }
          new function (other, tableauIdx, position, faceDownLength) {
            slotsFor.push({
              x: outer.TABLEAU_X + outer.TABLEAU_X_SPACING * tableauIdx,
              y: outer.TABLEAU_Y + outer.TABLEAU_Y_SPACING * (position + faceDownLength + 1),
              action: function () {
                gameState.moveToTableau(other, tableauIdx);
              },
              useful: 2,
              takesTableauStack: true
            });
          }(other, tableauIdx, position, faceDownLength);
          outer.slotsFor[other] = slotsFor;
        }
      }
      new function (cards, cardImage, cardNumber) {
        onArrive = function () {
          outer.faceUp(cardImage, cardNumber);
          outer.setClickable(cardImage, function (evt) {
            outer.startDrag(cards, gameState, evt);
          });
        };
      }(cards, cardImage, cardNumber);
      
      outer.placeCard(cardNumber, outer.TABLEAU_X + outer.TABLEAU_X_SPACING * tableauIdx,
          outer.TABLEAU_Y + outer.TABLEAU_Y_SPACING * (position + faceDownLength), onArrive);
      outer.raise(cardImage);
    }
  }

  // Position stock cards.
  var stockLength = gameState["stock"].length();
  
  for (var idx = 0; idx != stockLength; idx++) {
    var cardNumber = gameState["stock"].get(idx);
    var cardImage = this.cards[cardNumber];
    outer.faceDown(cardImage);
    var clickFunction;

    this.raise(cardImage);
    this.placeCard(cardNumber, this.STOCK_X, this.STOCK_Y, function () { });
      
  }

  this.setClickable(this.stockOverlay, null, function () {
    gameState.draw();
    outer.store(gameState);
    outer.render(gameState);
  });
  
  // Position waste cards.
  var wasteLength = gameState["waste"].length();
  for (var idx = 0; idx != wasteLength; idx++) {
    new function () {
      var cardNumber = gameState["waste"].get(idx);
      var cardImage = outer.cards[cardNumber];
      var onArrive;
      if (idx == wasteLength - 1) {
        var cards = [];
        cards.push(cardNumber);
        onArrive = function () {
          outer.setClickable(cardImage, function (evt) {
            outer.startDrag(cards, gameState, evt);
          }, null);
          outer.faceUp(cardImage, cardNumber);
        }
      } else {
        onArrive = function () {
          outer.faceUp(cardImage, cardNumber);
        };
      }
      outer.raise(cardImage);
      var position = idx - (wasteLength - Math.min(gameState["rules"]["cardsToDraw"], wasteLength));
      if (position < 0) {
        position = 0;
      }
      outer.placeCard(cardNumber, outer.WASTE_X + outer.WASTE_X_SPACING * position,
          outer.WASTE_Y, onArrive);
    }();
  }
  
  // Auto play
  if (gameState["stock"].length() == 0 && gameState["waste"].length() <= 1) {
    var anyFaceDown = false;
    for (var tableauIdx = 0; tableauIdx != Rules.NUMBER_TABLEAUS; tableauIdx++) {
      var tableau = gameState["tableausFaceDown"][tableauIdx];
      if(tableau.length() > 0) {
        anyFaceDown = true;
        break;
      }
    }
    if (!anyFaceDown) {
      window.setTimeout(function(){
        for (var tableauIdx = 0; tableauIdx != Rules.NUMBER_TABLEAUS; tableauIdx++) {
          var tableau = gameState["tableausFaceUp"][tableauIdx];
          if (tableau.length() > 0) {
            position = tableau.length() - 1;
            var cardNumber = tableau.get(position);
            var cardImage = outer.cards[cardNumber];
            var slots = outer.slotsFor[cardNumber];
            if (slots) {
              for (k in slots) {
                var slot = slots[k];
                if (!slot.takesTableauStack) {
                  slot.action();
                  outer.store(gameState);
                  outer.render(gameState);
                  return;
                }
              }
            }
          }
        }
      }, 400);
    }
  }
}

Renderer.prototype.store = function (gameState) {
  var MAX_UNDOS = 3;
  if (localStorage["gamePosition"] > MAX_UNDOS) { // max undos
    delete localStorage["gamePosition" + (localStorage["gamePosition"] - MAX_UNDOS)]; 
  }
  localStorage["gamePosition"]++;
  localStorage["gamePosition" + localStorage["gamePosition"]] = JSON.stringify(gameState);
  
};