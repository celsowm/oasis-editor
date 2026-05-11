import { For, Index, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";
import {
  getPageBodyTop,
  getPageContentHeight,
  getPageContentWidth,
  getPageHeaderZoneTop,
  type EditorLayoutBlock,
  type EditorLayoutDocument,
  type EditorLayoutFragment,
  type EditorLayoutLine,
  type EditorLayoutPage,
  type EditorLayoutParagraph,
  type EditorParagraphNode,
  getParagraphText,
  getParagraphs,
  type EditorParagraphListStyle,
  type EditorParagraphStyle,
  type EditorState,
  type EditorTableNode,
  type EditorTextStyle,
  type EditorBorderStyle,
  type EditorNamedStyle,
  type EditorTabStop,
  resolveImageSrc,
  resolveNamedParagraphStyle,
  resolveNamedTextStyle,
  resolveEffectiveTextStyle,
  resolveEffectiveTextStyleForParagraph,
  resolveEffectiveParagraphStyle,
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import {
  IMAGE_RESIZE_HANDLE_DIRECTIONS,
  type ImageResizeHandleDirection,
} from "../editorUiTypes.js";
import {
  projectDocumentLayout,
  projectParagraphLayout,
} from "../layoutProjection.js";
import { resolveRenderedLineHeightPx } from "../textMeasurement.js";
import { perfTimer } from "../../utils/performanceMetrics.js";
import { PageBreak } from "./PageBreak.js";

interface EditorSurfaceProps {
  state: Accessor<EditorState>;
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, EditorLayoutParagraph>>;
  /**
   * Phase 4: scroll viewport accessor for page virtualization.
   * When provided, only pages within (or near) the viewport are rendered with
   * their full block content; off-screen pages are replaced with a same-sized
   * placeholder so scroll geometry is preserved. Optional — when omitted, all
   * pages render in full (legacy behaviour).
   */
  viewportRef?: () => HTMLElement | undefined;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceMouseMove?: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
  onParagraphMouseDown: (
    paragraphId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ) => void;
  onImageMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageResizeHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ImageResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTableDragHandleMouseDown: (tableId: string, event: MouseEvent) => void;
  onRevisionMouseEnter: (revisionId: string, event: MouseEvent) => void;
  onRevisionMouseLeave?: (revisionId: string, event: MouseEvent) => void;
}

function getBorderStyle(border?: EditorBorderStyle): string | undefined {
  if (!border) return undefined;
  if (border.type === "none") return "none";
  return `${border.width}pt ${border.type} ${border.color}`;
}

function paragraphStyleToCss(
  style: EditorParagraphStyle | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
  isContinuation?: boolean,
  isTruncated?: boolean,
): Record<string, string> | undefined {
  const merged = resolveEffectiveParagraphStyle(style, styles);

  const css: Record<string, string> = {};

  if (merged.align) {
    css["text-align"] = merged.align;
  }
  if (merged.lineHeight !== undefined && merged.lineHeight !== null) {
    const effectiveTextStyle = resolveEffectiveTextStyleForParagraph(
      undefined,
      style?.styleId,
      styles,
    );
    css["line-height"] = `${resolveRenderedLineHeightPx(effectiveTextStyle, merged.lineHeight)}px`;
  }
  if (!isContinuation && merged.spacingBefore !== undefined && merged.spacingBefore !== null) {
    css["padding-top"] = `${merged.spacingBefore}px`;
  }
  if (!isTruncated && merged.spacingAfter !== undefined && merged.spacingAfter !== null) {
    css["padding-bottom"] = `${merged.spacingAfter}px`;
  }

  if (merged.shading) {
    css["background-color"] = merged.shading;
  }
  if (merged.borderTop) css["border-top"] = getBorderStyle(merged.borderTop)!;
  if (merged.borderRight)
    css["border-right"] = getBorderStyle(merged.borderRight)!;
  if (merged.borderBottom)
    css["border-bottom"] = getBorderStyle(merged.borderBottom)!;
  if (merged.borderLeft)
    css["border-left"] = getBorderStyle(merged.borderLeft)!;

  const indentLeft = (merged.indentLeft ?? 0) + (merged.indentHanging ?? 0);
  const textIndent =
    (merged.indentFirstLine ?? 0) - (merged.indentHanging ?? 0);

  if (indentLeft !== 0) {
    css["padding-left"] = `${indentLeft}px`;
  }
  if (textIndent !== 0 && !isContinuation) {
    css["text-indent"] = `${textIndent}px`;
  }
  if (merged.indentRight !== undefined && merged.indentRight !== null) {
    css["padding-right"] = `${merged.indentRight}px`;
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

function getParagraphRenderStyle(
  paragraph: EditorParagraphNode,
  state: EditorState,
  isContinuation?: boolean,
  isTruncated?: boolean,
): Record<string, string> | undefined {
  const css = paragraphStyleToCss(paragraph.style, state.document.styles, isContinuation, isTruncated) ?? {};
  const effectiveTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    state.document.styles,
  );
  if (effectiveTextStyle.fontFamily) {
    css["font-family"] = effectiveTextStyle.fontFamily;
  }
  if (effectiveTextStyle.fontSize !== undefined && effectiveTextStyle.fontSize !== null) {
    css["font-size"] = `${effectiveTextStyle.fontSize}px`;
  }
  if (effectiveTextStyle.color) {
    css.color = effectiveTextStyle.color;
  }
  if (paragraph.list) {
    css["--list-level"] = String(Math.max(0, paragraph.list.level ?? 0));
    css["margin-left"] = `${Math.max(0, paragraph.list.level ?? 0) * 28}px`;
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

function getParagraphAlign(
  paragraph: EditorParagraphNode,
  state: EditorState,
): NonNullable<EditorParagraphStyle["align"]> {
  return (
    resolveEffectiveParagraphStyle(paragraph.style, state.document.styles)?.align ??
    "left"
  );
}

function computeJustifyLineStyle(
  paragraph: EditorParagraphNode,
  state: EditorState,
  line: EditorLayoutLine,
  lineIndex: number,
  lineCount: number,
): Record<string, string> | undefined {
  if (
    getParagraphAlign(paragraph, state) !== "justify" ||
    lineIndex >= lineCount - 1
  ) {
    return undefined;
  }

  const lineChars = line.fragments.flatMap((fragment) => fragment.chars);
  if (lineChars.length === 0) {
    return undefined;
  }
  if (lineChars[lineChars.length - 1]?.char === "\n") {
    return undefined;
  }

  const expandableSpaces = lineChars.filter((char) => char.char === " ").length;
  if (expandableSpaces === 0) {
    return undefined;
  }

  // white-space:nowrap (from .oasis-editor-line CSS) prevents text-align:justify
  // from working. Override to "normal" so the browser can distribute inter-word
  // space. The text won't re-wrap because the layout engine already ensures each
  // line's content fits within the available width.
  return {
    "text-align": "justify",
    "text-align-last": "justify",
    "white-space": "normal",
  };
}

/**
 * A renderable atom inside a fragment.
 *
 *  - `text`: a contiguous run of non-tab characters → one DOM span with raw text.
 *  - `tab`:  a single \t character → its own span (variable width via tab stops).
 *  - `image`: a single image-bearing run character → its own span with <img>.
 *
 * Replacing the original "one span per character" rendering with these atoms is
 * the single biggest perf win for import/typing on real documents.
 */
type FragmentAtom =
  | { kind: "text"; startOffset: number; endOffset: number; text: string }
  | { kind: "tab"; offset: number; runOffset: number }
  | { kind: "image"; offset: number; runOffset: number };

function computeFragmentAtoms(fragment: EditorLayoutFragment): FragmentAtom[] {
  if (fragment.image && fragment.chars.length > 0) {
    const c = fragment.chars[0]!;
    return [{ kind: "image", offset: c.paragraphOffset, runOffset: c.runOffset }];
  }

  const atoms: FragmentAtom[] = [];
  let buf = "";
  let bufStart = -1;
  let bufEnd = -1;

  const flushText = () => {
    if (buf.length > 0) {
      atoms.push({
        kind: "text",
        startOffset: bufStart,
        endOffset: bufEnd + 1,
        text: buf,
      });
      buf = "";
      bufStart = -1;
      bufEnd = -1;
    }
  };

  for (const char of fragment.chars) {
    if (char.char === "\t") {
      flushText();
      atoms.push({ kind: "tab", offset: char.paragraphOffset, runOffset: char.runOffset });
    } else {
      if (buf.length === 0) {
        bufStart = char.paragraphOffset;
      }
      bufEnd = char.paragraphOffset;
      buf += char.char;
    }
  }
  flushText();
  return atoms;
}

function numberToLowerLetter(n: number): string {
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(97 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function numberToUpperLetter(n: number): string {
  return numberToLowerLetter(n).toUpperCase();
}

function numberToLowerRoman(n: number): string {
  const roman: Record<string, number> = {
    m: 1000,
    cm: 900,
    d: 500,
    cd: 400,
    c: 100,
    xc: 90,
    l: 50,
    xl: 40,
    x: 10,
    ix: 9,
    v: 5,
    iv: 4,
    i: 1,
  };
  let result = "";
  for (const key in roman) {
    while (n >= roman[key]) {
      result += key;
      n -= roman[key];
    }
  }
  return result;
}

function numberToUpperRoman(n: number): string {
  return numberToLowerRoman(n).toUpperCase();
}

function buildParagraphListMarkers(
  paragraphs: EditorParagraphNode[],
): Map<string, string> {
  const markers = new Map<string, string>();
  let orderedCounters: number[] = [];
  let previousList: EditorParagraphListStyle | undefined;

  for (const paragraph of paragraphs) {
    const list = paragraph.list;
    if (!list) {
      orderedCounters = [];
      previousList = undefined;
      continue;
    }

    const level = Math.max(0, list.level ?? 0);

    if (list.kind === "bullet" || list.format === "bullet") {
      orderedCounters = [];
      previousList = list;
      
      const bulletMarkers = ["\u2022", "\u25E6", "\u25AA", "\u2023", "\u2043"];
      const marker = bulletMarkers[level % bulletMarkers.length];
      markers.set(paragraph.id, marker!);
      continue;
    }

    if (previousList?.kind !== "ordered") {
      orderedCounters = [];
    }

    // Handle startAt - if defined, it always resets the counter for this level
    if (list.startAt !== undefined) {
      orderedCounters[level] = list.startAt - 1;
    }

    orderedCounters = orderedCounters.slice(0, level + 1);
    orderedCounters[level] = (orderedCounters[level] ?? 0) + 1;

    const count = orderedCounters[level];
    const format = list.format ?? "decimal";
    let marker = `${count}.`;

    if (format === "lowerLetter") marker = `${numberToLowerLetter(count)}.`;
    else if (format === "upperLetter")
      marker = `${numberToUpperLetter(count)}.`;
    else if (format === "lowerRoman") marker = `${numberToLowerRoman(count)}.`;
    else if (format === "upperRoman") marker = `${numberToUpperRoman(count)}.`;

    markers.set(paragraph.id, marker);
    previousList = list;
  }

  return markers;
}

function runStyleToCss(
  style: EditorTextStyle | undefined,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): Record<string, string> | undefined {
  const merged = resolveEffectiveTextStyleForParagraph(
    style,
    paragraphStyleId,
    styles,
  );

  const css: Record<string, string> = {};
  const textDecorations: string[] = [];

  if (merged.bold) {
    css["font-weight"] = "700";
  }
  if (merged.italic) {
    css["font-style"] = "italic";
  }
  if (merged.underline) {
    textDecorations.push("underline");
  }
  if (merged.strike) {
    textDecorations.push("line-through");
  }
  if (textDecorations.length > 0) {
    css["text-decoration"] = textDecorations.join(" ");
  }
  if (merged.superscript) {
    css["vertical-align"] = "super";
    css["font-size"] = "0.75em";
  } else if (merged.subscript) {
    css["vertical-align"] = "sub";
    css["font-size"] = "0.75em";
  }
  if (merged.fontFamily) {
    css["font-family"] = merged.fontFamily;
  }
  if (merged.fontSize !== undefined && merged.fontSize !== null) {
    css["font-size"] = `${merged.fontSize}px`;
  }
  if (merged.color) {
    css.color = merged.color;
  } else if (merged.link) {
    css.color = "#1d4ed8";
  }
  if (merged.highlight) {
    css["background-color"] = merged.highlight;
  }
  if (merged.link && !merged.underline) {
    textDecorations.unshift("underline");
    css["text-decoration"] = textDecorations.join(" ");
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

function resolveNextTabStop(
  currentX: number,
  tabs: EditorTabStop[] | undefined | null,
): number {
  const defaultTabInterval = 36; // 0.5 inch in pt

  if (tabs && tabs.length > 0) {
    const sortedTabs = [...tabs].sort((a, b) => a.position - b.position);
    for (const tab of sortedTabs) {
      if (tab.position > currentX) {
        return tab.position;
      }
    }
  }

  // Fallback to default tab stops
  return Math.ceil((currentX + 1) / defaultTabInterval) * defaultTabInterval;
}

function renderParagraph(
  paragraph: EditorParagraphNode,
  paragraphIndex: number,
  listMarker: string | null,
  layout: EditorLayoutParagraph | undefined,
  blockId: string,
  state: EditorState,
  normalizedSelection: Accessor<ReturnType<typeof normalizeSelection>>,
  onParagraphMouseDown: EditorSurfaceProps["onParagraphMouseDown"],
  onImageMouseDown: EditorSurfaceProps["onImageMouseDown"],
  onImageResizeHandleMouseDown: EditorSurfaceProps["onImageResizeHandleMouseDown"],
  onTableDragHandleMouseDown: EditorSurfaceProps["onTableDragHandleMouseDown"],
  onRevisionMouseEnter: EditorSurfaceProps["onRevisionMouseEnter"],
  onRevisionMouseLeave?: EditorSurfaceProps["onRevisionMouseLeave"],
  options?: {
    domParagraphId?: string;
    interactive?: boolean;
    testId?: string;
    contentWidth?: number;
  },
) {
  const paragraphLayout =
    layout ??
    projectParagraphLayout(
      paragraph,
      undefined,
      undefined,
      state.document.styles,
      options?.contentWidth,
    );
  const chars = paragraphLayout.fragments.flatMap((fragment) => fragment.chars);
  const normalized = normalizedSelection;
  const isContinuation = (paragraphLayout.startOffset ?? 0) > 0;
  const isTruncated = (paragraphLayout.endOffset ?? getParagraphText(paragraph).length) < getParagraphText(paragraph).length;
  const domParagraphId = options?.domParagraphId ?? paragraph.id;
  const interactive = options?.interactive ?? true;
  const testId = options?.testId ?? "editor-block";
  const paragraphAlign = getParagraphAlign(paragraph, state);
  const isCharSelected = (charIndex: number) => {
    const current = normalized();
    if (current.isCollapsed) {
      return false;
    }

    if (
      paragraphIndex < current.startIndex ||
      paragraphIndex > current.endIndex
    ) {
      return false;
    }

    if (current.startIndex === current.endIndex) {
      return (
        charIndex >= current.startParagraphOffset &&
        charIndex < current.endParagraphOffset
      );
    }

    if (paragraphIndex === current.startIndex) {
      return charIndex >= current.startParagraphOffset;
    }

    if (paragraphIndex === current.endIndex) {
      return charIndex < current.endParagraphOffset;
    }

    return true;
  };

  const resolvedParagraphStyle = () =>
    resolveNamedParagraphStyle(paragraph.style?.styleId, state.document.styles);
  const effectiveTabs = () =>
    paragraph.style?.tabs ?? resolvedParagraphStyle()?.tabs;
  const paragraphContent = (
    <>
      <Show
        when={chars.length > 0}
        fallback={
          <span
            class="oasis-editor-empty-char"
            data-empty-block="true"
            data-testid="editor-empty-char"
          >
            {"\u00A0"}
          </span>
        }
      >
        <For each={paragraphLayout.lines}>
          {(line, lineIndex) => (
            (() => {
              const slotsByOffset = new Map(
                line.slots.map((slot) => [slot.offset, slot] as const),
              );
              return (
                <div
                  class="oasis-editor-line"
                  data-testid="editor-line"
                  style={
                    computeJustifyLineStyle(
                      paragraph,
                      state,
                      line,
                      lineIndex(),
                      paragraphLayout.lines.length,
                      options?.contentWidth ?? paragraphLayout.contentWidth,
                    )
                  }
                >
                  <For each={line.fragments}>
                    {(fragment) => {
                      const atoms = computeFragmentAtoms(fragment);
                      const runContent = (
                        <span
                          class="oasis-editor-run"
                          classList={{
                            "oasis-editor-revision-insert":
                              fragment.revision?.type === "insert",
                            "oasis-editor-revision-delete":
                              fragment.revision?.type === "delete",
                          }}
                          data-run-id={fragment.runId}
                          data-testid="editor-run"
                          style={runStyleToCss(
                            fragment.styles,
                            paragraph.style?.styleId,
                            state.document.styles,
                          )}
                          onMouseEnter={
                            interactive && fragment.revision
                              ? (event) =>
                                  onRevisionMouseEnter?.(
                                    fragment.revision!.id,
                                    event,
                                  )
                              : undefined
                          }
                          onMouseLeave={
                            interactive && fragment.revision
                              ? (event) =>
                                  onRevisionMouseLeave?.(
                                    fragment.revision!.id,
                                    event,
                                  )
                              : undefined
                          }
                        >
                          <For each={atoms}>
                            {(atom) => {
                              if (atom.kind === "text") {
                                // Single span per contiguous text run. No per-char DOM nodes.
                                return (
                                  <span
                                    class="oasis-editor-text-segment"
                                    data-segment="text"
                                    data-paragraph-id={paragraph.id}
                                    data-run-id={fragment.runId}
                                    data-segment-start={atom.startOffset}
                                    data-segment-end={atom.endOffset}
                                    data-testid="editor-text-segment"
                                  >
                                    {atom.text}
                                  </span>
                                );
                              }

                              if (atom.kind === "tab") {
                                const tabWidth = () => {
                                  const currentX = slotsByOffset.get(atom.offset)?.left ?? 0;
                                  const nextTabPos = resolveNextTabStop(
                                    currentX,
                                    effectiveTabs(),
                                  );
                                  return Math.max(0, nextTabPos - currentX);
                                };
                                return (
                                  <span
                                    class="oasis-editor-char oasis-editor-tab-char"
                                    data-char-index={atom.offset}
                                    data-run-id={fragment.runId}
                                    data-run-offset={atom.runOffset}
                                    data-segment="tab"
                                    data-segment-start={atom.offset}
                                    data-segment-end={atom.offset + 1}
                                    data-testid="editor-char"
                                    style={{
                                      display: "inline-block",
                                      width: `${tabWidth()}pt`,
                                      overflow: "hidden",
                                      "white-space": "pre",
                                    }}
                                  >
                                    {"\u00A0"}
                                  </span>
                                );
                              }

                              // image atom
                              const imageSelected = () => isCharSelected(atom.offset);
                              return (
                                <span
                                  class="oasis-editor-char oasis-editor-image-char"
                                  data-char-index={atom.offset}
                                  data-run-id={fragment.runId}
                                  data-run-offset={atom.runOffset}
                                  data-segment="image"
                                  data-segment-start={atom.offset}
                                  data-segment-end={atom.offset + 1}
                                  data-testid="editor-char"
                                >
                                  <span
                                    classList={{
                                      "oasis-editor-image-inline": true,
                                      "oasis-editor-image-inline-selected":
                                        imageSelected(),
                                    }}
                                    onMouseDown={
                                      interactive
                                        ? (event) =>
                                            onImageMouseDown(
                                              paragraph.id,
                                              atom.offset,
                                              event,
                                            )
                                        : undefined
                                    }
                                    title={
                                      interactive
                                        ? "Click and drag to move image"
                                        : undefined
                                    }
                                  >
                                    <img
                                      src={resolveImageSrc(state.document, fragment.image!.src)}
                                      width={fragment.image!.width}
                                      height={fragment.image!.height}
                                      alt={fragment.image!.alt ?? ""}
                                      class="oasis-editor-image"
                                      style={{
                                        width: `${fragment.image!.width}px`,
                                        height: `${fragment.image!.height}px`,
                                      }}
                                      classList={{
                                        "oasis-editor-image-selected":
                                          imageSelected(),
                                      }}
                                      data-testid="editor-image"
                                    />
                                    <Show when={imageSelected()}>
                                      <For each={IMAGE_RESIZE_HANDLE_DIRECTIONS}>
                                        {(direction) => (
                                          <button
                                            type="button"
                                            aria-label={`Resize image ${direction}`}
                                            class="oasis-editor-image-resize-handle"
                                            data-direction={direction}
                                            data-testid={`editor-image-resize-handle-${direction}`}
                                            onMouseDown={
                                              interactive
                                                ? (event) =>
                                                    onImageResizeHandleMouseDown(
                                                      paragraph.id,
                                                      atom.offset,
                                                      direction,
                                                      event,
                                                    )
                                                : undefined
                                            }
                                          />
                                        )}
                                      </For>
                                    </Show>
                                  </span>
                                </span>
                              );
                            }}
                          </For>
                        </span>
                      );

                      return fragment.styles?.link ? (
                        <a
                          class="oasis-editor-link"
                          data-testid="editor-link"
                          href={fragment.styles.link}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {runContent}
                        </a>
                      ) : (
                        runContent
                      );
                    }}
                  </For>
                </div>
              );
            })()
          )}
        </For>
        <Show when={getParagraphText(paragraph).endsWith("\n")}>
          <span
            class="oasis-editor-char oasis-editor-char-phantom"
            data-char-index={getParagraphText(paragraph).length}
            data-testid="editor-char-phantom"
          >
            {"\u200B"}
          </span>
        </Show>
      </Show>
    </>
  );

  return (
    <p
      class="oasis-editor-block"
      classList={{ "oasis-editor-block-list": Boolean(paragraph.list) }}
      data-block-id={blockId}
      data-paragraph-id={domParagraphId}
      data-source-paragraph-id={paragraph.id}
      data-start-offset={paragraphLayout.startOffset ?? 0}
      data-end-offset={paragraphLayout.endOffset ?? chars.length}
      data-testid={testId}
      data-list-align={paragraph.list ? paragraphAlign : undefined}
      style={getParagraphRenderStyle(paragraph, state, isContinuation, isTruncated)}
      onMouseDown={
        interactive
          ? (event) => onParagraphMouseDown(paragraph.id, event)
          : undefined
      }
    >
      <Show when={paragraph.list}>
        <div class="oasis-editor-list-item" data-testid="editor-list-item">
          <span
            class="oasis-editor-list-marker"
            data-testid="editor-list-marker"
          >
            {isContinuation ? "" : listMarker}
          </span>
          <div class="oasis-editor-list-content">{paragraphContent}</div>
        </div>
      </Show>
      <Show when={!paragraph.list}>{paragraphContent}</Show>
    </p>
  );
}

function formatDimension(dim?: number | string): string | undefined {
  if (dim === undefined) return undefined;
  if (typeof dim === "number") return `${dim}pt`;
  return dim;
}

const POINT_TO_PX = 96 / 72;
const DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX = 28;
const MIN_TABLE_CELL_CONTENT_WIDTH_PX = 24;

function tableCellContentWidthPx(cell: EditorTableNode["rows"][number]["cells"][number]): number | undefined {
  if (typeof cell.style?.width !== "number") {
    return undefined;
  }

  const widthPx = cell.style.width * POINT_TO_PX;
  const horizontalPaddingPx =
    cell.style.padding !== undefined
      ? cell.style.padding * POINT_TO_PX * 2
      : DEFAULT_TABLE_CELL_HORIZONTAL_PADDING_PX;

  return Math.max(MIN_TABLE_CELL_CONTENT_WIDTH_PX, widthPx - horizontalPaddingPx);
}

function renderTable(
  table: EditorTableNode,
  blockId: string,
  paragraphIndexById: Map<string, number>,
  listMarkers: Map<string, string>,
  state: EditorState,
  normalizedSelection: Accessor<ReturnType<typeof normalizeSelection>>,
  onParagraphMouseDown: EditorSurfaceProps["onParagraphMouseDown"],
  onImageMouseDown: EditorSurfaceProps["onImageMouseDown"],
  onImageResizeHandleMouseDown: EditorSurfaceProps["onImageResizeHandleMouseDown"],
  onTableDragHandleMouseDown: EditorSurfaceProps["onTableDragHandleMouseDown"],
  onRevisionMouseEnter: EditorSurfaceProps["onRevisionMouseEnter"],
  onRevisionMouseLeave?: EditorSurfaceProps["onRevisionMouseLeave"],
  segment?: {
    startRowIndex: number;
    endRowIndex: number;
    repeatedHeaderRowCount: number;
  },
) {
  const repeatedHeaderRows =
    segment && segment.repeatedHeaderRowCount > 0
      ? table.rows.slice(0, segment.repeatedHeaderRowCount)
      : [];
  const bodyRows = segment
    ? table.rows.slice(segment.startRowIndex, segment.endRowIndex)
    : table.rows;
  const renderedRows = [
    ...repeatedHeaderRows.map((row, repeatedIndex) => ({
      row,
      sourceRowIndex: repeatedIndex,
      repeated: true,
      repeatedIndex,
    })),
    ...bodyRows.map((row, rowOffset) => ({
      row,
      sourceRowIndex: (segment?.startRowIndex ?? 0) + rowOffset,
      repeated: false,
      repeatedIndex: -1,
    })),
  ];

  const getTableStyle = () => {
    const s: Record<string, string> = {};
    if (table.style?.width) {
      s.width = formatDimension(table.style.width)!;
    }
    if (table.style?.align) {
      if (table.style.align === "center") {
        s["margin-left"] = "auto";
        s["margin-right"] = "auto";
      } else if (table.style.align === "right") {
        s["margin-left"] = "auto";
        s["margin-right"] = "0";
      } else {
        s["margin-left"] =
          table.style.indentLeft !== undefined
            ? `${table.style.indentLeft}pt`
            : "0";
        s["margin-right"] = "auto";
      }
    } else if (table.style?.indentLeft !== undefined) {
      s["margin-left"] = `${table.style.indentLeft}pt`;
    }
    return s;
  };

  return (
    <div
      class="oasis-editor-table-block"
      classList={{ "oasis-editor-table-block-segment": Boolean(segment) }}
      data-block-id={blockId}
      data-source-block-id={table.id}
      data-testid="editor-table"
      style={{ position: "relative" }}
    >
      <div
        class="oasis-editor-table-drag-handle"
        data-table-id={table.id}
        onMouseDown={(e) => {
          onTableDragHandleMouseDown(table.id, e);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m9 5 3-3 3 3"/><path d="m5 9-3 3 3 3"/></svg>
      </div>
      <table
        class="oasis-editor-table-grid"
        data-testid="editor-table-grid"
        style={getTableStyle()}
      >
        <tbody>
          <For each={renderedRows}>
            {(renderedRow) => (
              <tr
                class="oasis-editor-table-row"
                classList={{
                  "oasis-editor-table-row-repeated-header":
                    renderedRow.repeated,
                }}
                data-testid="editor-table-row"
                data-row-index={renderedRow.sourceRowIndex}
                data-repeated-header={renderedRow.repeated ? "true" : undefined}
                style={{
                  height: formatDimension(renderedRow.row.style?.height),
                }}
              >
                <For each={renderedRow.row.cells}>
                  {(cell, cellIndex) =>
                    cell.vMerge === "continue" ? null : (
                      <td
                        class="oasis-editor-table-cell"
                        colSpan={cell.colSpan ?? 1}
                        rowSpan={cell.rowSpan ?? 1}
                        data-testid="editor-table-cell"
                        data-row-index={renderedRow.sourceRowIndex}
                        data-cell-index={cellIndex()}
                        style={{
                          "background-color": cell.style?.shading,
                          "vertical-align": cell.style?.verticalAlign,
                          "text-align": cell.style?.horizontalAlign,
                          width: formatDimension(cell.style?.width),
                          "max-width": formatDimension(cell.style?.width),
                          "min-width": formatDimension(cell.style?.width),
                          padding:
                            cell.style?.padding !== undefined
                              ? `${cell.style.padding}pt`
                              : undefined,
                          "border-top": getBorderStyle(cell.style?.borderTop),
                          "border-right": getBorderStyle(
                            cell.style?.borderRight,
                          ),
                          "border-bottom": getBorderStyle(
                            cell.style?.borderBottom,
                          ),
                          "border-left": getBorderStyle(cell.style?.borderLeft),
                        }}
                      >
                        <For each={cell.blocks}>
                          {(paragraph, paragraphIndex) =>
                            renderParagraph(
                              paragraph,
                              paragraphIndexById.get(paragraph.id) ?? 0,
                              listMarkers.get(paragraph.id) ?? null,
                              undefined,
                              renderedRow.repeated
                                ? `${blockId}:repeat:${renderedRow.repeatedIndex}:${cell.id}:${paragraphIndex()}`
                                : paragraph.id,
                              state,
                              normalizedSelection,
                              onParagraphMouseDown,
                              onImageMouseDown,
                              onImageResizeHandleMouseDown,
                              onTableDragHandleMouseDown,
                              onRevisionMouseEnter,
                              onRevisionMouseLeave,
                              renderedRow.repeated
                                ? {
                                    domParagraphId: `${paragraph.id}:repeat:${blockId}:${renderedRow.repeatedIndex}:${paragraphIndex()}`,
                                    interactive: false,
                                    contentWidth: tableCellContentWidthPx(cell),
                                  }
                                : { contentWidth: tableCellContentWidthPx(cell) },
                            )
                          }
                        </For>
                      </td>
                    )
                  }
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function areLayoutParagraphsEquivalentForRender(
  previous: EditorLayoutParagraph | undefined,
  next: EditorLayoutParagraph | undefined,
): boolean {
  if (previous === next) {
    return true;
  }
  if (!previous || !next) {
    return false;
  }
  if (
    previous.text !== next.text ||
    previous.startOffset !== next.startOffset ||
    previous.endOffset !== next.endOffset ||
    previous.lines.length !== next.lines.length
  ) {
    return false;
  }
  return next.lines.every((line, index) => {
    const previousLine = previous.lines[index];
    return (
      previousLine &&
      previousLine.startOffset === line.startOffset &&
      previousLine.endOffset === line.endOffset &&
      previousLine.top === line.top &&
      previousLine.height === line.height
    );
  });
}

function canReuseLayoutBlock(
  previous: EditorLayoutBlock | undefined,
  next: EditorLayoutBlock,
): previous is EditorLayoutBlock {
  return Boolean(
    previous &&
      previous.blockId === next.blockId &&
      previous.sourceBlock === next.sourceBlock &&
      previous.estimatedHeight === next.estimatedHeight &&
      previous.tableSegment?.startRowIndex === next.tableSegment?.startRowIndex &&
      previous.tableSegment?.endRowIndex === next.tableSegment?.endRowIndex &&
      previous.tableSegment?.repeatedHeaderRowCount ===
        next.tableSegment?.repeatedHeaderRowCount &&
      areLayoutParagraphsEquivalentForRender(previous.layout, next.layout),
  );
}

function canReuseLayoutPage(
  previous: EditorLayoutPage | undefined,
  next: EditorLayoutPage,
): previous is EditorLayoutPage {
  const samePageSettings = Boolean(
    previous &&
      previous.pageSettings.width === next.pageSettings.width &&
      previous.pageSettings.height === next.pageSettings.height &&
      previous.pageSettings.orientation === next.pageSettings.orientation &&
      previous.pageSettings.margins.top === next.pageSettings.margins.top &&
      previous.pageSettings.margins.right === next.pageSettings.margins.right &&
      previous.pageSettings.margins.bottom === next.pageSettings.margins.bottom &&
      previous.pageSettings.margins.left === next.pageSettings.margins.left &&
      previous.pageSettings.margins.header === next.pageSettings.margins.header &&
      previous.pageSettings.margins.footer === next.pageSettings.margins.footer &&
      previous.pageSettings.margins.gutter === next.pageSettings.margins.gutter,
  );
  if (
    !previous ||
    previous.id !== next.id ||
    previous.index !== next.index ||
    previous.height !== next.height ||
    previous.maxHeight !== next.maxHeight ||
    !samePageSettings ||
    previous.bodyTop !== next.bodyTop ||
    previous.bodyBottom !== next.bodyBottom
  ) {
    return false;
  }

  const sameBlocks = (left?: EditorLayoutBlock[], right?: EditorLayoutBlock[]) => {
    if ((left?.length ?? 0) !== (right?.length ?? 0)) {
      return false;
    }
    return (right ?? []).every((block, index) => left?.[index] === block);
  };

  return (
    sameBlocks(previous.blocks, next.blocks) &&
    sameBlocks(previous.headerBlocks, next.headerBlocks) &&
    sameBlocks(previous.footerBlocks, next.footerBlocks)
  );
}

export function EditorSurface(props: EditorSurfaceProps) {
  let reusableLayoutBlocks = new Map<string, EditorLayoutBlock>();
  let reusableLayoutPages = new Map<string, EditorLayoutPage>();

  const preserveStableLayoutIdentity = (
    layout: EditorLayoutDocument,
  ): EditorLayoutDocument => {
    const nextBlockCache = new Map<string, EditorLayoutBlock>();
    const stabilizeBlocks = (blocks: EditorLayoutBlock[] | undefined) =>
      blocks?.map((block) => {
        const previous = reusableLayoutBlocks.get(block.blockId);
        const stable = canReuseLayoutBlock(previous, block) ? previous : block;
        nextBlockCache.set(stable.blockId, stable);
        return stable;
      });

    const pages = layout.pages.map((page) => {
      const nextPage: EditorLayoutPage = {
        ...page,
        blocks: stabilizeBlocks(page.blocks) ?? [],
        headerBlocks: stabilizeBlocks(page.headerBlocks),
        footerBlocks: stabilizeBlocks(page.footerBlocks),
      };
      const previous = reusableLayoutPages.get(nextPage.id);
      if (canReuseLayoutPage(previous, nextPage)) {
        return previous;
      }
      return nextPage;
    });

    reusableLayoutBlocks = nextBlockCache;
    reusableLayoutPages = new Map(pages.map((page) => [page.id, page]));
    return { pages };
  };

  // Memoize: each accessor below would otherwise re-walk the full document
  // tree (and project per-character layout) on every read inside JSX.
  const paragraphs = createMemo(() => getParagraphs(props.state()));
  const activeZone = () => props.state().activeZone ?? "main";
  const paragraphIndexById = createMemo(
    () =>
      new Map(
        paragraphs().map((paragraph, index) => [paragraph.id, index] as const),
      ),
  );
  const listMarkers = createMemo(() => buildParagraphListMarkers(paragraphs()));
  const normalizedSelection = createMemo(() => normalizeSelection(props.state()));
  const documentLayout = createMemo(() => {
    return perfTimer("layout:project", () =>
      preserveStableLayoutIdentity(
        projectDocumentLayout(
          props.state().document,
          undefined,
          props.measuredBlockHeights?.(),
          props.measuredParagraphLayouts?.(),
        ),
      ),
    );
  });

  // ── Phase 4: page virtualization ────────────────────────────────────────
  //
  // Only pages that intersect the viewport rect (with overscan) are rendered
  // with their full block contents. Other pages render as a same-sized
  // placeholder div so the scroll geometry (and surrounding pages' visual
  // positions) is preserved.
  //
  // We additionally pin the page that owns the caret / selection anchor /
  // selection focus paragraph, so caret + selection geometry remains
  // available even if the user briefly scrolls those off-screen.
  const VIRTUAL_OVERSCAN_PX = 1200;
  const [scrollTick, setScrollTick] = createSignal(0);
  let scrollHandler: (() => void) | null = null;
  let resizeHandler: (() => void) | null = null;
  let lastViewport: HTMLElement | null = null;

  onMount(() => {
    const attach = () => {
      const v = props.viewportRef?.();
      if (!v || v === lastViewport) return;
      if (lastViewport && scrollHandler) {
        lastViewport.removeEventListener("scroll", scrollHandler);
      }
      lastViewport = v;
      scrollHandler = () => setScrollTick((n) => n + 1);
      v.addEventListener("scroll", scrollHandler, { passive: true });
      // Fire once so the initial visible range is computed.
      setScrollTick((n) => n + 1);
    };
    resizeHandler = () => setScrollTick((n) => n + 1);
    window.addEventListener("resize", resizeHandler);
    attach();
    // Re-attach on the next animation frame in case viewportRef wasn't ready
    // at mount time.
    requestAnimationFrame(attach);
  });

  onCleanup(() => {
    if (lastViewport && scrollHandler) {
      lastViewport.removeEventListener("scroll", scrollHandler);
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
    }
    scrollHandler = null;
    resizeHandler = null;
    lastViewport = null;
  });

  const pinnedPageIds = createMemo(() => {
    const sel = props.state().selection;
    const pinnedParagraphIds = new Set([
      sel.anchor.paragraphId,
      sel.focus.paragraphId,
    ]);
    const ids = new Set<string>();
    for (const page of documentLayout().pages) {
      const owns = (blocks: EditorLayoutBlock[] | undefined) =>
        blocks?.some((b) =>
          b.sourceBlock.type === "paragraph"
            ? pinnedParagraphIds.has(b.sourceBlock.id)
            : b.sourceBlock.rows.some((row) =>
                row.cells.some((cell) =>
                  cell.blocks.some((p) => pinnedParagraphIds.has(p.id)),
                ),
              ),
        );
      if (owns(page.blocks) || owns(page.headerBlocks) || owns(page.footerBlocks)) {
        ids.add(page.id);
      }
    }
    return ids;
  });

  // Returns a `(pageIndex) => boolean` accessor that says whether a given
  // page should be rendered with its full content. When no viewport is
  // wired (e.g. headless tests or Word-parity scaffolding), everything
  // renders.
  const visiblePageIds = createMemo<Set<string> | null>(() => {
    scrollTick(); // reactive dep
    const viewport = props.viewportRef?.();
    if (!viewport) return null; // no virtualization possible

    const pages = documentLayout().pages;
    if (pages.length === 0) return new Set();

    const viewportRect = viewport.getBoundingClientRect();
    const visible = new Set<string>();

    // 1. Try DOM-based query (fast, accurate after first render).
    const pageEls = viewport.querySelectorAll<HTMLElement>('[data-testid="editor-page"]');
    if (pageEls.length > 0) {
      const top = viewportRect.top - VIRTUAL_OVERSCAN_PX;
      const bottom = viewportRect.bottom + VIRTUAL_OVERSCAN_PX;
      for (const el of pageEls) {
        const idx = Number(el.dataset.pageIndex);
        if (!Number.isFinite(idx)) continue;
        const page = pages[idx];
        if (!page) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom >= top && r.top <= bottom) {
          visible.add(page.id);
        }
      }
      return visible;
    }

    // 2. First render fallback: predict page positions from cumulative
    //    heights so we don't render hundreds of pages on initial mount of
    //    a long document.
    const scrollTop = viewport.scrollTop;
    const viewportHeight = viewport.clientHeight || 800;
    const visibleTop = scrollTop - VIRTUAL_OVERSCAN_PX;
    const visibleBottom = scrollTop + viewportHeight + VIRTUAL_OVERSCAN_PX;

    let cumulative = 0;
    for (const page of pages) {
      const pageHeight = Math.max(page.height || 0, page.pageSettings.height);
      const pageBottom = cumulative + pageHeight;
      if (pageBottom >= visibleTop && cumulative <= visibleBottom) {
        visible.add(page.id);
      }
      cumulative = pageBottom + 24; // grid gap
      if (cumulative > visibleBottom + VIRTUAL_OVERSCAN_PX) break;
    }
    return visible;
  });

  const shouldRenderPageContent = (page: EditorLayoutPage): boolean => {
    const visible = visiblePageIds();
    if (visible === null) return true; // legacy / unvirtualized
    if (visible.has(page.id)) return true;
    if (pinnedPageIds().has(page.id)) return true;
    return false;
  };

  // After every layout / state change, re-tick on the next microtask so
  // `visiblePageIds` queries the freshly mounted DOM (otherwise it would
  // see the pre-commit DOM and we'd render stale visibility for one frame).
  createEffect(() => {
    documentLayout();
    queueMicrotask(() => setScrollTick((n) => n + 1));
  });

  return (
    <div class="oasis-editor-paper-stack">
      <Index each={documentLayout().pages}>
        {(page, index) => {
          const pageSettings = () => page().pageSettings;
          const contentWidth = () => getPageContentWidth(pageSettings());
          const bodyTop = () => page().bodyTop ?? getPageBodyTop(pageSettings());
          const bodyBottom = () =>
            page().bodyBottom ?? bodyTop() + getPageContentHeight(pageSettings());
          const contentHeight = () => Math.max(24, Math.floor(bodyBottom() - bodyTop()));
          const headerZoneTop = () => getPageHeaderZoneTop(pageSettings());
          const headerZoneHeight = () => Math.max(0, bodyTop() - headerZoneTop());
          const footerZoneTop = () => bodyBottom();
          const footerZoneHeight = () => Math.max(0, pageSettings().height - footerZoneTop());
          const headerContentOffset = () =>
            Math.min(pageSettings().margins.header, headerZoneHeight());

          return (
            <>
              <Show when={index > 0}>
                <PageBreak pageIndex={index} />
              </Show>
              <div
                class="oasis-editor-paper"
              classList={{
                "oasis-editor-paper-landscape":
                  pageSettings().orientation === "landscape",
              }}
              data-page-index={index}
              data-testid="editor-page"
              style={{
                width: `${pageSettings().width}px`,
                "min-height": `${pageSettings().height}px`,
              }}
            >
              <Show
                when={shouldRenderPageContent(page())}
                fallback={
                  // Phase 4: lightweight placeholder for off-screen pages.
                  // Scroll geometry stays correct because the parent
                  // `.oasis-editor-paper` already enforces min-height equal to
                  // the page paper height.
                  <div
                    class="oasis-editor-page-virtual-placeholder"
                    data-testid="editor-page-virtual-placeholder"
                    aria-hidden="true"
                  />
                }
              >
              <div
                class="oasis-editor-page-header-zone"
                classList={{
                  "oasis-editor-zone-active": activeZone() === "header",
                  "oasis-editor-zone-dimmed": activeZone() !== "header",
                }}
                data-testid="editor-page-header-zone"
                style={{
                  left: `${pageSettings().margins.left + pageSettings().margins.gutter}px`,
                  top: `${headerZoneTop()}px`,
                  width: `${contentWidth()}px`,
                  height: `${headerZoneHeight()}px`,
                }}
                onMouseDown={props.onSurfaceMouseDown}
                onMouseMove={props.onSurfaceMouseMove}
                onDblClick={props.onSurfaceDblClick}              >
                <div
                  class="oasis-editor-page-header-guide"
                  style={{
                    top: `${headerZoneHeight()}px`,
                  }}
                />
                <div style={{ "padding-top": `${headerContentOffset()}px` }}>
                  <For each={page().headerBlocks}>
                    {(block) => {
                      return block.sourceBlock.type === "paragraph"
                        ? renderParagraph(
                            block.sourceBlock,
                            paragraphIndexById().get(block.sourceBlock.id) ?? 0,
                            listMarkers().get(block.sourceBlock.id) ?? null,
                            block.layout,
                            block.blockId,
                            props.state(),
                            normalizedSelection,
                            props.onParagraphMouseDown,
                            props.onImageMouseDown,
                            props.onImageResizeHandleMouseDown,
                            props.onTableDragHandleMouseDown,
                            props.onRevisionMouseEnter,
                            props.onRevisionMouseLeave,
                            {
                              testId: "editor-header-block",
                              contentWidth: contentWidth(),
                            },
                          )
                        : renderTable(
                            block.sourceBlock,
                            block.blockId,
                            paragraphIndexById(),
                            listMarkers(),
                            props.state(),
                            normalizedSelection,
                            props.onParagraphMouseDown,
                            props.onImageMouseDown,
                            props.onImageResizeHandleMouseDown,
                            props.onTableDragHandleMouseDown,
                            props.onRevisionMouseEnter,
                            props.onRevisionMouseLeave,
                            block.tableSegment,
                          );
                    }}
                  </For>
                </div>
              </div>
              <div
                class="oasis-editor-surface"
                data-testid="editor-surface"
                style={{
                  width: `${contentWidth()}px`,
                  "min-height": `${contentHeight()}px`,
                  "margin-top": `${bodyTop()}px`,
                  "margin-right": `${pageSettings().margins.right}px`,
                  "margin-bottom": `${pageSettings().height - footerZoneTop()}px`,
                  "margin-left": `${pageSettings().margins.left + pageSettings().margins.gutter}px`,
                }}
                onMouseDown={props.onSurfaceMouseDown}
                onMouseMove={props.onSurfaceMouseMove}
                onDblClick={props.onSurfaceDblClick}              >
                <For each={page().blocks}>
                  {(block) => {
                    return block.sourceBlock.type === "paragraph"
                      ? renderParagraph(
                          block.sourceBlock,
                          paragraphIndexById().get(block.sourceBlock.id) ?? 0,
                          listMarkers().get(block.sourceBlock.id) ?? null,
                          block.layout,
                          block.blockId,
                          props.state(),
                          normalizedSelection,
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onTableDragHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          { contentWidth: contentWidth() },
                        )
                      : renderTable(
                          block.sourceBlock,
                          block.blockId,
                          paragraphIndexById(),
                          listMarkers(),
                          props.state(),
                          normalizedSelection,
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onTableDragHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          block.tableSegment,
                        );
                  }}
                </For>
              </div>
              <div
                class="oasis-editor-page-footer-zone"
                classList={{
                  "oasis-editor-zone-active": activeZone() === "footer",
                  "oasis-editor-zone-dimmed": activeZone() !== "footer",
                }}
                data-testid="editor-page-footer-zone"
                style={{
                  left: `${pageSettings().margins.left + pageSettings().margins.gutter}px`,
                  top: `${footerZoneTop()}px`,
                  width: `${contentWidth()}px`,
                  height: `${footerZoneHeight()}px`,
                }}
                onMouseDown={props.onSurfaceMouseDown}
                onMouseMove={props.onSurfaceMouseMove}
                onDblClick={props.onSurfaceDblClick}              >
                <div
                  class="oasis-editor-page-footer-guide"
                  style={{
                    bottom: `${footerZoneHeight()}px`,
                  }}
                />
                <For each={page().footerBlocks}>
                  {(block) => {
                    return block.sourceBlock.type === "paragraph"
                      ? renderParagraph(
                          block.sourceBlock,
                          paragraphIndexById().get(block.sourceBlock.id) ?? 0,
                          listMarkers().get(block.sourceBlock.id) ?? null,
                          block.layout,
                          block.blockId,
                          props.state(),
                          normalizedSelection,
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onTableDragHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          {
                            testId: "editor-footer-block",
                            contentWidth: contentWidth(),
                          },
                        )
                      : renderTable(
                          block.sourceBlock,
                          block.blockId,
                          paragraphIndexById(),
                          listMarkers(),
                          props.state(),
                          normalizedSelection,
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onTableDragHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          block.tableSegment,
                        );
                  }}
                </For>
              </div>
              </Show>
            </div>
            </>
          );
        }}
      </Index>
    </div>
  );
}
