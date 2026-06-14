import type { GameState, SerializedGameState } from './gameState';

export function store(gameState: GameState) {
  const MAX_UNDOS = 3;
  const gamePositionStr = localStorage.getItem('gamePosition');
  let gamePosition = gamePositionStr ? parseInt(gamePositionStr, 10) : 0;
  if (gamePosition > MAX_UNDOS) { // max undos
    localStorage.removeItem(`gamePosition${gamePosition - MAX_UNDOS}`);
  }
  gamePosition++;
  localStorage.setItem('gamePosition', String(gamePosition));
  localStorage.setItem(`gamePosition${gamePosition}`, JSON.stringify(gameState));
}

export function restore(gameState: GameState) {
  const gamePositionStr = localStorage.getItem('gamePosition');
  if (gamePositionStr !== null) {
    try {
      const storedState = localStorage.getItem(`gamePosition${gamePositionStr}`);
      if (storedState) {
        gameState.restore(JSON.parse(storedState) as SerializedGameState);
        return true;
      }
    } catch (err) {
      console.log(err);
    }
  }
  return false;
}

export function erase() {
  localStorage.removeItem('gamePosition');
}
