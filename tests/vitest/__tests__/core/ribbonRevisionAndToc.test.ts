import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import {
  acceptRevisionsInSelection,
  collectSelectedRevisionIds,
  hasRevisionsInSelection,
  rejectRevisionsInSelection,
} from "@/core/commands/history.js";
import {
  hasTableOfContents,
  insertTableOfContents,
  updateTableOfContents,
} from "@/core/commands/tableOfContents.js";

const trackedState = () => {
  const paragraph = createEditorParagraph("tracked text");
  const marked = {
    ...paragraph,
    runs: paragraph.runs.map((run) => ({
      ...run,
      revision: { id: "rev-1", type: "insert" as const, author: "Tester", date: 1 },
    })),
  };
  const initial = createEditorStateFromDocument(createEditorDocument([marked]));
  const start = paragraphOffsetToPosition(marked, 0);
  const end = paragraphOffsetToPosition(marked, "tracked text".length);
  return {
    initial,
    selected: {
      ...initial,
      selection: { anchor: start, focus: end },
    },
  };
};

describe("selection-aware Review command state", () => {
  it("rejects revisions only in the current supported selection", () => {
    const { initial, selected } = trackedState();
    expect(hasRevisionsInSelection(initial)).toBe(false);
    expect(hasRevisionsInSelection(selected)).toBe(true);
    expect([...collectSelectedRevisionIds(selected)]).toEqual(["rev-1"]);
    expect(collectSelectedRevisionIds(initial).size).toBe(0);

    const rejected = rejectRevisionsInSelection(selected);
    expect(hasRevisionsInSelection(rejected)).toBe(false);
  });

  it("accepts revisions and leaves unmarked selections disabled", () => {
    const { selected } = trackedState();
    const accepted = acceptRevisionsInSelection(selected);
    expect(hasRevisionsInSelection(accepted)).toBe(false);
    expect(collectSelectedRevisionIds(accepted).size).toBe(0);
    expect(acceptRevisionsInSelection(accepted)).toBe(accepted);
  });
});

describe("TOC command availability", () => {
  it("detects an inserted TOC and preserves it on refresh", () => {
    const paragraph = createEditorParagraph("Introduction");
    const initial = createEditorStateFromDocument(createEditorDocument([paragraph]));
    expect(hasTableOfContents(initial)).toBe(false);
    expect(updateTableOfContents(initial)).toBe(initial);

    const inserted = insertTableOfContents(initial);
    expect(hasTableOfContents(inserted)).toBe(true);
    const updated = updateTableOfContents(inserted);
    expect(hasTableOfContents(updated)).toBe(true);
  });
});
