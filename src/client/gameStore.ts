import type { GameState, SerializedGameState } from './gameState';

export const GameStore = {
  store(gameState: GameState) {
    const MAX_UNDOS = 3;
    const gamePositionStr = localStorage.getItem('gamePositionV2');
      let gamePosition = gamePositionStr ? parseInt(gamePositionStr, 10) : 0;
    if (gamePosition > MAX_UNDOS) { // max undos
      localStorage.removeItem(`gamePosition${gamePosition - MAX_UNDOS}`);
    }
    gamePosition++;
    localStorage.setItem('gamePositionV2', String(gamePosition));
    localStorage.setItem(`gamePositionV2${gamePosition}`, JSON.stringify(gameState));
  },

  restore(gameState: GameState) {
    const gamePositionStr = localStorage.getItem('gamePositionV2');
    if (gamePositionStr !== null) {
      try {
        const storedState = localStorage.getItem(`gamePositionV2${gamePositionStr}`);
        if (storedState) {
          gameState.restore(JSON.parse(storedState) as SerializedGameState);
          return true;
        }
      } catch (err) {
        console.log(err);
      }
    }
    return false;
  },

  erase() {
    localStorage.removeItem('gamePosition');
  }
};
