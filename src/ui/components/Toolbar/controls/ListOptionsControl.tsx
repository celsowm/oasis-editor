import { type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import { Select } from "@/ui/components/Toolbar/primitives/Select.js";

import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

/** List format + start-at options dropdown — command-driven. */
export function ListOptionsControl(props: {
  api: ToolbarActionApi;
}): JSX.Element {
  const t = useI18n();
  const api = props.api;
  return (
    <Menu
      icon="list-filter"
      tooltip={t("toolbar.listFormat")}
      testId="editor-toolbar-list-options-dropdown"
      hideChevron
    >
      <div class="oasis-editor-toolbar-list-options">
        <label class="oasis-editor-toolbar-field">
          <span>{t("toolbar.listFormat")}</span>
          <Select
            data-testid="editor-toolbar-list-format"
            onChange={(e): unknown =>
              api.commands.execute("setListFormat", e.currentTarget.value)
            }
            tooltip={t("toolbar.listFormat")}
          >
            <option value="decimal">{t("toolbar.formatDecimal")}</option>
            <option value="lowerLetter">
              {t("toolbar.formatLowerLetter")}
            </option>
            <option value="upperLetter">
              {t("toolbar.formatUpperLetter")}
            </option>
            <option value="lowerRoman">{t("toolbar.formatLowerRoman")}</option>
            <option value="upperRoman">{t("toolbar.formatUpperRoman")}</option>
            <option value="bullet">{t("toolbar.formatBullet")}</option>
          </Select>
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
            onChange={(e): unknown =>
              api.commands.execute("setListStartAt", e.currentTarget.value)
            }
            title={t("toolbar.listStartAt")}
          />
        </label>
      </div>
    </Menu>
  );
}
