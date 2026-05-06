import { For } from "solid-js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { ToolbarSelect } from "../ToolbarSelect.js";
import { t } from "../../../../i18n/index.js";

export function StyleGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();
  const state = () => ctx().state;
  const fontFamilyOptions = () => {
    const values = new Set<string>([
      "Arial",
      "Calibri, sans-serif",
      "Calibri Light, sans-serif",
      "Georgia",
      "Inter",
      "Times New Roman",
      "Courier New",
    ]);

    for (const style of Object.values(state().document.styles ?? {})) {
      const fontFamily = style.textStyle?.fontFamily?.trim();
      if (fontFamily) {
        values.add(fontFamily);
      }
    }

    const currentFontFamily = t_style().fontFamily.trim();
    if (currentFontFamily) {
      values.add(currentFontFamily);
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  };

  const fontSizeOptions = () => {
    const values = new Set<number>([12, 14, 15, 16, 18, 20, 24, 28, 32]);

    for (const style of Object.values(state().document.styles ?? {})) {
      const fontSize = style.textStyle?.fontSize;
      if (typeof fontSize === "number" && Number.isFinite(fontSize)) {
        values.add(fontSize);
      }
    }

    const currentFontSize = Number(t_style().fontSize);
    if (Number.isFinite(currentFontSize) && currentFontSize > 0) {
      values.add(currentFontSize);
    }

    return Array.from(values).sort((a, b) => a - b);
  };

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
        value={t_style().fontFamily}
        onMouseDown={() =>
          ctx().debugToolbarEvent("font-family", "mousedown", {
            value: t_style().fontFamily,
            options: fontFamilyOptions(),
          })
        }
        onClick={() =>
          ctx().debugToolbarEvent("font-family", "click", {
            value: t_style().fontFamily,
            options: fontFamilyOptions(),
          })
        }
        onFocus={() =>
          ctx().debugToolbarEvent("font-family", "focus", {
            value: t_style().fontFamily,
            options: fontFamilyOptions(),
          })
        }
        onChange={(event) =>
          (ctx().debugToolbarEvent("font-family", "change", {
            previousValue: t_style().fontFamily,
            nextValue: event.currentTarget.value,
          }),
          ctx().applyValueStyleCommand("fontFamily", event.currentTarget.value || null)
          )
        }
        tooltip={t("toolbar.fontFamily")}
      >
        <option value="">{t("toolbar.font")}</option>
        <For each={fontFamilyOptions()}>
          {(fontFamily) => <option value={fontFamily}>{fontFamily}</option>}
        </For>
      </ToolbarSelect>

      <ToolbarSelect
        small
        data-testid="editor-toolbar-font-size"
        value={t_style().fontSize}
        onMouseDown={() =>
          ctx().debugToolbarEvent("font-size", "mousedown", {
            value: t_style().fontSize,
            options: fontSizeOptions(),
          })
        }
        onClick={() =>
          ctx().debugToolbarEvent("font-size", "click", {
            value: t_style().fontSize,
            options: fontSizeOptions(),
          })
        }
        onFocus={() =>
          ctx().debugToolbarEvent("font-size", "focus", {
            value: t_style().fontSize,
            options: fontSizeOptions(),
          })
        }
        onChange={(event) =>
          (ctx().debugToolbarEvent("font-size", "change", {
            previousValue: t_style().fontSize,
            nextValue: event.currentTarget.value,
          }),
          ctx().applyValueStyleCommand(
            "fontSize",
            event.currentTarget.value ? Number(event.currentTarget.value) : null,
          ))
        }
        tooltip={t("toolbar.fontSize")}
      >
        <option value="">{t("toolbar.size")}</option>
        <For each={fontSizeOptions()}>
          {(fontSize) => <option value={String(fontSize)}>{fontSize}</option>}
        </For>
      </ToolbarSelect>

      <label class="oasis-editor-tool-color" title={t("toolbar.color")}>
        <i data-lucide="type" />
        <input
          type="color"
          class="oasis-editor-tool-color-input"
          data-testid="editor-toolbar-color"
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
