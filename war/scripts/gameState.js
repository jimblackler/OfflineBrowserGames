/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details. */

var GameState = function(data) {

  if (data) {
    this.deck = new CardList(data.deck);
    this.stock = new CardList(data.stock);
    this.tableausFaceDown = [];
    for ( var idx = 0; idx != data.tableausFaceDown.length; idx++) {
      this.tableausFaceDown.push(new CardList(data.tableausFaceDown[idx]));
    }
    this.tableausFaceUp = [];
    for ( var idx = 0; idx != data.tableausFaceUp.length; idx++) {
      this.tableausFaceUp.push(new CardList(data.tableausFaceUp[idx]));
    }
    this.waste = new CardList(data.waste);
    this.foundations = [];
    for ( var idx = 0; idx != data.foundations.length; idx++) {
      this.foundations.push(new CardList(data.foundations[idx]));
    }
  } else {
    this.deck = new CardList();
    this.stock = new CardList();
    this.tableausFaceDown = [];
    this.tableausFaceUp = [];
    this.waste = new CardList();
    this.foundations = [];
    
    // Add cards to deck
    for ( var idx = 0; idx != Rules.NUMBER_CARDS; idx++) {
      this.deck.add(idx);
    }
    
    var random = Alea(localStorage.seed);
    
    this.deck.shuffle(random);

    // Tableaus.
    for ( var tableau = 0; tableau != Rules.NUMBER_TABLEAUS; tableau++) {
      this.tableausFaceDown[tableau] = new CardList();
      for ( var position = 0; position <= tableau - 1; position++) {
        this.tableausFaceDown[tableau].add(this.deck.pop());
      }
      this.tableausFaceUp[tableau] = new CardList();
      this.tableausFaceUp[tableau].add(this.deck.pop());
    }

    // Stock.
    while (this.deck.length() > 0) {
      this.stock.add(this.deck.pop());
    }

    // Foundations
    for ( var idx = 0; idx != Rules.NUMBER_FOUNDATIONS; idx++) {
      this.foundations[idx] = new CardList();
    }

  }

};

GameState.prototype.draw = function() {
  if (this.stock.length() == 0) {
    while (this.waste.length()) {
      var drawn = this.waste.pop();
      this.stock.add(drawn);
    }
  } else {
    // Three cards from stock to waste.
    for ( var idx = 0; idx != Rules.CARDS_TO_DRAW && this.stock.length(); idx++) {
      var drawn = this.stock.pop();
      this.waste.add(drawn);
    }
  }
}

GameState.prototype.canPlaceOnInTableau = function(cardNumber) {
  var suit = Rules.getSuit(cardNumber);
  var type = Rules.getType(cardNumber);
  if (type == Rules.ACE_TYPE) {
    return []; // Nothing goes on aces.
  }
  if (suit < 2) {
    return [ Rules.getCard(2, type - 1), Rules.getCard(3, type - 1) ];
  } else {
    return [ Rules.getCard(0, type - 1), Rules.getCard(1, type - 1) ];
  }
}

GameState.prototype.canPlaceOnInFoundation = function(cardNumber) {
  var suit = Rules.getSuit(cardNumber);
  var type = Rules.getType(cardNumber);
  if (type == Rules.KING_TYPE) {
    return []; // Nothing goes on kings.
  }
  return [ Rules.getCard(suit, type + 1) ];
}

GameState.prototype.remove = function(cardNumber) {
  // In tableau cards?
  for ( var tableauIdx = 0; tableauIdx != Rules.NUMBER_TABLEAUS; tableauIdx++) {
    var tableau = this.tableausFaceUp[tableauIdx];
    if (tableau.remove(cardNumber)) {
      // Reveal undercard if needed
      if (tableau.length() == 0) {
        var tableauFaceDown = this.tableausFaceDown[tableauIdx];
        if (tableauFaceDown.length() > 0) {
          tableau.pushFront(tableauFaceDown.pop());
        }
      }
      return true;
    }
  }
  // In stock cards?
  if (this.stock.remove(cardNumber)) {
    return true;
  }

  // In waste cards?
  if (this.waste.remove(cardNumber)) {
    return true;
  }

  // Foundations
  for ( var idx = 0; idx != Rules.NUMBER_FOUNDATIONS; idx++) {
    if (this.foundations[idx].remove(cardNumber)) {
      return true;
    }
  }

  return false;
}

GameState.prototype.stackedOn = function(cardNumber) {
  // In tableau cards?
  for ( var tableauIdx = 0; tableauIdx != Rules.NUMBER_TABLEAUS; tableauIdx++) {
    var tableau = this.tableausFaceUp[tableauIdx];
    var idx = tableau.indexOf(cardNumber);
    if (idx != -1 && idx < tableau.length() - 1) {
      return tableau.get(idx + 1);
    }
  }
  return null;
}

GameState.prototype.moveToTableau = function(cardNumber, tableauIdx) {
  var movingCard = cardNumber;

  while (movingCard) {
    var stackedOn = this.stackedOn(movingCard);
    if (this.remove(movingCard)) {
      this.tableausFaceUp[tableauIdx].add(movingCard);
    }
    movingCard = stackedOn;
  }
}

GameState.prototype.moveToFoundation = function(cardNumber, foundationIdx) {
  if (this.remove(cardNumber)) {
    this.foundations[foundationIdx].add(cardNumber);
  }
}

GameState.prototype.kings = function() {
  return [ Rules.getCard(0, Rules.KING_TYPE), Rules.getCard(1, Rules.KING_TYPE),
      Rules.getCard(2, Rules.KING_TYPE), Rules.getCard(3, Rules.KING_TYPE) ];
}

GameState.prototype.aces = function() {
  return [ Rules.getCard(0, Rules.ACE_TYPE), Rules.getCard(1, Rules.ACE_TYPE),
      Rules.getCard(2, Rules.ACE_TYPE), Rules.getCard(3, Rules.ACE_TYPE) ];
}