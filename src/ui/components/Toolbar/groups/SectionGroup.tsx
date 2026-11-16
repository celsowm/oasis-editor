import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";

import type { JSX } from "solid-js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

/** Section page-setup panel (orientation, section breaks) — command-driven. */
export function SectionGroup(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  const api = props.api;
  const orientation = () => api.commands.state("toggleOrientation");
  const editable = () => api.commands.state("setOrientation").isEnabled;

  return (
    <Menu
      icon="pageOrientation"
      label={t("section.orientation")}
      testId="editor-toolbar-section-dropdown"
      tooltip={t("section.pageSetup")}
      panelClass="oasis-editor-toolbar-panel oasis-editor-section-panel oasis-editor-command-menu"
      fitViewport
      keepMounted
    >
      <div class="oasis-editor-command-menu-section">
        <div class="oasis-editor-command-menu-heading">{t("section.orientation")}</div>
        <Button
          icon="pagePortrait"
          label={t("section.portrait")}
          class="oasis-editor-section-action"
          active={!orientation().isActive}
          pressed={!orientation().isActive}
          disabled={!editable()}
          data-testid="editor-toolbar-orientation-portrait"
          onClick={(): unknown =>
            api.commands.execute({
              name: "setOrientation",
              payload: "portrait",
            })
          }
          tooltip={t("section.portrait")}
        />
        <Button
          icon="pageLandscape"
          label={t("section.landscape")}
          class="oasis-editor-section-action"
          active={orientation().isActive}
          pressed={orientation().isActive}
          disabled={!editable()}
          data-testid="editor-toolbar-orientation-landscape"
          onClick={(): unknown =>
            api.commands.execute({
              name: "setOrientation",
              payload: "landscape",
            })
          }
          tooltip={t("section.landscape")}
        />
      </div>

      <div class="oasis-editor-command-menu-section">
        <div class="oasis-editor-command-menu-heading">{t("section.breaksHeading")}</div>
        <Button
          icon="sectionBreakNext"
          label={t("section.secNext")}
          class="oasis-editor-section-action"
          disabled={!api.commands.state("sectionBreakNextPage").isEnabled}
          data-testid="editor-toolbar-section-break-next"
          onClick={(): unknown => api.commands.execute("sectionBreakNextPage")}
          tooltip={t("section.secNextTooltip")}
        />
        <Button
          icon="sectionBreakContinuous"
          label={t("section.secCont")}
          class="oasis-editor-section-action"
          disabled={!api.commands.state("sectionBreakContinuous").isEnabled}
          data-testid="editor-toolbar-section-break-continuous"
          onClick={(): unknown =>
            api.commands.execute("sectionBreakContinuous")
          }
          tooltip={t("section.secContTooltip")}
        />
      </div>
    </Menu>
  );
}
