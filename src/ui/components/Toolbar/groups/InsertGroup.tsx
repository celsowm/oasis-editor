import { insertFieldAtSelection } from "../../../../core/editorCommands.js";
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
        icon="hash"
        data-testid="editor-toolbar-insert-page-number"
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
        tooltip={t("toolbar.pageNumber")}
        aria-label={t("toolbar.pageNumber")}
      />
      <ToolbarButton
        icon="layers"
        data-testid="editor-toolbar-insert-total-pages"
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
        tooltip={t("toolbar.totalPages")}
        aria-label={t("toolbar.totalPages")}
      />

      <ToolbarButton
        icon="link"
        active={Boolean(t_style().link)}
        data-testid="editor-toolbar-link"
        disabled={ctx().selectionCollapsed() && !t_style().link}
        onClick={() => ctx().promptForLink()}
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
