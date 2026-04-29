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
  }
  if (style.highlight) {
    css["background-color"] = style.highlight;
  }

  return Object.keys(css).length > 0 ? css : undefined;
}

function renderParagraph(
  paragraph: Editor2ParagraphNode,
  paragraphIndex: number,
  state: Editor2State,
  onParagraphMouseDown: EditorSurfaceProps["onParagraphMouseDown"],
) {
  const layout = projectParagraphLayout(paragraph);
  const chars = layout.fragments.flatMap((fragment) => fragment.chars);
  const normalized = normalizeSelection(state);
  const isEmptyBlockSelected =
    !normalized.isCollapsed &&
    getParagraphText(paragraph).length === 0 &&
    paragraphIndex >= normalized.startIndex &&
    paragraphIndex <= normalized.endIndex;
  const isCharSelected = (charIndex: number) => {
    if (normalized.isCollapsed) {
      return false;
    }

    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return false;
    }

    if (normalized.startIndex === normalized.endIndex) {
      return charIndex >= normalized.startParagraphOffset && charIndex < normalized.endParagraphOffset;
    }

    if (paragraphIndex === normalized.startIndex) {
      return charIndex >= normalized.startParagraphOffset;
    }

    if (paragraphIndex === normalized.endIndex) {
      return charIndex < normalized.endParagraphOffset;
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
              "oasis-editor-2-empty-char-selected": isEmptyBlockSelected,
            }}
            data-empty-block="true"
            data-testid="editor-2-empty-char"
          >
            {"\u00A0"}
          </span>
        }
      >
        <For each={layout.fragments}>
          {(fragment) => (
            <span
              class="oasis-editor-2-run"
              data-run-id={fragment.runId}
              data-testid="editor-2-run"
              style={runStyleToCss(fragment.styles)}
            >
              <For each={fragment.chars}>
                {(char) => (
                  <span
                    classList={{
                      "oasis-editor-2-char": true,
                      "oasis-editor-2-char-selected": isCharSelected(char.paragraphOffset),
                    }}
                    data-char-index={char.paragraphOffset}
                    data-run-id={fragment.runId}
                    data-run-offset={char.runOffset}
                    data-testid="editor-2-char"
                  >
                    {fragment.image ? (
                      <img 
                        src={fragment.image.src} 
                        width={fragment.image.width} 
                        height={fragment.image.height} 
                        class="oasis-editor-2-image" 
                      />
                    ) : (
                      char.char
                    )}
                  </span>
                )}
              </For>
            </span>
          )}
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
) {
  return (
    <div class="oasis-editor-2-table-block" data-block-id={table.id} data-testid="editor-2-table">
      <table class="oasis-editor-2-table-grid" data-testid="editor-2-table-grid">
        <tbody>
          <For each={table.rows}>
            {(row) => (
              <tr class="oasis-editor-2-table-row" data-testid="editor-2-table-row">
                <For each={row.cells}>
                  {(cell) => (
                    <td class="oasis-editor-2-table-cell" data-testid="editor-2-table-cell">
                      <For each={cell.blocks}>
                        {(paragraph) =>
                          renderParagraph(
                            paragraph,
                            paragraphIndexById.get(paragraph.id) ?? 0,
                            state,
                            onParagraphMouseDown,
                          )}
                      </For>
                    </td>
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
                      )
                    : renderTable(
                        block.sourceBlock,
                        paragraphIndexById(),
                        props.state(),
                        props.onParagraphMouseDown,
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
