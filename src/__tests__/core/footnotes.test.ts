import { describe, it, expect, beforeEach } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  resetEditorIds,
} from "../../core/editorState.js";
import {
  collectFootnoteReferences,
  findFootnoteByParagraphId,
  findFootnoteReference,
  getFootnoteDisplayMarker,
  renumberFootnotes,
} from "../../core/footnotes.js";
import {
  deleteFootnote,
  goToFootnoteBody,
  goToFootnoteReference,
  insertFootnote,
} from "../../core/commands/footnotes.js";
import {
  findParagraphLocation,
  getDocumentParagraphs,
  paragraphOffsetToPosition,
} from "../../core/model.js";
import { cloneEditorState } from "../../core/cloneState.js";

beforeEach(() => {
  resetEditorIds();
});

describe("footnote helpers", () => {
  it("getFootnoteDisplayMarker formats different numbering schemes", () => {
    expect(getFootnoteDisplayMarker(1)).toBe("1");
    expect(getFootnoteDisplayMarker(2)).toBe("2");
    expect(getFootnoteDisplayMarker(1, "lowerRoman")).toBe("i");
    expect(getFootnoteDisplayMarker(4, "upperRoman")).toBe("IV");
    expect(getFootnoteDisplayMarker(1, "lowerLetter")).toBe("a");
    expect(getFootnoteDisplayMarker(27, "lowerLetter")).toBe("aa");
    expect(getFootnoteDisplayMarker(1, "symbol")).toBe("*");
    expect(getFootnoteDisplayMarker(7, "symbol")).toBe("**");
  });
});

describe("insertFootnote", () => {
  it("creates a reference run and a body, switching to footnote zone", () => {
    const paragraph = createEditorParagraph("hello world");
    const doc = createEditorDocument([paragraph]);
    const state = createEditorStateFromDocument(doc);

    // Place caret after "hello"
    const stateAtCaret = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 5),
        focus: paragraphOffsetToPosition(paragraph, 5),
      },
    };

    const next = insertFootnote(stateAtCaret);

    // Document should now have footnotes registry with exactly one entry.
    expect(Object.keys(next.document.footnotes?.items ?? {})).toHaveLength(1);

    // There must be an inline reference run with text "1".
    const refs = collectFootnoteReferences(next.document);
    expect(refs).toHaveLength(1);
    expect(refs[0].run.text).toBe("1");
    expect(refs[0].run.footnoteReference?.footnoteId).toBeDefined();
    expect(refs[0].run.styles?.superscript).toBe(true);

    // The state's active zone must be footnote and the caret must be
    // inside the footnote body.
    expect(next.activeZone).toBe("footnote");
    expect(next.activeFootnoteId).toBe(
      refs[0].run.footnoteReference?.footnoteId,
    );
    const bodyParagraphs =
      next.document.footnotes!.items[next.activeFootnoteId!].blocks;
    expect(bodyParagraphs.length).toBeGreaterThanOrEqual(1);
  });

  it("renumbers markers when a second footnote is inserted before the first", () => {
    const paragraph = createEditorParagraph("ABCDE");
    const doc = createEditorDocument([paragraph]);
    const state = createEditorStateFromDocument(doc);

    // Caret at end → insert footnote (becomes "1" after E)
    const atEnd = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 5),
        focus: paragraphOffsetToPosition(paragraph, 5),
      },
    };
    const after1 = insertFootnote(atEnd);

    // Return to main zone before inserting another footnote
    const refs1 = collectFootnoteReferences(after1.document);
    const back1 = goToFootnoteReference(
      after1,
      refs1[0].run.footnoteReference!.footnoteId,
    );

    // Re-fetch paragraph and place caret at offset 1 (before "B")
    const mainParagraph = getDocumentParagraphs(back1.document).find((p) =>
      p.runs.some((r) => r.text.startsWith("A")),
    )!;
    const beforeB = {
      ...back1,
      selection: {
        anchor: paragraphOffsetToPosition(mainParagraph, 1),
        focus: paragraphOffsetToPosition(mainParagraph, 1),
      },
    };
    const after2 = insertFootnote(beforeB);

    const refs2 = collectFootnoteReferences(after2.document);
    expect(refs2).toHaveLength(2);
    expect(refs2[0].run.text).toBe("1");
    expect(refs2[1].run.text).toBe("2");
  });
});

describe("deleteFootnote", () => {
  it("removes the inline reference and the body, renumbering remaining notes", () => {
    const paragraph = createEditorParagraph("ABCDE");
    const doc = createEditorDocument([paragraph]);
    const state = createEditorStateFromDocument(doc);

    // Insert two footnotes: one after A, one after E.
    const atOne = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 1),
        focus: paragraphOffsetToPosition(paragraph, 1),
      },
    };
    const s1 = insertFootnote(atOne);
    const mainPara = getDocumentParagraphs(s1.document)[0];
    const atEnd = {
      ...goToFootnoteReference(
        s1,
        collectFootnoteReferences(s1.document)[0].run.footnoteReference!
          .footnoteId,
      ),
      selection: {
        anchor: paragraphOffsetToPosition(
          mainPara,
          mainPara.runs.reduce((s, r) => s + r.text.length, 0),
        ),
        focus: paragraphOffsetToPosition(
          mainPara,
          mainPara.runs.reduce((s, r) => s + r.text.length, 0),
        ),
      },
    };
    const s2 = insertFootnote(atEnd);

    expect(collectFootnoteReferences(s2.document)).toHaveLength(2);

    const firstFootnoteId = collectFootnoteReferences(s2.document)[0].run
      .footnoteReference!.footnoteId;
    const s3 = deleteFootnote(s2, firstFootnoteId);

    const refsAfter = collectFootnoteReferences(s3.document);
    expect(refsAfter).toHaveLength(1);
    // After deletion, the surviving note's marker must be re-numbered to "1".
    expect(refsAfter[0].run.text).toBe("1");
    expect(s3.document.footnotes!.items[firstFootnoteId]).toBeUndefined();
  });
});

