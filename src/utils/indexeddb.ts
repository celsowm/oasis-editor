/**
 * Simple Promise-based wrapper for IndexedDB operations.
 */

export interface IndexedDBOptions {
  name: string;
  version: number;
  onUpgrade: (
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number | null,
  ) => void;
}

export function openDB(options: IndexedDBOptions): Promise<IDBDatabase> {
  return new Promise((resolve, reject): void => {
    const request = indexedDB.open(options.name, options.version);

    request.onerror = (): void => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = (): void => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event): void => {
      const db = request.result;
      options.onUpgrade(db, event.oldVersion, event.newVersion);
    };
  });
}

export function putItem<T>(
  db: IDBDatabase,
  storeName: string,
  key: string,
  value: T,
): Promise<void> {
  return new Promise((resolve, reject): void => {
    try {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);

      request.onerror = (): void => {
        reject(
          new Error(
            `Failed to put item in ${storeName}: ${request.error?.message}`,
          ),
        );
      };

      transaction.oncomplete = (): void => {
        resolve();
      };
      transaction.onabort = transaction.onerror = (): void => {
        reject(
          new Error(
            `Transaction failed putting item in ${storeName}: ${transaction.error?.message}`,
          ),
        );
      };
    } catch (err) {
      reject(err);
    }
  });
}

export function getItem<T>(
  db: IDBDatabase,
  storeName: string,
  key: string,
): Promise<T | null> {
  return new Promise((resolve, reject): void => {
    try {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = (): void => {
        reject(
          new Error(
            `Failed to get item from ${storeName}: ${request.error?.message}`,
          ),
        );
      };

      request.onsuccess = (): void => {
        resolve(request.result ?? null);
      };
    } catch (err) {
      reject(err);
    }
  });
}

export function deleteItem(
  db: IDBDatabase,
  storeName: string,
  key: string,
): Promise<void> {
  return new Promise((resolve, reject): void => {
    try {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = (): void => {
        reject(
          new Error(
            `Failed to delete item from ${storeName}: ${request.error?.message}`,
          ),
        );
      };

      transaction.oncomplete = (): void => {
        resolve();
      };
      transaction.onabort = transaction.onerror = (): void => {
        reject(
          new Error(
            `Transaction failed deleting item from ${storeName}: ${transaction.error?.message}`,
          ),
        );
      };
    } catch (err) {
      reject(err);
    }
  });
}
