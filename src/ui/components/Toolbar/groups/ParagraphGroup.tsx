import { For } from "solid-js";
import type { EditorParagraphListStyle } from "../../../../core/model.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup, ToolbarSeparator } from "../ToolbarGroup.js";
import { ToolbarSelect } from "../ToolbarSelect.js";
import { alignButtons, listButtons } from "../toolbarConfig.js";

export function ParagraphGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t = () => ctx().toolbarStyleState();

  return (
    <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
      <ToolbarGroup>
        <For each={alignButtons}>
          {(button) => (
            <ToolbarButton
              icon={button.icon}
              active={t().align === button.value}
              data-testid={button.testId}
              onClick={() => ctx().applyParagraphStyleCommand("align", button.value)}
              tooltip={button.label}
            />
          )}
        </For>
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <For each={listButtons}>
          {(button) => (
            <ToolbarButton
              icon={button.icon}
              active={t().listKind === button.kind}
              data-testid={button.testId}
              onClick={() => ctx().applyParagraphListCommand(button.kind)}
              tooltip={button.label}
            />
          )}
        </For>

        <ToolbarSelect
          data-testid="editor-toolbar-list-format"
          onChange={(e) =>
            ctx().handleListFormatChange(
              e.currentTarget.value as EditorParagraphListStyle["format"],
            )
          }
          tooltip="Change list numbering format"
        >
          <option value="decimal">1, 2, 3</option>
          <option value="lowerLetter">a, b, c</option>
          <option value="upperLetter">A, B, C</option>
          <option value="lowerRoman">i, ii, iii</option>
          <option value="upperRoman">I, II, III</option>
          <option value="bullet">Bullet</option>
        </ToolbarSelect>

        <label class="oasis-editor-tool-metric">
          <span>Start</span>
          <input
            type="number"
            class="oasis-editor-tool-number"
            data-testid="editor-toolbar-list-start-at"
            min="1"
            step="1"
            placeholder="1"
            onChange={(e) =>
              ctx().handleListStartAtChange(
                e.currentTarget.value ? Number(e.currentTarget.value) : null,
              )
            }
            title="Start numbering at"
          />
        </label>
      </ToolbarGroup>
    </div>
  );
}
