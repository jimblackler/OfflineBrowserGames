import {clearStore, deleteValue, getStore, getValue, setValue} from './database';
import type {GameState} from './gameState';

const MAX_UNDOS = 3;

export async function store(gameState: GameState): Promise<void> {
  const gamePosition =
      await getValue<number>(await getStore('session', 'readwrite'), 'gamePosition') ?? 0;
  const historyStore = await getStore('history', 'readwrite');
  if (gamePosition > MAX_UNDOS) {
    await deleteValue(historyStore, gamePosition - MAX_UNDOS);
  }
  const nextPosition = gamePosition + 1;
  await setValue(historyStore, nextPosition, gameState);
  await setValue(await getStore('session', 'readwrite'), 'gamePosition', nextPosition);
}

export async function restore() {
  const sessionStore = await getStore('session', 'readonly');
  const gamePosition = await getValue<number>(sessionStore, 'gamePosition');
  if (gamePosition !== undefined) {
    const historyStore = await getStore('history', 'readonly');
    return getValue<GameState>(historyStore, gamePosition);
  }
  return undefined;
}

export async function erase(): Promise<void> {
  await setValue(await getStore('session', 'readwrite'), 'gamePosition', 0);
  await clearStore(await getStore('history', 'readwrite'));
}
