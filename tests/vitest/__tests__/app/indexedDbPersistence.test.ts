import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorParagraph } from "@/core/editorState.js";
import {
  DEFAULT_EDITOR_PAGE_SETTINGS,
  type EditorDocument,
} from "@/core/model.js";
import { createIndexedDbPersistence } from "@/app/services/indexedDbPersistence.js";

const DB_NAME = "oasis-editor-db";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => reject(new Error("IndexedDB delete blocked"));
  });
}

function makeDocument(id: string, text: string): EditorDocument {
  return {
    id,
    pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
    sections: [
      {
        id: "section:default",
        blocks: [createEditorParagraph(text)],
        pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
      },
    ],
  };
}

beforeEach(async () => {
  await deleteDatabase(DB_NAME);
});

describe("indexedDb persistence", () => {
  it("keeps canonical section document unchanged", async () => {
    const persistence = createIndexedDbPersistence();
    const canonicalDocument = makeDocument("document:canonical", "canonical");

    await persistence.saveDocument(canonicalDocument);
    const loaded = await persistence.loadDocument();
    persistence.close();

    expect(loaded).toEqual(canonicalDocument);
  });

  it("clears stored document", async () => {
    const persistence = createIndexedDbPersistence();
    await persistence.saveDocument(makeDocument("document:clear", "to clear"));
    await persistence.clearDocument();
    const loaded = await persistence.loadDocument();
    persistence.close();

    expect(loaded).toBeNull();
  });

  it("isolates documents stored under distinct keys", async () => {
    const editorA = createIndexedDbPersistence({ key: "editor-a" });
    const editorB = createIndexedDbPersistence({ key: "editor-b" });

    await editorA.saveDocument(makeDocument("document:a", "a"));
    await editorB.saveDocument(makeDocument("document:b", "b"));

    const loadedA = await editorA.loadDocument();
    const loadedB = await editorB.loadDocument();
    editorA.close();
    editorB.close();

    expect(loadedA?.id).toBe("document:a");
    expect(loadedB?.id).toBe("document:b");
  });
});
