import { Show, createMemo, type JSX } from "solid-js";

import { createLucideSvg } from "./IconManager.js";

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

/**
 * Shared SVG shell for custom icons. Centralizes the boilerplate
 * (`xmlns`/`width`/`height`/`viewBox`/`aria-hidden`) that every custom icon used
 * to repeat, so new glyphs only declare their inner markup. Defaults to lucide's
 * 24x24 viewBox so existing toolbar icon sizing applies identically; callers can
 * override `width`/`height`/`viewBox` for non-default glyphs (e.g. the line
 * spacing arrow) and pass arbitrary SVG presentation attributes.
 */
export interface SvgIconProps {
  width?: number | string;
  height?: number | string;
  viewBox?: string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number | string;
  "stroke-linecap"?: JSX.SvgSVGAttributes<SVGSVGElement>["stroke-linecap"];
  "stroke-linejoin"?: JSX.SvgSVGAttributes<SVGSVGElement>["stroke-linejoin"];
  class?: string;
  children: JSX.Element;
}

export function SvgIcon(props: SvgIconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width ?? 24}
      height={props.height ?? 24}
      viewBox={props.viewBox ?? "0 0 24 24"}
      fill={props.fill ?? "none"}
      stroke={props.stroke}
      stroke-width={props["stroke-width"]}
      stroke-linecap={props["stroke-linecap"]}
      stroke-linejoin={props["stroke-linejoin"]}
      class={props.class}
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

/** Original path glyphs keep superscript metrics independent of system fonts. */
const FootnoteIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4.5" y="2.5" width="13" height="19" rx="1.2" />
    <path d="M7.5 6.5h7M7.5 9.5h5" opacity={0.65} />
    <path d="M7.5 14.5h4.5" stroke="var(--oasis-accent, #1a73e8)" />
    <path d="M7.5 17.5h7" />
    <path
      d="m18 4.8 1.8-1.3V9.5m-1.6 0h3.2"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.85}
    />
  </SvgIcon>
);

/** Underline letterform mirrors Lucide's 24px stroke and vertical ink bounds. */
const UnderlineGlyphIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={2}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M7 4v10a5 5 0 0 0 10 0V4M6 20h12" />
  </SvgIcon>
);

/** Document-story icons share a page silhouette and distinct target regions. */
function PageStoryIcon(props: {
  target: "header" | "footer" | "both";
  numbered?: boolean;
}): JSX.Element {
  const top = props.target !== "footer";
  const bottom = props.target !== "header";
  return (
    <SvgIcon
      stroke="currentColor"
      stroke-width={1.7}
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="5" y="2.5" width="14" height="19" rx="1.2" />
      <path d="M8 10h8m-8 3h8" opacity={0.65} />
      <Show
        when={props.numbered}
        fallback={
          <>
            <Show when={top}>
              <rect
                x="7.5"
                y="4.5"
                width="9"
                height="2.5"
                rx="0.5"
                fill="var(--oasis-accent, #1a73e8)"
                stroke="none"
              />
            </Show>
            <Show when={bottom}>
              <rect
                x="7.5"
                y="17"
                width="9"
                height="2.5"
                rx="0.5"
                fill="var(--oasis-accent, #1a73e8)"
                stroke="none"
              />
            </Show>
          </>
        }
      >
        <path
          d={top ? "m10.5 5.5 1.5-1v4m-1.5 0h3" : "m10.5 16.5 1.5-1v4m-1.5 0h3"}
          stroke="var(--oasis-accent, #1a73e8)"
        />
      </Show>
    </SvgIcon>
  );
}
const PageHeaderIcon: CustomIconRenderer = () => (
  <PageStoryIcon target="header" />
);
const PageFooterIcon: CustomIconRenderer = () => (
  <PageStoryIcon target="footer" />
);
const PageHeaderFooterIcon: CustomIconRenderer = () => (
  <PageStoryIcon target="both" />
);
const PageNumberTopIcon: CustomIconRenderer = () => (
  <PageStoryIcon target="header" numbered />
);
const PageNumberBottomIcon: CustomIconRenderer = () => (
  <PageStoryIcon target="footer" numbered />
);
const PageNumberIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="5" y="2.5" width="14" height="19" rx="1.2" />
    <path d="M8 6h8m-8 3h6" opacity={0.65} />
    <path d="m10.5 14 1.5-1v5m-1.5 0h3" stroke="var(--oasis-accent, #1a73e8)" />
  </SvgIcon>
);
const PageCountIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M15 4V2.5H3.5v16H6" opacity={0.65} />
    <rect x="7" y="5.5" width="13.5" height="16" rx="1.2" />
    <path d="M10 9h7m-7 3h5" opacity={0.65} />
    <path d="m12 16 1.5-1v4m-1.5 0h3" stroke="var(--oasis-accent, #1a73e8)" />
  </SvgIcon>
);

