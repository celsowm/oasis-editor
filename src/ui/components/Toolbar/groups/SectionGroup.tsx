import { getActiveSectionIndex } from "../../../../core/model.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarDropdown } from "../ToolbarDropdown.js";
import { t } from "../../../../i18n/index.js";

export function SectionGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const state = () => ctx().state();

  return (
    <>
      <ToolbarDropdown
        label=""
        icon="layout-template"
        testId="editor-toolbar-section-dropdown"
        tooltip={t("section.pageSetup")}
        hideChevron
        menuClass="oasis-editor-toolbar-panel"
        keepMounted
      >
        <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <ToolbarButton
          icon="layout"
          active={
            (state()?.document.sections?.[getActiveSectionIndex(state())] ?? state()?.document)
              ?.pageSettings?.orientation === "landscape"
          }
          data-testid="editor-toolbar-orientation"
          onClick={() => {
            const currentSectionIndex = getActiveSectionIndex(state());
            const section =
              state()?.document.sections?.[currentSectionIndex] || state()?.document;
            if (!section) return;
            const currentOrientation = section.pageSettings?.orientation || "portrait";
            const nextOrientation = currentOrientation === "portrait" ? "landscape" : "portrait";
            ctx().applyUpdateSectionSettingsCommand(currentSectionIndex, {
              pageSettings: {
                ...section.pageSettings!,
                orientation: nextOrientation,
              },
            });
          }}
          tooltip={t("section.toggleOrientation")}
        />
        </div>

        <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <ToolbarButton
          icon="scissors"
          data-testid="editor-toolbar-section-break-next"
          onClick={() => ctx().applyInsertSectionBreakCommand("nextPage")}
          tooltip={t("section.secNextTooltip")}
        />
        <ToolbarButton
          icon="scissors"
          data-testid="editor-toolbar-section-break-continuous"
          onClick={() => ctx().applyInsertSectionBreakCommand("continuous")}
          tooltip={t("section.secContTooltip")}
        />
        </div>
      </ToolbarDropdown>
    </>
  );
}
