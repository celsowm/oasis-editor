import type { JSX } from "solid-js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import { NumberField } from "@/ui/public/NumberField.js";
import { TextField } from "@/ui/public/TextField.js";

import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

const numValue = (api: ToolbarActionApi, command: string): string => {
  const value = api.commands.state(command).value;
  return value == null ? "" : String(value);
};

/** Paragraph metrics panel (spacing, indents, shading, borders) — command-driven. */
export function MetricGroup(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  const api = props.api;

  return (
    <Menu
      icon="sliders-horizontal"
      testId="editor-toolbar-metrics-dropdown"
      tooltip={t("metric.leftIndent")}
      hideChevron
      panelClass="oasis-editor-toolbar-panel"
      keepMounted
    >
      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="file-up"
          active={api.commands.state("togglePageBreakBefore").isActive}
          data-testid="editor-toolbar-page-break-before"
          onClick={() => api.commands.execute("togglePageBreakBefore")}
          tooltip={t("metric.pageBreakBefore")}
        />
        <Button
          icon="link-2"
          active={api.commands.state("toggleKeepWithNext").isActive}
          data-testid="editor-toolbar-keep-with-next"
          onClick={() => api.commands.execute("toggleKeepWithNext")}
          tooltip={t("metric.keepWithNext")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-grid">
        <NumberField
          class="oasis-editor-tool-metric"
          labelClass="oasis-editor-tool-metric-label"
          title={t("metric.spacingAfter")}
          label={t("metric.after")}
          controlClass="oasis-editor-tool-number"
          data-testid="editor-toolbar-spacing-after"
          min="0"
          step="1"
          value={numValue(api, "setSpacingAfter")}
          onChange={(value) =>
            api.commands.execute(
              "setSpacingAfter",
              value == null ? "" : String(value),
            )
          }
        />

        <NumberField
          class="oasis-editor-tool-metric"
          labelClass="oasis-editor-tool-metric-label"
          title={t("metric.leftIndent")}
          label={t("metric.indent")}
          controlClass="oasis-editor-tool-number"
          data-testid="editor-toolbar-indent-left"
          min="0"
          step="1"
          value={numValue(api, "setIndentLeft")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentLeft",
              value == null ? "" : String(value),
            )
          }
        />

        <NumberField
          class="oasis-editor-tool-metric"
          labelClass="oasis-editor-tool-metric-label"
          title={t("metric.firstLineIndent")}
          label={t("metric.first")}
          controlClass="oasis-editor-tool-number"
          data-testid="editor-toolbar-indent-first-line"
          step="1"
          value={numValue(api, "setIndentFirstLine")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentFirstLine",
              value == null ? "" : String(value),
            )
          }
        />

        <NumberField
          class="oasis-editor-tool-metric"
          labelClass="oasis-editor-tool-metric-label"
          title={t("metric.hangingIndent")}
          label={t("metric.hang")}
          controlClass="oasis-editor-tool-number"
          data-testid="editor-toolbar-indent-hanging"
          min="0"
          step="1"
          value={numValue(api, "setIndentHanging")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentHanging",
              value == null ? "" : String(value),
            )
          }
        />

        <TextField
          class="oasis-editor-tool-color"
          labelClass="oasis-editor-tool-metric-label"
          title={t("metric.paragraphBgColor")}
          label={t("metric.paraBg")}
          type="color"
          controlClass="oasis-editor-tool-color-input"
          data-testid="editor-toolbar-paragraph-shading"
          value={numValue(api, "setParagraphShading") || "#ffffff"}
          onChange={(value) =>
            api.commands.execute("setParagraphShading", value)
          }
        />

        <Button
          icon="frame"
          data-testid="editor-toolbar-paragraph-borders"
          onClick={() => api.commands.execute("applyParagraphBorders")}
          tooltip={t("metric.applyBorders")}
        />
      </div>
    </Menu>
  );
}
