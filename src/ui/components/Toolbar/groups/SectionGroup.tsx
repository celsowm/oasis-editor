import { Button } from "../primitives/Button.js";
import { Menu } from "../primitives/Menu.js";
import { t } from "../../../../i18n/index.js";
import type { ToolbarActionApi } from "../schema/items.js";

/** Section page-setup panel (orientation, section breaks) — command-driven. */
export function SectionGroup(props: { api: ToolbarActionApi }) {
  const api = props.api;

  return (
    <Menu
      icon="layout-template"
      testId="editor-toolbar-section-dropdown"
      tooltip={t("section.pageSetup")}
      hideChevron
      panelClass="oasis-editor-toolbar-panel"
      keepMounted
    >
      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="rectangle-vertical"
          active={!api.commands.state("toggleOrientation").isActive}
          data-testid="editor-toolbar-orientation-portrait"
          onClick={() =>
            api.commands.execute({ name: "setOrientation", payload: "portrait" })
          }
          tooltip={t("section.portrait")}
        />
        <Button
          icon="rectangle-horizontal"
          active={api.commands.state("toggleOrientation").isActive}
          data-testid="editor-toolbar-orientation-landscape"
          onClick={() =>
            api.commands.execute({
              name: "setOrientation",
              payload: "landscape",
            })
          }
          tooltip={t("section.landscape")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="scissors"
          data-testid="editor-toolbar-section-break-next"
          onClick={() => api.commands.execute("sectionBreakNextPage")}
          tooltip={t("section.secNextTooltip")}
        />
        <Button
          icon="scissors"
          data-testid="editor-toolbar-section-break-continuous"
          onClick={() => api.commands.execute("sectionBreakContinuous")}
          tooltip={t("section.secContTooltip")}
        />
      </div>
    </Menu>
  );
}
