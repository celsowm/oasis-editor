import { For, Show } from "solid-js";
import type { Accessor } from "solid-js";
import {
  getDocumentPageSettings,
  getPageContentWidth,
  getPageContentHeight,
  type Editor2LayoutParagraph,
  type Editor2ParagraphNode,
  getParagraphText,
  getParagraphs,
  type Editor2ParagraphListStyle,
  type Editor2ParagraphStyle,
  type Editor2State,
  type Editor2TableNode,
  type Editor2TextStyle,
  type Editor2BorderStyle,
  type Editor2NamedStyle,
  type Editor2TabStop,
  resolveNamedParagraphStyle,
  resolveNamedTextStyle,
  resolveEffectiveTextStyle,
  resolveEffectiveParagraphStyle,
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import {
  projectDocumentLayout,
  projectParagraphLayout,
} from "../layoutProjection.js";

interface EditorSurfaceProps {
  state: Accessor<Editor2State>;
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, Editor2LayoutParagraph>>;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
  onParagraphMouseDown: (
    paragraphId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ) => void;
  onImageMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLImageElement },
  ) => void;
  onImageResizeHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLButtonElement },
  ) => void;
  onRevisionMouseEnter?: (revisionId: string, event: MouseEvent) => void;
  onRevisionMouseLeave?: (revisionId: string, event: MouseEvent) => void;
}

function getBorderStyle(border?: Editor2BorderStyle): string | undefined {
  if (!border) return undefined;
  if (border.type === "none") return "none";
  return `${border.width}pt ${border.type} ${border.color}`;
}