/** Word-like first-line indent glyph: a simple ">" on the first line. */
const SpecialIndentFirstLineIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon fill="currentColor">
    <g>
      <path d="M3.375 4.875 L7.125 8.625 L3.375 12.375 L2.25 11.25 L4.875 8.625 L2.25 6 Z" />
      <rect x="10.125" y="6" width="9" height="1.6875" rx="0.25" />
      <rect x="5.625" y="10.875" width="13.5" height="1.6875" rx="0.25" />
      <rect x="5.625" y="15.75" width="13.5" height="1.6875" rx="0.25" />
    </g>
  </SvgIcon>
);

/**
 * Line-spacing dropdown glyph: a vertical up/down double arrow next to three
 * stacked horizontal lines. Registered as a custom icon so the LineSpacing
 * dropdown can render it through the normal `icon` prop like any other control,
 * instead of hand-rolling its own trigger markup.
 */
const LineSpacingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    width={18}
    height={18}
    stroke="currentColor"
    stroke-width={2}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    {/* Up arrow head */}
    <polyline points="4 7 7 4 10 7" />
    {/* Vertical shaft */}
    <line x1="7" y1="4" x2="7" y2="20" />
    {/* Down arrow head */}
    <polyline points="4 17 7 20 10 17" />
    {/* Horizontal lines */}
    <line x1="13" y1="6" x2="21" y2="6" />
    <line x1="13" y1="12" x2="21" y2="12" />
    <line x1="13" y1="18" x2="21" y2="18" />
  </SvgIcon>
);

/** Office-like table glyph shell: a compact 3×3 grid with a command mark. */
const TableIcon = (props: { children: JSX.Element }): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.65}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="5.25" y="5.25" width="13.5" height="13.5" rx="0.7" />
    <path d="M9.75 5.25v13.5M14.25 5.25v13.5M5.25 9.75h13.5M5.25 14.25h13.5" />
    {props.children}
  </SvgIcon>
);

const DeleteTableIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 11V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6M4 9.5h16M9.5 4v16M4 9.5v9.5a1 1 0 0 0 1 1h6.5" />
    <path d="m14.5 14.5 5 5m0-5-5 5" stroke="#d14343" stroke-width={2} />
  </SvgIcon>
);

const RepeatHeaderRowIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect
      x="4"
      y="4"
      width="16"
      height="4.5"
      rx="0.8"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M4 8.5h16M9.5 8.5V20M14.5 8.5V14" stroke-width={1.4} />
    <path
      d="M14.5 17.5a2.5 2.5 0 1 1 2.5-2.5m-1.5-1.5 1.5 1.5 1.5-1.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.75}
    />
  </SvgIcon>
);

const TableWidthIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M3 21h18M4.5 19.5 3 21l1.5 1.5M19.5 19.5 21 21l-1.5 1.5" />
  </TableIcon>
);

const TableDistributeRowsIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M2.5 6h19M2.5 18h19M12 1.75v2.5M10.5 3.25 12 1.75l1.5 1.5M12 22.25v-2.5M10.5 20.75 12 22.25l1.5-1.5" />
  </TableIcon>
);

const TableDistributeColumnsIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M6 2.5v19M18 2.5v19M1.75 12h2.5M3.25 10.5 1.75 12l1.5 1.5M22.25 12h-2.5M20.75 10.5l1.5 1.5-1.5 1.5" />
  </TableIcon>
);

const TableAutoFitIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M2 21h20M5 19 2 21l3 2M19 19l3 2-3 2M8 12h8M10 10l-2 2 2 2M14 10l2 2-2 2" />
  </TableIcon>
);

const TableNoBordersIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <rect
      x="5"
      y="5"
      width="14"
      height="14"
      rx="0.8"
      stroke-dasharray="2.5 2"
    />
    <path d="M3 3l18 18" stroke="#d14343" stroke-width={2.1} />
  </SvgIcon>
);

/** Clipboard family: Office/WordCraft silhouettes with semantic accents. */
const ClipboardIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M9 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18 4h-3" />
    <rect x="8.5" y="2.5" width="7" height="3.2" rx="1" />
    <path d="M8 10.5h8M8 13.5h8M8 16.5h5.5" opacity={0.75} />
  </SvgIcon>
);

const ClipboardPasteIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M8.5 4H5.8A1.3 1.3 0 0 0 4.5 5.3v12.4A1.3 1.3 0 0 0 5.8 19H9" />
    <rect
      x="7.5"
      y="2.5"
      width="6"
      height="3"
      rx="0.9"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
    <rect
      x="9.5"
      y="7.5"
      width="10"
      height="13"
      rx="1.1"
      fill="var(--oasis-paper, #ffffff)"
      stroke="var(--oasis-accent, #1a73e8)"
    />
    <path
      d="M12 11h5M12 14h5M12 17h3.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.55}
    />
  </SvgIcon>
);

const ClipboardCutIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.8}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="6.5" cy="17.5" r="2.6" stroke="var(--oasis-accent, #1a73e8)" />
    <circle cx="17.5" cy="17.5" r="2.6" stroke="var(--oasis-accent, #1a73e8)" />
    <path d="M8.6 15.4 18.5 4.5M15.4 15.4 5.5 4.5" />
  </SvgIcon>
);

const FormatPainterIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect
      x="4.5"
      y="3.5"
      width="12.5"
      height="5.5"
      rx="1"
      fill="#f59e0b"
      fill-opacity={0.32}
    />
    <path d="M17 6.2h2a1 1 0 0 1 1 1v3.3a1 1 0 0 1-1 1h-7.5v2" />
    <rect
      x="9.8"
      y="13.5"
      width="3.4"
      height="7"
      rx="1"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
  </SvgIcon>
);

const FormatPainterContinuousIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect
      x="4"
      y="3.5"
      width="11.5"
      height="5"
      rx="1"
      fill="#f59e0b"
      fill-opacity={0.32}
    />
    <path d="M15.5 6h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-7v2" />
    <rect
      x="9"
      y="13"
      width="3"
      height="7"
      rx="0.9"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
    <path
      d="M15.5 16.5a2.3 2.3 0 1 1 2.3 2.3"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
  </SvgIcon>
);

const FormatPainterCancelIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4" y="3.5" width="11.5" height="5" rx="1" />
    <path d="M15.5 6h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-7v2" />
    <rect x="9" y="13" width="3" height="7" rx="0.9" />
    <path d="m15 15 4.5 4.5m0-4.5L15 19.5" stroke="#d14343" stroke-width={2} />
  </SvgIcon>
);

/** Table borders — 2x2 windowpane grid with emphasized bottom/outer border. */
const TableBordersIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect
      x="4.5"
      y="4.5"
      width="15"
      height="15"
      rx="0.9"
      stroke-dasharray="2 1.8"
      opacity={0.75}
    />
    <path d="M4.5 12h15M12 4.5v15" stroke-dasharray="2 1.8" opacity={0.75} />
    <path
      d="M4.5 19.5h15"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2.4}
    />
  </SvgIcon>
);

/** Font family: crisp glyphs positioned above the ColorPicker swatch bar. */
const FontColorIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={2}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M7.2 16 12 4.2 16.8 16M9 12.2h6M5.8 16h2.8M15.4 16h2.8" />
  </SvgIcon>
);

const HighlightIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    {/* Yellow trunk: a rectangle rotated 45°, short edges vector (4.8, 4.8). */}
    <path
      d="M14.2 3.5 L19 8.3 L11.8 15.5 L7 10.7 Z"
      fill="#facc15"
      fill-opacity={0.38}
    />
    {/* Eraser band spans the full short-edge width (4.8, 4.8). */}
    <path d="M12.2 5.5 L17 10.3" />
    {/* Triangular tip: its base IS the trunk's bottom short edge
        (7 10.7 -> 11.8 15.5), so tip, trunk and eraser share one width.
        The apex is centred on that edge (midpoint + outward normal). */}
    <path d="M7 10.7 L6 16.5 L11.8 15.5" />
  </SvgIcon>
);

const ShadingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M10.8 3.8 17.5 10.5 10.8 16.5 4.5 10.5Z"
      fill="var(--oasis-accent, #1a73e8)"
      fill-opacity={0.18}
    />
    <path d="M8.5 6 5.8 3.3" />
    <path
      d="M19.2 14c0 1.3-1 2.2-1.7 2.2s-1.7-.9-1.7-2.2c0-1 1.7-2.8 1.7-2.8s1.7 1.8 1.7 2.8Z"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
  </SvgIcon>
);

/** Table operation grids — refined stroke weights (1.65px grid, 1.8px accents). */
const TableInsertRowAboveIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 1.75v3M10.5 3.25 12 1.75l1.5 1.5" stroke-width={1.8} />
    <path
      d="M5.25 7.5h13.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2.5}
    />
  </TableIcon>
);

const TableInsertRowBelowIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 22.25v-3M10.5 20.75 12 22.25l1.5-1.5" stroke-width={1.8} />
    <path
      d="M5.25 16.5h13.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2.5}
    />
  </TableIcon>
);

const TableDeleteRowIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M4.5 12h15" stroke="#d14343" stroke-width={2.2} />
  </TableIcon>
);

const TableInsertColumnLeftIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M1.75 12h3M3.25 10.5 1.75 12l1.5 1.5" stroke-width={1.8} />
    <path
      d="M7.5 5.25v13.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2.5}
    />
  </TableIcon>
);

const TableInsertColumnRightIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M22.25 12h-3M20.75 10.5l1.5 1.5-1.5 1.5" stroke-width={1.8} />
    <path
      d="M16.5 5.25v13.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2.5}
    />
  </TableIcon>
);

const TableDeleteColumnIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 4.5v15" stroke="#d14343" stroke-width={2.2} />
  </TableIcon>
);

const TableMergeIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path d="M4 9.5h16M4 14.5h16" opacity={0.55} />
    <rect
      x="6"
      y="9.5"
      width="12"
      height="5"
      fill="var(--oasis-accent, #1a73e8)"
      fill-opacity={0.18}
      stroke="var(--oasis-accent, #1a73e8)"
    />
    <path
      d="M9 12h6m-4.5-1.5L9 12l1.5 1.5m3-3L15 12l-1.5 1.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.6}
    />
  </SvgIcon>
);

const TableSplitIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path
      d="M12 4v16"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
      stroke-dasharray="2.5 2"
    />
    <path
      d="M9.5 12H6m1.5-2L6 12l1.5 2M14.5 12H18m-1.5-2L18 12l-1.5 2"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.7}
    />
  </SvgIcon>
);

const TableToTextIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3.5" y="3.5" width="8.5" height="7.5" rx="0.8" />
    <path d="M3.5 7.25h8.5M7.75 3.5V11" stroke-width={1.4} />
    <path
      d="M14 7.25h5.5m-2-2 2 2-2 2"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
    <path d="M3.5 15h17M3.5 18.5h12.5" stroke-width={1.8} />
  </SvgIcon>
);

const TextToTableIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3.5 5.5h8.5M3.5 9h6.5" stroke-width={1.8} />
    <path
      d="M14 7.25h5.5m-2-2 2 2-2 2"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
    <rect x="3.5" y="13" width="17" height="7.5" rx="0.8" />
    <path d="M3.5 16.75h17M9.2 13v7.5M14.8 13v7.5" stroke-width={1.4} />
  </SvgIcon>
);

const SplitTableIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4" y="3.5" width="16" height="6" rx="0.8" />
    <path d="M9.5 3.5v6M14.5 3.5v6" stroke-width={1.4} />
    <path
      d="M3 12h18"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
      stroke-dasharray="3 2"
    />
    <rect x="4" y="14.5" width="16" height="6" rx="0.8" />
    <path d="M9.5 14.5v6M14.5 14.5v6" stroke-width={1.4} />
  </SvgIcon>
);

const SortAscendingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.8}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4.5 10.5 7 4.5l2.5 6M5.2 8.8h3.6" />
    <path d="M4.6 14h4.8l-4.8 5.5h4.8" />
    <path d="M16.5 4.5v15m-3-3 3 3 3-3" stroke="var(--oasis-accent, #1a73e8)" />
  </SvgIcon>
);

const SortDescendingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.8}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4.6 4.5h4.8L4.6 10h4.8" />
    <path d="M4.5 19.5 7 13.5l2.5 6M5.2 17.8h3.6" />
    <path d="M16.5 4.5v15m-3-3 3 3 3-3" stroke="var(--oasis-accent, #1a73e8)" />
  </SvgIcon>
);

const TableVerticalAlignIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path
      d="M7.5 10.5h9M7.5 13.5h6"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
    <path d="M12 6v2.2M12 15.8V18" opacity={0.7} />
  </SvgIcon>
);

/** Paragraph alignment — properly aligned horizontal lines without translate hacks. */
const AlignLeftIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M4 6h16M4 10h11M4 14h16M4 18h9" />
  </SvgIcon>
);

const AlignCenterIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M4 6h16M6.5 10h11M4 14h16M7.5 18h9" />
  </SvgIcon>
);

const AlignRightIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M4 6h16M9 10h11M4 14h16M11 18h9" />
  </SvgIcon>
);

const AlignJustifyIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </SvgIcon>
);

/** Table alignment — cell frame with properly left/center/right aligned lines. */
const TableAlignLeftIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round">
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path
      d="M7 8.5h10M7 12h6.5M7 15.5h8"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
  </SvgIcon>
);

const TableAlignCenterIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round">
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path
      d="M7 8.5h10M8.75 12h6.5M8 15.5h8"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
  </SvgIcon>
);

const TableAlignRightIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round">
    <rect x="4" y="4" width="16" height="16" rx="1" />
    <path
      d="M7 8.5h10M10.5 12h6.5M9 15.5h8"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
  </SvgIcon>
);

