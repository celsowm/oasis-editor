import { setParagraphStyle } from "../../../../core/editorCommands.js";
import type { EditorBorderStyle } from "../../../../core/model.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { t } from "../../../../i18n/index.js";

export function MetricGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();

  return (
    <>
      <ToolbarGroup>
        <ToolbarButton
          icon="file-up"
          label={t("metric.pageBreak")}
          wide
          active={t_style().pageBreakBefore}
          data-testid="editor-toolbar-page-break-before"
          onClick={() => ctx().toggleParagraphFlagCommand("pageBreakBefore")}
          tooltip={t("metric.pageBreakBefore")}
        />
        <ToolbarButton
          icon="link-2"
          label={t("metric.keepNext")}
          wide
          active={t_style().keepWithNext}
          data-testid="editor-toolbar-keep-with-next"
          onClick={() => ctx().toggleParagraphFlagCommand("keepWithNext")}
          tooltip={t("metric.keepWithNext")}
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <label class="oasis-editor-tool-metric" title={t("metric.lineHeight")}>
          <span>{t("metric.line")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-line-height"
            min="1"
            step="0.1"
            value={t_style().lineHeight}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "lineHeight",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-tool-metric" title={t("metric.spacingBefore")}>
          <span>{t("metric.before")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-spacing-before"
            min="0"
            step="1"
            value={t_style().spacingBefore}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "spacingBefore",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-tool-metric" title={t("metric.spacingAfter")}>
          <span>{t("metric.after")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-spacing-after"
            min="0"
            step="1"
            value={t_style().spacingAfter}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "spacingAfter",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
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
            value={t_style().indentLeft}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "indentLeft",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-tool-metric" title={t("metric.firstLineIndent")}>
          <span>{t("metric.first")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-indent-first-line"
            step="1"
            value={t_style().indentFirstLine}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "indentFirstLine",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-tool-metric" title={t("metric.hangingIndent")}>
          <span>{t("metric.hang")}</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-indent-hanging"
            min="0"
            step="1"
            value={t_style().indentHanging}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "indentHanging",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-tool-color" title={t("metric.paragraphBgColor")}>
          <span>{t("metric.paraBg")}</span>
          <input
            type="color"
            class="oasis-editor-tool-color-input"
            data-testid="editor-toolbar-paragraph-shading"
            value={t_style().shading || "#ffffff"}
            onInput={(event) => ctx().applyParagraphStyleCommand("shading", event.currentTarget.value)}
          />
        </label>

        <ToolbarButton
          icon="frame"
          label={t("metric.paraBorders")}
          wide
          data-testid="editor-toolbar-paragraph-borders"
          onClick={() => {
            const border: EditorBorderStyle = { width: 1, type: "solid", color: "#000000" };
            ctx().applyTransactionalState(
              (current) => {
                let next = setParagraphStyle(current, "borderTop", border);
                next = setParagraphStyle(next, "borderRight", border);
                next = setParagraphStyle(next, "borderBottom", border);
                next = setParagraphStyle(next, "borderLeft", border);
                return next;
              },
              { mergeKey: "paraBorders" },
            );
            ctx().focusInput();
          }}
          tooltip={t("metric.applyBorders")}
        />
      </ToolbarGroup>
    </>
  );
}
