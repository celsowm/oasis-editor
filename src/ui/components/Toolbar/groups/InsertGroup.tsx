import { Show } from "solid-js";
import { insertFieldAtSelection } from "../../../../core/editorCommands.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { t } from "../../../../i18n/index.js";

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

export function InsertGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();

  return (
    <ToolbarGroup>
      <ToolbarButton
        icon="image"
        data-testid="editor-toolbar-insert-image"
        onClick={() => ctx().imageInputRef()?.click()}
        tooltip={t("toolbar.image")}
        aria-label={t("toolbar.image")}
      />
      <ToolbarButton
        icon="table"
        data-testid="editor-toolbar-insert-table"
        onClick={() => ctx().insertTableCommand(3, 3)}
        tooltip={t("toolbar.table")}
        aria-label={t("toolbar.table")}
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

      <Show when={Boolean(ctx().selectedImageRun())}>
        <ToolbarButton
          icon="file-text"
          label={t("toolbar.alt")}
          wide
          active={true}
          data-testid="editor-toolbar-image-alt"
          onClick={() => ctx().promptForImageAlt()}
          tooltip={t("toolbar.alt")}
        />
      </Show>
    </ToolbarGroup>
  );
}
