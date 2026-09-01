import { For, Show, createMemo, createSignal, type JSX } from "solid-js";
import type { EditorPageBorder, EditorWatermark } from "@/core/model.js";
import type { DesignThemeId } from "@/core/commands/design.js";
import type { ToolbarActionApi } from "./schema/items.js";

interface ThemeCard {
  id: DesignThemeId;
  label: string;
  colors: [string, string, string, string];
  heading: string;
  body: string;
}

const THEMES: ThemeCard[] = [
  {
    id: "oasis",
    label: "Oasis",
    colors: ["#0f766e", "#14b8a6", "#f0fdfa", "#1f2937"],
    heading: "Aptos Display",
    body: "Aptos",
  },
  {
    id: "office",
    label: "Office",
    colors: ["#4472c4", "#5b9bd5", "#deebf7", "#1f2937"],
    heading: "Calibri Light",
    body: "Calibri",
  },
  {
    id: "facet",
    label: "Facet",
    colors: ["#8064a2", "#c4a7e7", "#eee8f5", "#262626"],
    heading: "Georgia",
    body: "Georgia",
  },
  {
    id: "integral",
    label: "Integral",
    colors: ["#70ad47", "#a9d18e", "#e2f0d9", "#1f2937"],
    heading: "Calibri Light",
    body: "Calibri",
  },
  {
    id: "ion",
    label: "Ion",
    colors: ["#ed7d31", "#f4b183", "#fce4d6", "#262626"],
    heading: "Garamond",
    body: "Garamond",
  },
  {
    id: "retrospect",
    label: "Retrospect",
    colors: ["#5b9bd5", "#9dc3e6", "#deebf7", "#1f2937"],
    heading: "Georgia",
    body: "Aptos",
  },
];

const COLOR_SCHEMES = [
  {
    id: "oasis",
    label: "Oasis",
    colors: ["#0f766e", "#14b8a6", "#f0fdfa", "#1f2937"],
  },
  {
    id: "office",
    label: "Office",
    colors: ["#4472c4", "#ed7d31", "#a5a5a5", "#ffc000"],
  },
  {
    id: "monochrome",
    label: "Monocromático",
    colors: ["#111827", "#4b5563", "#9ca3af", "#e5e7eb"],
  },
  {
    id: "warm",
    label: "Quente",
    colors: ["#9a3412", "#ea580c", "#f59e0b", "#fef3c7"],
  },
] as const;

const FONT_SCHEMES = [
  { id: "aptos", heading: "Aptos Display", body: "Aptos" },
  { id: "calibri", heading: "Calibri Light", body: "Calibri" },
  { id: "georgia", heading: "Georgia", body: "Georgia" },
  { id: "garamond", heading: "Garamond", body: "Garamond" },
] as const;

const SPACING = [
  { id: "compact", label: "Compacto", sample: "Antes 0 · Depois 4" },
  { id: "tight", label: "Estreito", sample: "Antes 0 · Depois 6" },
  { id: "open", label: "Aberto", sample: "Antes 0 · Depois 10" },
  { id: "relaxed", label: "Relaxado", sample: "Antes 4 · Depois 12" },
] as const;

const EFFECTS = [
  { id: "subtle", label: "Sutil", description: "Sombras leves" },
  { id: "moderate", label: "Moderado", description: "Contraste equilibrado" },
  { id: "intense", label: "Intenso", description: "Sombras marcantes" },
  { id: "flat", label: "Plano", description: "Sem efeitos" },
] as const;

function moveFocus(
  event: KeyboardEvent,
  selector: string,
  columns: number,
): void {
  const current = event.currentTarget as HTMLElement;
  const buttons = Array.from(
    current.querySelectorAll<HTMLButtonElement>(selector),
  );
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  const moves: Record<string, number | undefined> = {
    ArrowLeft: index - 1,
    ArrowRight: index + 1,
    ArrowUp: index - columns,
    ArrowDown: index + columns,
    Home: 0,
    End: buttons.length - 1,
  };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus();
}

export interface DesignGalleryProps {
  api: ToolbarActionApi;
}

