import { onCleanup, onMount, Show, type JSX } from "solid-js";
import "./toolbar.css";
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
import { ToolbarDropdown } from "./ToolbarDropdown.js";
import { ToolbarOverflowManager } from "./ToolbarOverflowManager.js";
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
      <ToolbarOverflowManager>
        <ToolbarGroup>
          <ToolbarDropdown label="File" icon="file" testId="editor-2-toolbar-file-dropdown">
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
          </ToolbarDropdown>
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

        <StyleGroup ctx={ctx} />

        <ToolbarSeparator />

        <FormatGroup ctx={ctx} />

        <ToolbarSeparator />

        <InsertGroup ctx={ctx} />

        <ToolbarSeparator />

        <ParagraphGroup ctx={ctx} />

        <ToolbarSeparator />

        <Show when={ctx().isInsideTable()}>
          <TableGroup ctx={ctx} />
          <ToolbarSeparator />
        </Show>

        <SectionGroup ctx={ctx} />

        <ToolbarSeparator />

        <ReviewGroup ctx={ctx} />
      </ToolbarOverflowManager>
    </section>
  );
}
