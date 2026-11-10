import { createMemo, type JSX } from "solid-js";
import { createLucideSvg } from "@/ui/utils/IconManager.js";

export interface DropdownChevronProps {
  /** Additional classes; the shared affordance retains its canonical 12px slot. */
  class?: string;
}

/** An owned Lucide node keeps one affordance through updates and disposal. */
export function DropdownChevron(props: DropdownChevronProps): JSX.Element {
  const glyph = createMemo(() =>
    createLucideSvg("chevron-down", {
      class: `oasis-editor-dropdown-chevron${props.class ? ` ${props.class}` : ""}`,
    }),
  );
  return <>{glyph()}</>;
}
