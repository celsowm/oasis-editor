import { onCleanup, onMount, type JSX } from "solid-js";
import "./toolbar.css";
import {
  insertFieldAtSelection,
} from "../../../core/editorCommands.js";
import {
  type Editor2ParagraphListStyle,
  type Editor2ParagraphStyle,
  type Editor2Section,
  type Editor2State,
} from "../../../core/model.js";
import type {
  BooleanStyleKey,
  ParagraphStyleKey,
  ToolbarStyleState,
} from "../../toolbarStyleState.js";
import { ToolbarButton } from "./ToolbarButton.js";
import { ToolbarGroup, ToolbarSeparator } from "./ToolbarGroup.js";
import { startIconObserver, stopIconObserver } from "../../utils/IconManager.js";
import { FormatGroup } from "./groups/FormatGroup.js";
import { InsertGroup } from "./groups/InsertGroup.js";
import { MetricGroup } from "./groups/MetricGroup.js";
import { ParagraphGroup } from "./groups/ParagraphGroup.js";
import { ReviewGroup } from "./groups/ReviewGroup.js";
import { SectionGroup } from "./groups/SectionGroup.js";
import { StyleGroup } from "./groups/StyleGroup.js";
import { TableGroup } from "./groups/TableGroup.js";

type ValueStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";

/**
 * Bag of references the toolbar needs from the editor app. We keep this typed
 * narrowly so the toolbar stays a leaf in the render tree without owning state.
 *
 * - `state` is the live Solid store proxy and remains reactive when read.
 * - Accessor functions (`undoStack`, `selectionCollapsed`, etc.) are getter
 *   wrappers around signals or derived values.
 * - Imperative handlers are referenced as-is.
 */
export interface EditorToolbarCtx {
  state: Editor2State;
  undoStack: () => unknown[];
  redoStack: () => unknown[];
  importInputRef: () => HTMLInputElement | undefined;
  imageInputRef: () => HTMLInputElement | undefined;

  toolbarStyleState: () => ToolbarStyleState;
  selectionCollapsed: () => boolean;
  selectedImageRun: () => unknown;
  tableSelectionLabel: () => string | null;
  tableActionRestrictionLabel: () => string | null;

  handleExportDocx: () => void;
  performUndo: () => void;
  performRedo: () => void;
  focusInput: () => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    transform: (state: Editor2State) => Editor2State,
    options?: { mergeKey?: string },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: Editor2State,
    edit: (state: Editor2State) => Editor2State,
  ) => Editor2State;

  promptForImageAlt: () => void;
  promptForLink: () => void;
  removeLinkCommand: () => void;

  applyBooleanStyleCommand: (key: BooleanStyleKey) => void;
  applyValueStyleCommand: <K extends ValueStyleKey>(
    key: K,
    value: K extends "fontSize" ? number | null : string | null,
  ) => void;
  applyParagraphStyleCommand: <K extends ParagraphStyleKey>(
    key: K,
    value: Editor2ParagraphStyle[K] | null,
  ) => void;
  applyParagraphListCommand: (kind: NonNullable<Editor2ParagraphListStyle["kind"]>) => void;
  applyInsertSectionBreakCommand: (breakType: "nextPage" | "continuous") => void;
  applyToggleTrackChangesCommand: () => void;
  applyAcceptRevisionsCommand: () => void;
  applyRejectRevisionsCommand: () => void;
  applyUpdateSectionSettingsCommand: (
    sectionIndex: number,
    settings: Partial<Editor2Section>,
  ) => void;
  toggleParagraphFlagCommand: (key: "pageBreakBefore" | "keepWithNext") => void;
  handleListFormatChange: (format: Editor2ParagraphListStyle["format"]) => void;
  handleListStartAtChange: (startAt: number | null) => void;
  handleStyleChange: (styleId: string) => void;

  canMergeSelectedTable: (state: Editor2State) => boolean;
  canMergeSelectedTableCells: (state: Editor2State) => boolean;
  canMergeSelectedTableRows: (state: Editor2State) => boolean;
  canSplitSelectedTable: (state: Editor2State) => boolean;
  canSplitSelectedTableCell: (state: Editor2State) => boolean;
  canSplitSelectedTableCellVertically: (state: Editor2State) => boolean;
  canEditSelectedTableColumn: (state: Editor2State) => boolean;
  canEditSelectedTableRow: (state: Editor2State) => boolean;
  mergeSelectedTable: (state: Editor2State) => Editor2State;
  mergeSelectedTableCells: (state: Editor2State) => Editor2State;
  mergeSelectedTableRows: (state: Editor2State) => Editor2State;
  splitSelectedTable: (state: Editor2State) => Editor2State;
  splitSelectedTableCell: (state: Editor2State) => Editor2State;
  splitSelectedTableCellVertically: (state: Editor2State) => Editor2State;
  insertSelectedTableColumn: (state: Editor2State, direction: -1 | 1) => Editor2State;
  insertSelectedTableRow: (state: Editor2State, direction: -1 | 1) => Editor2State;
  deleteSelectedTableColumn: (state: Editor2State) => Editor2State;
  deleteSelectedTableRow: (state: Editor2State) => Editor2State;
  insertTableCommand: (rows: number, cols: number) => void;
}

