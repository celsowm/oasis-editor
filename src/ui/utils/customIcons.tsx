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
    stroke-width={1.8}
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M8.5 12.5c-1.4-1.8-5.5-1.2-5.5 2.9 0 4.4 4.4 4.9 5.5 2.5M8.5 12v8M12 6v14m0-7c1.4-1.8 5.8-1.6 5.8 2.9 0 4.2-4.1 5-5.8 2.5" />
    <path
      d="m18 4.8 2-1.3V10m-1.8 0h3.5"
      stroke="var(--oasis-accent, #1a73e8)"
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
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <rect x="4" y="4" width="16" height="16" rx="0.8" />
    <path d="M4 12h16M9 4v16M15 4v16" stroke-width={1.4} />
    <path d="M11.5 14.5 14.5 11.5M14.5 14.5 11.5 11.5" stroke-width={1.6} />
  </SvgIcon>
);

const RepeatHeaderRowIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <rect x="4" y="4" width="16" height="16" rx="0.8" />
    <path d="M4 8.5h16M4 8.5 8 5.25 12 8.5 16 5.25 20 8.5" stroke-width={1.4} />
    <path d="M7.5 12h9M7.5 15h9M7.5 18h9" stroke-width={1.3} />
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

const _TableAlignIcon = (
  alignment: "left" | "center" | "right",
): JSX.Element => {
  const x = alignment === "left" ? 6.75 : alignment === "center" ? 10.5 : 14.25;
  return (
    <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
      <rect x="4" y="4" width="16" height="16" rx="0.8" />
      <path d={`M${x} 9h6M${x} 12h6M${x} 15h6`} />
    </SvgIcon>
  );
};

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

/** Clipboard family: shared silhouette with action-specific accents. */
const ClipboardIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.65} stroke-linecap="round">
    <rect x="5.5" y="3.5" width="13" height="17" rx="1" />
    <path d="M8 3.5v4M16 3.5v4" />
    <path d="M8 11h8M8 14h8M8 17h8" stroke-width={1.3} opacity={0.7} />
  </SvgIcon>
);

const ClipboardPasteIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.65} stroke-linecap="round">
    <rect x="5.5" y="3.5" width="13" height="17" rx="1" />
    <path d="M8 3.5v4M16 3.5v4" />
    <rect
      x="8.5"
      y="9.5"
      width="7"
      height="9"
      rx="0.5"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
    <path d="M12 12v4M10 14h4" stroke="#fff" stroke-width={1.5} />
  </SvgIcon>
);

const ClipboardCutIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.65} stroke-linecap="round">
    <rect x="5.5" y="3.5" width="13" height="17" rx="1" />
    <path d="M8 3.5v4M16 3.5v4" />
    <path d="M10 12 14 16M14 12 10 16" stroke="#d14343" stroke-width={2} />
    <path d="M12 12h4M12 15h4" stroke-width={1.3} opacity={0.7} />
  </SvgIcon>
);

const FormatPainterIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.65} stroke-linecap="round">
    <rect x="5.5" y="3.5" width="13" height="17" rx="1" />
    <path d="M8 3.5v4M16 3.5v4" />
    <path d="M11.5 11c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" stroke-width={2} />
    <path d="M10 14h4M10 17h4" stroke-width={1.3} opacity={0.7} />
  </SvgIcon>
);

const FormatPainterContinuousIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.65} stroke-linecap="round">
    <rect x="5.5" y="3.5" width="13" height="17" rx="1" />
    <path d="M8 3.5v4M16 3.5v4" />
    <path
      d="M10 11c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5M10 14c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5"
      stroke-width={2}
    />
    <path d="M10 17h4" stroke-width={1.3} opacity={0.7} />
  </SvgIcon>
);

const FormatPainterCancelIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.65} stroke-linecap="round">
    <rect x="5.5" y="3.5" width="13" height="17" rx="1" />
    <path d="M8 3.5v4M16 3.5v4" />
    <path d="M9 9 15 15M15 9 9 15" stroke="#d14343" stroke-width={2} />
    <path d="M10 14h4M10 17h4" stroke-width={1.3} opacity={0.7} />
  </SvgIcon>
);

/** Table borders — simple diagonal cross. */
const TableBordersIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M3 3l18 18" stroke-width={2} />
  </TableIcon>
);

/** Font family: shared A glyph with action-specific accents. */
const FontColorIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round">
    <path d="M12 4v3M9 12l3-6 3 6M7 16h10" />
    <path
      d="M6 19h12"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2.5}
    />
  </SvgIcon>
);

const HighlightIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round">
    <path d="M12 4v3M9 12l3-6 3 6M7 16h10" />
    <path
      d="M5 14.5 19 14.5"
      stroke="var(--oasis-accent, #f6c100)"
      stroke-width={5}
      stroke-linecap="butt"
    />
  </SvgIcon>
);

const ShadingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round">
    <rect x="4" y="5" width="16" height="14" rx="1" />
    <path d="M6 8.5h12M6 12h12M6 15.5h12" stroke-width={1.4} opacity={0.6} />
    <rect
      x="6"
      y="10"
      width="12"
      height="5"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
  </SvgIcon>
);