/** Word-like visual gallery used by the Design ribbon's custom menu. */
export function DesignGallery(props: DesignGalleryProps): JSX.Element {
  const [previewTheme, setPreviewTheme] = createSignal<DesignThemeId | null>(
    null,
  );
  const apply = (command: string, payload: unknown): void => {
    props.api.commands.execute(command, payload);
    props.api.focusEditor();
  };
  const selectedTheme = createMemo(() =>
    String(props.api.commands.state("applyDocumentTheme").value ?? ""),
  );
  const selectedColors = createMemo(() =>
    String(props.api.commands.state("setDocumentColorScheme").value ?? ""),
  );
  const selectedFonts = createMemo(() =>
    String(props.api.commands.state("setDocumentFontScheme").value ?? ""),
  );
  const selectedSpacing = createMemo(() =>
    String(props.api.commands.state("setDocumentParagraphSpacing").value ?? ""),
  );
  const selectedEffects = createMemo(() =>
    String(props.api.commands.state("setDocumentEffects").value ?? ""),
  );

  return (
    <div
      class="oasis-editor-design-gallery"
      role="dialog"
      aria-label={props.api.t("design.themes")}
    >
      <section class="oasis-editor-design-gallery-section">
        <h3>{props.api.t("design.themes")}</h3>
        <div
          class="oasis-editor-design-theme-grid"
          role="listbox"
          onKeyDown={(event) =>
            moveFocus(event, ".oasis-editor-design-theme-card", 3)
          }
        >
          <For each={THEMES}>
            {(theme): JSX.Element => (
              <button
                type="button"
                class="oasis-editor-design-theme-card"
                classList={{
                  "oasis-editor-design-card-active":
                    selectedTheme() === theme.id,
                }}
                role="option"
                aria-selected={selectedTheme() === theme.id}
                data-testid={`editor-toolbar-design-theme-${theme.id}`}
                onMouseEnter={() => setPreviewTheme(theme.id)}
                onMouseLeave={() => setPreviewTheme(null)}
                onFocus={() => setPreviewTheme(theme.id)}
                onBlur={() => setPreviewTheme(null)}
                onClick={() => apply("applyDocumentTheme", theme.id)}
              >
                <span
                  class="oasis-editor-design-theme-preview"
                  style={{ "background-color": theme.colors[2] }}
                >
                  <strong
                    style={{
                      color: theme.colors[1],
                      "font-family": theme.heading,
                    }}
                  >
                    Aa
                  </strong>
                  <span
                    style={{
                      color: theme.colors[3],
                      "font-family": theme.body,
                    }}
                  >
                    Lorem ipsum
                  </span>
                  <i style={{ "background-color": theme.colors[0] }} />
                  <i style={{ "background-color": theme.colors[1] }} />
                </span>
                <span>{theme.label}</span>
              </button>
            )}
          </For>
        </div>
        <Show when={previewTheme()}>
          {(id): JSX.Element => {
            const theme = THEMES.find((item) => item.id === id());
            return (
              <p class="oasis-editor-design-preview-note">
                {theme?.heading} · {theme?.body}
              </p>
            );
          }}
        </Show>
      </section>

      <section class="oasis-editor-design-gallery-section">
        <h3>{props.api.t("design.colors")}</h3>
        <div
          class="oasis-editor-design-option-grid"
          role="listbox"
          onKeyDown={(event) =>
            moveFocus(event, ".oasis-editor-design-option-card", 4)
          }
        >
          <For each={COLOR_SCHEMES}>
            {(scheme): JSX.Element => (
              <button
                type="button"
                class="oasis-editor-design-option-card"
                classList={{
                  "oasis-editor-design-card-active":
                    selectedColors() === scheme.id,
                }}
                role="option"
                aria-selected={selectedColors() === scheme.id}
                data-testid={`editor-toolbar-design-color-${scheme.id}`}
                onClick={() => apply("setDocumentColorScheme", scheme.id)}
              >
                <span class="oasis-editor-design-swatch-row">
                  <For each={scheme.colors}>
                    {(color) => <i style={{ "background-color": color }} />}
                  </For>
                </span>
                <span>{scheme.label}</span>
              </button>
            )}
          </For>
        </div>
      </section>

      <section class="oasis-editor-design-gallery-section">
        <h3>{props.api.t("design.fonts")}</h3>
        <div
          class="oasis-editor-design-option-grid"
          role="listbox"
          onKeyDown={(event) =>
            moveFocus(event, ".oasis-editor-design-font-card", 2)
          }
        >
          <For each={FONT_SCHEMES}>
            {(scheme): JSX.Element => (
              <button
                type="button"
                class="oasis-editor-design-option-card oasis-editor-design-font-card"
                classList={{
                  "oasis-editor-design-card-active":
                    selectedFonts() === scheme.id,
                }}
                role="option"
                aria-selected={selectedFonts() === scheme.id}
                data-testid={`editor-toolbar-design-font-${scheme.id}`}
                onClick={() => apply("setDocumentFontScheme", scheme.id)}
              >
                <strong style={{ "font-family": scheme.heading }}>
                  Título
                </strong>
                <span style={{ "font-family": scheme.body }}>Texto normal</span>
              </button>
            )}
          </For>
        </div>
      </section>

      <div class="oasis-editor-design-gallery-columns">
        <section class="oasis-editor-design-gallery-section">
          <h3>{props.api.t("design.spacing")}</h3>
          <div class="oasis-editor-design-compact-grid" role="listbox">
            <For each={SPACING}>
              {(option) => (
                <button
                  type="button"
                  class="oasis-editor-design-list-card"
                  classList={{
                    "oasis-editor-design-card-active":
                      selectedSpacing() === option.id,
                  }}
                  onClick={() =>
                    apply("setDocumentParagraphSpacing", option.id)
                  }
                >
                  <strong>{option.label}</strong>
                  <small>{option.sample}</small>
                </button>
              )}
            </For>
          </div>
        </section>
        <section class="oasis-editor-design-gallery-section">
          <h3>{props.api.t("design.effects")}</h3>
          <div class="oasis-editor-design-compact-grid" role="listbox">
            <For each={EFFECTS}>
              {(option) => (
                <button
                  type="button"
                  class="oasis-editor-design-list-card"
                  classList={{
                    "oasis-editor-design-card-active":
                      selectedEffects() === option.id,
                  }}
                  onClick={() => apply("setDocumentEffects", option.id)}
                >
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </button>
              )}
            </For>
          </div>
        </section>
      </div>
    </div>
  );
}