/** Table properties — Table grid with clean bottom-right sliders badge. */
const TablePropertiesIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M11.5 19H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v6.5M4 9h15M9 4v15" />
    <circle
      cx="17"
      cy="17"
      r="3.2"
      fill="var(--oasis-paper, #ffffff)"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
    <path
      d="M17 12.6v1.2M17 20.2v1.2M12.6 17h1.2M20.2 17h1.2"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.7}
    />
  </SvgIcon>
);

/** Page setup family — 1.7px stroke with clean Office geometry. */
const PageMarginsIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="4.5" y="2.5" width="15" height="19" rx="1.2" />
    <rect
      x="7.5"
      y="5.5"
      width="9"
      height="13"
      rx="0.4"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.5}
      stroke-dasharray="2.2 1.8"
    />
  </SvgIcon>
);

const PageOrientationIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3.5" y="3" width="10" height="14" rx="1" opacity={0.65} />
    <rect
      x="8.5"
      y="10"
      width="12"
      height="9.5"
      rx="1"
      fill="var(--oasis-paper, #ffffff)"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
    <path
      d="M16 4.5a3 3 0 0 1 3 3m-1.5-1.2L19 7.8l1.2-1.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.6}
    />
  </SvgIcon>
);

const PageSizeIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="6.5" y="5.5" width="13" height="15.5" rx="1.1" />
    <path
      d="M6.5 3h13M8 1.8 6.5 3 8 4.2M18 1.8 19.5 3 18 4.2M3.5 5.5V21M2.3 7 3.5 5.5 4.7 7M2.3 19.5 3.5 21l1.2-1.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.6}
    />
  </SvgIcon>
);

const PageColumnsIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="4.5" y="2.5" width="15" height="19" rx="1.2" />
    <path
      d="M12 5.5v13"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.6}
    />
    <path d="M7 7h3M7 10h3M7 13h3M7 16h2.5M14 7h3M14 10h3M14 13h3M14 16h2.5" />
  </SvgIcon>
);

const PageBreakIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M5 9V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v5H5ZM5 15v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5H5Z" />
    <path
      d="M3 12h18"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
      stroke-dasharray="3 2"
    />
  </SvgIcon>
);

const SectionBreakIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M5 8.5V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4.5H5ZM5 15.5V20a1 1 0 0 0 1 1h5v-5.5H5Zm8 0V21h5a1 1 0 0 0 1-1v-4.5h-6Z" />
    <path
      d="M3 11.2h18M3 12.8h18"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.5}
      stroke-dasharray="2.5 2"
    />
  </SvgIcon>
);

/** Themes/styles — WordCraft 2x2 palette & page design icons. */
const ThemesIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.6}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect
      x="3.5"
      y="3.5"
      width="7.5"
      height="7.5"
      rx="1.2"
      fill="var(--oasis-accent, #1a73e8)"
    />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.2" fill="#e07b1f" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" fill="#2e8b57" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.2" fill="#f2c811" />
  </SvgIcon>
);

const ColorSchemeIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.6} stroke-linecap="round">
    <circle cx="9" cy="9" r="4.2" fill="#d13b3b" fill-opacity={0.85} />
    <circle
      cx="15"
      cy="9"
      r="4.2"
      fill="var(--oasis-accent, #1a73e8)"
      fill-opacity={0.85}
    />
    <circle cx="12" cy="14.5" r="4.2" fill="#2e8b57" fill-opacity={0.85} />
  </SvgIcon>
);

const FontSchemeIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.85}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3.5 18.5 8 5.5l4.5 13M5.1 14.5h5.8" />
    <path
      d="m14.5 18.5 2.8-8 2.8 8M15.4 16.2h4"
      stroke="var(--oasis-accent, #1a73e8)"
    />
  </SvgIcon>
);

const EffectsIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle
      cx="11"
      cy="13"
      r="5.5"
      fill="var(--oasis-accent, #1a73e8)"
      fill-opacity={0.22}
      stroke="var(--oasis-accent, #1a73e8)"
    />
    <path d="M17.5 3.5v4M15.5 5.5h4M6 4.5v2.5M4.75 5.75h2.5" stroke="#f59e0b" />
  </SvgIcon>
);

const ParagraphSpacingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10 6h10M10 9.5h7M10 14.5h10M10 18h7" />
    <path
      d="M5.5 4.5v15m-2-12.5 2-2.5 2 2.5m-4 10 2 2.5 2-2.5"
      stroke="var(--oasis-accent, #1a73e8)"
    />
  </SvgIcon>
);

const WatermarkIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4.5" y="2.5" width="15" height="19" rx="1.2" />
    <path
      d="M9 16 12 8l3 8M10 13.5h4"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.85}
      opacity={0.85}
    />
  </SvgIcon>
);

const PageColorIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4.5" y="2.5" width="15" height="19" rx="1.2" />
    <rect
      x="6.5"
      y="9.5"
      width="11"
      height="9.5"
      rx="0.6"
      fill="var(--oasis-accent, #1a73e8)"
      fill-opacity={0.35}
      stroke="none"
    />
    <path
      d="M12 5.2c0 1.2-.9 2-1.5 2S9 6.4 9 5.2C9 4.3 10.5 2.8 10.5 2.8S12 4.3 12 5.2Z"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
  </SvgIcon>
);

const PageBordersIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4.5" y="2.5" width="15" height="19" rx="1.2" />
    <rect
      x="7"
      y="5"
      width="10"
      height="14"
      rx="0.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.85}
    />
  </SvgIcon>
);

const DesignDefaultIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="4.5" y="2.5" width="15" height="19" rx="1.2" />
    <path d="m8.5 12.5 2.5 2.5 5-5" stroke="#16a34a" stroke-width={2.2} />
  </SvgIcon>
);

const MultilevelListIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.8}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle
      cx="4.5"
      cy="5.5"
      r="1.2"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
    <path d="M8 5.5h12" />
    <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
    <path d="M11 11.5h9" />
    <circle
      cx="10.5"
      cy="17.5"
      r="1.2"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
    <path d="M14 17.5h6" />
  </SvgIcon>
);

const CommentsPaneIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.75}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M4 5.5A1.5 1.5 0 0 1 5.5 4h11A1.5 1.5 0 0 1 18 5.5v7a1.5 1.5 0 0 1-1.5 1.5H9.5L6 17v-3H5.5A1.5 1.5 0 0 1 4 12.5v-7Z"
      fill="var(--oasis-accent, #1a73e8)"
      fill-opacity={0.14}
    />
    <path
      d="M7.5 8h7M7.5 10.8h4.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.7}
    />
    <path d="M18 9h1.5A1.5 1.5 0 0 1 21 10.5v6a1.5 1.5 0 0 1-1.5 1.5H18v2.2L15.5 18H12" />
  </SvgIcon>
);

const HorizontalLineIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round">
    <path d="M5 6.5h14M5 17.5h10" opacity={0.6} />
    <path
      d="M3.5 12h17"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2.4}
    />
  </SvgIcon>
);

const TableDrawBordersIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M11 19H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v6M4 11.5h8.5M11.5 4v8.5" />
    <path
      d="m13.5 17.5 4.8-4.8 2.2 2.2-4.8 4.8-2.6.4.4-2.6Z"
      fill="var(--oasis-accent, #1a73e8)"
      fill-opacity={0.22}
      stroke="var(--oasis-accent, #1a73e8)"
    />
  </SvgIcon>
);

const TableGridlinesIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round">
    <rect
      x="4.5"
      y="4.5"
      width="15"
      height="15"
      rx="0.9"
      stroke-dasharray="2 2"
    />
    <path
      d="M4.5 12h15M12 4.5v15"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-dasharray="2 2"
    />
  </SvgIcon>
);

const FileExportDocxIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M14 2.5H6A1.5 1.5 0 0 0 4.5 4v16A1.5 1.5 0 0 0 6 21.5h12a1.5 1.5 0 0 0 1.5-1.5V8L14 2.5Z" />
    <path d="M14 2.5V8h5.5" />
    <path
      d="M8 12.5 9.4 17l1.6-3.8L12.6 17 14 12.5"
      stroke="#2563eb"
      stroke-width={1.85}
    />
  </SvgIcon>
);

const FileExportPdfIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M14 2.5H6A1.5 1.5 0 0 0 4.5 4v16A1.5 1.5 0 0 0 6 21.5h12a1.5 1.5 0 0 0 1.5-1.5V8L14 2.5Z" />
    <path d="M14 2.5V8h5.5" />
    <rect
      x="7"
      y="12"
      width="10"
      height="5.5"
      rx="1"
      fill="#dc2626"
      stroke="none"
    />
    <path d="M9 14.75h6" stroke="#ffffff" stroke-width={1.6} />
  </SvgIcon>
);

const FileImportDocxIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon
    stroke="currentColor"
    stroke-width={1.7}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M14 2.5H6A1.5 1.5 0 0 0 4.5 4v16A1.5 1.5 0 0 0 6 21.5h12a1.5 1.5 0 0 0 1.5-1.5V8L14 2.5Z" />
    <path d="M14 2.5V8h5.5" />
    <path
      d="M12 17v-6m-2.5 2.5L12 11l2.5 2.5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.9}
    />
  </SvgIcon>
);

/**
 * Checkmark glyph used to mark the active item in radio/check menus. Replaces the
 * duplicated inline `<polyline points="20 6 9 17 4 12">` previously copy-pasted
 * into LineSpacingButton and ContextMenu. Rendered at 14px to match the previous
 * line-spacing check size; ContextMenu renders its own 18px variant via lucide.
 */
