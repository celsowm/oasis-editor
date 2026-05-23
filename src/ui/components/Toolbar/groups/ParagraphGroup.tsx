import { For } from "solid-js";
import type { EditorParagraphListStyle } from "../../../../core/model.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarDropdown } from "../ToolbarDropdown.js";
import { ToolbarSelect } from "../ToolbarSelect.js";
import { alignButtons, listButtons } from "../toolbarConfig.js";
import { t } from "../../../../i18n/index.js";

/**
 * Alignment and list buttons rendered as individual items (no wrapper)
 * so the OverflowManager can move them one-by-one.
 * The list-options dropdown (format/start-at) stays as a small dropdown.
 */
export function ParagraphGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const t_style = () => ctx().toolbarStyleState();

  return (
    <>
      <For each={alignButtons}>
        {(button) => (
          <ToolbarButton
            icon={button.icon}
            active={t_style().align === button.value}
            data-testid={button.testId}
            onClick={() => ctx().applyParagraphStyleCommand("align", button.value)}
            tooltip={t(`toolbar.${button.icon.replace(/-./g, x => x[1].toUpperCase())}` as any)}
          />
        )}
      </For>

      <For each={listButtons}>
        {(button) => (
          <ToolbarButton
            icon={button.icon}
            active={t_style().listKind === button.kind}
            data-testid={button.testId}
            onClick={() => ctx().applyParagraphListCommand(button.kind)}
            tooltip={t(`toolbar.${button.kind}List` as any)}
          />
        )}
      </For>

      <ToolbarButton
        icon="indent-decrease"
        data-testid="editor-toolbar-list-outdent"
        onClick={() => ctx().handleListTab("outdent")}
        tooltip={t("toolbar.decreaseIndent")}
      />
      <ToolbarButton
        icon="indent-increase"
        data-testid="editor-toolbar-list-indent"
        onClick={() => ctx().handleListTab("indent")}
        tooltip={t("toolbar.increaseIndent")}
      />

      <ToolbarDropdown
        label=""
        icon="list-filter"
        testId="editor-toolbar-list-options-dropdown"
        tooltip={t("toolbar.listFormat")}
        hideChevron
      >
        <div class="oasis-editor-toolbar-list-options">
          <label class="oasis-editor-toolbar-field">
            <span>{t("toolbar.listFormat")}</span>
            <ToolbarSelect
              data-testid="editor-toolbar-list-format"
              onChange={(e) =>
                ctx().handleListFormatChange(
                  e.currentTarget.value as EditorParagraphListStyle["format"],
                )
              }
              tooltip={t("toolbar.listFormat")}
            >
              <option value="decimal">{t("toolbar.formatDecimal")}</option>
              <option value="lowerLetter">{t("toolbar.formatLowerLetter")}</option>
              <option value="upperLetter">{t("toolbar.formatUpperLetter")}</option>
              <option value="lowerRoman">{t("toolbar.formatLowerRoman")}</option>
              <option value="upperRoman">{t("toolbar.formatUpperRoman")}</option>
              <option value="bullet">{t("toolbar.formatBullet")}</option>
            </ToolbarSelect>
          </label>

          <label class="oasis-editor-toolbar-field">
            <span>{t("toolbar.listStartAt")}</span>
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
              title={t("toolbar.listStartAt")}
            />
          </label>
        </div>
      </ToolbarDropdown>
    </>
  );
}
