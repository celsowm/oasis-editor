import { describe, expect, it, vi } from "vitest";
import { createEditorKeyboardController } from "@/app/controllers/useEditorKeyboard.js";
import { resolveTabAction, type TabContext } from "@/app/controllers/handleDocumentTab.js";
import type { EditorKeyboardDeps } from "@/app/controllers/EditorKeyboardDeps.js";
import { createEditorStateFromTexts } from "@/core/editorState.js";
import { toggleParagraphList } from "@/core/commands/list.js";
import { getParagraphs, getParagraphText, paragraphOffsetToPosition, type EditorState } from "@/core/model.js";

function harness(text: string, offset: number, opts: { list?: boolean; readOnly?: boolean; pendingBold?: boolean } = {}) {
  let state = createEditorStateFromTexts([text], { offset });
  if (opts.list) state = toggleParagraphList(state, "bullet");
  const focusInput = vi.fn();
  const deps = {
    state: () => state,
    isReadOnly: () => Boolean(opts.readOnly),
    pendingCaretTextStyle: () => opts.pendingBold ? { bold: true } : undefined,
    focusInput,
    clearPreferredColumn: vi.fn(),
    resetTransactionGrouping: vi.fn(),
    applyTransactionalState: (producer: (current: EditorState) => EditorState) => { state = producer(state); },
    applySelectionAwareParagraphCommand: (producer: (current: EditorState) => EditorState) => { state = producer(state); },
    applyTableAwareParagraphEdit: (current: EditorState, edit: (current: EditorState) => EditorState) => edit(current),
    resolveAdjacentTableCellPosition: vi.fn(() => null),
  } as unknown as EditorKeyboardDeps;
  const controller = createEditorKeyboardController(deps);
  function press(overrides: Partial<KeyboardEvent> = {}) {
    const event = {
      key: "Tab", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
      preventDefault: vi.fn(), currentTarget: { value: "" }, ...overrides,
    } as unknown as KeyboardEvent & { currentTarget: HTMLTextAreaElement };
    controller.handleKeyDown(event);
    return event;
  }
  return {
    press, focusInput,
    state: () => state,
    paragraph: () => getParagraphs(state)[0],
    text: () => getParagraphText(getParagraphs(state)[0]),
    selectAll() {
      const p = getParagraphs(state)[0];
      state = { ...state, selection: { anchor: paragraphOffsetToPosition(p, 0), focus: paragraphOffsetToPosition(p, getParagraphText(p).length) } };
    },
  };
}

describe("document Tab typing", () => {
  it("inserts a real tab and retains editing focus", () => {
    const h = harness("abcd", 2);
    const e = h.press();
    expect(h.text()).toBe("ab\tcd");
    expect(e.preventDefault).toHaveBeenCalledOnce();
    expect(h.focusInput).toHaveBeenCalledOnce();
  });
  it("inserts a tab at an empty paragraph", () => {
    const h = harness("", 0);
    h.press();
    expect(h.text()).toBe("\t");
  });
  it("uses pending text formatting for a literal tab", () => {
    const h = harness("abcd", 2, { pendingBold: true });
    h.press();
    expect(h.paragraph().runs.find(r => r.text.includes("\t"))?.styles?.bold).toBe(true);
  });
  it("demotes the list item at its start and saturates at level zero on reverse", () => {
    const h = harness("item", 0, { list: true });
    h.press();
    expect(h.paragraph().list?.level).toBe(1);
    h.press({ shiftKey: true });
    expect(h.paragraph().list?.level ?? 0).toBe(0);
    h.press({ shiftKey: true });
    expect(h.paragraph().list).toBeDefined();
    expect(h.text()).toBe("item");
  });
  it("inserts a literal tab in the middle of a list item", () => {
    const h = harness("item", 2, { list: true });
    h.press();
    expect(h.text()).toBe("it\tem");
    expect(h.paragraph().list?.level ?? 0).toBe(0);
  });
  it("indents rather than deletes fully selected paragraph content", () => {
    const h = harness("keep", 0);
    h.selectAll();
    h.press();
    expect(h.text()).toBe("keep");
    expect(h.paragraph().style?.indentLeft).toBe(48);
    h.press({ shiftKey: true });
    expect(h.paragraph().style?.indentLeft).toBe(0);
  });
  it("consumes a no-op outdent at zero without mutating state", () => {
    const h = harness("keep", 0);
    const before = h.state();
    const event = h.press({ shiftKey: true });
    expect(h.state()).toBe(before);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
  it("does not intercept browser Ctrl+Tab outside a table", () => {
    const h = harness("abcd", 2);
    const e = h.press({ctrlKey: true});
    expect(h.text()).toBe("abcd");
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
  it("does not trap focus in a read-only editor", () => {
    const h = harness("abcd", 2, { readOnly: true });
    const e = h.press();
    expect(h.text()).toBe("abcd");
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
  it("does not insert while composition is active", () => {
    const h = harness("abcd", 2);
    const e = h.press({ isComposing: true });
    expect(h.text()).toBe("abcd");
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

describe("pure Tab routing", () => {
  const plain: TabContext = { inTable: false, shift: false, ctrl: false, meta: false, alt: false, wholeParagraphs: false, atListStart: false };
  it("prioritizes cell navigation over list and selection", () => {
    expect(resolveTabAction({ ...plain, inTable: true, atListStart: true, wholeParagraphs: true })).toBe("navigateCell");
    expect(resolveTabAction({ ...plain, inTable: true, shift: true })).toBe("navigateCell");
  });
  it("recognizes delivered Ctrl+Tab only within tables", () => {
    expect(resolveTabAction({ ...plain, inTable: true, ctrl: true })).toBe("insertLiteralTab");
    expect(resolveTabAction({ ...plain, ctrl: true })).toBe("passThrough");
    expect(resolveTabAction({ ...plain, meta: true })).toBe("passThrough");
  });
});
