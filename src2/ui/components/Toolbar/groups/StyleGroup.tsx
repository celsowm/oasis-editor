import { For } from "solid-js";
import type { EditorToolbarCtx } from "../EditorToolbar.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { ToolbarSelect } from "../ToolbarSelect.js";

export function StyleGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const state = () => ctx().state;
  const t = () => ctx().toolbarStyleState();

  return (
    <ToolbarGroup>
      <ToolbarSelect
        wide
        data-testid="editor-2-toolbar-style"
        value={t().styleId || "normal"}
        onChange={(e) => ctx().handleStyleChange(e.currentTarget.value)}
        tooltip="Paragraph Style"
      >
        <For each={Object.values(state().document.styles ?? {})}>
          {(style) => <option value={style.id}>{style.name}</option>}
        </For>
      </ToolbarSelect>

      <ToolbarSelect
        data-testid="editor-2-toolbar-font-family"
        disabled={ctx().selectionCollapsed()}
        value={t().fontFamily}
        onChange={(event) =>
          ctx().applyValueStyleCommand("fontFamily", event.currentTarget.value || null)
        }
      >
        <option value="">Font</option>
        <option value="Georgia">Georgia</option>
        <option value="Inter">Inter</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
      </ToolbarSelect>

      <ToolbarSelect
        small
        data-testid="editor-2-toolbar-font-size"
        disabled={ctx().selectionCollapsed()}
        value={t().fontSize}
        onChange={(event) =>
          ctx().applyValueStyleCommand(
            "fontSize",
            event.currentTarget.value ? Number(event.currentTarget.value) : null,
          )
        }
      >
        <option value="">Size</option>
        <option value="14">14</option>
        <option value="16">16</option>
        <option value="18">18</option>
        <option value="20">20</option>
        <option value="24">24</option>
        <option value="28">28</option>
      </ToolbarSelect>

      <label class="oasis-editor-2-tool-color" title="Text Color">
        <i data-lucide="type" />
        <input
          type="color"
          class="oasis-editor-2-tool-color-input"
          data-testid="editor-2-toolbar-color"
          disabled={ctx().selectionCollapsed()}
          value={t().color || "#111827"}
          onInput={(event) => ctx().applyValueStyleCommand("color", event.currentTarget.value)}
        />
      </label>

      <label class="oasis-editor-2-tool-color" title="Highlight Color">
        <i data-lucide="highlighter" />
        <input
          type="color"
          class="oasis-editor-2-tool-color-input"
          data-testid="editor-2-toolbar-highlight"
          disabled={ctx().selectionCollapsed()}
          value={t().highlight || "#fef08a"}
          onInput={(event) =>
            ctx().applyValueStyleCommand("highlight", event.currentTarget.value)
          }
        />
      </label>
    </ToolbarGroup>
  );
}
