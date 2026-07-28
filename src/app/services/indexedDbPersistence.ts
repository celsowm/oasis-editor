import { openDB, putItem, getItem, deleteItem } from "@/utils/indexeddb.js";
import type { EditorDocument } from "@/core/model.js";

const DEFAULT_DB_NAME = "oasis-editor-db";
const DEFAULT_STORE_NAME = "documents";
const DEFAULT_DOCUMENT_KEY = "current-document";
const DB_VERSION = 1;

/** Options for configuring an IndexedDB persistence instance. */
export interface IndexedDbPersistenceOptions {
  /** Key under which the document is stored. Distinct keys isolate editors. */
  key?: string;
  dbName?: string;
  storeName?: string;
}

/** IndexedDB-backed persistence contract for saving and loading documents. */
export interface IndexedDbPersistence {
  /** Persists the document to IndexedDB. */
  saveDocument(doc: EditorDocument): Promise<void>;
  /** Loads the document from IndexedDB, or null if none exists. */
  loadDocument(): Promise<EditorDocument | null>;
  /** Removes the stored document from IndexedDB. */
  clearDocument(): Promise<void>;
  /** Closes the database connection. */
  close(): void;
}

/**
 * Creates an IndexedDB-backed persistence instance. Each call owns its own
 * connection and storage key, so two editors on the same page never share a
 * document slot. There is intentionally no module-level singleton.
 *
 * @param options - Configuration options for the persistence instance.
 * @returns A new IndexedDbPersistence instance.
 */
export function createIndexedDbPersistence(
  options: IndexedDbPersistenceOptions = {},
): IndexedDbPersistence {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  const storeName = options.storeName ?? DEFAULT_STORE_NAME;
  const documentKey = options.key ?? DEFAULT_DOCUMENT_KEY;
  let db: IDBDatabase | null = null;

  async function getDB(): Promise<IDBDatabase> {
    if (db) {
      return db;
    }
    db = await openDB({
      name: dbName,
      version: DB_VERSION,
      onUpgrade: (database): void => {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      },
    });
    return db;
  }

  return {
    async saveDocument(doc: EditorDocument): Promise<void> {
      await putItem(await getDB(), storeName, documentKey, doc);
    },
    async loadDocument(): Promise<EditorDocument | null> {
      return getItem<EditorDocument>(await getDB(), storeName, documentKey);
    },
    async clearDocument(): Promise<void> {
      await deleteItem(await getDB(), storeName, documentKey);
    },
    close(): void {
      if (db) {
        db.close();
        db = null;
      }
    },
  };
}