/** Table operation grids — refined stroke weights (1.65px grid, 1.8px accents). */
const TableInsertRowAboveIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 1.75v3M10.5 3.25 12 1.75l1.5 1.5" stroke-width={1.8} />
    <path d="M5.25 8h13.5" stroke-width={2.5} />
  </TableIcon>
);

const TableInsertRowBelowIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 22.25v-3M10.5 20.75 12 22.25l1.5-1.5" stroke-width={1.8} />
    <path d="M5.25 16h13.5" stroke-width={2.5} />
  </TableIcon>
);

const TableDeleteRowIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M4.5 12h15" stroke="#d14343" stroke-width={2.0} />
  </TableIcon>
);

const TableInsertColumnLeftIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M1.75 12h3M3.25 10.5 1.75 12l1.5 1.5" stroke-width={1.8} />
    <path d="M8 5.25v13.5" stroke-width={2.5} />
  </TableIcon>
);

const TableInsertColumnRightIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M22.25 12h-3M20.75 10.5l1.5 1.5-1.5 1.5" stroke-width={1.8} />
    <path d="M16 5.25v13.5" stroke-width={2.5} />
  </TableIcon>
);

const TableDeleteColumnIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 4.5v15" stroke="#d14343" stroke-width={2.0} />
  </TableIcon>
);

const TableMergeIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path
      d="M7.25 12h9.5M9.25 10l-2 2 2 2M14.75 10l2 2-2 2"
      stroke-width={1.8}
    />
    <path d="M5.25 12h13.5" stroke-width={1.65} opacity={0.5} />
  </TableIcon>
);

const TableSplitIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 8v8M10 10l2-2 2 2M10 14l2 2 2-2" stroke-width={1.8} />
    <path d="M3 12h18M7.5 12v9M16.5 12v9" stroke-width={1.6} />
    <path
      d="M4.5 8.5 3 12l1.5 3.5M19.5 8.5 21 12l-1.5 3.5"
      stroke-width={1.4}
    />
  </TableIcon>
);

const TableToTextIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.65} stroke-linecap="round">
    <rect x="4" y="4" width="16" height="16" rx="0.8" />
    <path d="M8.5 10h7M8.5 14h7" />
    <path d="M11 7l-2 2 2 2M15 7l2 2-2 2" stroke-width={1.6} />
    <path d="M17 12 20 12M19 10 20 12 19 14" stroke-width={2.0} />
  </SvgIcon>
);

const TextToTableIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.65} stroke-linecap="round">
    <rect x="4" y="4" width="16" height="16" rx="0.8" />
    <path d="M9 11v2M13 11v2M7 11h8M7 15h8" />
    <path d="M10 6l-2 2 2 2M14 6l2 2-2 2" stroke-width={1.6} />
    <path d="M4 12 7 12M5 10 7 12 5 14" stroke-width={2.0} />
  </SvgIcon>
);

const SplitTableIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M3 12h18M7.5 12v9M16.5 12v9" stroke-width={1.6} />
    <path
      d="M4.5 8.5 3 12l1.5 3.5M19.5 8.5 21 12l-1.5 3.5"
      stroke-width={1.4}
    />
    <path d="M12 5.25v13.5" stroke-width={2.0} />
  </TableIcon>
);

const SortAscendingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M4 17l4-4 3 3 4-5" stroke-width={1.8} />
    <path d="M15 12V6h3M14.5 7.5 15 6l3 .5" stroke-width={1.8} />
  </SvgIcon>
);

const SortDescendingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M4 8l4 4 3-3 4 6" stroke-width={1.8} />
    <path d="M15 18v-6h3M14.5 16.5 15 18l3-.5" stroke-width={1.8} />
  </SvgIcon>
);

const TableVerticalAlignIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <rect x="4" y="4" width="16" height="16" rx="0.8" />
    <path d="M8 8h8M8 12h8M8 16h8" stroke-width={1.8} />
    <path
      d="M7.5 10.5 9 12 10.5 10.5M13.5 10.5 15 12 16.5 10.5"
      stroke-width={1.8}
    />
  </SvgIcon>
);

/** Paragraph alignment — 1.8px stroke matching underline-glyph family. */
const AlignLeftIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M6 6h12M6 10h12M6 14h8M6 18h12" />
  </SvgIcon>
);

const AlignCenterIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M6 6h12M6 10h12M6 14h8M6 18h12" transform="translate(2, 0)" />
  </SvgIcon>
);

const AlignRightIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M6 6h12M6 10h12M6 14h8M6 18h12" transform="translate(4, 0)" />
  </SvgIcon>
);

const AlignJustifyIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.8} stroke-linecap="round">
    <path d="M6 6h12M6 10h9M6 14h6M6 18h12" />
  </SvgIcon>
);

/** Table alignment — TableIcon shell with 1.8px stroke. */
const TableAlignLeftIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M7.25 8h8M7.25 12h8M7.25 16h5" stroke-width={1.8} />
  </TableIcon>
);

const TableAlignCenterIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path
      d="M7.25 8h8M7.25 12h8M7.25 16h5"
      transform="translate(2.5, 0)"
      stroke-width={1.8}
    />
  </TableIcon>
);

const TableAlignRightIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path
      d="M7.25 8h8M7.25 12h8M7.25 16h5"
      transform="translate(5, 0)"
      stroke-width={1.8}
    />
  </TableIcon>
);

/** Table properties — Table shell with properties badge. */
const TablePropertiesIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M14 5 16 7 13 10" stroke-width={1.8} />
    <rect x="13" y="4" width="6" height="6" rx="1" stroke-width={1.5} />
  </TableIcon>
);

/** Page setup family — 1.7px stroke. */
const PageMarginsIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M5 7h14M5 14h14" stroke-width={1.4} />
    <path
      d="M9 3v4M15 3v4M9 20v-4M15 20v-4"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
  </SvgIcon>
);

const PageOrientationIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="3" y="5" width="8.5" height="14" rx="0.5" />
    <rect x="12.5" y="5" width="8.5" height="14" rx="0.5" />
    <path
      d="M11.5 8 12.5 12 11.5 16"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
    />
    <path d="M5 8.5h7M5 15.5h7" stroke-width={1.4} opacity={0.6} />
    <path d="M12.5 8.5h7M12.5 15.5h7" stroke-width={1.4} opacity={0.6} />
  </SvgIcon>
);

const PageSizeIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M3 12 5 12M19 12 21 12" stroke-width={1.8} />
    <path d="M12 1 12 3M12 21 12 23" stroke-width={1.8} />
    <path d="M8 9h8M8 15h8" stroke-width={1.4} opacity={0.6} />
  </SvgIcon>
);

const PageColumnsIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M12 5v14" stroke-width={2.0} />
    <path d="M5 8.5h14M5 15.5h14" stroke-width={1.4} opacity={0.6} />
  </SvgIcon>
);

const PageBreakIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M5 12h14" stroke-width={2.0} />
    <path d="M11 9 12 12 11 15" stroke="#d14343" stroke-width={2} />
  </SvgIcon>
);

const SectionBreakIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="3" y="3" width="9" height="18" rx="0.8" />
    <rect x="12" y="3" width="9" height="18" rx="0.8" />
    <path d="M12 12h-9M12 12h9" stroke-width={2.0} stroke-dasharray="3 2" />
    <path d="M7.5 8.5h7M7.5 15.5h7" stroke-width={1.4} opacity={0.6} />
    <path d="M16.5 8.5h7M16.5 15.5h7" stroke-width={1.4} opacity={0.6} />
  </SvgIcon>
);

/** Themes/styles — 1.7px stroke. */
const ThemesIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="3" y="3" width="9" height="18" rx="0.8" />
    <rect x="12" y="3" width="9" height="18" rx="0.8" />
    <rect x="6" y="3" width="9" height="18" rx="0.8" />
    <path
      d="M5 6h5M5 10h5M5 14h5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
    />
    <path
      d="M14 6h5M14 10h5M14 14h5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
    />
    <path
      d="M17 6h5M17 10h5M17 14h5"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
    />
  </SvgIcon>
);

const ColorSchemeIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path
      d="M8 6h8M8 10h8M8 14h8M8 18h8"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2.5}
    />
  </SvgIcon>
);

const FontSchemeIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path
      d="M10 8 12 6 14 8M10 14 12 12 14 14M10 18 12 16 14 18"
      stroke-width={1.8}
    />
    <path d="M6 11h12M6 17h12" stroke-width={1.5} opacity={0.6} />
  </SvgIcon>
);

const EffectsIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path
      d="M8 6 10 4 16 10M8 14 10 12 16 18M8 18 10 16 16 22"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={1.8}
    />
    <path d="M6 8h12M6 14h12" stroke-width={1.5} opacity={0.6} />
  </SvgIcon>
);

const ParagraphSpacingIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M5 8h14M5 12h14M5 16h14" stroke-width={1.8} />
    <path
      d="M11 6 12 8 13 6"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
    />
    <path
      d="M11 20 12 18 13 20"
      stroke="var(--oasis-accent, #1a73e8)"
      stroke-width={2}
    />
  </SvgIcon>
);

const WatermarkIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M7 7h10M7 11h8M7 15h6" stroke-width={1.2} opacity="0.3" />
  </SvgIcon>
);

const PageColorIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <rect
      x="7"
      y="5"
      width="10"
      height="14"
      fill="var(--oasis-accent, #1a73e8)"
      stroke="none"
    />
  </SvgIcon>
);

const PageBordersIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <rect x="6.5" y="4.5" width="11" height="15" rx="0.5" stroke-width={1.8} />
  </SvgIcon>
);

const DesignDefaultIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.7} stroke-linecap="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M12 16 10 12l2-2M12 16 14 12l-2-2" stroke-width={2} />
    <path d="M12 8 12 16" stroke-width={1.8} />
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

const CUSTOM_ICONS: Record<string, CustomIconRenderer> = {
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
  // Table properties (replaced from Lucide)
  tableProperties: TablePropertiesIcon,
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
