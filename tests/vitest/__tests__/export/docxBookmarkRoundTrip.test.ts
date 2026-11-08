import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import { createBookmark, listBookmarks } from "@/core/commands/bookmark.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

describe("bookmark authoring DOCX round-trip", () => {
  it("exports a created bookmark and re-imports it with anchors intact", async () => {
    const paragraph = createEditorParagraph("Hello world");
    const state = createEditorStateFromDocument(
      createEditorDocument([paragraph]),
    );
    const selected = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 0),
        focus: paragraphOffsetToPosition(paragraph, 5),
      },
    };
    const authored = createBookmark(selected, "Greeting");
    expect(listBookmarks(authored)).toHaveLength(1);

    const buffer = await exportEditorDocumentToDocx(authored.document);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    expect(documentXml).toContain('w:name="Greeting"');
    expect(documentXml).toContain("<w:bookmarkStart");
    expect(documentXml).toContain("<w:bookmarkEnd");

    // Re-import: the bookmark comes back with the same name and anchors.
    const imported = await importDocxToEditorDocument(buffer);
    const bookmarks = imported.bookmarks;
    expect(bookmarks).toBeDefined();
    expect(bookmarks!.order).toHaveLength(1);
    const bookmark = bookmarks!.items[bookmarks!.order[0]!]!;
    expect(bookmark.name).toBe("Greeting");
    expect(bookmark.start).toMatchObject({
      paragraphId: imported.sections![0]!.blocks[0]!.id,
      offset: 0,
    });
    expect(bookmark.end).toMatchObject({ offset: 5 });
  });
});
