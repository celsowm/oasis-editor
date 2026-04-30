import { For, Show } from "solid-js";
import type { Accessor } from "solid-js";
import {
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

function getParagraphListMarker(
  list: Editor2ParagraphListStyle | undefined,
  paragraphIndex: number,
): string | null {
  if (!list) {
    return null;
  }

  if (list.kind === "bullet") {
    return "\u2022";
  }

  return `${paragraphIndex + 1}.`;
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
  state: Editor2State,
  onParagraphMouseDown: EditorSurfaceProps["onParagraphMouseDown"],
  onImageMouseDown: EditorSurfaceProps["onImageMouseDown"],
  onImageResizeHandleMouseDown: EditorSurfaceProps["onImageResizeHandleMouseDown"],
) {
  const layout = projectParagraphLayout(paragraph);
  const chars = layout.fragments.flatMap((fragment) => fragment.chars);
  const normalized = () => normalizeSelection(state);
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
      data-block-id={paragraph.id}
      data-paragraph-id={paragraph.id}
      data-testid="editor-2-block"
      style={paragraphStyleToCss(paragraph.style)}
      onMouseDown={(event) => onParagraphMouseDown(paragraph.id, event)}
    >
      <Show when={paragraph.list}>
        <span class="oasis-editor-2-list-marker" data-testid="editor-2-list-marker">
          {getParagraphListMarker(paragraph.list, paragraphIndex)}
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
        <For each={layout.fragments}>
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
                                class="oasis-editor-2-image"
                                style={{
                                  width: `${fragment.image.width}px`,
                                  height: `${fragment.image.height}px`,
                                }}
                                classList={{
                                  "oasis-editor-2-image-selected": imageSelected(),
                                }}
                                data-testid="editor-2-image"
                                onMouseDown={(event) =>
                                  onImageMouseDown(paragraph.id, char.paragraphOffset, event)
                                }
                              />
                              <Show when={imageSelected()}>
                                <button
                                  type="button"
                                  aria-label="Resize image"
                                  class="oasis-editor-2-image-resize-handle"
                                  data-testid="editor-2-image-resize-handle"
                                  onMouseDown={(event) =>
                                    onImageResizeHandleMouseDown(paragraph.id, char.paragraphOffset, event)
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
      </Show>
    </p>
  );
}

function renderTable(
  table: Editor2TableNode,
  paragraphIndexById: Map<string, number>,
  state: Editor2State,
  onParagraphMouseDown: EditorSurfaceProps["onParagraphMouseDown"],
  onImageMouseDown: EditorSurfaceProps["onImageMouseDown"],
  onImageResizeHandleMouseDown: EditorSurfaceProps["onImageResizeHandleMouseDown"],
) {
  return (
    <div class="oasis-editor-2-table-block" data-block-id={table.id} data-testid="editor-2-table">
      <table class="oasis-editor-2-table-grid" data-testid="editor-2-table-grid">
        <tbody>
          <For each={table.rows}>
            {(row, rowIndex) => (
              <tr class="oasis-editor-2-table-row" data-testid="editor-2-table-row" data-row-index={rowIndex()}>
                <For each={row.cells}>
                  {(cell, cellIndex) => (
                    cell.vMerge === "continue" ? null : (
                      <td
                        class="oasis-editor-2-table-cell"
                        colSpan={cell.colSpan ?? 1}
                        rowSpan={cell.rowSpan ?? 1}
                        data-testid="editor-2-table-cell"
                        data-row-index={rowIndex()}
                        data-cell-index={cellIndex()}
                      >
                        <For each={cell.blocks}>
                          {(paragraph) =>
                            renderParagraph(
                              paragraph,
                              paragraphIndexById.get(paragraph.id) ?? 0,
                              state,
                              onParagraphMouseDown,
                              onImageMouseDown,
                              onImageResizeHandleMouseDown,
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
  const paragraphIndexById = () =>
    new Map(paragraphs().map((paragraph, index) => [paragraph.id, index] as const));
  const documentLayout = () =>
    projectDocumentLayout(props.state().document.blocks, undefined, props.measuredBlockHeights?.());

  return (
    <div class="oasis-editor-2-paper-stack">
      <For each={documentLayout().pages}>
        {(page) => (
          <div class="oasis-editor-2-paper" data-testid="editor-2-page">
            <div
              class="oasis-editor-2-surface"
              data-testid="editor-2-surface"
              onMouseDown={props.onSurfaceMouseDown}
            >
              <For each={page.blocks}>
                {(block) => {
                  return block.sourceBlock.type === "paragraph"
                    ? renderParagraph(
                        block.sourceBlock,
                        paragraphIndexById().get(block.sourceBlock.id) ?? 0,
                        props.state(),
                        props.onParagraphMouseDown,
                        props.onImageMouseDown,
                        props.onImageResizeHandleMouseDown,
                      )
                    : renderTable(
                        block.sourceBlock,
                        paragraphIndexById(),
                        props.state(),
                        props.onParagraphMouseDown,
                        props.onImageMouseDown,
                        props.onImageResizeHandleMouseDown,
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
