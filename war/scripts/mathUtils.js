var MathUtils = {
  toT : function(start, end, value) {
    return (value - start) / (end - start);
  },

  tInRange : function(start, end, t) {
    return t * (end - start) + start;
  }
};