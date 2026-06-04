import { Show, type JSX } from "solid-js";

/**
 * Custom inline-SVG icons that can't be expressed with lucide's monochrome,
 * path-only icon set (e.g. multi-color glyphs or text). Rendered directly as
 * SVG so they are not picked up by the lucide MutationObserver, which only
 * processes `[data-lucide]` elements.
 *
 * Each renderer mirrors lucide's default svg attributes (24x24 viewBox) so the
 * existing toolbar/menubar icon sizing applies identically.
 */
export type CustomIconRenderer = () => JSX.Element;

/** Word-style footnote glyph: "ab" in the current color with a red superscript "1". */
const FootnoteIcon: CustomIconRenderer = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <text
      x="2"
      y="18"
      font-family="'Segoe UI', Arial, sans-serif"
      font-size="14"
      font-weight="700"
      fill="currentColor"
    >
      ab
    </text>
    <text
      x="15.5"
      y="11"
      font-family="'Segoe UI', Arial, sans-serif"
      font-size="10"
      font-weight="700"
      fill="#c00000"
    >
      1
    </text>
  </svg>
);

const CUSTOM_ICONS: Record<string, CustomIconRenderer> = {
  footnote: FootnoteIcon,
};

export function getCustomIcon(name?: string): CustomIconRenderer | undefined {
  return name ? CUSTOM_ICONS[name] : undefined;
}

/**
 * Renders an icon by name: a registered custom inline SVG when available,
 * otherwise a lucide `<i data-lucide>` placeholder resolved by the icon observer.
 */
export function ToolIcon(props: { name: string }): JSX.Element {
  return (
    <Show when={getCustomIcon(props.name)} fallback={<i data-lucide={props.name} />}>
      {(render) => render()()}
    </Show>
  );
}