export const CheckIcon = (props: { size?: number }): JSX.Element => (
  <SvgIcon
    width={props.size ?? 14}
    height={props.size ?? 14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width={2.5}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </SvgIcon>
);

/** Shared original document/comment geometry for review actions. */
function ReviewActionIcon(props: {
  family: "page" | "pages" | "comment";
  mark: string;
  tone: "info" | "positive" | "negative";
}): JSX.Element {
  const color = (): string => `var(--oasis-review-${props.tone}, ${props.tone === "positive" ? "#21834e" : props.tone === "negative" ? "#bd3d41" : "#347caf"})`;
  return (
    <SvgIcon class="oasis-review-icon" stroke="currentColor" stroke-width={1.65}
      stroke-linecap="round" stroke-linejoin="round">
      <Show when={props.family === "pages"}>
        <path d="M6 2h12l3 3v6" />
      </Show>
      <Show when={props.family === "comment"} fallback={
        <><path d="M3 3h10l4 4v14H3z M13 3v5h4" />
          <path d="M6 11h7M6 14h4M6 17h3" opacity={0.75} /></>
      }>
        <path d="M2 4h16v12H8l-4 4v-4H2z M5 8h9M5 11h6" />
      </Show>
      <rect x="11" y="10" width="12" height="13" rx="2.2"
        fill="var(--oasis-review-icon-bg, var(--oasis-ribbon-panel-bg, #fff))"
        stroke="none" />
      <path d={props.mark} stroke={color()} stroke-width={1.9} />
    </SvgIcon>
  );
}

const reviewTrackChangesIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M13 20l1-4 5-5 3 3-5 5z M18 12l3 3" tone="info" />
);
const reviewMarkupIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M13 13h8 M13 16h5 M13 19h8 M13 15v2" tone="info" />
);
const reviewPaneIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M13 11h8v10h-8z M16 11v10 M18 14h1 M18 17h1" tone="info" />
);
const reviewAcceptIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M13 17l3 3 6-7" tone="positive" />
);
const reviewRejectIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M14 13l7 7 M21 13l-7 7" tone="negative" />
);
const reviewAcceptAllIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="pages" mark="M13 17l3 3 6-7" tone="positive" />
);
const reviewRejectAllIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="pages" mark="M14 13l7 7 M21 13l-7 7" tone="negative" />
);
const reviewPreviousIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M21 16h-8l3-3 M13 16l3 3" tone="info" />
);
const reviewNextIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M13 16h8l-3-3 M21 16l-3 3" tone="info" />
);
const commentNewIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="comment" mark="M13 16h8 M17 12v8" tone="positive" />
);
const commentReplyIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="comment" mark="M13 15l3-3 M13 15l3 3 M13 15h5a3 3 0 0 1 3 3v2" tone="info" />
);
const commentEditIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="comment" mark="M13 20l1-4 5-5 3 3-5 5z M18 12l3 3" tone="info" />
);
const commentPreviousIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="comment" mark="M21 16h-8l3-3 M13 16l3 3" tone="info" />
);
const commentNextIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="comment" mark="M13 16h8l-3-3 M21 16l-3 3" tone="info" />
);
const commentResolveIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="comment" mark="M13 17l3 3 6-7" tone="positive" />
);
const commentReopenIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="comment" mark="M14 12v4h4 M14 16a4 4 0 1 1 1 4" tone="info" />
);
const commentDeleteIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="comment" mark="M14 13l7 7 M21 13l-7 7" tone="negative" />
);
const reviewDisplayIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M12 16s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z M17 15v2" tone="info" />
);
const reviewMarkupFilterIcon: CustomIconRenderer = () => (
  <ReviewActionIcon family="page" mark="M12 12h10l-4 5v4l-2-1v-3z" tone="info" />
);

