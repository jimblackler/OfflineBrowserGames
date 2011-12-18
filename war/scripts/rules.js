var Rules = {
  NUMBER_CARDS : 52,
  NUMBER_TABLEAUS : 7,
  ACE_TYPE : 0,
  KING_TYPE : 12,
  NUMBER_CARDS_IN_SUIT : 13,
  CARDS_TO_DRAW : 3,
  NUMBER_FOUNDATIONS : 4,
  
  getSuit : function(cardNumber) {
    return Math.floor(cardNumber / Rules.NUMBER_CARDS_IN_SUIT);
  },
  getType : function(cardNumber) {
    return cardNumber % Rules.NUMBER_CARDS_IN_SUIT;
  },
  getCard : function(suit, type) {
    return suit * Rules.NUMBER_CARDS_IN_SUIT + type;
  }
};