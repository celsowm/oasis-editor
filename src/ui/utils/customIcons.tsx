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

/** Word-style footnote glyph: "ab" in the current color with a red superscript "1". */
const FootnoteIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon fill="none">
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

const TableInsertRowAboveIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 1.75v3M10.5 3.25 12 1.75l1.5 1.5" />
    <path d="M5.25 8h13.5" stroke-width={2.5} />
  </TableIcon>
);

const TableInsertRowBelowIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 22.25v-3M10.5 20.75 12 22.25l1.5-1.5" />
    <path d="M5.25 16h13.5" stroke-width={2.5} />
  </TableIcon>
);

const TableDeleteRowIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M4.5 12h15" stroke="#d14343" stroke-width={2.6} />
  </TableIcon>
);

const TableInsertColumnLeftIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M1.75 12h3M3.25 10.5 1.75 12l1.5 1.5" />
    <path d="M8 5.25v13.5" stroke-width={2.5} />
  </TableIcon>
);

const TableInsertColumnRightIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M22.25 12h-3M20.75 10.5l1.5 1.5-1.5 1.5" />
    <path d="M16 5.25v13.5" stroke-width={2.5} />
  </TableIcon>
);

const TableDeleteColumnIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 4.5v15" stroke="#d14343" stroke-width={2.6} />
  </TableIcon>
);

const TableMergeIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M7.25 12h9.5M9.25 10l-2 2 2 2M14.75 10l2 2-2 2" stroke-width={2} />
  </TableIcon>
);

const TableSplitIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M12 8v8M10 10l2-2 2 2M10 14l2 2 2-2" stroke-width={2} />
  </TableIcon>
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

const TableAlignIcon = (
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

const TableAlignLeftIcon: CustomIconRenderer = (): JSX.Element =>
  TableAlignIcon("left");
const TableAlignCenterIcon: CustomIconRenderer = (): JSX.Element =>
  TableAlignIcon("center");
const TableAlignRightIcon: CustomIconRenderer = (): JSX.Element =>
  TableAlignIcon("right");

const TableBordersIcon: CustomIconRenderer = (): JSX.Element => (
  <TableIcon>
    <path d="M3 3l18 18" stroke-width={2} />
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

/** Custom SVG icon for New Document (file with plus) */
const FilePlusIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="12" y2="18" stroke-width={2.2} stroke="#2563eb" />
    <line x1="9" y1="15" x2="15" y2="15" stroke-width={2.2} stroke="#2563eb" />
  </SvgIcon>
);

/** Custom SVG icon for Import Document (open folder) */
const FolderOpenIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" fill="#fef3c7" />
    <path d="M2 10h20l-2 8H4l-2-8z" fill="#fde68a" stroke="#d97706" />
  </SvgIcon>
);

/** Custom SVG icon for DOCX Export (document page with Word blue badge) */
const FileDocxIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    {/* Blue Word badge */}
    <rect x="5.5" y="11.5" width="13" height="8" rx="1.5" fill="#2563eb" stroke="#1d4ed8" stroke-width="0.5" />
    <text
      x="12"
      y="17.2"
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      font-size="6.5"
      font-weight="800"
      fill="#ffffff"
      text-anchor="middle"
      stroke="none"
    >
      DOCX
    </text>
  </SvgIcon>
);

/** Custom SVG icon for PDF Export (document page with PDF red badge) */
const FilePdfIcon: CustomIconRenderer = (): JSX.Element => (
  <SvgIcon stroke="currentColor" stroke-width={1.75} stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    {/* Red PDF badge */}
    <rect x="6" y="11.5" width="12" height="8" rx="1.5" fill="#dc2626" stroke="#b91c1c" stroke-width="0.5" />
    <text
      x="12"
      y="17.2"
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      font-size="6.5"
      font-weight="800"
      fill="#ffffff"
      text-anchor="middle"
      stroke="none"
    >
      PDF
    </text>
  </SvgIcon>
);

const CUSTOM_ICONS: Record<string, CustomIconRenderer> = {
  "file-plus": FilePlusIcon,
  "folder-open": FolderOpenIcon,
  "file-docx": FileDocxIcon,
  "file-pdf": FilePdfIcon,
  footnote: FootnoteIcon,
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
  tableWidth: TableWidthIcon,
  tableDistributeRows: TableDistributeRowsIcon,
  tableDistributeColumns: TableDistributeColumnsIcon,
  tableAutoFit: TableAutoFitIcon,
  tableAlignLeft: TableAlignLeftIcon,
  tableAlignCenter: TableAlignCenterIcon,
  tableAlignRight: TableAlignRightIcon,
  tableBorders: TableBordersIcon,
  tableNoBorders: TableNoBordersIcon,
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
    <Show
      when={getCustomIcon(props.name)}
      fallback={<i data-lucide={props.name} />}
    >
      {(render): JSX.Element => render()()}
    </Show>
  );
}
