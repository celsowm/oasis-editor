import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { PersistenceService } from "../../../app/services/PersistenceService.js";
import { createEditorDocument, createEditorParagraph } from "../../../core/editorState.js";

describe("PersistenceService", () => {
  let service: PersistenceService;

  beforeEach(() => {
    service = new PersistenceService();
  });

  afterEach(async () => {
    service.close();
    const req = indexedDB.deleteDatabase("oasis-editor-db");
    await new Promise((resolve) => {
      req.onsuccess = resolve;
      req.onerror = resolve;
    });
  });

  it("should save and load a document", async () => {
    const doc = createEditorDocument([createEditorParagraph("Hello Persistence")]);
    await service.saveDocument(doc);

    const loaded = await service.loadDocument();
    expect(loaded).toEqual(doc);
  });

  it("should return null when no document is saved", async () => {
    const loaded = await service.loadDocument();
    expect(loaded).toBeNull();
  });

  it("should clear the saved document", async () => {
    const doc = createEditorDocument([createEditorParagraph("To be cleared")]);
    await service.saveDocument(doc);
    await service.clearDocument();

    const loaded = await service.loadDocument();
    expect(loaded).toBeNull();
  });

  it("should handle updates to the same document", async () => {
    const doc1 = createEditorDocument([createEditorParagraph("Version 1")]);
    await service.saveDocument(doc1);

    const doc2 = { ...doc1, blocks: [createEditorParagraph("Version 2")] };
    await service.saveDocument(doc2);

    const loaded = await service.loadDocument();
    expect(loaded).toEqual(doc2);
  });
});
