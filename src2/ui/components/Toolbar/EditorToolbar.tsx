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
import type { EditorToolbarCtx, ValueStyleKey } from "./types.js";

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
