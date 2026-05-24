import { For, createSignal } from "solid-js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarSelect } from "../ToolbarSelect.js";
import { t } from "../../../../i18n/index.js";
import { ColorSplitButton } from "../ColorSplitButton.js";

/**
 * Style tools (Selects and Colors) rendered as individual items
 * to allow granular overflow management.
 */
export function StyleGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();
  const state = () => ctx().state();
  const [lastTextColor, setLastTextColor] = createSignal("#111827");
  const [lastHighlightColor, setLastHighlightColor] = createSignal("#fef08a");

  const applyTextColor = (value: string | null) => {
    if (value) setLastTextColor(value);
    ctx().applyValueStyleCommand("color", value);
  };

  const applyHighlightColor = (value: string | null) => {
    if (value) setLastHighlightColor(value);
    ctx().applyValueStyleCommand("highlight", value);
  };
  
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

    for (const style of Object.values(state().document?.styles ?? {})) {
      const fontFamily = style.textStyle?.fontFamily?.trim();
      if (fontFamily) values.add(fontFamily);
    }

    const currentFontFamily = t_style().fontFamily.trim();
    if (currentFontFamily) values.add(currentFontFamily);

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  };

  const fontSizeOptions = () => {
    const values = new Set<number>([12, 14, 15, 16, 18, 20, 24, 28, 32]);

    for (const style of Object.values(state().document?.styles ?? {})) {
      const fontSize = style.textStyle?.fontSize;
      if (typeof fontSize === "number" && Number.isFinite(fontSize)) values.add(fontSize);
    }

    const currentFontSize = Number(t_style().fontSize);
    if (Number.isFinite(currentFontSize) && currentFontSize > 0) values.add(currentFontSize);

    return Array.from(values).sort((a, b) => a - b);
  };

  return (
    <>
      <ToolbarSelect
        wide
        data-testid="editor-toolbar-style"
        value={t_style().styleId || "normal"}
        onChange={(e) => ctx().handleStyleChange(e.currentTarget.value)}
        tooltip={t("toolbar.style")}
      >
        <For each={Object.values(state().document?.styles ?? {})}>
          {(style) => <option value={style.id}>{style.name}</option>}
        </For>
      </ToolbarSelect>

      <ToolbarSelect
        data-testid="editor-toolbar-font-family"
        value={t_style().fontFamily}
        onChange={(event) =>
          ctx().applyValueStyleCommand("fontFamily", event.currentTarget.value || null)
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
        onChange={(event) =>
          ctx().applyValueStyleCommand(
            "fontSize",
            event.currentTarget.value ? Number(event.currentTarget.value) : null,
          )
        }
        tooltip={t("toolbar.fontSize")}
      >
        <option value="">{t("toolbar.size")}</option>
        <For each={fontSizeOptions()}>
          {(fontSize) => <option value={String(fontSize)}>{fontSize}</option>}
        </For>
      </ToolbarSelect>

      <ColorSplitButton
        kind="color"
        icon="type"
        value={t_style().color || null}
        defaultValue="#111827"
        lastValue={lastTextColor()}
        tooltip={t("toolbar.color")}
        testId="editor-toolbar-color"
        automaticLabel={t("toolbar.colorAutomatic")}
        themeColorsLabel={t("toolbar.themeColors")}
        standardColorsLabel={t("toolbar.standardColors")}
        moreColorsLabel={t("toolbar.moreColors")}
        onApply={applyTextColor}
      />

      <ColorSplitButton
        kind="highlight"
        icon="highlighter"
        value={t_style().highlight || null}
        defaultValue="#fef08a"
        lastValue={lastHighlightColor()}
        tooltip={t("toolbar.highlight")}
        testId="editor-toolbar-highlight"
        noColorLabel={t("toolbar.noHighlight")}
        themeColorsLabel={t("toolbar.themeColors")}
        standardColorsLabel={t("toolbar.standardColors")}
        moreColorsLabel={t("toolbar.moreColors")}
        onApply={applyHighlightColor}
      />
    </>
  );
}
