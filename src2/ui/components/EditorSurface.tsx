import { For, Show } from "solid-js";
import type { Accessor } from "solid-js";
import {
  getDocumentPageSettings,
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
} from "../../core/model.js";
import { normalizeSelection } from "../../core/selection.js";
import { projectDocumentLayout, projectParagraphLayout } from "../layoutProjection.js";

interface EditorSurfaceProps {
  state: Accessor<Editor2State>;
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, Editor2LayoutParagraph>>;
  onSurfaceMouseDown: (event: MouseEvent) => void;
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
}

function paragraphStyleToCss(style?: Editor2ParagraphStyle): Record<string, string> | undefined {
  if (!style) {
    return undefined;
  }

  const css: Record<string, string> = {};

  if (style.align) {
    css["text-align"] = style.align;
  }
  if (style.lineHeight !== undefined && style.lineHeight !== null) {
    css["line-height"] = `${style.lineHeight}`;
  }
  if (style.spacingBefore !== undefined && style.spacingBefore !== null) {
    css["padding-top"] = `${style.spacingBefore}px`;
  }
  if (style.spacingAfter !== undefined && style.spacingAfter !== null) {
    css["padding-bottom"] = `${style.spacingAfter}px`;
  }
  if (style.indentLeft !== undefined && style.indentLeft !== null) {
    css["padding-left"] = `${style.indentLeft}px`;
  }
  if (style.indentRight !== undefined && style.indentRight !== null) {
    css["padding-right"] = `${style.indentRight}px`;
  }
  if (style.indentFirstLine !== undefined && style.indentFirstLine !== null) {
    css["text-indent"] = `${style.indentFirstLine}px`;
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

function getParagraphRenderStyle(
  paragraph: Editor2ParagraphNode,
): Record<string, string> | undefined {
  const css = paragraphStyleToCss(paragraph.style) ?? {};
  if (paragraph.list) {
    css["--list-level"] = String(Math.max(0, paragraph.list.level ?? 0));
    css["margin-left"] = `${Math.max(0, paragraph.list.level ?? 0) * 28}px`;
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

function buildParagraphListMarkers(paragraphs: Editor2ParagraphNode[]): Map<string, string> {
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

    if (list.kind === "bullet") {
      orderedCounters = [];
      previousList = list;
      markers.set(paragraph.id, "\u2022");
      continue;
    }

    const level = Math.max(0, list.level ?? 0);
    if (previousList?.kind !== "ordered") {
      orderedCounters = [];
    }
    orderedCounters = orderedCounters.slice(0, level + 1);
    orderedCounters[level] = (orderedCounters[level] ?? 0) + 1;
    markers.set(paragraph.id, `${orderedCounters[level]}.`);
    previousList = list;
  }

  return markers;
}

function runStyleToCss(style?: Editor2TextStyle): Record<string, string> | undefined {
  if (!style) {
    return undefined;
  }

  const css: Record<string, string> = {};
  const textDecorations: string[] = [];

  if (style.bold) {
    css["font-weight"] = "700";
  }
  if (style.italic) {
    css["font-style"] = "italic";
  }
  if (style.underline) {
    textDecorations.push("underline");
  }
  if (style.strike) {
    textDecorations.push("line-through");
  }
  if (textDecorations.length > 0) {
    css["text-decoration"] = textDecorations.join(" ");
  }
  if (style.superscript) {
    css["vertical-align"] = "super";
    css["font-size"] = "0.75em";
  } else if (style.subscript) {
    css["vertical-align"] = "sub";
    css["font-size"] = "0.75em";
  }
  if (style.fontFamily) {
    css["font-family"] = style.fontFamily;
  }
  if (style.fontSize !== undefined && style.fontSize !== null) {
    css["font-size"] = `${style.fontSize}px`;
  }
  if (style.color) {
    css.color = style.color;
  } else if (style.link) {
    css.color = "#1d4ed8";
  }
  if (style.highlight) {
    css["background-color"] = style.highlight;
  }
  if (style.link && !style.underline) {
    textDecorations.unshift("underline");
    css["text-decoration"] = textDecorations.join(" ");
  }

  return Object.keys(css).length > 0 ? css : undefined;
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
  options?: {
    domParagraphId?: string;
    interactive?: boolean;
  },
) {
  const paragraphLayout = layout ?? projectParagraphLayout(paragraph);
  const chars = paragraphLayout.fragments.flatMap((fragment) => fragment.chars);
  const normalized = () => normalizeSelection(state);
  const isContinuation = (paragraphLayout.startOffset ?? 0) > 0;
  const domParagraphId = options?.domParagraphId ?? paragraph.id;
  const interactive = options?.interactive ?? true;
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

    if (paragraphIndex < current.startIndex || paragraphIndex > current.endIndex) {
      return false;
    }

    if (current.startIndex === current.endIndex) {
      return charIndex >= current.startParagraphOffset && charIndex < current.endParagraphOffset;
    }

    if (paragraphIndex === current.startIndex) {
      return charIndex >= current.startParagraphOffset;
    }

    if (paragraphIndex === current.endIndex) {
      return charIndex < current.endParagraphOffset;
    }

    return true;
  };

  return (
    <p
      class="oasis-editor-2-block"
      classList={{ "oasis-editor-2-block-list": Boolean(paragraph.list) }}
      data-block-id={blockId}
      data-paragraph-id={domParagraphId}
      data-source-paragraph-id={paragraph.id}
      data-start-offset={paragraphLayout.startOffset ?? 0}
      data-end-offset={paragraphLayout.endOffset ?? chars.length}
      data-testid="editor-2-block"
      style={getParagraphRenderStyle(paragraph)}
      onMouseDown={interactive ? (event) => onParagraphMouseDown(paragraph.id, event) : undefined}
    >
      <Show when={paragraph.list}>
        <span class="oasis-editor-2-list-marker" data-testid="editor-2-list-marker">
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
                      data-run-id={fragment.runId}
                      data-testid="editor-2-run"
                      style={runStyleToCss(fragment.styles)}
                    >
                      <For each={fragment.chars}>
                        {(char) => (
                          (() => {
                            const imageSelected = () =>
                              Boolean(fragment.image) && isCharSelected(char.paragraphOffset);
                            return (
                              <span
                                classList={{
                                  "oasis-editor-2-char": true,
                                  "oasis-editor-2-char-selected": isCharSelected(char.paragraphOffset),
                                  "oasis-editor-2-image-char": Boolean(fragment.image),
                                }}
                                data-char-index={char.paragraphOffset}
                                data-run-id={fragment.runId}
                                data-run-offset={char.runOffset}
                                data-testid="editor-2-char"
                              >
                                {fragment.image ? (
                                  <span
                                    classList={{
                                      "oasis-editor-2-image-inline": true,
                                      "oasis-editor-2-image-inline-selected": imageSelected(),
                                    }}
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
                                        "oasis-editor-2-image-selected": imageSelected(),
                                      }}
                                      data-testid="editor-2-image"
                                      onMouseDown={
                                        interactive
                                          ? (event) => onImageMouseDown(paragraph.id, char.paragraphOffset, event)
                                          : undefined
                                      }
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
                                                onImageResizeHandleMouseDown(paragraph.id, char.paragraphOffset, event)
                                            : undefined
                                        }
                                      />
                                    </Show>
                                  </span>
                                ) : (
                                  char.char
                                )}
                              </span>
                            );
                          })()
                        )}
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
      </Show>
    </p>
  );
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
  segment?: {
    startRowIndex: number;
    endRowIndex: number;
    repeatedHeaderRowCount: number;
  },
) {
  const repeatedHeaderRows =
    segment && segment.repeatedHeaderRowCount > 0 ? table.rows.slice(0, segment.repeatedHeaderRowCount) : [];
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

  return (
    <div
      class="oasis-editor-2-table-block"
      classList={{ "oasis-editor-2-table-block-segment": Boolean(segment) }}
      data-block-id={blockId}
      data-source-block-id={table.id}
      data-testid="editor-2-table"
    >
      <table class="oasis-editor-2-table-grid" data-testid="editor-2-table-grid">
        <tbody>
          <For each={renderedRows}>
            {(renderedRow) => (
              <tr
                class="oasis-editor-2-table-row"
                classList={{ "oasis-editor-2-table-row-repeated-header": renderedRow.repeated }}
                data-testid="editor-2-table-row"
                data-row-index={renderedRow.sourceRowIndex}
                data-repeated-header={renderedRow.repeated ? "true" : undefined}
              >
                <For each={renderedRow.row.cells}>
                  {(cell, cellIndex) => (
                    cell.vMerge === "continue" ? null : (
                      <td
                        class="oasis-editor-2-table-cell"
                        colSpan={cell.colSpan ?? 1}
                        rowSpan={cell.rowSpan ?? 1}
                        data-testid="editor-2-table-cell"
                        data-row-index={renderedRow.sourceRowIndex}
                        data-cell-index={cellIndex()}
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
                              renderedRow.repeated
                                ? {
                                    domParagraphId: `${paragraph.id}:repeat:${blockId}:${renderedRow.repeatedIndex}:${paragraphIndex()}`,
                                    interactive: false,
                                  }
                                : undefined,
                            )}
                        </For>
                      </td>
                    )
                  )}
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
  const pageSettings = () => getDocumentPageSettings(props.state().document);
  const paragraphIndexById = () =>
    new Map(paragraphs().map((paragraph, index) => [paragraph.id, index] as const));
  const listMarkers = () => buildParagraphListMarkers(paragraphs());
  const documentLayout = () =>
    projectDocumentLayout(
      props.state().document.blocks,
      getPageContentHeight(pageSettings()),
      props.measuredBlockHeights?.(),
      props.measuredParagraphLayouts?.(),
    );

  return (
    <div class="oasis-editor-2-paper-stack">
      <For each={documentLayout().pages}>
        {(page) => (
          <div
            class="oasis-editor-2-paper"
            data-testid="editor-2-page"
            style={{
              width: `${pageSettings().width}px`,
              "min-height": `${pageSettings().height}px`,
            }}
          >
            <div
              class="oasis-editor-2-surface"
              data-testid="editor-2-surface"
              style={{
                "padding-top": `${pageSettings().margins.top}px`,
                "padding-right": `${pageSettings().margins.right}px`,
                "padding-bottom": `${pageSettings().margins.bottom}px`,
                "padding-left": `${pageSettings().margins.left + pageSettings().margins.gutter}px`,
              }}
              onMouseDown={props.onSurfaceMouseDown}
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
                        block.tableSegment,
                      );
                }}
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
