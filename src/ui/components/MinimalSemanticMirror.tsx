import { For, createMemo } from "solid-js";
import {
  type EditorLayoutBlock,
  type EditorLayoutPage,
  getPageBodyTop,
} from "../../core/model.js";

interface ParagraphStub {
  key: string;
  paragraphId: string;
  blockId: string;
  top: number;
  height: number;
  left: number;
  width: number;
}

/**
 * Lightweight semantic compatibility layer for the canvas engine.
 *
 * Renders one absolutely-positioned, empty <div> per paragraph/block so the
 * existing features that still query DOM nodes (outline panel, "scroll to
 * paragraph" actions, table drag targeting, useEditorLayout block scoping)
 * keep working without forcing a full DOMEditorSurface reconciliation on every
 * keystroke. The canvas itself remains the visual source of truth.
 *
 * Mount this *inside* each canvas page wrapper so positions are relative to
 * the page and we don't need to compute cumulative page tops.
 */
export interface MinimalSemanticPageMirrorProps {
  page: EditorLayoutPage;
}

export function MinimalSemanticPageMirror(props: MinimalSemanticPageMirrorProps) {
  const stubs = createMemo(() => collectPageStubs(props.page));

  return (
    <div
      class="oasis-editor-semantic-dom-mirror"
      data-semantic-mirror="true"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: "0",
        opacity: 0,
        "pointer-events": "none",
        "z-index": 0,
        overflow: "hidden",
      }}
    >
      <For each={stubs()}>
        {(stub) => (
          <div
            data-paragraph-id={stub.paragraphId}
            data-source-paragraph-id={stub.paragraphId}
            data-block-id={stub.blockId}
            style={{
              position: "absolute",
              left: `${stub.left}px`,
              top: `${stub.top}px`,
              width: `${stub.width}px`,
              height: `${stub.height}px`,
            }}
          />
        )}
      </For>
    </div>
  );
}

function collectPageStubs(page: EditorLayoutPage): ParagraphStub[] {
  const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
  const marginX =
    page.pageSettings.margins.left + page.pageSettings.margins.gutter;
  const stubs: ParagraphStub[] = [];

  appendBlockStubs(page.headerBlocks ?? [], stubs, marginX, 0, page);
  appendBlockStubs(page.blocks, stubs, marginX, bodyTop, page);
  if (page.bodyBottom !== undefined) {
    appendBlockStubs(
      page.footerBlocks ?? [],
      stubs,
      marginX,
      page.bodyBottom,
      page,
    );
  }

  return stubs;
}

function appendBlockStubs(
  blocks: EditorLayoutBlock[],
  out: ParagraphStub[],
  originX: number,
  originY: number,
  page: EditorLayoutPage,
) {
  const bodyWidth =
    page.pageSettings.width -
    page.pageSettings.margins.left -
    page.pageSettings.margins.right -
    page.pageSettings.margins.gutter;
  let cursorY = originY;
  for (const block of blocks) {
    const blockId = block.blockId;
    if (block.sourceBlock.type === "paragraph") {
      const paragraphId = block.paragraphId ?? block.sourceBlock.id;
      out.push({
        key: `${page.id}:${blockId}`,
        paragraphId,
        blockId,
        top: cursorY,
        left: originX,
        width: Math.max(1, bodyWidth),
        height: Math.max(1, block.estimatedHeight),
      });
    } else if (block.sourceBlock.type === "table") {
      out.push({
        key: `${page.id}:${blockId}`,
        paragraphId: block.sourceBlock.id,
        blockId,
        top: cursorY,
        left: originX,
        width: Math.max(1, bodyWidth),
        height: Math.max(1, block.estimatedHeight),
      });
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
}
