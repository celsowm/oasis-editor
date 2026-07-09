import { For, type JSX } from "solid-js";
import type { ColorPalette } from "@/ui/components/Toolbar/schema/palette.js";

export interface ColorGridsProps {
  palette: ColorPalette;
  themeColorsLabel: string;
  standardColorsLabel: string;
  /** Lowercased hex of the currently applied colour, for the active ring. */
  activeColor: string;
  testId: string;
  onPreview: (color: string | null) => void;
  onPick: (color: string) => void;
}

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * The theme-colour columns and standard-colour row shared by every colour popup
 * (font colour, highlight, shading, picture border). Owns only the swatches —
 * the surrounding "automatic"/"no colour" and "more colours" actions differ per
 * consumer and stay with them.
 */
export function ColorGrids(props: ColorGridsProps): JSX.Element {
  return (
    <>
      <div class="oasis-editor-color-menu-section">
        <div class="oasis-editor-color-menu-heading">
          {props.themeColorsLabel}
        </div>
        <div class="oasis-editor-color-theme-grid">
          <For each={props.palette.themeColors}>
            {(theme): JSX.Element => (
              <div class="oasis-editor-color-theme-column">
                <For each={theme.values}>
                  {(color): JSX.Element => (
                    <button
                      type="button"
                      class="oasis-editor-color-swatch"
                      classList={{
                        "oasis-editor-color-swatch-active":
                          props.activeColor === normalize(color),
                      }}
                      style={{ "background-color": color }}
                      title={`${theme.name} ${color}`}
                      aria-label={`${theme.name} ${color}`}
                      data-testid={`${props.testId}-theme-swatch-${color.replace("#", "")}`}
                      onMouseEnter={(): void => props.onPreview(color)}
                      onFocus={(): void => props.onPreview(color)}
                      onBlur={(): void => props.onPreview(null)}
                      onClick={(): void => props.onPick(color)}
                    />
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="oasis-editor-color-menu-section">
        <div class="oasis-editor-color-menu-heading">
          {props.standardColorsLabel}
        </div>
        <div class="oasis-editor-color-standard-grid">
          <For each={props.palette.standardColors}>
            {(swatch): JSX.Element => (
              <button
                type="button"
                class="oasis-editor-color-swatch"
                classList={{
                  "oasis-editor-color-swatch-active":
                    props.activeColor === normalize(swatch.value),
                }}
                style={{ "background-color": swatch.value }}
                title={swatch.name}
                aria-label={swatch.name}
                data-testid={`${props.testId}-standard-swatch-${swatch.value.replace("#", "")}`}
                onMouseEnter={(): void => props.onPreview(swatch.value)}
                onFocus={(): void => props.onPreview(swatch.value)}
                onBlur={(): void => props.onPreview(null)}
                onClick={(): void => props.onPick(swatch.value)}
              />
            )}
          </For>
        </div>
      </div>
    </>
  );
}
