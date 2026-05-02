import { type JSX } from "solid-js";
import { setParagraphStyle } from "../../../core/editorCommands.js";
import type { Editor2BorderStyle } from "../../../core/model.js";
import type { EditorToolbarCtx } from "../Toolbar/types.js";
import { ToolbarButton } from "../Toolbar/ToolbarButton.js";
import "./sidebar.css";

export function Sidebar(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t = () => ctx().toolbarStyleState();

  return (
    <aside class="oasis-editor-2-sidebar">
      <div class="oasis-editor-2-sidebar-section">
        <h3>Paragraph Properties</h3>
        
        <div class="oasis-editor-2-sidebar-group">
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
        </div>

        <div class="oasis-editor-2-sidebar-metrics">
          <div class="oasis-editor-2-sidebar-metric">
            <label title="Line Height">Line</label>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-line-height"
              min="1"
              step="0.1"
              value={t().lineHeight ?? 1}
              onChange={(event) =>
                ctx().applyParagraphStyleCommand(
                  "lineHeight",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </div>

          <div class="oasis-editor-2-sidebar-metric">
            <label title="Spacing Before">Before</label>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-spacing-before"
              min="0"
              step="1"
              value={t().spacingBefore ?? 0}
              onChange={(event) =>
                ctx().applyParagraphStyleCommand(
                  "spacingBefore",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </div>

          <div class="oasis-editor-2-sidebar-metric">
            <label title="Spacing After">After</label>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-spacing-after"
              min="0"
              step="1"
              value={t().spacingAfter ?? 0}
              onChange={(event) =>
                ctx().applyParagraphStyleCommand(
                  "spacingAfter",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </div>

          <div class="oasis-editor-2-sidebar-metric">
            <label title="Left Indent">Indent</label>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-indent-left"
              min="0"
              step="1"
              value={t().indentLeft ?? 0}
              onChange={(event) =>
                ctx().applyParagraphStyleCommand(
                  "indentLeft",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </div>

          <div class="oasis-editor-2-sidebar-metric">
            <label title="First Line Indent">First</label>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-indent-first-line"
              step="1"
              value={t().indentFirstLine ?? 0}
              onChange={(event) =>
                ctx().applyParagraphStyleCommand(
                  "indentFirstLine",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </div>

          <div class="oasis-editor-2-sidebar-metric">
            <label title="Hanging Indent">Hang</label>
            <input
              type="number"
              class="oasis-editor-2-tool-number"
              data-testid="editor-2-toolbar-indent-hanging"
              min="0"
              step="1"
              value={t().indentHanging ?? 0}
              onChange={(event) =>
                ctx().applyParagraphStyleCommand(
                  "indentHanging",
                  event.currentTarget.value ? Number(event.currentTarget.value) : null,
                )
              }
            />
          </div>
        </div>

        <div class="oasis-editor-2-sidebar-group">
          <label class="oasis-editor-2-sidebar-color" title="Paragraph Background Color">
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
        </div>
      </div>
    </aside>
  );
}