const CUSTOM_ICONS: Record<string, CustomIconRenderer> = {
  reviewTrackChanges: reviewTrackChangesIcon,
  reviewMarkup: reviewMarkupIcon,
  reviewPane: reviewPaneIcon,
  reviewAccept: reviewAcceptIcon,
  reviewReject: reviewRejectIcon,
  reviewAcceptAll: reviewAcceptAllIcon,
  reviewRejectAll: reviewRejectAllIcon,
  reviewPrevious: reviewPreviousIcon,
  reviewNext: reviewNextIcon,
  commentNew: commentNewIcon,
  commentReply: commentReplyIcon,
  commentEdit: commentEditIcon,
  commentPrevious: commentPreviousIcon,
  commentNext: commentNextIcon,
  commentResolve: commentResolveIcon,
  commentReopen: commentReopenIcon,
  commentDelete: commentDeleteIcon,
  reviewDisplay: reviewDisplayIcon,
  reviewMarkupFilter: reviewMarkupFilterIcon,
  footnote: FootnoteIcon,
  underlineGlyph: UnderlineGlyphIcon,
  pageHeader: PageHeaderIcon,
  pageFooter: PageFooterIcon,
  pageHeaderFooter: PageHeaderFooterIcon,
  pageNumber: PageNumberIcon,
  pageNumberTop: PageNumberTopIcon,
  pageNumberBottom: PageNumberBottomIcon,
  pageCount: PageCountIcon,
  specialIndentFirstLine: SpecialIndentFirstLineIcon,
  lineSpacing: LineSpacingIcon,
  tableInsertRowAbove: TableInsertRowAboveIcon,
  tableInsertRowBelow: TableInsertRowBelowIcon,
  tableDeleteRow: TableDeleteRowIcon,
  tableInsertColumnLeft: TableInsertColumnLeftIcon,
  tableInsertColumnRight: TableInsertColumnRightIcon,
  tableDeleteColumn: TableDeleteColumnIcon,
  tableMerge: TableMergeIcon,
  tableSplit: TableSplitIcon,
  tableToText: TableToTextIcon,
  textToTable: TextToTableIcon,
  splitTable: SplitTableIcon,
  sortAscending: SortAscendingIcon,
  sortDescending: SortDescendingIcon,
  deleteTable: DeleteTableIcon,
  repeatHeaderRow: RepeatHeaderRowIcon,
  tableBorders: TableBordersIcon,
  tableNoBorders: TableNoBordersIcon,
  // Distribution/AutoFit/Alignment (refined)
  tableDistributeRows: TableDistributeRowsIcon,
  tableDistributeColumns: TableDistributeColumnsIcon,
  tableAutoFit: TableAutoFitIcon,
  tableWidth: TableWidthIcon,
  tableAlignLeft: TableAlignLeftIcon,
  tableAlignCenter: TableAlignCenterIcon,
  tableAlignRight: TableAlignRightIcon,
  tableVerticalAlign: TableVerticalAlignIcon,
  // Clipboard family
  clipboard: ClipboardIcon,
  clipboardPaste: ClipboardPasteIcon,
  clipboardCut: ClipboardCutIcon,
  formatPainter: FormatPainterIcon,
  formatPainterContinuous: FormatPainterContinuousIcon,
  formatPainterCancel: FormatPainterCancelIcon,
  // Font family
  fontColor: FontColorIcon,
  highlight: HighlightIcon,
  shading: ShadingIcon,
  // Margins/orientation/page setup
  pageMargins: PageMarginsIcon,
  pageOrientation: PageOrientationIcon,
  pageSize: PageSizeIcon,
  pageColumns: PageColumnsIcon,
  pageBreak: PageBreakIcon,
  sectionBreak: SectionBreakIcon,
  // Themes/styles
  themes: ThemesIcon,
  colorScheme: ColorSchemeIcon,
  fontScheme: FontSchemeIcon,
  effects: EffectsIcon,
  paragraphSpacing: ParagraphSpacingIcon,
  watermark: WatermarkIcon,
  pageColor: PageColorIcon,
  pageBorders: PageBordersIcon,
  designDefault: DesignDefaultIcon,
  // Paragraph alignment (replaced from Lucide)
  alignLeft: AlignLeftIcon,
  alignCenter: AlignCenterIcon,
  alignRight: AlignRightIcon,
  alignJustify: AlignJustifyIcon,
  // Table properties & border tools
  tableProperties: TablePropertiesIcon,
  tableDrawBorders: TableDrawBordersIcon,
  tableGridlines: TableGridlinesIcon,
  horizontalLine: HorizontalLineIcon,
  // List & Review & File custom icons
  multilevelList: MultilevelListIcon,
  commentsPane: CommentsPaneIcon,
  fileExportDocx: FileExportDocxIcon,
  fileExportPdf: FileExportPdfIcon,
  fileImportDocx: FileImportDocxIcon,
};

export function getCustomIcon(name?: string): CustomIconRenderer | undefined {
  return name ? CUSTOM_ICONS[name] : undefined;
}

function LucideToolIcon(props: { name: string }): JSX.Element {
  const icon = createMemo(() => createLucideSvg(props.name));
  return (
    <Show when={icon()} fallback={<i data-lucide={props.name} />}>
      {(svg): JSX.Element => svg()}
    </Show>
  );
}

/** Custom vectors and Lucide nodes remain owned by Solid across name changes. */
export function ToolIcon(props: { name: string }): JSX.Element {
  return (
    <Show when={props.name} keyed>
      {(name): JSX.Element => (
        <Show
          when={getCustomIcon(name)}
          fallback={<LucideToolIcon name={name} />}
        >
          {(render): JSX.Element => render()()}
        </Show>
      )}
    </Show>
  );
}
