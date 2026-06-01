import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { TableGridPicker } from "../TableGridPicker.js";
import { t } from "../../../../i18n/index.js";

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

/**
 * Insert tools rendered as individual items (no ToolbarGroup wrapper)
 * so the OverflowManager can move them one-by-one.
 */
export function InsertGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();
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

  return (
    <>
      <ToolbarButton
        icon="image"
        data-testid="editor-toolbar-insert-image"
        onClick={() => ctx().imageInputRef()?.click()}
        tooltip={t("toolbar.image")}
        aria-label={t("toolbar.image")}
      />
      <TableGridPicker
        testId="editor-toolbar-insert-table"
        tooltip={t("toolbar.table")}
        onSelect={(rows, cols) => ctx().insertTableCommand(rows, cols)}
      />

      <ToolbarButton
        icon="link"
        active={Boolean(t_style().link)}
        data-testid="editor-toolbar-link"
        disabled={ctx().selectionCollapsed() && !t_style().link}
        onClick={() => executeOrFallback("link", () => ctx().promptForLink())}
        tooltip={`${t("toolbar.link")} (${mod}+K)`}
        aria-label={t("toolbar.link")}
      />
      <ToolbarButton
        icon="unlink"
        data-testid="editor-toolbar-unlink"
        disabled={!t_style().link}
        onClick={() => ctx().removeLinkCommand()}
        tooltip={t("toolbar.unlink")}
        aria-label={t("toolbar.unlink")}
      />
      <ToolbarButton
        icon="superscript"
        data-testid="editor-toolbar-footnote"
        disabled={!ctx().canInsertFootnoteCommand()}
        onClick={() =>
          executeOrFallback("insertFootnote", () => ctx().applyInsertFootnoteCommand())
        }
        tooltip={`${t("toolbar.footnote")} (${mod}+Alt+F)`}
        aria-label={t("toolbar.footnote")}
      />

      {/*
        Always render the alt button to keep the toolbar's children list
        stable. The ToolbarOverflowManager moves wrappers imperatively between
        the strip and the overflow menu; if the number of children changes
        (e.g. with <Show>) Solid's <For> reconciliation tries to insertBefore
        a node that the imperative move already relocated, producing
        "Failed to execute 'insertBefore'" errors. Toggling visibility via
        style/disabled keeps the DOM topology stable.
      */}
      <ToolbarButton
        icon="file-text"
        active={Boolean(ctx().selectedImageRun())}
        disabled={!ctx().selectedImageRun()}
        data-testid="editor-toolbar-image-alt"
        onClick={() => ctx().promptForImageAlt()}
        tooltip={t("toolbar.alt")}
        style={{ display: ctx().selectedImageRun() ? undefined : "none" }}
      />
    </>
  );
}
