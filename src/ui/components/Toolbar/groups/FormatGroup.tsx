import { For, createSignal } from "solid-js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { booleanButtons, UNDERLINE_BUTTON_TOOLTIP } from "../toolbarConfig.js";
import { UnderlineSplitButton } from "../UnderlineSplitButton.js";
import type { EditorUnderlineStyle } from "../../../../core/model.js";
import { t } from "../../../../i18n/index.js";

/**
 * Format buttons (Bold, Italic, Underline, etc.) rendered as
 * individual items — NOT wrapped in a ToolbarGroup — so the
 * OverflowManager can move them one-by-one instead of all-or-nothing.
 *
 * The underline button is rendered as a split-button (icon + chevron):
 * clicking the icon toggles underline; clicking the chevron opens a
 * stack of line-style options (single, double, dotted, dashed, wave…).
 */
export function FormatGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();
  const [lastUnderlineStyle, setLastUnderlineStyle] = createSignal<EditorUnderlineStyle>("single");
  const executeOrFallback = (commandName: string, fallback: () => void) => {
    const toolbarCtx = ctx();
    const executeCommand = toolbarCtx.executeCommand;
    const canExecuteCommand = toolbarCtx.canExecuteCommand;
    if (executeCommand) {
      if (canExecuteCommand && canExecuteCommand(commandName)) {
        executeCommand(commandName);
        return;
      }
      if (!canExecuteCommand) {
        executeCommand(commandName);
        return;
      }
    }
    fallback();
  };

  const applyUnderlineStyle = (style: EditorUnderlineStyle) => {
    setLastUnderlineStyle(style);
    const wasActive = t_style().underline;
    const styleValue: EditorUnderlineStyle | null = style === "single" ? null : style;
    ctx().applyValueStyleCommand("underlineStyle", styleValue);
    if (!wasActive) {
      executeOrFallback("underline", () => ctx().applyBooleanStyleCommand("underline"));
    }
  };

  const toggleUnderline = () => {
    if (!t_style().underline) {
      const style = lastUnderlineStyle();
      if (style !== "single" && !t_style().underlineStyle) {
        ctx().applyValueStyleCommand("underlineStyle", style);
      }
    }
    executeOrFallback("underline", () => ctx().applyBooleanStyleCommand("underline"));
  };

  const removeUnderline = () => {
    if (t_style().underline) {
      executeOrFallback("underline", () => ctx().applyBooleanStyleCommand("underline"));
    }
    ctx().applyValueStyleCommand("underlineStyle", null);
  };

  // Bold + Italic come before Underline; the rest after — preserves the
  // historical button order (B, I, U, S, Sup, Sub).
  const buttonsBeforeUnderline = () => booleanButtons.filter((b) => b.key === "bold" || b.key === "italic");
  const buttonsAfterUnderline = () =>
    booleanButtons.filter((b) => b.key !== "bold" && b.key !== "italic");

  return (
    <>
      <For each={buttonsBeforeUnderline()}>
        {(button) => (
          <ToolbarButton
            icon={button.icon}
            active={!!t_style()[button.key]}
            data-testid={button.testId}
            onClick={() =>
              button.key === "bold" || button.key === "italic"
                ? executeOrFallback(button.key, () => ctx().applyBooleanStyleCommand(button.key))
                : ctx().applyBooleanStyleCommand(button.key)
            }
            tooltip={t(`toolbar.${button.key}` as any)}
          />
        )}
      </For>
      <UnderlineSplitButton
        active={t_style().underline}
        currentStyle={t_style().underlineStyle || ""}
        lastStyle={lastUnderlineStyle()}
        tooltip={UNDERLINE_BUTTON_TOOLTIP}
        testId="editor-toolbar-underline"
        removeLabel={t("toolbar.underlineRemove")}
        onToggleUnderline={toggleUnderline}
        onApplyStyle={applyUnderlineStyle}
        onRemoveUnderline={removeUnderline}
      />
      <For each={buttonsAfterUnderline()}>
        {(button) => (
          <ToolbarButton
            icon={button.icon}
            active={!!t_style()[button.key]}
            data-testid={button.testId}
            onClick={() =>
              button.key === "strike" || button.key === "superscript" || button.key === "subscript"
                ? executeOrFallback(button.key, () => ctx().applyBooleanStyleCommand(button.key))
                : ctx().applyBooleanStyleCommand(button.key)
            }
            tooltip={t(`toolbar.${button.key}` as any)}
          />
        )}
      </For>
    </>
  );
}