export function EditorToolbar(props: { ctx: EditorToolbarCtx }): JSX.Element {
  let toolbarRef: HTMLElement | undefined;
  const ctx = () => props.ctx;

  return (
    <section
      ref={toolbarRef}
      class="oasis-editor-2-toolbar"
      onMouseDown={(event) => event.preventDefault()}
    >
      <ToolbarGroup>
        <ToolbarButton
          icon="download"
          label="Export"
          wide
          data-testid="editor-2-toolbar-export-docx"
          onClick={() => void ctx().handleExportDocx()}
          tooltip="Export DOCX"
        />
        <ToolbarButton
          icon="upload"
          label="Import"
          wide
          data-testid="editor-2-toolbar-import-docx"
          onClick={() => ctx().importInputRef()?.click()}
          tooltip="Import DOCX"
        />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ToolbarButton
          icon="undo"
          data-testid="editor-2-toolbar-undo"
          disabled={ctx().undoStack().length === 0}
          onClick={() => ctx().performUndo()}
          tooltip="Undo last change"
        />
        <ToolbarButton
          icon="redo"
          data-testid="editor-2-toolbar-redo"
          disabled={ctx().redoStack().length === 0}
          onClick={() => ctx().performRedo()}
          tooltip="Redo last undone change"
        />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ToolbarButton
          icon="image"
          label="Image"
          wide
          data-testid="editor-2-toolbar-insert-image"
          onClick={() => ctx().imageInputRef()?.click()}
          tooltip="Insert Image"
        />
        <ToolbarButton
          icon="hash"
          data-testid="editor-2-toolbar-insert-page-number"
          onClick={() => {
            ctx().clearPreferredColumn();
            ctx().resetTransactionGrouping();
            ctx().applyTransactionalState((current) =>
              ctx().applyTableAwareParagraphEdit(current, (temp) =>
                insertFieldAtSelection(temp, "PAGE"),
              ),
            );
            ctx().focusInput();
          }}
          tooltip="Insert Page Number"
        />
        <ToolbarButton
          icon="layers"
          data-testid="editor-2-toolbar-insert-total-pages"
          onClick={() => {
            ctx().clearPreferredColumn();
            ctx().resetTransactionGrouping();
            ctx().applyTransactionalState((current) =>
              ctx().applyTableAwareParagraphEdit(current, (temp) =>
                insertFieldAtSelection(temp, "NUMPAGES"),
              ),
            );
            ctx().focusInput();
          }}
          tooltip="Insert Total Pages"
        />
        <ToolbarButton
          icon="file-text"
          label="Alt"
          wide
          active={Boolean(ctx().selectedImageRun())}
          data-testid="editor-2-toolbar-image-alt"
          disabled={!ctx().selectedImageRun()}
          onClick={() => ctx().promptForImageAlt()}
          tooltip="Edit the selected image alt text"
        />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ToolbarButton
          icon="table"
          label="Table"
          wide
          data-testid="editor-2-toolbar-insert-table"
          onClick={() => ctx().insertTableCommand(3, 3)}
          tooltip="Insert 3x3 Table"
        />
      </ToolbarGroup>

      <ToolbarSeparator />

      <StyleGroup ctx={ctx} />

      <ToolbarSeparator />

      <FormatGroup ctx={ctx} />

      <ToolbarSeparator />

      <InsertGroup ctx={ctx} />

      <ToolbarSeparator />

      <ParagraphGroup ctx={ctx} />

      <ToolbarSeparator />

      <TableGroup ctx={ctx} />

      <ToolbarSeparator />

      <SectionGroup ctx={ctx} />

      <ToolbarSeparator />

      <ReviewGroup ctx={ctx} />

      <ToolbarSeparator />

      <MetricGroup ctx={ctx} />
    </section>
  );
}