describe("renumberFootnotes", () => {
  it("prunes unreferenced footnotes from the registry", () => {
    const paragraph = createEditorParagraph("hi");
    const doc = createEditorDocument([paragraph]);
    const state = createEditorStateFromDocument(doc);
    const inserted = insertFootnote({
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 2),
        focus: paragraphOffsetToPosition(paragraph, 2),
      },
    });

    // Manually inject a dangling footnote that nothing references.
    const docWithOrphan = {
      ...inserted.document,
      footnotes: {
        ...inserted.document.footnotes!,
        items: {
          ...inserted.document.footnotes!.items,
          "footnote:orphan": { id: "footnote:orphan", blocks: [] },
        },
      },
    };
    expect(docWithOrphan.footnotes!.items["footnote:orphan"]).toBeDefined();

    const pruned = renumberFootnotes(docWithOrphan);
    expect(pruned.footnotes!.items["footnote:orphan"]).toBeUndefined();
  });
});

describe("paragraph index includes footnote bodies", () => {
  it("findParagraphLocation returns footnote zone for body paragraphs", () => {
    const paragraph = createEditorParagraph("hello");
    const doc = createEditorDocument([paragraph]);
    const state = createEditorStateFromDocument(doc);
    const next = insertFootnote({
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 5),
        focus: paragraphOffsetToPosition(paragraph, 5),
      },
    });

    const footnoteId = next.activeFootnoteId!;
    const bodyParagraph = next.document.footnotes!.items[footnoteId].blocks[0];
    expect(bodyParagraph.type).toBe("paragraph");

    if (bodyParagraph.type !== "paragraph") return;
    const location = findParagraphLocation(next.document, bodyParagraph.id);
    expect(location?.zone).toBe("footnote");
    expect(location?.footnoteId).toBe(footnoteId);

    const lookup = findFootnoteByParagraphId(next.document, bodyParagraph.id);
    expect(lookup?.footnoteId).toBe(footnoteId);
  });
});

describe("navigation", () => {
  it("goToFootnoteBody moves selection into the body", () => {
    const paragraph = createEditorParagraph("hello");
    const doc = createEditorDocument([paragraph]);
    const state = createEditorStateFromDocument(doc);
    const inserted = insertFootnote({
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 5),
        focus: paragraphOffsetToPosition(paragraph, 5),
      },
    });

    const footnoteId = inserted.activeFootnoteId!;

    // Pretend the user navigated to a different position; goToFootnoteBody
    // should reset focus to body start.
    const otherState = goToFootnoteReference(inserted, footnoteId);
    expect(otherState.activeZone).toBe("main");

    const back = goToFootnoteBody(otherState, footnoteId);
    expect(back.activeZone).toBe("footnote");
    expect(back.activeFootnoteId).toBe(footnoteId);
  });

  it("goToFootnoteReference finds the inline reference", () => {
    const paragraph = createEditorParagraph("hi");
    const doc = createEditorDocument([paragraph]);
    const state = createEditorStateFromDocument(doc);
    const inserted = insertFootnote({
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 2),
        focus: paragraphOffsetToPosition(paragraph, 2),
      },
    });

    const footnoteId = inserted.activeFootnoteId!;
    const ref = findFootnoteReference(inserted.document, footnoteId);
    expect(ref).not.toBeNull();
    expect(ref!.run.footnoteReference?.footnoteId).toBe(footnoteId);
  });
});

describe("cloneEditorState", () => {
  it("clones the footnote registry deeply", () => {
    const paragraph = createEditorParagraph("hello");
    const doc = createEditorDocument([paragraph]);
    const state = createEditorStateFromDocument(doc);
    const inserted = insertFootnote({
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 5),
        focus: paragraphOffsetToPosition(paragraph, 5),
      },
    });

    const cloned = cloneEditorState(inserted);
    expect(cloned.document.footnotes).not.toBe(inserted.document.footnotes);
    expect(cloned.document.footnotes!.items).not.toBe(
      inserted.document.footnotes!.items,
    );
    const footnoteId = inserted.activeFootnoteId!;
    expect(cloned.document.footnotes!.items[footnoteId]).not.toBe(
      inserted.document.footnotes!.items[footnoteId],
    );
    expect(cloned.activeFootnoteId).toBe(footnoteId);
    expect(cloned.activeZone).toBe("footnote");
  });
});
