import { type JSX } from "solid-js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { ToolbarDropdown } from "../ToolbarDropdown.js";
import { t } from "../../../../i18n/index.js";

export function ReviewGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const state = () => ctx().state;

  return (
    <>
      <ToolbarDropdown
        label=""
        icon="message-square"
        testId="editor-toolbar-review-dropdown"
        tooltip={t("toolbar.review")}
        hideChevron
        menuClass="oasis-editor-toolbar-panel"
      >
        <div class="oasis-editor-toolbar-panel-section">
        <ToolbarButton
          icon="eye"
          label={t("toolbar.trackChanges")}
          wide
          active={state().trackChangesEnabled}
          data-testid="editor-toolbar-track-changes"
          onClick={() => ctx().applyToggleTrackChangesCommand()}
          tooltip={t("toolbar.trackChanges")}
        />
        <ToolbarButton
          icon="check"
          label={t("toolbar.accept")}
          wide
          data-testid="editor-toolbar-accept-revisions"
          disabled={ctx().selectionCollapsed()}
          onClick={() => ctx().applyAcceptRevisionsCommand()}
          tooltip={t("toolbar.accept")}
        />
        <ToolbarButton
          icon="x"
          label={t("toolbar.reject")}
          wide
          data-testid="editor-toolbar-reject-revisions"
          disabled={ctx().selectionCollapsed()}
          onClick={() => ctx().applyRejectRevisionsCommand()}
          tooltip={t("toolbar.reject")}
        />
        </div>
      </ToolbarDropdown>
    </>
  );
}
