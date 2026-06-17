import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditorParagraph } from "@/core/editorState.js";
import {
  DEFAULT_EDITOR_PAGE_SETTINGS,
  type EditorDocument,
} from "@/core/model.js";
import { PersistenceService } from "@/app/services/PersistenceService.js";

const DB_NAME = "oasis-editor-db";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => reject(new Error("IndexedDB delete blocked"));
  });
}

beforeEach(async () => {
  await deleteDatabase(DB_NAME);
});

describe("persistence service", () => {
  it("keeps canonical section document unchanged", async () => {
    const service = new PersistenceService();
    const paragraph = createEditorParagraph("canonical");
    const canonicalDocument: EditorDocument = {
      id: "document:canonical",
      pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
      sections: [
        {
          id: "section:default",
          blocks: [paragraph],
          pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
        },
      ],
    };

    await service.saveDocument(canonicalDocument);
    const loaded = await service.loadDocument();
    service.close();

    expect(loaded).toEqual(canonicalDocument);
  });

  it("clears stored document", async () => {
    const service = new PersistenceService();
    const paragraph = createEditorParagraph("to be cleared");
    const doc: EditorDocument = {
      id: "document:clear",
      pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
      sections: [
        {
          id: "section:default",
          blocks: [paragraph],
          pageSettings: DEFAULT_EDITOR_PAGE_SETTINGS,
        },
      ],
    };

    await service.saveDocument(doc);
    await service.clearDocument();
    const loaded = await service.loadDocument();
    service.close();

    expect(loaded).toBeNull();
  });
});
