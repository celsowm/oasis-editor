import type { JSX } from "solid-js";
import oasisMarkBase64 from "../../../branding/generated/brand-mark.webp?base64";

/**
 * The Oasis Editor brand mark, embedded as a base64 data URI through the same
 * `?base64` Vite plugin used for the bundled fonts. Inlining keeps it
 * self-contained in the library build (where `assetsInlineLimit` is 0 and an
 * emitted asset URL would break consumers) with no runtime asset fetch. The
 * source is a compact 192×256 WebP (~6 KB) rendered from the vector artwork.
 */
const OASIS_MARK_DATA_URI = `data:image/webp;base64,${oasisMarkBase64}`;

// Intrinsic aspect ratio of the mark (192×256 = 3:4).
const MARK_ASPECT = 3 / 4;

export function OasisBrandMark(props: {
  /** Rendered height in px; width follows the 3:4 aspect ratio. */
  height?: number;
  class?: string;
}): JSX.Element {
  const height = () => props.height ?? 64;
  const width = () => Math.round(height() * MARK_ASPECT);
  return (
    <img
      src={OASIS_MARK_DATA_URI}
      width={width()}
      height={height()}
      alt=""
      aria-hidden="true"
      class={props.class}
      draggable={false}
    />
  );
}
