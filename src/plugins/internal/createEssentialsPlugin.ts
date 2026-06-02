import type { CommandState, OasisPlugin } from "../../core/plugin.js";
import type { ToolbarStyleState } from "../../ui/toolbarStyleState.js";

export interface EssentialsPluginDeps {
  isCommandEnabled: (commandName: string) => boolean;
  /** Reactive toolbar style snapshot — feeds command `isActive`/`value`. */
  styleState: () => ToolbarStyleState;
  canUndo: () => boolean;
  canRedo: () => boolean;
  selectAll: () => boolean;
  insertFootnote: () => boolean;
  pastePlainText: () => boolean;
  bold: () => boolean;
  italic: () => boolean;
  underline: () => boolean;
  strike: () => boolean;
  superscript: () => boolean;
  subscript: () => boolean;
  link: () => boolean;
  alignLeft: () => boolean;
  alignCenter: () => boolean;
  alignRight: () => boolean;
  alignJustify: () => boolean;
  orderedList: () => boolean;
  bulletList: () => boolean;
  find: () => boolean;
  replace: () => boolean;
  toggleTrackChanges: () => boolean;
  acceptRevisions: () => boolean;
  rejectRevisions: () => boolean;
  toggleShowMargins: () => boolean;
  toggleShowParagraphMarks: () => boolean;
  undo: () => boolean;
  redo: () => boolean;
  pageBreak: () => boolean;
  lineBreak: () => boolean;
  splitBlock: () => boolean;
  /** Value commands — apply a payload and expose the current value via refresh. */
  setFontFamily: (value: string | null) => boolean;
  setFontSize: (value: number | null) => boolean;
  setColor: (value: string | null) => boolean;
  setHighlight: (value: string | null) => boolean;
  setStyleId: (value: string) => boolean;
  /** Document's named styles — exposed as the `documentStyles` command value. */
  documentStyles: () => Array<{ id: string; name: string; fontFamily?: string; fontSize?: number }>;

  /** File / insert IO. */
  io: {
    exportDocx: () => void;
    exportPdf: () => void;
    importDocx: () => void;
    insertImage: () => void;
  };
  /** Link / image-alt operations and their selection-derived state. */
  linkOps: {
    prompt: () => void;
    remove: () => void;
    canPrompt: () => boolean;
  };
  imageAlt: {
    prompt: () => void;
    isSelected: () => boolean;
  };
  browserActions: {
    print: () => void;
    copy: () => void;
  };
  /** Paragraph metric / list / indent operations. */
  paragraph: {
    togglePageBreakBefore: () => void;
    toggleKeepWithNext: () => void;
    setSpacingAfter: (value: number | null) => void;
    setSpacingBefore: (value: number | null) => void;
    setIndentLeft: (value: number | null) => void;
    setIndentFirstLine: (value: number | null) => void;
    setIndentHanging: (value: number | null) => void;
    setShading: (value: string | null) => void;
    applyBorders: () => void;
    setLineHeight: (value: number | null) => void;
    setListFormat: (format: string) => void;
    setListStartAt: (value: number | null) => void;
    outdent: () => void;
    indent: () => void;
  };
  /** Underline style value operation. */
  setUnderlineStyle: (value: string | null) => void;
  /** Section page-setup operations. */
  section: {
    isLandscape: () => boolean;
    toggleOrientation: () => void;
    breakNextPage: () => void;
    breakContinuous: () => void;
  };
  /** Table operations and their selection-derived enablement. */
  table: {
    insideTable: () => boolean;
    selectionLabel: () => string | null;
    canMerge: () => boolean;
    canSplit: () => boolean;
    canEditColumn: () => boolean;
    canEditRow: () => boolean;
    merge: () => void;
    split: () => void;
    insertColumnBefore: () => void;
    insertColumnAfter: () => void;
    deleteColumn: () => void;
    insertRowBefore: () => void;
    insertRowAfter: () => void;
    deleteRow: () => void;
    cellShading: (color: string | null) => void;
    cellBorders: () => void;
    cellNoBorders: () => void;
    width100: () => void;
    alignLeft: () => void;
    alignCenter: () => void;
    alignRight: () => void;
    setCellWidth: (width: string) => void;
    insert: (rows: number, cols: number) => void;
  };
}

