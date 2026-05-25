import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { Dialog } from "./Dialog.js";
import { t } from "../../../i18n/index.js";

export interface FontDialogInitialValues {
  fontFamily: string;
  fontSize: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
}

export interface FontDialogApplyValues {
  fontFamily: string | null;
  fontSize: number | null;
  color: string | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
}

export interface FontDialogProps {
  isOpen: boolean;
  initial: FontDialogInitialValues;
  familyOptions: string[];
  sizeOptions: number[];
  onClose: () => void;
  onApply: (values: FontDialogApplyValues, original: FontDialogInitialValues) => void;
}

const DEFAULT_COLOR = "#111827";

export function FontDialog(props: FontDialogProps) {
  const [fontFamily, setFontFamily] = createSignal("");
  const [fontSize, setFontSize] = createSignal("");
  const [color, setColor] = createSignal(DEFAULT_COLOR);
  const [bold, setBold] = createSignal(false);
  const [italic, setItalic] = createSignal(false);
  const [underline, setUnderline] = createSignal(false);
  const [strike, setStrike] = createSignal(false);

  createEffect(() => {
    if (props.isOpen) {
      setFontFamily(props.initial.fontFamily ?? "");
      setFontSize(props.initial.fontSize ?? "");
      setColor(props.initial.color || DEFAULT_COLOR);
      setBold(Boolean(props.initial.bold));
      setItalic(Boolean(props.initial.italic));
      setUnderline(Boolean(props.initial.underline));
      setStrike(Boolean(props.initial.strike));
    }
  });

  const previewStyle = createMemo(() => {
    const size = Number(fontSize());
    return {
      "font-family": fontFamily() || "inherit",
      "font-size": Number.isFinite(size) && size > 0 ? `${size}pt` : undefined,
      "font-weight": bold() ? 700 : 400,
      "font-style": italic() ? "italic" : "normal",
      "text-decoration": [
        underline() ? "underline" : "",
        strike() ? "line-through" : "",
      ]
        .filter(Boolean)
        .join(" ") || "none",
      color: color(),
    } as Record<string, string | number | undefined>;
  });

  const handleApply = () => {
    const sizeNum = Number(fontSize());
    props.onApply(
      {
        fontFamily: fontFamily().trim() ? fontFamily().trim() : null,
        fontSize: Number.isFinite(sizeNum) && sizeNum > 0 ? sizeNum : null,
        color: color() || null,
        bold: bold(),
        italic: italic(),
        underline: underline(),
        strike: strike(),
      },
      props.initial,
    );
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.font.title")}
      onClose={props.onClose}
      footer={
        <>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
            onClick={props.onClose}
            data-testid="editor-font-dialog-cancel"
          >
            {t("generic.cancel")}
          </button>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
            onClick={handleApply}
            data-testid="editor-font-dialog-apply"
          >
            {t("generic.apply")}
          </button>
        </>
      }
    >
      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">{t("dialog.font.family")}</label>
          <select
            class="oasis-editor-dialog-input"
            value={fontFamily()}
            onChange={(e) => setFontFamily(e.currentTarget.value)}
            data-testid="editor-font-dialog-family"
          >
            <option value="">—</option>
            <For each={props.familyOptions}>
              {(family) => <option value={family}>{family}</option>}
            </For>
          </select>
        </div>
        <div class="oasis-editor-dialog-input-group">
          <label class="oasis-editor-dialog-label">{t("dialog.font.size")}</label>
          <select
            class="oasis-editor-dialog-input"
            value={fontSize()}
            onChange={(e) => setFontSize(e.currentTarget.value)}
            data-testid="editor-font-dialog-size"
          >
            <option value="">—</option>
            <For each={props.sizeOptions}>
              {(size) => <option value={String(size)}>{size}</option>}
            </For>
          </select>
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group">
          <label class="oasis-editor-dialog-label">{t("dialog.font.color")}</label>
          <input
            type="color"
            class="oasis-editor-dialog-color"
            value={color()}
            onInput={(e) => setColor(e.currentTarget.value)}
            data-testid="editor-font-dialog-color"
          />
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">{t("dialog.font.style")}</label>
          <div class="oasis-editor-dialog-style-row">
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={bold()}
                onChange={(e) => setBold(e.currentTarget.checked)}
                data-testid="editor-font-dialog-bold"
              />
              <span style={{ "font-weight": 700 }}>{t("dialog.font.bold")}</span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={italic()}
                onChange={(e) => setItalic(e.currentTarget.checked)}
                data-testid="editor-font-dialog-italic"
              />
              <span style={{ "font-style": "italic" }}>{t("dialog.font.italic")}</span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={underline()}
                onChange={(e) => setUnderline(e.currentTarget.checked)}
                data-testid="editor-font-dialog-underline"
              />
              <span style={{ "text-decoration": "underline" }}>{t("dialog.font.underline")}</span>
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                checked={strike()}
                onChange={(e) => setStrike(e.currentTarget.checked)}
                data-testid="editor-font-dialog-strike"
              />
              <span style={{ "text-decoration": "line-through" }}>{t("dialog.font.strike")}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">{t("dialog.font.preview")}</label>
        <div
          class="oasis-editor-dialog-preview"
          data-testid="editor-font-dialog-preview"
          style={previewStyle()}
        >
          {t("dialog.font.previewText")}
        </div>
      </div>
    </Dialog>
  );
}
