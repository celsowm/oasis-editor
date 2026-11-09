import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import type {
  EditorNamedStyle,
  EditorParagraphNode,
  EditorState,
  EditorTabStop,
} from "@/core/model.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import {
  editParagraphTabStops,
  MAX_TAB_STOPS,
} from "@/core/commands/paragraphTabs.js";

function buildState(paragraphs: EditorParagraphNode[]): EditorState {
  const state = createEditorStateFromDocument(
    createEditorDocument(paragraphs),
  );
  const first = paragraphs[0]!;
  const text = first.runs.map((r) => r.text).join("");
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(first, 0),
      focus: paragraphOffsetToPosition(first, text.length),
    },
  };
}

function selectRange(state: EditorState, lo: number, hi: number): EditorState {
  const paragraphs = getParagraphs(state);
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraphs[lo]!, 0),
      focus: paragraphOffsetToPosition(
        paragraphs[hi]!,
        paragraphs[hi]!.runs.map((r) => r.text).join("").length,
      ),
    },
  };
}

function paragraphWithTabs(
  text: string,
  tabs: EditorTabStop[] | undefined,
): EditorParagraphNode {
  const p = createEditorParagraphFromRuns([{ text }]);
  if (tabs) {
    p.style = { tabs };
  }
  return p;
}

/** Attach a named style that declares tab stops to the state's document. */
function withNamedStyle(
  state: EditorState,
  style: EditorNamedStyle,
): EditorState {
  return {
    ...state,
    document: {
      ...state.document,
      styles: { ...(state.document.styles ?? {}), [style.id]: style },
    },
  };
}

const tab = (position: number, type: EditorTabStop["type"] = "left"): EditorTabStop =>
  ({ position, type });

describe("edit paragraph tab stops (para.tabs)", () => {
  it("replaces the direct list when tabs is provided", () => {
    const p = paragraphWithTabs("hi", [tab(72), tab(144, "right")]);
    const next = editParagraphTabStops(buildState([p]), {
      tabs: [tab(36)],
    });
    expect(getParagraphs(next)[0]!.style?.tabs).toEqual([tab(36)]);
  });

  it("adds stops with set, replacing an existing stop at the same position", () => {
    const p = paragraphWithTabs("hi", [tab(72)]);
    const next = editParagraphTabStops(buildState([p]), {
      set: [tab(36, "center"), tab(72, "decimal")],
    });
    const tabs = getParagraphs(next)[0]!.style?.tabs!;
    expect(tabs.find((t) => t.position === 36)?.type).toBe("center");
    expect(tabs.find((t) => t.position === 72)?.type).toBe("decimal");
    expect(tabs).toHaveLength(2);
  });

  it("sorts stops by position after editing", () => {
    const p = paragraphWithTabs("hi", [tab(144)]);
    const next = editParagraphTabStops(buildState([p]), { set: [tab(72)] });
    expect(
      getParagraphs(next)[0]!.style?.tabs!.map((t) => t.position),
    ).toEqual([72, 144]);
  });

  it("clears a stop by position", () => {
    const p = paragraphWithTabs("hi", [tab(72), tab(144)]);
    const next = editParagraphTabStops(buildState([p]), { clear: [72] });
    expect(
      getParagraphs(next)[0]!.style?.tabs!.map((t) => t.position),
    ).toEqual([144]);
  });

  it("records a clear stop over a style-declared position", () => {
    const p = paragraphWithTabs("hi", [tab(72)]);
    p.style!.styleId = "body";
    const withStyle = withNamedStyle(buildState([p]), {
      id: "body",
      name: "Body Text",
      type: "paragraph",
      paragraphStyle: { tabs: [tab(144)] },
    });
    const next = editParagraphTabStops(withStyle, { clear: [144] });
    const tabs = getParagraphs(next)[0]!.style?.tabs!;
    expect(tabs.find((t) => t.position === 144)?.type).toBe("clear");
    // The direct 72 stop is untouched.
    expect(tabs.find((t) => t.position === 72)?.type).toBe("left");
  });

  it("clearAll removes every direct stop and records clears over inherited", () => {
    const p = paragraphWithTabs("hi", [tab(72)]);
    p.style!.styleId = "body";
    const withStyle = withNamedStyle(buildState([p]), {
      id: "body",
      name: "Body Text",
      type: "paragraph",
      paragraphStyle: { tabs: [tab(144)] },
    });
    const next = editParagraphTabStops(withStyle, { clearAll: true });
    const tabs = getParagraphs(next)[0]!.style?.tabs ?? [];
    expect(tabs.filter((t) => t.type === "clear").map((t) => t.position)).toEqual(
      [144],
    );
    expect(tabs.some((t) => t.type === "left")).toBe(false);
  });

  it("is a no-op when nothing is provided", () => {
    const p = paragraphWithTabs("hi", [tab(72)]);
    const state = buildState([p]);
    expect(editParagraphTabStops(state, {})).toBe(state);
  });

  it("edits only the selected paragraphs", () => {
    const p1 = paragraphWithTabs("a", [tab(72)]);
    const p2 = paragraphWithTabs("b", [tab(72)]);
    const p3 = paragraphWithTabs("c", [tab(72)]);
    const state = selectRange(buildState([p1, p2, p3]), 0, 1);
    const next = editParagraphTabStops(state, { set: [tab(36)] });
    const all = getParagraphs(next);
    expect(all[0]!.style?.tabs!.some((t) => t.position === 36)).toBe(true);
    expect(all[1]!.style?.tabs!.some((t) => t.position === 36)).toBe(true);
    // Unselected paragraph keeps only its original 72 stop.
    expect(all[2]!.style?.tabs).toEqual([tab(72)]);
  });

  it("truncates the direct list to MAX_TAB_STOPS", () => {
    const many: EditorTabStop[] = Array.from({ length: MAX_TAB_STOPS + 10 }, (_, i) =>
      tab(i * 10),
    );
    const p = paragraphWithTabs("hi", []);
    const next = editParagraphTabStops(buildState([p]), { tabs: many });
    expect(getParagraphs(next)[0]!.style?.tabs).toHaveLength(MAX_TAB_STOPS);
  });

  it("sets the document default tab interval", () => {
    const p = paragraphWithTabs("hi", []);
    const next = editParagraphTabStops(buildState([p]), { default: 72 });
    expect(next.document.settings?.defaultTabStop).toBe(72);
  });

  it("clearing the previous default removes the document setting", () => {
    const p = paragraphWithTabs("hi", []);
    let state = buildState([p]);
    state = {
      ...state,
      document: { ...state.document, settings: { ...state.document.settings, defaultTabStop: 144 } },
    };
    const next = editParagraphTabStops(state, { default: null });
    expect(next.document.settings?.defaultTabStop).toBeUndefined();
  });

  it("is a no-op when only the default matches the current value", () => {
    const p = paragraphWithTabs("hi", []);
    let state = buildState([p]);
    state = {
      ...state,
      document: { ...state.document, settings: { ...state.document.settings, defaultTabStop: 72 } },
    };
    expect(editParagraphTabStops(state, { default: 72 })).toBe(state);
  });
});
