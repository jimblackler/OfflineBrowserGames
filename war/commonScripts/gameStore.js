export class GameStore {
  static store(gameState) {
    const MAX_UNDOS = 3;
    if (localStorage["gamePosition"] > MAX_UNDOS) { // max undos
      delete localStorage["gamePosition" + (localStorage["gamePosition"] - MAX_UNDOS)];
    }
    localStorage["gamePosition"]++;
    localStorage["gamePosition" + localStorage["gamePosition"]] = JSON.stringify(gameState);
  }
}