import { getActiveSectionIndex } from "../../../../core/model.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { ToolbarSelect } from "../ToolbarSelect.js";

export function SectionGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const state = () => ctx().state;

  return (
    <>
      <ToolbarGroup>
        <ToolbarButton
          icon="layout"
          label="Orient"
          wide
          active={
            (state().document.sections?.[getActiveSectionIndex(state())] ?? state().document)
              .pageSettings?.orientation === "landscape"
          }
          data-testid="editor-toolbar-orientation"
          onClick={() => {
            const currentSectionIndex = getActiveSectionIndex(state());
            const section =
              state().document.sections?.[currentSectionIndex] || state().document;
            const currentOrientation = section.pageSettings?.orientation || "portrait";
            const nextOrientation = currentOrientation === "portrait" ? "landscape" : "portrait";
            ctx().applyUpdateSectionSettingsCommand(currentSectionIndex, {
              pageSettings: {
                ...section.pageSettings!,
                orientation: nextOrientation,
              },
            });
          }}
          tooltip="Toggle Orientation"
        />
        <ToolbarSelect
          data-testid="editor-toolbar-margins"
          onChange={(event) => {
            const currentSectionIndex = getActiveSectionIndex(state());
            const section =
              state().document.sections?.[currentSectionIndex] || state().document;
            const value = event.currentTarget.value;
            const margins =
              value === "narrow"
                ? { top: 48, right: 48, bottom: 48, left: 48, header: 24, footer: 24, gutter: 0 }
                : { top: 96, right: 96, bottom: 96, left: 96, header: 48, footer: 48, gutter: 0 };
            ctx().applyUpdateSectionSettingsCommand(currentSectionIndex, {
              pageSettings: {
                ...section.pageSettings!,
                margins,
              },
            });
          }}
        >
          <option value="normal">Normal Margins</option>
          <option value="narrow">Narrow Margins</option>
        </ToolbarSelect>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon="scissors"
          label="Sec Next"
          wide
          data-testid="editor-toolbar-section-break-next"
          onClick={() => ctx().applyInsertSectionBreakCommand("nextPage")}
          tooltip="Insert Section Break (Next Page)"
        />
        <ToolbarButton
          icon="scissors"
          label="Sec Cont"
          wide
          data-testid="editor-toolbar-section-break-continuous"
          onClick={() => ctx().applyInsertSectionBreakCommand("continuous")}
          tooltip="Insert Section Break (Continuous)"
        />
      </ToolbarGroup>
    </>
  );
}
