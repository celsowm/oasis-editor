import { describe, expect, it } from "vitest";
import type {
  EditorDocument,
  EditorPageSettings,
  EditorParagraphNode,
  EditorTextRun,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { setReviewDisplayMode } from "@/core/commands/history.js";
import { projectTrackedRevisions } from "@/core/document/trackedRevisions.js";
import { reviewDisplayProjection } from "@/core/commands/reviewMarkup.js";
import { getParagraphs } from "@/core/model.js";

function pageSettings(): EditorPageSettings {
  return {
    width: 816,
    height: 1056,
    orientation: "portrait",
    margins: {
      top: 96,
      right: 96,
      bottom: 96,
      left: 96,
      header: 48,
      footer: 48,
      gutter: 0,
    },
  };
}

function textRun(
  id: string,
  text: string,
  revision?: {
    id: string;
    type: "insert" | "delete";
    author: string;
    date: number;
  },
): EditorTextRun {
  return {
    id,
    kind: "text",
    text,
    ...(revision ? { revision } : {}),
  } as EditorTextRun;
}

function paragraph(id: string, runs: EditorTextRun[]): EditorParagraphNode {
  return { id, type: "paragraph", runs };
}

function trackedDocument(): EditorDocument {
  const p = paragraph("p1", [
    textRun("a", "keep "),
    textRun("b", "inserted ", {
      id: "ins",
      type: "insert",
      author: "A",
      date: 1,
    }),
    textRun("c", "gone", {
      id: "del",
      type: "delete",
      author: "A",
      date: 2,
    }),
  ]);
  return {
    id: "doc",
    sections: [{ id: "s1", blocks: [p], pageSettings: pageSettings() }],
  };
}

function stateOf() {
  return createEditorStateFromDocument(trackedDocument());
}

describe("setReviewDisplayMode", () => {
  it("round-trips all modes and defaults to all", () => {
    const state = stateOf();
    expect(state.reviewDisplayMode).toBeUndefined();

    const final = setReviewDisplayMode(state, "final");
    expect(final.reviewDisplayMode).toBe("final");

    const original = setReviewDisplayMode(final, "original");
    expect(original.reviewDisplayMode).toBe("original");

    const all = setReviewDisplayMode(original, "all");
    expect(all.reviewDisplayMode).toBe("all");

    const simple = setReviewDisplayMode(all, "simple");
    expect(simple.reviewDisplayMode).toBe("simple");

    // no-op when the mode is unchanged (no new history entry)
    expect(setReviewDisplayMode(all, "all")).toBe(all);
    expect(setReviewDisplayMode(simple, "simple")).toBe(simple);
  });
});

describe("reviewDisplayProjection", () => {
  it("All Markup (default) renders the raw document", () => {
    expect(reviewDisplayProjection(undefined)).toBeNull();
    expect(reviewDisplayProjection("all")).toBeNull();
  });

  it("Final and Original map to their own projections", () => {
    expect(reviewDisplayProjection("final")).toBe("final");
    expect(reviewDisplayProjection("original")).toBe("original");
  });

  it("Simple Markup renders the accepted final text", () => {
    expect(reviewDisplayProjection("simple")).toBe("final");
  });
});

describe("projectTrackedRevisions", () => {
  it("final keeps inserted text and drops deletions", () => {
    const { document } = projectTrackedRevisions(trackedDocument(), "final");
    const [paragraphNode] = getParagraphs(
      createEditorStateFromDocument(document),
    );
    expect(paragraphNode.runs.map((run) => run.text).join("")).toBe(
      "keep inserted ",
    );
    expect(paragraphNode.runs.every((run) => !run.revision)).toBe(true);
  });

  it("original drops inserted text and restores deletions", () => {
    const { document } = projectTrackedRevisions(trackedDocument(), "original");
    const [paragraphNode] = getParagraphs(
      createEditorStateFromDocument(document),
    );
    expect(paragraphNode.runs.map((run) => run.text).join("")).toBe(
      "keep gone",
    );
    expect(paragraphNode.runs.every((run) => !run.revision)).toBe(true);
  });
});
