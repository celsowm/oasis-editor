import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";

import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

const numValue = (api: ToolbarActionApi, command: string): string => {
  const value = api.commands.state(command).value;
  return value == null ? "" : String(value);
};

/** Paragraph metrics panel (spacing, indents, shading, borders) — command-driven. */
export function MetricGroup(props: { api: ToolbarActionApi }) {
  const t = useI18n();
  const api = props.api;
  const onNumber =
    (command: string) => (event: { currentTarget: HTMLInputElement }) =>
      api.commands.execute(command, event.currentTarget.value);

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
        <label
          class="oasis-editor-tool-metric"
          title={t("metric.spacingAfter")}
        >
          <span>{t("metric.after")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-spacing-after"
            min="0"
            step="1"
            value={numValue(api, "setSpacingAfter")}
            onChange={onNumber("setSpacingAfter")}
          />
        </label>

        <label class="oasis-editor-tool-metric" title={t("metric.leftIndent")}>
          <span>{t("metric.indent")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-indent-left"
            min="0"
            step="1"
            value={numValue(api, "setIndentLeft")}
            onChange={onNumber("setIndentLeft")}
          />
        </label>

        <label
          class="oasis-editor-tool-metric"
          title={t("metric.firstLineIndent")}
        >
          <span>{t("metric.first")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-indent-first-line"
            step="1"
            value={numValue(api, "setIndentFirstLine")}
            onChange={onNumber("setIndentFirstLine")}
          />
        </label>

        <label
          class="oasis-editor-tool-metric"
          title={t("metric.hangingIndent")}
        >
          <span>{t("metric.hang")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-indent-hanging"
            min="0"
            step="1"
            value={numValue(api, "setIndentHanging")}
            onChange={onNumber("setIndentHanging")}
          />
        </label>

        <label
          class="oasis-editor-tool-color"
          title={t("metric.paragraphBgColor")}
        >
          <span>{t("metric.paraBg")}</span>
          <input
            type="color"
            class="oasis-editor-tool-color-input"
            data-testid="editor-toolbar-paragraph-shading"
            value={numValue(api, "setParagraphShading") || "#ffffff"}
            onInput={(event) =>
              api.commands.execute(
                "setParagraphShading",
                event.currentTarget.value,
              )
            }
          />
        </label>

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
