import type { JSX } from "solid-js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import { TextField } from "@/ui/public/TextField.js";
import { MetricField } from "@/ui/components/Toolbar/primitives/MetricField.js";
import { pxToPt, ptToPx } from "@/export/pdf/units.js";
import { cmToPx, pxToCm } from "@/ui/components/Toolbar/marginPresets.js";
import { roundTo } from "@/utils/round.js";

import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

const numValue = (api: ToolbarActionApi, command: string): string => {
  const value = api.commands.state(command).value;
  return value == null ? "" : String(value);
};

const numericValue = (
  api: ToolbarActionApi,
  command: string,
): number | undefined => {
  const value = api.commands.state(command).value;
  if (value == null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const ptValue = (api: ToolbarActionApi, command: string): string => {
  const value = numericValue(api, command);
  return value === undefined ? "" : String(roundTo(pxToPt(value), 2));
};

const cmValue = (api: ToolbarActionApi, command: string): string => {
  const value = numericValue(api, command);
  return value === undefined ? "" : String(pxToCm(value));
};

/**
 * Paragraph metrics panel (spacing, indents, shading, borders) — command-driven.
 *
 * Word greys the Layout-tab Paragraph controls out in read-only documents
 * instead of hiding the panel, so each control follows its command's enabled
 * state. Units live in the accessible name (`Spacing After (pt)`) as well as in
 * the visible suffix, and decimal values use the document's separator.
 */
export function MetricGroup(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  const api = props.api;
  const enabled = (command: string): boolean =>
    api.commands.state(command).isEnabled;

  return (
    <Menu
      icon="sliders-horizontal"
      testId="editor-toolbar-metrics-dropdown"
      tooltip={t("paragraph.title")}
      hideChevron
      panelClass="oasis-editor-toolbar-panel"
      keepMounted
    >
      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="file-up"
          active={api.commands.state("togglePageBreakBefore").isActive}
          disabled={!enabled("togglePageBreakBefore")}
          data-testid="editor-toolbar-page-break-before"
          onClick={() => api.commands.execute("togglePageBreakBefore")}
          tooltip={t("metric.pageBreakBefore")}
        />
        <Button
          icon="link-2"
          active={api.commands.state("toggleKeepWithNext").isActive}
          disabled={!enabled("toggleKeepWithNext")}
          data-testid="editor-toolbar-keep-with-next"
          onClick={() => api.commands.execute("toggleKeepWithNext")}
          tooltip={t("metric.keepWithNext")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-grid">
        <MetricField
          disabled={!enabled("setSpacingAfter")}
          label={t("metric.after")}
          title={t("metric.spacingAfter")}
          unit="pt"
          testId="editor-toolbar-spacing-after"
          min="0"
          step="1"
          value={ptValue(api, "setSpacingAfter")}
          onChange={(value) =>
            api.commands.execute(
              "setSpacingAfter",
              value == null ? null : ptToPx(value),
            )
          }
        />

        <MetricField
          disabled={!enabled("setIndentLeft")}
          label={t("metric.indent")}
          title={t("metric.leftIndent")}
          unit="cm"
          testId="editor-toolbar-indent-left"
          min="0"
          step="0.1"
          value={cmValue(api, "setIndentLeft")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentLeft",
              value == null ? null : cmToPx(value),
            )
          }
        />

        <MetricField
          disabled={!enabled("setIndentFirstLine")}
          label={t("metric.first")}
          title={t("metric.firstLineIndent")}
          unit="cm"
          testId="editor-toolbar-indent-first-line"
          step="0.1"
          value={cmValue(api, "setIndentFirstLine")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentFirstLine",
              value == null ? null : cmToPx(value),
            )
          }
        />

        <MetricField
          disabled={!enabled("setIndentHanging")}
          label={t("metric.hang")}
          title={t("metric.hangingIndent")}
          unit="cm"
          testId="editor-toolbar-indent-hanging"
          min="0"
          step="0.1"
          value={cmValue(api, "setIndentHanging")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentHanging",
              value == null ? null : cmToPx(value),
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
          disabled={!enabled("setParagraphShading")}
          value={numValue(api, "setParagraphShading") || "#ffffff"}
          onChange={(value) =>
            api.commands.execute("setParagraphShading", value)
          }
        />

        <Button
          icon="frame"
          disabled={!enabled("applyParagraphBorders")}
          data-testid="editor-toolbar-paragraph-borders"
          onClick={() => api.commands.execute("applyParagraphBorders")}
          tooltip={t("metric.applyBorders")}
        />
      </div>
    </Menu>
  );
}
