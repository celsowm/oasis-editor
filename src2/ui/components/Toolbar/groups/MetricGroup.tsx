import { setParagraphStyle } from "../../../../core/editorCommands.js";
import type { Editor2BorderStyle } from "../../../../core/model.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";

export function MetricGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t = () => ctx().toolbarStyleState();

  return (
    <>
      <ToolbarGroup>
        <ToolbarButton
          icon="file-up"
          label="Page Break"
          wide
          active={t().pageBreakBefore}
          data-testid="editor-2-toolbar-page-break-before"
          onClick={() => ctx().toggleParagraphFlagCommand("pageBreakBefore")}
          tooltip="Page Break Before"
        />
        <ToolbarButton
          icon="link-2"
          label="Keep Next"
          wide
          active={t().keepWithNext}
          data-testid="editor-2-toolbar-keep-with-next"
          onClick={() => ctx().toggleParagraphFlagCommand("keepWithNext")}
          tooltip="Keep with Next"
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <label class="oasis-editor-2-tool-metric" title="Line Height">
          <span>Line</span>
          <input
            type="number"
            class="oasis-editor-2-tool-number"
            data-testid="editor-2-toolbar-line-height"
            min="1"
            step="0.1"
            value={t().lineHeight}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "lineHeight",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-2-tool-metric" title="Spacing Before">
          <span>Before</span>
          <input
            type="number"
            class="oasis-editor-2-tool-number"
            data-testid="editor-2-toolbar-spacing-before"
            min="0"
            step="1"
            value={t().spacingBefore}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "spacingBefore",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-2-tool-metric" title="Spacing After">
          <span>After</span>
          <input
            type="number"
            class="oasis-editor-2-tool-number"
            data-testid="editor-2-toolbar-spacing-after"
            min="0"
            step="1"
            value={t().spacingAfter}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "spacingAfter",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-2-tool-metric" title="Left Indent">
          <span>Indent</span>
          <input
            type="number"
            class="oasis-editor-2-tool-number"
            data-testid="editor-2-toolbar-indent-left"
            min="0"
            step="1"
            value={t().indentLeft}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "indentLeft",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-2-tool-metric" title="First Line Indent">
          <span>First</span>
          <input
            type="number"
            class="oasis-editor-2-tool-number"
            data-testid="editor-2-toolbar-indent-first-line"
            step="1"
            value={t().indentFirstLine}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "indentFirstLine",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-2-tool-metric" title="Hanging Indent">
          <span>Hang</span>
          <input
            type="number"
            class="oasis-editor-2-tool-number"
            data-testid="editor-2-toolbar-indent-hanging"
            min="0"
            step="1"
            value={t().indentHanging}
            onChange={(event) =>
              ctx().applyParagraphStyleCommand(
                "indentHanging",
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </label>

        <label class="oasis-editor-2-tool-color" title="Paragraph Background Color">
          <span>Para BG</span>
          <input
            type="color"
            class="oasis-editor-2-tool-color-input"
            data-testid="editor-2-toolbar-paragraph-shading"
            value={t().shading || "#ffffff"}
            onInput={(event) => ctx().applyParagraphStyleCommand("shading", event.currentTarget.value)}
          />
        </label>

        <ToolbarButton
          icon="frame"
          label="Para Borders"
          wide
          data-testid="editor-2-toolbar-paragraph-borders"
          onClick={() => {
            const border: Editor2BorderStyle = { width: 1, type: "solid", color: "#000000" };
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
          tooltip="Apply borders to paragraph"
        />
      </ToolbarGroup>
    </>
  );
}