function paragraphStyleToCss(
  style: Editor2ParagraphStyle | undefined,
  styles: Record<string, Editor2NamedStyle> | undefined,
): Record<string, string> | undefined {
  const merged = resolveEffectiveParagraphStyle(style, styles);

  const css: Record<string, string> = {};

  if (merged.align) {
    css["text-align"] = merged.align;
  }
  if (merged.lineHeight !== undefined && merged.lineHeight !== null) {
    css["line-height"] = `${merged.lineHeight}`;
  }
  if (merged.spacingBefore !== undefined && merged.spacingBefore !== null) {
    css["padding-top"] = `${merged.spacingBefore}px`;
  }
  if (merged.spacingAfter !== undefined && merged.spacingAfter !== null) {
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
  if (textIndent !== 0) {
    css["text-indent"] = `${textIndent}px`;
  }
  if (merged.indentRight !== undefined && merged.indentRight !== null) {
    css["padding-right"] = `${merged.indentRight}px`;
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

function getParagraphRenderStyle(
  paragraph: Editor2ParagraphNode,
  state: Editor2State,
): Record<string, string> | undefined {
  const css = paragraphStyleToCss(paragraph.style, state.document.styles) ?? {};
  if (paragraph.list) {
    css["--list-level"] = String(Math.max(0, paragraph.list.level ?? 0));
    css["margin-left"] = `${Math.max(0, paragraph.list.level ?? 0) * 28}px`;
  }

  return Object.keys(css).length > 0 ? css : undefined;
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
  paragraphs: Editor2ParagraphNode[],
): Map<string, string> {
  const markers = new Map<string, string>();
  let orderedCounters: number[] = [];
  let previousList: Editor2ParagraphListStyle | undefined;

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
      markers.set(paragraph.id, "\u2022");
      continue;
    }

    if (previousList?.kind !== "ordered") {
      orderedCounters = [];
    }

    // Handle startAt
    if (
      list.startAt !== undefined &&
      (orderedCounters[level] === undefined || previousList?.level !== level)
    ) {
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
  style: Editor2TextStyle | undefined,
  styles: Record<string, Editor2NamedStyle> | undefined,
): Record<string, string> | undefined {
  const merged = resolveEffectiveTextStyle(style, styles);

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
  tabs: Editor2TabStop[] | undefined | null,
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
  paragraph: Editor2ParagraphNode,
  paragraphIndex: number,
  listMarker: string | null,
  layout: Editor2LayoutParagraph | undefined,
  blockId: string,
  state: Editor2State,
  onParagraphMouseDown: EditorSurfaceProps["onParagraphMouseDown"],
  onImageMouseDown: EditorSurfaceProps["onImageMouseDown"],
  onImageResizeHandleMouseDown: EditorSurfaceProps["onImageResizeHandleMouseDown"],
  onRevisionMouseEnter: EditorSurfaceProps["onRevisionMouseEnter"],
  onRevisionMouseLeave: EditorSurfaceProps["onRevisionMouseLeave"],
  options?: {
    domParagraphId?: string;
    interactive?: boolean;
    testId?: string;
  },
) {
  const paragraphLayout = layout ?? projectParagraphLayout(paragraph);
  const chars = paragraphLayout.fragments.flatMap((fragment) => fragment.chars);
  const normalized = () => normalizeSelection(state);
  const isContinuation = (paragraphLayout.startOffset ?? 0) > 0;
  const domParagraphId = options?.domParagraphId ?? paragraph.id;
  const interactive = options?.interactive ?? true;
  const testId = options?.testId ?? "editor-2-block";
  const isEmptyBlockSelected = () => {
    const current = normalized();
    return (
      !current.isCollapsed &&
      getParagraphText(paragraph).length === 0 &&
      paragraphIndex >= current.startIndex &&
      paragraphIndex <= current.endIndex
    );
  };
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

  return (
    <p
      class="oasis-editor-2-block"
      classList={{ "oasis-editor-2-block-list": Boolean(paragraph.list) }}
      data-block-id={blockId}
      data-paragraph-id={domParagraphId}
      data-source-paragraph-id={paragraph.id}
      data-start-offset={paragraphLayout.startOffset ?? 0}
      data-end-offset={paragraphLayout.endOffset ?? chars.length}
      data-testid={testId}
      style={getParagraphRenderStyle(paragraph, state)}
      onMouseDown={
        interactive
          ? (event) => onParagraphMouseDown(paragraph.id, event)
          : undefined
      }
    >
      <Show when={paragraph.list}>
        <span
          class="oasis-editor-2-list-marker"
          data-testid="editor-2-list-marker"
        >
          {isContinuation ? "" : listMarker}
        </span>
      </Show>
      <Show
        when={chars.length > 0}
        fallback={
          <span
            classList={{
              "oasis-editor-2-empty-char": true,
              "oasis-editor-2-empty-char-selected": isEmptyBlockSelected(),
            }}
            data-empty-block="true"
            data-testid="editor-2-empty-char"
          >
            {"\u00A0"}
          </span>
        }
      >
        <For each={paragraphLayout.lines}>
          {(line) => (
            <div class="oasis-editor-2-line" data-testid="editor-2-line">
              <For each={line.fragments}>
                {(fragment) => {
                  const runContent = (
                    <span
                      class="oasis-editor-2-run"
                      classList={{
                        "oasis-editor-2-revision-insert":
                          fragment.revision?.type === "insert",
                        "oasis-editor-2-revision-delete":
                          fragment.revision?.type === "delete",
                      }}
                      data-run-id={fragment.runId}
                      data-testid="editor-2-run"
                      style={runStyleToCss(
                        fragment.styles,
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
                      <For each={fragment.chars}>
                        {(char) =>
                          (() => {
                            const imageSelected = () =>
                              Boolean(fragment.image) &&
                              isCharSelected(char.paragraphOffset);
                            const slot = () =>
                              line.slots.find(
                                (s) => s.offset === char.paragraphOffset,
                              );
                            const tabWidth = () => {
                              if (char.char !== "\t") return 0;
                              const currentX = slot()?.left ?? 0;
                              const nextTabPos = resolveNextTabStop(
                                currentX,
                                effectiveTabs(),
                              );
                              return Math.max(0, nextTabPos - currentX);
                            };

                            return (
                              <span
                                classList={{
                                  "oasis-editor-2-char": true,
                                  "oasis-editor-2-char-selected":
                                    isCharSelected(char.paragraphOffset),
                                  "oasis-editor-2-image-char": Boolean(
                                    fragment.image,
                                  ),
                                  "oasis-editor-2-tab-char": char.char === "\t",
                                }}
                                data-char-index={char.paragraphOffset}
                                data-run-id={fragment.runId}
                                data-run-offset={char.runOffset}
                                data-testid="editor-2-char"
                                style={
                                  char.char === "\t"
                                    ? {
                                        display: "inline-block",
                                        width: `${tabWidth()}pt`,
                                        overflow: "hidden",
                                        "white-space": "pre",
                                      }
                                    : undefined
                                }
                              >
                                {fragment.image ? (
                                  <span
                                    classList={{
                                      "oasis-editor-2-image-inline": true,
                                      "oasis-editor-2-image-inline-selected":
                                        imageSelected(),
                                    }}
                                    onMouseDown={
                                      interactive
                                        ? (event) =>
                                            onImageMouseDown(
                                              paragraph.id,
                                              char.paragraphOffset,
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
                                      src={fragment.image.src}
                                      width={fragment.image.width}
                                      height={fragment.image.height}
                                      alt={fragment.image.alt ?? ""}
                                      class="oasis-editor-2-image"
                                      style={{
                                        width: `${fragment.image.width}px`,
                                        height: `${fragment.image.height}px`,
                                      }}
                                      classList={{
                                        "oasis-editor-2-image-selected":
                                          imageSelected(),
                                      }}
                                      data-testid="editor-2-image"
                                    />
                                    <Show when={imageSelected()}>
                                      <button
                                        type="button"
                                        aria-label="Resize image"
                                        class="oasis-editor-2-image-resize-handle"
                                        data-testid="editor-2-image-resize-handle"
                                        onMouseDown={
                                          interactive
                                            ? (event) =>
                                                onImageResizeHandleMouseDown(
                                                  paragraph.id,
                                                  char.paragraphOffset,
                                                  event,
                                                )
                                            : undefined
                                        }
                                      />
                                    </Show>
                                  </span>
                                ) : char.char === "\t" ? (
                                  "\u00A0"
                                ) : (
                                  char.char
                                )}
                              </span>
                            );
                          })()
                        }
                      </For>
                    </span>
                  );

                  return fragment.styles?.link ? (
                    <a
                      class="oasis-editor-2-link"
                      data-testid="editor-2-link"
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
          )}
        </For>
        <Show when={getParagraphText(paragraph).endsWith("\n")}>
          <span
            class="oasis-editor-2-char oasis-editor-2-char-phantom"
            data-char-index={getParagraphText(paragraph).length}
            data-testid="editor-2-char-phantom"
          >
            {"\u200B"}
          </span>
        </Show>
      </Show>
    </p>
  );
}

function formatDimension(dim?: number | string): string | undefined {
  if (dim === undefined) return undefined;
  if (typeof dim === "number") return `${dim}pt`;
  return dim;
}

function renderTable(
  table: Editor2TableNode,
  blockId: string,
  paragraphIndexById: Map<string, number>,
  listMarkers: Map<string, string>,
  state: Editor2State,
  onParagraphMouseDown: EditorSurfaceProps["onParagraphMouseDown"],
  onImageMouseDown: EditorSurfaceProps["onImageMouseDown"],
  onImageResizeHandleMouseDown: EditorSurfaceProps["onImageResizeHandleMouseDown"],
  onRevisionMouseEnter: EditorSurfaceProps["onRevisionMouseEnter"],
  onRevisionMouseLeave: EditorSurfaceProps["onRevisionMouseLeave"],
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
      class="oasis-editor-2-table-block"
      classList={{ "oasis-editor-2-table-block-segment": Boolean(segment) }}
      data-block-id={blockId}
      data-source-block-id={table.id}
      data-testid="editor-2-table"
    >
      <table
        class="oasis-editor-2-table-grid"
        data-testid="editor-2-table-grid"
        style={getTableStyle()}
      >
        <tbody>
          <For each={renderedRows}>
            {(renderedRow) => (
              <tr
                class="oasis-editor-2-table-row"
                classList={{
                  "oasis-editor-2-table-row-repeated-header":
                    renderedRow.repeated,
                }}
                data-testid="editor-2-table-row"
                data-row-index={renderedRow.sourceRowIndex}
                data-repeated-header={renderedRow.repeated ? "true" : undefined}
              >
                <For each={renderedRow.row.cells}>
                  {(cell, cellIndex) =>
                    cell.vMerge === "continue" ? null : (
                      <td
                        class="oasis-editor-2-table-cell"
                        colSpan={cell.colSpan ?? 1}
                        rowSpan={cell.rowSpan ?? 1}
                        data-testid="editor-2-table-cell"
                        data-row-index={renderedRow.sourceRowIndex}
                        data-cell-index={cellIndex()}
                        style={{
                          "background-color": cell.style?.shading,
                          "vertical-align": cell.style?.verticalAlign,
                          "text-align": cell.style?.horizontalAlign,
                          width: formatDimension(cell.style?.width),
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
                              onParagraphMouseDown,
                              onImageMouseDown,
                              onImageResizeHandleMouseDown,
                              onRevisionMouseEnter,
                              onRevisionMouseLeave,
                              renderedRow.repeated
                                ? {
                                    domParagraphId: `${paragraph.id}:repeat:${blockId}:${renderedRow.repeatedIndex}:${paragraphIndex()}`,
                                    interactive: false,
                                  }
                                : undefined,
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

export function EditorSurface(props: EditorSurfaceProps) {
  const paragraphs = () => getParagraphs(props.state());
  const activeZone = () => props.state().activeZone ?? "main";
  const paragraphIndexById = () =>
    new Map(
      paragraphs().map((paragraph, index) => [paragraph.id, index] as const),
    );
  const listMarkers = () => buildParagraphListMarkers(paragraphs());
  const documentLayout = () =>
    projectDocumentLayout(
      props.state().document,
      undefined,
      props.measuredBlockHeights?.(),
      props.measuredParagraphLayouts?.(),
    );

  return (
    <div class="oasis-editor-2-paper-stack">
      <For each={documentLayout().pages}>
        {(page) => {
          const pageSettings = page.pageSettings;
          const contentWidth = getPageContentWidth(pageSettings);
          const contentHeight = getPageContentHeight(pageSettings);

          return (
            <div
              class="oasis-editor-2-paper"
              classList={{
                "oasis-editor-2-paper-landscape":
                  pageSettings.orientation === "landscape",
              }}
              data-testid="editor-2-page"
              style={{
                width: `${pageSettings.width}px`,
                "min-height": `${pageSettings.height}px`,
              }}
            >
              <div
                class="oasis-editor-2-page-header-zone"
                classList={{
                  "oasis-editor-2-zone-active": activeZone() === "header",
                  "oasis-editor-2-zone-dimmed": activeZone() !== "header",
                }}
                data-testid="editor-2-page-header-zone"
                style={{
                  left: `${pageSettings.margins.left + pageSettings.margins.gutter}px`,
                  top: "0px",
                  width: `${contentWidth}px`,
                  height: `${pageSettings.margins.top}px`,
                }}
                onMouseDown={props.onSurfaceMouseDown}
                onDblClick={props.onSurfaceDblClick}
              >
                <div
                  class="oasis-editor-2-page-header-guide"
                  style={{
                    top: `${pageSettings.margins.header}px`,
                  }}
                />
                <For each={page.headerBlocks}>
                  {(block) => {
                    return block.sourceBlock.type === "paragraph"
                      ? renderParagraph(
                          block.sourceBlock,
                          paragraphIndexById().get(block.sourceBlock.id) ?? 0,
                          listMarkers().get(block.sourceBlock.id) ?? null,
                          block.layout,
                          block.blockId,
                          props.state(),
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          { testId: "editor-2-header-block" },
                        )
                      : renderTable(
                          block.sourceBlock,
                          block.blockId,
                          paragraphIndexById(),
                          listMarkers(),
                          props.state(),
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          block.tableSegment,
                        );
                  }}
                </For>
              </div>
              <div
                class="oasis-editor-2-surface"
                data-testid="editor-2-surface"
                style={{
                  width: `${contentWidth}px`,
                  "min-height": `${contentHeight}px`,
                  "margin-top": `${pageSettings.margins.top}px`,
                  "margin-right": `${pageSettings.margins.right}px`,
                  "margin-bottom": `${pageSettings.margins.bottom}px`,
                  "margin-left": `${pageSettings.margins.left + pageSettings.margins.gutter}px`,
                }}
                onMouseDown={props.onSurfaceMouseDown}
                onDblClick={props.onSurfaceDblClick}
              >
                <For each={page.blocks}>
                  {(block) => {
                    return block.sourceBlock.type === "paragraph"
                      ? renderParagraph(
                          block.sourceBlock,
                          paragraphIndexById().get(block.sourceBlock.id) ?? 0,
                          listMarkers().get(block.sourceBlock.id) ?? null,
                          block.layout,
                          block.blockId,
                          props.state(),
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                        )
                      : renderTable(
                          block.sourceBlock,
                          block.blockId,
                          paragraphIndexById(),
                          listMarkers(),
                          props.state(),
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          block.tableSegment,
                        );
                  }}
                </For>
              </div>
              <div
                class="oasis-editor-2-page-footer-zone"
                classList={{
                  "oasis-editor-2-zone-active": activeZone() === "footer",
                  "oasis-editor-2-zone-dimmed": activeZone() !== "footer",
                }}
                data-testid="editor-2-page-footer-zone"
                style={{
                  left: `${pageSettings.margins.left + pageSettings.margins.gutter}px`,
                  bottom: "0px",
                  width: `${contentWidth}px`,
                  height: `${pageSettings.margins.bottom}px`,
                }}
                onMouseDown={props.onSurfaceMouseDown}
                onDblClick={props.onSurfaceDblClick}
              >
                <div
                  class="oasis-editor-2-page-footer-guide"
                  style={{
                    bottom: `${pageSettings.margins.footer}px`,
                  }}
                />
                <For each={page.footerBlocks}>
                  {(block) => {
                    return block.sourceBlock.type === "paragraph"
                      ? renderParagraph(
                          block.sourceBlock,
                          paragraphIndexById().get(block.sourceBlock.id) ?? 0,
                          listMarkers().get(block.sourceBlock.id) ?? null,
                          block.layout,
                          block.blockId,
                          props.state(),
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          { testId: "editor-2-footer-block" },
                        )
                      : renderTable(
                          block.sourceBlock,
                          block.blockId,
                          paragraphIndexById(),
                          listMarkers(),
                          props.state(),
                          props.onParagraphMouseDown,
                          props.onImageMouseDown,
                          props.onImageResizeHandleMouseDown,
                          props.onRevisionMouseEnter,
                          props.onRevisionMouseLeave,
                          block.tableSegment,
                        );
                  }}
                </For>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
