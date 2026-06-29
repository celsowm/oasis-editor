import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteItem,
  getItem,
  openDB,
  putItem,
} from "@/utils/indexeddb.js";

const DB_NAME = "oasis-editor-wrapper-test";
const STORE = "items";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => reject(new Error("IndexedDB delete blocked"));
  });
}

async function openTestDb(): Promise<IDBDatabase> {
  return openDB({
    name: DB_NAME,
    version: 1,
    onUpgrade: (db) => {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
}

beforeEach(async () => {
  await deleteDatabase(DB_NAME);
});

describe("indexeddb wrapper", () => {
  it("commits a put before resolving (value is readable)", async () => {
    const db = await openTestDb();
    await putItem(db, STORE, "k", { value: 42 });
    const loaded = await getItem<{ value: number }>(db, STORE, "k");
    db.close();
    expect(loaded).toEqual({ value: 42 });
  });

  it("commits a delete before resolving (value is gone)", async () => {
    const db = await openTestDb();
    await putItem(db, STORE, "k", { value: 1 });
    await deleteItem(db, STORE, "k");
    const loaded = await getItem(db, STORE, "k");
    db.close();
    expect(loaded).toBeNull();
  });
});