export interface DesignWatermarkPanelProps {
  api: ToolbarActionApi;
}

export function DesignWatermarkPanel(
  props: DesignWatermarkPanelProps,
): JSX.Element {
  const current = (): EditorWatermark | null =>
    (props.api.commands.state("setDocumentWatermark").value as
      | EditorWatermark
      | null
      | undefined) ?? null;
  const [text, setText] = createSignal(current()?.text ?? "CONFIDENCIAL");
  const [color, setColor] = createSignal(current()?.color ?? "#94a3b8");
  const [opacity, setOpacity] = createSignal(current()?.opacity ?? 0.25);
  const [scale, setScale] = createSignal(current()?.scale ?? 1);
  const [rotation, setRotation] = createSignal(current()?.rotation ?? -45);
  const [fontFamily, setFontFamily] = createSignal(
    current()?.fontFamily ?? "Arial",
  );
  const [fontSize, setFontSize] = createSignal(current()?.fontSize ?? 48);
  const applyText = (): void => {
    props.api.commands.execute("setDocumentWatermark", {
      kind: "text",
      text: text(),
      color: color(),
      opacity: opacity(),
      scale: scale(),
      rotation: rotation(),
      fontFamily: fontFamily(),
      fontSize: fontSize(),
    });
  };
  const onImage = (event: Event): void => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (): void => {
      props.api.commands.execute("setDocumentWatermark", {
        kind: "image",
        src: String(reader.result),
        color: color(),
        opacity: opacity(),
        scale: scale(),
        rotation: rotation(),
      });
    };
    reader.readAsDataURL(file);
  };
  return (
    <div class="oasis-editor-design-background-panel">
      <h3>{props.api.t("design.watermark")}</h3>
      <div class="oasis-editor-design-presets">
        <For each={["CONFIDENCIAL", "RASCUNHO", "NÃO COPIAR"]}>
          {(preset) => (
            <button
              type="button"
              onClick={() => {
                setText(preset);
                applyText();
              }}
            >
              {preset}
            </button>
          )}
        </For>
      </div>
      <label>
        {props.api.t("design.text")}
        <input
          value={text()}
          onInput={(event) => setText(event.currentTarget.value)}
        />
      </label>
      <div class="oasis-editor-design-fields">
        <label>
          {props.api.t("design.color")}
          <input
            type="color"
            value={color()}
            onInput={(event) => setColor(event.currentTarget.value)}
          />
        </label>
        <label>
          {props.api.t("design.opacity")}
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={opacity()}
            onInput={(event) => setOpacity(Number(event.currentTarget.value))}
          />
        </label>
        <label>
          {props.api.t("design.scale")}
          <input
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={scale()}
            onInput={(event) => setScale(Number(event.currentTarget.value))}
          />
        </label>
        <label>
          {props.api.t("design.rotation")}
          <input
            type="number"
            min="-180"
            max="180"
            value={rotation()}
            onInput={(event) => setRotation(Number(event.currentTarget.value))}
          />
        </label>
        <label>
          {props.api.t("design.fontFamily")}
          <input
            value={fontFamily()}
            onInput={(event) => setFontFamily(event.currentTarget.value)}
          />
        </label>
        <label>
          {props.api.t("design.fontSize")}
          <input
            type="number"
            min="8"
            max="240"
            value={fontSize()}
            onInput={(event) => setFontSize(Number(event.currentTarget.value))}
          />
        </label>
      </div>
      <div class="oasis-editor-design-actions">
        <button type="button" onClick={applyText}>
          {props.api.t("design.applyText")}
        </button>
        <label class="oasis-editor-design-file">
          {props.api.t("design.useImage")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/svg+xml"
            onChange={onImage}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            props.api.commands.execute("setDocumentWatermark", null)
          }
        >
          {props.api.t("design.remove")}
        </button>
      </div>
    </div>
  );
}

