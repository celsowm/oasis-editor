import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { openDB, putItem, getItem, deleteItem } from "../../utils/indexeddb.js";

describe("IndexedDB Utils", () => {
  const DB_NAME = "test-db";
  const STORE_NAME = "test-store";

  beforeEach(async () => {
    // Clear the database before each test if possible, 
    // but fake-indexeddb usually handles isolation well enough if we use different names or just delete it.
    const req = indexedDB.deleteDatabase(DB_NAME);
    await new Promise((resolve) => {
      req.onsuccess = resolve;
      req.onerror = resolve;
    });
  });

  it("should open a database and run onUpgrade", async () => {
    let upgradeCalled = false;
    const db = await openDB({
      name: DB_NAME,
      version: 1,
      onUpgrade: (db) => {
        upgradeCalled = true;
        db.createObjectStore(STORE_NAME);
      },
    });

    expect(db).toBeDefined();
    expect(upgradeCalled).toBe(true);
    db.close();
  });

  it("should put and get items", async () => {
    const db = await openDB({
      name: DB_NAME,
      version: 1,
      onUpgrade: (db) => {
        db.createObjectStore(STORE_NAME);
      },
    });

    const testData = { foo: "bar", baz: 123 };
    await putItem(db, STORE_NAME, "key1", testData);

    const retrieved = await getItem<typeof testData>(db, STORE_NAME, "key1");
    expect(retrieved).toEqual(testData);

    db.close();
  });

  it("should return null for missing items", async () => {
    const db = await openDB({
      name: DB_NAME,
      version: 1,
      onUpgrade: (db) => {
        db.createObjectStore(STORE_NAME);
      },
    });

    const retrieved = await getItem(db, STORE_NAME, "missing");
    expect(retrieved).toBeNull();

    db.close();
  });

  it("should delete items", async () => {
    const db = await openDB({
      name: DB_NAME,
      version: 1,
      onUpgrade: (db) => {
        db.createObjectStore(STORE_NAME);
      },
    });

    await putItem(db, STORE_NAME, "key1", "value1");
    await deleteItem(db, STORE_NAME, "key1");

    const retrieved = await getItem(db, STORE_NAME, "key1");
    expect(retrieved).toBeNull();

    db.close();
  });

  it("should handle transactions and object stores", async () => {
    const db = await openDB({
      name: DB_NAME,
      version: 1,
      onUpgrade: (db) => {
        db.createObjectStore("store1");
        db.createObjectStore("store2");
      },
    });

    await putItem(db, "store1", "a", 1);
    await putItem(db, "store2", "b", 2);

    expect(await getItem(db, "store1", "a")).toBe(1);
    expect(await getItem(db, "store2", "b")).toBe(2);

    db.close();
  });
});
