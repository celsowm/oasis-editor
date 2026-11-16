import { describe, expect, it, vi } from "vitest";
import { createEditorKeyboardController } from "@/app/controllers/useEditorKeyboard.js";
import { resolveTabAction, type TabContext } from "@/app/controllers/handleDocumentTab.js";
import type { EditorKeyboardDeps } from "@/app/controllers/EditorKeyboardDeps.js";
import { createEditorStateFromTexts, createEditorDocument, createEditorParagraphFromRuns, createEditorStateFromDocument } from "@/core/editorState.js";
import { toggleParagraphList } from "@/core/commands/list.js";
import { getParagraphs, getParagraphText, paragraphOffsetToPosition, positionToParagraphOffset, type EditorState } from "@/core/model.js";

function harness(text: string, offset: number, opts: { list?: boolean; readOnly?: boolean; pendingBold?: boolean; autoIndent?: boolean; defaultTab?: number; rich?: boolean } = {}) {
  let state = createEditorStateFromTexts([text], { offset });
  if (opts.rich) {
    const p = createEditorParagraphFromRuns([{text:text.slice(0,4)}, {text:text.slice(4),styles:{bold:true}}]);
    const caret = paragraphOffsetToPosition(p,offset);
    state = {...createEditorStateFromDocument(createEditorDocument([p])),selection:{anchor:caret,focus:caret}};
  }
  if (opts.list) state = toggleParagraphList(state, "bullet");
  if (opts.defaultTab) state = { ...state, document: { ...state.document, settings: { ...state.document.settings, defaultTabStop: opts.defaultTab } } };
  const focusInput = vi.fn();
  const deps = {
    state: () => state,
    isReadOnly: () => Boolean(opts.readOnly),
    pendingCaretTextStyle: () => opts.pendingBold ? { bold: true } : undefined,
    autoTabIndentEnabled: () => opts.autoIndent ?? true,
    focusInput,
    clearPreferredColumn: vi.fn(),
    resetTransactionGrouping: vi.fn(),
    applyState: (next: EditorState) => { state = next; },
    applyTransactionalState: (producer: (current: EditorState) => EditorState) => { state = producer(state); },
    applySelectionAwareParagraphCommand: (producer: (current: EditorState) => EditorState) => { state = producer(state); },
    applyTableAwareParagraphEdit: (current: EditorState, edit: (current: EditorState) => EditorState) => edit(current),
    resolveAdjacentTableCellPosition: vi.fn(() => null),
    commandsController: { handleListBoundaryBackspace: () => false },
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
  it("uses a first-line indent at the start of existing text, then whole-paragraph indent", () => {
    const h = harness("existing", 0, {defaultTab: 72});
    h.press();
    expect(h.text()).toBe("existing");
    expect(h.paragraph().style?.indentFirstLine).toBe(96);
    h.press();
    expect(h.paragraph().style?.indentLeft).toBe(96);
    h.press({shiftKey: true});
    expect(h.paragraph().style?.indentLeft).toBe(0);
    h.press({shiftKey: true});
    expect(h.paragraph().style?.indentFirstLine).toBe(0);
  });
  it("reverses two consecutive Tabs using two Backspaces without deleting the first letter", () => {
    const h = harness("blablabla", 0);
    h.press();
    h.press();
    expect(h.paragraph().style?.indentLeft).toBe(48);
    expect(h.paragraph().style?.indentFirstLine).toBe(48);
    const e = h.press({key:"Backspace"});
    expect(e.preventDefault).toHaveBeenCalledOnce();
    expect(h.paragraph().style?.indentLeft).toBe(0);
    expect(h.paragraph().style?.indentFirstLine).toBe(48);
    h.press({key:"Backspace"});
    expect(h.paragraph().style?.indentFirstLine).toBe(0);
    expect(h.text()).toBe("blablabla");
    expect(positionToParagraphOffset(h.paragraph(),h.state().selection.focus)).toBe(0);
    h.press({key:"Backspace"});
    expect(h.text()).toBe("blablabla");
  });
  it("Backspace removes a literal tab or selected text normally", () => {
    const h = harness("abc", 1);
    h.press();
    expect(h.text()).toBe("a\tbc");
    h.press({key:"Backspace"});
    expect(h.text()).toBe("abc");
    h.selectAll();
    h.press({key:"Backspace"});
    expect(h.text()).toBe("");
  });
  it("deletes a character inside an indented paragraph instead of outdenting", () => {
    const h = harness("abc", 0);
    h.press();
    h.press({key:"ArrowRight"});
    h.press({key:"Backspace"});
    expect(h.text()).toBe("bc");
    expect(h.paragraph().style?.indentFirstLine).toBe(48);
  });
  it("Ctrl+Backspace deletes from the actual paragraph offset across formatted runs", () => {
    const h = harness("one two", 7, {rich:true});
    h.press({key:"Backspace",ctrlKey:true});
    expect(h.text()).toBe("one ");
    expect(positionToParagraphOffset(h.paragraph(),h.state().selection.focus)).toBe(4);
  });
  it("Ctrl+Delete deletes the next word, not a word in the preceding run", () => {
    const h = harness("one two three", 5, {rich:true});
    h.press({key:"Delete",ctrlKey:true});
    expect(h.text()).toBe("one tthree");
  });
  it("types a literal tab at paragraph start when auto-indent is disabled", () => {
    const h = harness("existing", 0, {autoIndent: false});
    h.press();
    expect(h.text()).toBe("\texisting");
    expect(h.paragraph().style?.indentFirstLine ?? 0).toBe(0);
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
