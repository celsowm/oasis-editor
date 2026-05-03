import { openDB, putItem, getItem, deleteItem } from "../../utils/indexeddb.js";
import type { Editor2Document } from "../../core/model.js";

const DB_NAME = "oasis-editor-2-db";
const STORE_NAME = "documents";
const DOCUMENT_KEY = "current-document";
const DB_VERSION = 1;

export class PersistenceService {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    this.db = await openDB({
      name: DB_NAME,
      version: DB_VERSION,
      onUpgrade: (db) => {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });

    return this.db;
  }

  async saveDocument(doc: Editor2Document): Promise<void> {
    const db = await this.getDB();
    await putItem(db, STORE_NAME, DOCUMENT_KEY, doc);
  }

  async loadDocument(): Promise<Editor2Document | null> {
    const db = await this.getDB();
    return await getItem<Editor2Document>(db, STORE_NAME, DOCUMENT_KEY);
  }

  async clearDocument(): Promise<void> {
    const db = await this.getDB();
    await deleteItem(db, STORE_NAME, DOCUMENT_KEY);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const persistenceService = new PersistenceService();