export function createEssentialsPlugin(deps: EssentialsPluginDeps): OasisPlugin {
  /**
   * Builds a command. The optional `state` resolver populates `isActive`/`value`
   * (and may override `isEnabled`) from the app's reactive accessors, so a
   * SolidJS `createMemo`/effect calling `refresh()` tracks the right slices.
   */
  const command = (
    name: string,
    execute: () => boolean,
    state?: () => Partial<CommandState>,
  ) => ({
    execute,
    refresh: (): CommandState => ({
      isEnabled: deps.isCommandEnabled(name),
      ...state?.(),
    }),
  });

  /**
   * Builds a value command: `execute(payload)` applies the value, and `refresh`
   * exposes the current value so selects/color pickers derive it from the
   * command registry (single source of truth).
   */
  const valueCommand = (
    name: string,
    execute: (payload?: unknown) => boolean,
    value: () => unknown,
  ) => ({
    execute,
    refresh: (): CommandState => ({
      isEnabled: deps.isCommandEnabled(name),
      value: value(),
    }),
  });

  /**
   * Builds an action command from a void operation (optionally payload-driven).
   * `state` may override `isEnabled` / add `isActive` from reactive accessors.
   */
  const actionCommand = (
    name: string,
    execute: (payload?: unknown) => void,
    state?: () => Partial<CommandState>,
  ) => ({
    execute: (payload?: unknown) => {
      execute(payload);
      return true;
    },
    refresh: (): CommandState => ({
      isEnabled: deps.isCommandEnabled(name),
      ...state?.(),
    }),
  });

  const numOrNull = (p: unknown): number | null =>
    p != null && p !== "" ? Number(p) : null;

  const s = deps.styleState;

  return {
    name: "Essentials",
    commands: {
      selectAll: command("selectAll", deps.selectAll),
      insertFootnote: command("insertFootnote", deps.insertFootnote),
      pastePlainText: command("pastePlainText", deps.pastePlainText),
      bold: command("bold", deps.bold, () => ({ isActive: Boolean(s().bold) })),
      italic: command("italic", deps.italic, () => ({ isActive: Boolean(s().italic) })),
      underline: command("underline", deps.underline, () => ({
        isActive: Boolean(s().underline),
      })),
      strike: command("strike", deps.strike, () => ({ isActive: Boolean(s().strike) })),
      superscript: command("superscript", deps.superscript, () => ({
        isActive: Boolean(s().superscript),
      })),
      subscript: command("subscript", deps.subscript, () => ({
        isActive: Boolean(s().subscript),
      })),
      link: command("link", deps.link, () => ({
        isEnabled: deps.isCommandEnabled("link") && deps.linkOps.canPrompt(),
        isActive: Boolean(s().link),
      })),
      alignLeft: command("alignLeft", deps.alignLeft, () => ({
        isActive: s().align === "left",
      })),
      alignCenter: command("alignCenter", deps.alignCenter, () => ({
        isActive: s().align === "center",
      })),
      alignRight: command("alignRight", deps.alignRight, () => ({
        isActive: s().align === "right",
      })),
      alignJustify: command("alignJustify", deps.alignJustify, () => ({
        isActive: s().align === "justify",
      })),
      orderedList: command("orderedList", deps.orderedList, () => ({
        isActive: s().listKind === "ordered",
      })),
      bulletList: command("bulletList", deps.bulletList, () => ({
        isActive: s().listKind === "bullet",
      })),
      find: command("find", deps.find),
      replace: command("replace", deps.replace),
      toggleTrackChanges: command("toggleTrackChanges", deps.toggleTrackChanges),
      acceptRevisions: command("acceptRevisions", deps.acceptRevisions),
      rejectRevisions: command("rejectRevisions", deps.rejectRevisions),
      toggleShowMargins: command("toggleShowMargins", deps.toggleShowMargins),
      toggleShowParagraphMarks: command("toggleShowParagraphMarks", deps.toggleShowParagraphMarks),
      undo: command("undo", deps.undo, () => ({
        isEnabled: deps.isCommandEnabled("undo") && deps.canUndo(),
      })),
      redo: command("redo", deps.redo, () => ({
        isEnabled: deps.isCommandEnabled("redo") && deps.canRedo(),
      })),
      pageBreak: command("pageBreak", deps.pageBreak),
      lineBreak: command("lineBreak", deps.lineBreak),
      splitBlock: command("splitBlock", deps.splitBlock),
      setFontFamily: valueCommand(
        "setFontFamily",
        (p) => deps.setFontFamily((p as string) || null),
        () => s().fontFamily,
      ),
      setFontSize: valueCommand(
        "setFontSize",
        (p) => deps.setFontSize(p != null && p !== "" ? Number(p) : null),
        () => s().fontSize,
      ),
      setColor: valueCommand(
        "setColor",
        (p) => deps.setColor((p as string) ?? null),
        () => s().color || null,
      ),
      setHighlight: valueCommand(
        "setHighlight",
        (p) => deps.setHighlight((p as string) ?? null),
        () => s().highlight || null,
      ),
      setStyleId: valueCommand(
        "setStyleId",
        (p) => deps.setStyleId(String(p)),
        () => s().styleId || "normal",
      ),

      // --- Read-only state feed: document's named styles for option lists ---
      documentStyles: actionCommand("documentStyles", () => {}, () => ({
        isEnabled: true,
        value: deps.documentStyles(),
      })),   

      // --- Browser-level document commands ---
      print: actionCommand("print", () => deps.browserActions.print(), () => ({ isEnabled: true })),
      copy: actionCommand("copy", () => deps.browserActions.copy(), () => ({ isEnabled: true })),

      // --- File / insert IO ---
      exportDocx: actionCommand("exportDocx", () => deps.io.exportDocx()),
      exportPdf: actionCommand("exportPdf", () => deps.io.exportPdf()),
      importDocx: actionCommand("importDocx", () => deps.io.importDocx()),
      insertImage: actionCommand("insertImage", () => deps.io.insertImage()),

      // --- Link / image alt ---
      unlink: actionCommand("unlink", () => deps.linkOps.remove(), () => ({
        isEnabled: deps.isCommandEnabled("unlink") && Boolean(s().link),
        isActive: Boolean(s().link),
      })),
      editImageAlt: actionCommand("editImageAlt", () => deps.imageAlt.prompt(), () => ({
        isEnabled: deps.imageAlt.isSelected(),
        isActive: deps.imageAlt.isSelected(),
      })),

      // --- Paragraph indent ---
      outdent: actionCommand("outdent", () => deps.paragraph.outdent()),
      indent: actionCommand("indent", () => deps.paragraph.indent()),

      // --- Paragraph metrics ---
      togglePageBreakBefore: actionCommand(
        "togglePageBreakBefore",
        () => deps.paragraph.togglePageBreakBefore(),
        () => ({ isActive: Boolean(s().pageBreakBefore) }),
      ),
      toggleKeepWithNext: actionCommand(
        "toggleKeepWithNext",
        () => deps.paragraph.toggleKeepWithNext(),
        () => ({ isActive: Boolean(s().keepWithNext) }),
      ),
      setSpacingAfter: valueCommand(
        "setSpacingAfter",
        (p) => (deps.paragraph.setSpacingAfter(numOrNull(p)), true),
        () => s().spacingAfter,
      ),
      setSpacingBefore: valueCommand(
        "setSpacingBefore",
        (p) => (deps.paragraph.setSpacingBefore(numOrNull(p)), true),
        () => s().spacingBefore,
      ),
      setIndentLeft: valueCommand(
        "setIndentLeft",
        (p) => (deps.paragraph.setIndentLeft(numOrNull(p)), true),
        () => s().indentLeft,
      ),
      setIndentFirstLine: valueCommand(
        "setIndentFirstLine",
        (p) => (deps.paragraph.setIndentFirstLine(numOrNull(p)), true),
        () => s().indentFirstLine,
      ),
      setIndentHanging: valueCommand(
        "setIndentHanging",
        (p) => (deps.paragraph.setIndentHanging(numOrNull(p)), true),
        () => s().indentHanging,
      ),
      setParagraphShading: valueCommand(
        "setParagraphShading",
        (p) => (deps.paragraph.setShading((p as string) ?? null), true),
        () => s().shading || "#ffffff",
      ),
      applyParagraphBorders: actionCommand(
        "applyParagraphBorders",
        () => deps.paragraph.applyBorders(),
      ),
      setLineHeight: valueCommand(
        "setLineHeight",
        (p) => (deps.paragraph.setLineHeight(numOrNull(p)), true),
        () => s().lineHeight,
      ),
      setListFormat: actionCommand("setListFormat", (p) =>
        deps.paragraph.setListFormat(String(p)),
      ),
      setListStartAt: actionCommand("setListStartAt", (p) =>
        deps.paragraph.setListStartAt(numOrNull(p)),
      ),

      // --- Underline style ---
      setUnderlineStyle: valueCommand(
        "setUnderlineStyle",
        (p) => (deps.setUnderlineStyle((p as string) || null), true),
        () => s().underlineStyle,
      ),

      // --- Section ---
      toggleOrientation: actionCommand(
        "toggleOrientation",
        () => deps.section.toggleOrientation(),
        () => ({ isActive: deps.section.isLandscape() }),
      ),
      sectionBreakNextPage: actionCommand("sectionBreakNextPage", () =>
        deps.section.breakNextPage(),
      ),
      sectionBreakContinuous: actionCommand("sectionBreakContinuous", () =>
        deps.section.breakContinuous(),
      ),

      // --- Table ---
      tableContext: actionCommand("tableContext", () => {}, () => ({
        isEnabled: deps.table.insideTable(),
        isActive: deps.table.insideTable(),
        value: deps.table.selectionLabel(),
      })),
      tableMerge: actionCommand("tableMerge", () => deps.table.merge(), () => ({
        isEnabled: deps.isCommandEnabled("tableMerge") && deps.table.canMerge(),
      })),
      tableSplit: actionCommand("tableSplit", () => deps.table.split(), () => ({
        isEnabled: deps.isCommandEnabled("tableSplit") && deps.table.canSplit(),
      })),
      tableInsertColumnBefore: actionCommand(
        "tableInsertColumnBefore",
        () => deps.table.insertColumnBefore(),
        () => ({ isEnabled: deps.isCommandEnabled("tableInsertColumnBefore") && deps.table.canEditColumn() }),
      ),
      tableInsertColumnAfter: actionCommand(
        "tableInsertColumnAfter",
        () => deps.table.insertColumnAfter(),
        () => ({ isEnabled: deps.isCommandEnabled("tableInsertColumnAfter") && deps.table.canEditColumn() }),
      ),
      tableDeleteColumn: actionCommand(
        "tableDeleteColumn",
        () => deps.table.deleteColumn(),
        () => ({ isEnabled: deps.isCommandEnabled("tableDeleteColumn") && deps.table.canEditColumn() }),
      ),
      tableInsertRowBefore: actionCommand(
        "tableInsertRowBefore",
        () => deps.table.insertRowBefore(),
        () => ({ isEnabled: deps.isCommandEnabled("tableInsertRowBefore") && deps.table.canEditRow() }),
      ),
      tableInsertRowAfter: actionCommand(
        "tableInsertRowAfter",
        () => deps.table.insertRowAfter(),
        () => ({ isEnabled: deps.isCommandEnabled("tableInsertRowAfter") && deps.table.canEditRow() }),
      ),
      tableDeleteRow: actionCommand(
        "tableDeleteRow",
        () => deps.table.deleteRow(),
        () => ({ isEnabled: deps.isCommandEnabled("tableDeleteRow") && deps.table.canEditRow() }),
      ),
      tableCellShading: actionCommand("tableCellShading", (p) =>
        deps.table.cellShading((p as string) ?? null),
      ),
      tableCellBorders: actionCommand("tableCellBorders", () => deps.table.cellBorders()),
      tableCellNoBorders: actionCommand("tableCellNoBorders", () => deps.table.cellNoBorders()),
      tableWidth100: actionCommand("tableWidth100", () => deps.table.width100()),
      tableAlignLeft: actionCommand("tableAlignLeft", () => deps.table.alignLeft()),
      tableAlignCenter: actionCommand("tableAlignCenter", () => deps.table.alignCenter()),
      tableAlignRight: actionCommand("tableAlignRight", () => deps.table.alignRight()),
      tableSetCellWidth: actionCommand("tableSetCellWidth", (p) =>
        deps.table.setCellWidth(String(p)),
      ),
      insertTable: actionCommand("insertTable", (p) => {
        const { rows, cols } = (p ?? {}) as { rows?: number; cols?: number };
        if (rows && cols) deps.table.insert(rows, cols);
      }),
    },
  };
}
