import { For, Show, type JSX } from "solid-js";
import "./toolbar.css";
import { ToolbarButton } from "./ToolbarButton.js";
import { ToolbarSeparator } from "./ToolbarGroup.js";
import { ToolbarDropdown } from "./ToolbarDropdown.js";
import { ToolbarOverflowManager } from "./ToolbarOverflowManager.js";
import { FormatGroup } from "./groups/FormatGroup.js";
import { InsertGroup } from "./groups/InsertGroup.js";
import { LineSpacingButton } from "./LineSpacingButton.js";
import { MetricGroup } from "./groups/MetricGroup.js";
import { ParagraphGroup } from "./groups/ParagraphGroup.js";
import { SectionGroup } from "./groups/SectionGroup.js";
import { StyleGroup } from "./groups/StyleGroup.js";
import { TableGroup } from "./groups/TableGroup.js";
import type { EditorToolbarCtx } from "./types.js";
import { t } from "../../../i18n/index.js";
import { defaultToolbarRegistry } from "./toolbarRegistry.js";

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

const shouldAllowNativeMouseDown = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest("select, input, textarea, label") !== null;

export function EditorToolbar(props: {
  ctx: EditorToolbarCtx;
  showFileGroup?: boolean;
}): JSX.Element {
  let toolbarRef: HTMLElement | undefined;
  const ctx = () => props.ctx;
  const showFileGroup = () => props.showFileGroup ?? true;
  const executeOrFallback = (commandName: string, fallback: () => void) => {
    const toolbarCtx = ctx();
    const executeCommand = toolbarCtx.executeCommand;
    const canExecuteCommand = toolbarCtx.canExecuteCommand;
    if (executeCommand) {
      if (canExecuteCommand && canExecuteCommand(commandName)) {
        executeCommand(commandName);
        return;
      }
      if (!canExecuteCommand) {
        executeCommand(commandName);
        return;
      }
    }
    fallback();
  };
  const registryItems = () => defaultToolbarRegistry.getItems();
  const runToolbarItem = (item: { command?: string; onClick?: (ctx: EditorToolbarCtx) => void }) => {
    if (item.command) {
      executeOrFallback(item.command, () => item.onClick?.(ctx()));
      return;
    }
    item.onClick?.(ctx());
  };

  return (
    <section
      ref={toolbarRef}
      class="oasis-editor-toolbar"
      onMouseDown={(event) => {
        if (shouldAllowNativeMouseDown(event.target)) {
          return;
        }
        event.preventDefault();
      }}
    >
      <ToolbarOverflowManager>
        <Show when={showFileGroup()}>
          <ToolbarDropdown label="" icon="file" testId="editor-toolbar-file-dropdown" tooltip={t("toolbar.file")}>
            <ToolbarButton
              icon="file-text"
              label="Export DOCX"
              wide
              data-testid="editor-toolbar-export-docx"
              onClick={() => void ctx().handleExportDocx()}
              tooltip="Export DOCX"
            />
            <ToolbarButton
              icon="file-down"
              label="Export PDF"
              wide
              data-testid="editor-toolbar-export-pdf"
              onClick={() => void ctx().handleExportPdf()}
              tooltip="Export PDF"
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

          <ToolbarSeparator />
        </Show>

        <ToolbarButton
          icon="undo"
          data-testid="editor-toolbar-undo"
          disabled={ctx().undoStack().length === 0}
          onClick={() => executeOrFallback("undo", () => ctx().performUndo())}
          tooltip={`${t("toolbar.undo")} (${mod}+Z)`}
        />
        <ToolbarButton
          icon="redo"
          data-testid="editor-toolbar-redo"
          disabled={ctx().redoStack().length === 0}
          onClick={() => executeOrFallback("redo", () => ctx().performRedo())}
          tooltip={`${t("toolbar.redo")} (${mod}+Shift+Z)`}
        />

        <ToolbarSeparator />

        <StyleGroup ctx={ctx} />

        <ToolbarSeparator />

        <FormatGroup ctx={ctx} />

        <ToolbarSeparator />

        <InsertGroup ctx={ctx} />

        <ToolbarSeparator />

        <ParagraphGroup ctx={ctx} />

        <LineSpacingButton ctx={ctx} />

        <ToolbarSeparator />

        <MetricGroup ctx={ctx} />

        <ToolbarSeparator />

        <TableGroup ctx={ctx} hidden={!ctx().isInsideTable()} />
        <ToolbarSeparator hidden={!ctx().isInsideTable()} />

        <SectionGroup ctx={ctx} />
        <For each={registryItems()}>
          {(item) => (
            <Show
              when={item.type === "separator"}
              fallback={
                <ToolbarButton
                  icon={item.icon}
                  tooltip={item.tooltip}
                  onClick={() => runToolbarItem(item)}
                  disabled={item.disabled?.(ctx())}
                />
              }
            >
              <ToolbarSeparator />
            </Show>
          )}
        </For>
      </ToolbarOverflowManager>
    </section>
  );
}