export interface DesignPageBorderPanelProps {
  api: ToolbarActionApi;
}

export function DesignPageBorderPanel(
  props: DesignPageBorderPanelProps,
): JSX.Element {
  const current = (): EditorPageBorder | null =>
    (props.api.commands.state("setDocumentPageBorder").value as
      | EditorPageBorder
      | null
      | undefined) ?? null;
  const [style, setStyle] = createSignal<EditorPageBorder["style"]>(
    current()?.style ?? "single",
  );
  const [color, setColor] = createSignal(current()?.color ?? "#64748b");
  const [width, setWidth] = createSignal(current()?.width ?? 1);
  const [distance, setDistance] = createSignal(current()?.distance ?? 24);
  const apply = (): void => {
    props.api.commands.execute("setDocumentPageBorder", {
      style: style(),
      color: color(),
      width: width(),
      distance: distance(),
    });
  };
  return (
    <div class="oasis-editor-design-background-panel">
      <h3>{props.api.t("design.pageBorders")}</h3>
      <div
        class="oasis-editor-design-border-preview"
        style={{ border: `${width()}px ${style()} ${color()}` }}
      >
        Página
      </div>
      <div class="oasis-editor-design-fields">
        <label>
          {props.api.t("design.borderStyle")}
          <select
            value={style()}
            onChange={(event) =>
              setStyle(event.currentTarget.value as EditorPageBorder["style"])
            }
          >
            <option value="single">Simples</option>
            <option value="double">Dupla</option>
            <option value="dashed">Tracejada</option>
            <option value="dotted">Pontilhada</option>
          </select>
        </label>
        <label>
          {props.api.t("design.color")}
          <input
            type="color"
            value={color()}
            onInput={(event) => setColor(event.currentTarget.value)}
          />
        </label>
        <label>
          {props.api.t("design.borderWidth")}
          <input
            type="number"
            min="1"
            max="12"
            value={width()}
            onInput={(event) => setWidth(Number(event.currentTarget.value))}
          />
        </label>
        <label>
          {props.api.t("design.distance")}
          <input
            type="number"
            min="0"
            max="144"
            value={distance()}
            onInput={(event) => setDistance(Number(event.currentTarget.value))}
          />
        </label>
      </div>
      <div class="oasis-editor-design-actions">
        <button type="button" onClick={apply}>
          {props.api.t("design.apply")}
        </button>
        <button
          type="button"
          onClick={() =>
            props.api.commands.execute("setDocumentPageBorder", null)
          }
        >
          {props.api.t("design.remove")}
        </button>
      </div>
    </div>
  );
}
