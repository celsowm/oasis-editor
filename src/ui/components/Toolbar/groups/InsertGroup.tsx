import { Show, type JSX } from "solid-js";
import { insertFieldAtSelection } from "../../../../core/editorCommands.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { ToolbarDropdown } from "../ToolbarDropdown.js";

export function InsertGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t = () => ctx().toolbarStyleState();

  return (
    <ToolbarGroup>
      <ToolbarDropdown label="Insert" icon="plus" testId="editor-toolbar-insert-dropdown">
        <ToolbarButton
          icon="image"
          label="Image"
          wide
          data-testid="editor-toolbar-insert-image"
          onClick={() => ctx().imageInputRef()?.click()}
          tooltip="Insert Image"
        />
        <ToolbarButton
          icon="table"
          label="Table"
          wide
          data-testid="editor-toolbar-insert-table"
          onClick={() => ctx().insertTableCommand(3, 3)}
          tooltip="Insert 3x3 Table"
        />
        <ToolbarButton
          icon="hash"
          label="Page #"
          wide
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
          tooltip="Insert Page Number"
        />
        <ToolbarButton
          icon="layers"
          label="Total Pages"
          wide
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
          tooltip="Insert Total Pages"
        />
      </ToolbarDropdown>

      <ToolbarButton
        icon="link"
        label="Link"
        wide
        active={Boolean(t().link)}
        data-testid="editor-toolbar-link"
        disabled={ctx().selectionCollapsed() && !t().link}
        onClick={() => ctx().promptForLink()}
        tooltip="Insert Link"
      />
      <ToolbarButton
        icon="unlink"
        label="Unlink"
        wide
        data-testid="editor-toolbar-unlink"
        disabled={!t().link}
        onClick={() => ctx().removeLinkCommand()}
        tooltip="Remove Link"
      />

      <Show when={Boolean(ctx().selectedImageRun())}>
        <ToolbarButton
          icon="file-text"
          label="Alt"
          wide
          active={true}
          data-testid="editor-toolbar-image-alt"
          onClick={() => ctx().promptForImageAlt()}
          tooltip="Edit the selected image alt text"
        />
      </Show>
    </ToolbarGroup>
  );
}
