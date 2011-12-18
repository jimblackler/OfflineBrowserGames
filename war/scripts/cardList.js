var CardList = function(data) {
  if (data) {
    this.cards = data.cards;
  } else {
    this.cards = [];
  }
};

CardList.prototype.add = function(cardNumber) {
  this.cards.push(cardNumber);
};

CardList.prototype.pushFront = function(cardNumber) {
  return this.cards.splice(0, 0, cardNumber);
};

CardList.prototype.asArray = function() {
  return this.cards;
};

CardList.prototype.get = function(idx) {
  return this.cards[idx];
};

CardList.prototype.length = function() {
  return this.cards.length;
};

CardList.prototype.pop = function() {
  return this.cards.pop();
};

CardList.prototype.indexOf = function(cardNumber) {
  return this.cards.indexOf(cardNumber);
}

CardList.prototype.remove = function(cardNumber) {
  var idx = this.indexOf(cardNumber);
  if (idx == -1) {
    return false;
  } else {
    this.cards.splice(idx, 1);
    return true;
  }
}

CardList.prototype.shuffle = function(random) {
  var array = this.cards;
  var tmp;
  var current;
  var top = array.length;

  if (top) {
    while (--top) {
      current = Math.floor(random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
    }
  }
};
