const DATABASE_NAME = 'OfflineBrowserGames';
const DATABASE_VERSION = 1;

let databasePromise: Promise<IDBDatabase> | undefined;

function getDatabase() {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const {result: database} = request;
      if (!database.objectStoreNames.contains('preferences')) {
        database.createObjectStore('preferences');
      }
      if (!database.objectStoreNames.contains('session')) {
        database.createObjectStore('session');
      }
      if (!database.objectStoreNames.contains('history')) {
        database.createObjectStore('history');
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error ?? new Error('Database open error'));
    };
  });
  return databasePromise;
}

export async function getStore(storeName: string, mode: IDBTransactionMode) {
  const database = await getDatabase();
  return database.transaction(storeName, mode).objectStore(storeName);
}

export async function getValue<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => {
      resolve(request.result as T ?? undefined);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Get value error'));
    };
  });
}

export async function setValue(store: IDBObjectStore, key: IDBValidKey, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.put(value, key);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Set value error'));
    };
  });
}

export async function deleteValue(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Delete value error'));
    };
  });
}

export async function clearStore(store: IDBObjectStore): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Clear store error'));
    };
  });
}
