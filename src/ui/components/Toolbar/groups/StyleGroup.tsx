import { For } from "solid-js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { ToolbarSelect } from "../ToolbarSelect.js";
import { t } from "../../../../i18n/index.js";

export function StyleGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();
  const state = () => ctx().state;

  return (
    <ToolbarGroup>
      <ToolbarSelect
        wide
        data-testid="editor-toolbar-style"
        value={t_style().styleId || "normal"}
        onChange={(e) => ctx().handleStyleChange(e.currentTarget.value)}
        tooltip={t("toolbar.style")}
      >
        <For each={Object.values(state().document.styles ?? {})}>
          {(style) => <option value={style.id}>{style.name}</option>}
        </For>
      </ToolbarSelect>

      <ToolbarSelect
        data-testid="editor-toolbar-font-family"
        disabled={ctx().selectionCollapsed()}
        value={t_style().fontFamily}
        onChange={(event) =>
          ctx().applyValueStyleCommand("fontFamily", event.currentTarget.value || null)
        }
        tooltip={t("toolbar.fontFamily")}
      >
        <option value="">{t("toolbar.font")}</option>
        <option value="Georgia">Georgia</option>
        <option value="Inter">Inter</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
      </ToolbarSelect>

      <ToolbarSelect
        small
        data-testid="editor-toolbar-font-size"
        disabled={ctx().selectionCollapsed()}
        value={t_style().fontSize}
        onChange={(event) =>
          ctx().applyValueStyleCommand(
            "fontSize",
            event.currentTarget.value ? Number(event.currentTarget.value) : null,
          )
        }
        tooltip={t("toolbar.fontSize")}
      >
        <option value="">{t("toolbar.size")}</option>
        <option value="14">14</option>
        <option value="16">16</option>
        <option value="18">18</option>
        <option value="20">20</option>
        <option value="24">24</option>
        <option value="28">28</option>
      </ToolbarSelect>

      <label class="oasis-editor-tool-color" title={t("toolbar.color")}>
        <i data-lucide="type" />
        <input
          type="color"
          class="oasis-editor-tool-color-input"
          data-testid="editor-toolbar-color"
          disabled={ctx().selectionCollapsed()}
          value={t_style().color || "#111827"}
          onInput={(event) => ctx().applyValueStyleCommand("color", event.currentTarget.value)}
          aria-label={t("toolbar.color")}
        />
      </label>

      <label class="oasis-editor-tool-color" title={t("toolbar.highlight")}>
        <i data-lucide="highlighter" />
        <input
          type="color"
          class="oasis-editor-tool-color-input"
          data-testid="editor-toolbar-highlight"
          disabled={ctx().selectionCollapsed()}
          value={t_style().highlight || "#fef08a"}
          onInput={(event) =>
            ctx().applyValueStyleCommand("highlight", event.currentTarget.value)
          }
          aria-label={t("toolbar.highlight")}
        />
      </label>
    </ToolbarGroup>
  );
}
