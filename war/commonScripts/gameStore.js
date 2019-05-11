export class GameStore {
  static store(gameState) {
    const MAX_UNDOS = 3;
    if (localStorage["gamePosition"] > MAX_UNDOS) { // max undos
      delete localStorage["gamePosition" + (localStorage["gamePosition"] - MAX_UNDOS)];
    }
    localStorage["gamePosition"]++;
    localStorage["gamePosition" + localStorage["gamePosition"]] = JSON.stringify(gameState);
  }

  static restore(gameState) {
    if ("gamePosition" in localStorage) {
      try {
        gameState.restore(JSON.parse(localStorage["gamePosition" + localStorage["gamePosition"]]));
        return true;
      } catch (err) {
        console.log(err);
      }
    }
   return false;
  }

  static erase() {
    delete localStorage["gamePosition"];
  }
}