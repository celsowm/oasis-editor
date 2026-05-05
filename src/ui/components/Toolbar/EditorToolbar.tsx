import { onCleanup, onMount, Show, type JSX } from "solid-js";
import "./toolbar.css";
import {
  type EditorParagraphListStyle,
  type EditorParagraphStyle,
  type EditorSection,
  type EditorState,
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
import { t } from "../../../i18n/index.js";

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

export function EditorToolbar(props: { ctx: EditorToolbarCtx }): JSX.Element {
  let toolbarRef: HTMLElement | undefined;
  const ctx = () => props.ctx;

  return (
    <section
      ref={toolbarRef}
      class="oasis-editor-toolbar"
      onMouseDown={(event) => event.preventDefault()}
    >
      <ToolbarOverflowManager>
        <ToolbarGroup>
          <ToolbarDropdown label={t("toolbar.file")} icon="file" testId="editor-toolbar-file-dropdown">
            <ToolbarButton
              icon="download"
              label={t("toolbar.export")}
              wide
              data-testid="editor-toolbar-export-docx"
              onClick={() => void ctx().handleExportDocx()}
              tooltip={t("toolbar.export")}
            />
            <ToolbarButton
              icon="upload"
              label={t("toolbar.import")}
              wide
              data-testid="editor-toolbar-import-docx"
              onClick={() => ctx().importInputRef()?.click()}
              tooltip={t("toolbar.import")}
            />
          </ToolbarDropdown>
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarButton
            icon="undo"
            data-testid="editor-toolbar-undo"
            disabled={ctx().undoStack().length === 0}
            onClick={() => ctx().performUndo()}
            tooltip={`${t("toolbar.undo")} (${mod}+Z)`}
          />
          <ToolbarButton
            icon="redo"
            data-testid="editor-toolbar-redo"
            disabled={ctx().redoStack().length === 0}
            onClick={() => ctx().performRedo()}
            tooltip={`${t("toolbar.redo")} (${mod}+Shift+Z)`}
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

        <MetricGroup ctx={ctx} />

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
