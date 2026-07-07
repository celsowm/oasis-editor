import { type JSX } from "solid-js";

export interface DropdownChevronProps {
  /**
   * Extra class for the affordance element. The base `.oasis-editor-dropdown-chevron`
   * class is always applied and owns the canonical small/crisp size (13px, full
   * opacity) shared by every dropdown in the toolbar.
   */
  class?: string;
}

/**
 * The single dropdown-affordance glyph for the whole toolbar. Every dropdown-ish
 * control (Menu, SplitButton's menu side, StyleGallery expand) composes this so
 * there is exactly one chevron look — no per-control re-implementations.
 *
 * Rendered as a lucide `<i data-lucide="chevron-down">` placeholder (resolved by
 * the icon observer) rather than an inline SVG, so it stays consistent with the
 * rest of the icon set and inherits `currentColor`.
 */
export function DropdownChevron(props: DropdownChevronProps): JSX.Element {
  return (
    <i
      data-lucide="chevron-down"
      class={`oasis-editor-dropdown-chevron${props.class ? ` ${props.class}` : ""}`}
    />
  );
}
