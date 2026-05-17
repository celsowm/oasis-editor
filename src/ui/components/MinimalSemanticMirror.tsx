import { For, createMemo, Show } from "solid-js";
import {
  type EditorLayoutBlock,
  type EditorLayoutPage,
  type EditorTextStyle,
  getPageBodyTop,
  getPageHeaderZoneTop,
  getPageBodyBottom,
  getPageFooterZoneTop,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";

interface ParagraphRunStub {
  text: string;
  styles?: EditorTextStyle;
}

interface ParagraphStub {
  key: string;
  paragraphId: string;
  blockId: string;
  top: number;
  height: number;
  left: number;
  width: number;
  runs: ParagraphRunStub[];
  paragraphStyleId?: string;
}

interface TableStub {
  key: string;
  blockId: string;
  top: number;
  height: number;
  left: number;
  width: number;
  rows: TableRowStub[];
}

interface TableRowStub {
  cells: TableCellStub[];
}

interface TableCellStub {
  shading?: string;
  blocks: (ParagraphStub | TableStub)[];
}

interface PageStubs {
  header: (ParagraphStub | TableStub)[];
  body: (ParagraphStub | TableStub)[];
  footer: (ParagraphStub | TableStub)[];
}

/**
 * Lightweight semantic compatibility layer for the canvas engine.
 *
 * Renders absolutely-positioned divs per line so the word-parity tests,
 * accessibility tools, and pointer-event systems can interact with the
 * document structure as if it were DOM-based.
 */
export interface MinimalSemanticPageMirrorProps {
  page: EditorLayoutPage;
}

export function MinimalSemanticPageMirror(props: MinimalSemanticPageMirrorProps) {
  const stubs = createMemo(() => collectPageStubs(props.page));

  const bodyTop = () => props.page.bodyTop ?? getPageBodyTop(props.page.pageSettings);
  const footerTop = () => props.page.footerTop ?? props.page.bodyBottom ?? getPageBodyBottom(props.page.pageSettings);

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
      <div
        data-testid="editor-page-header-zone"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${bodyTop()}px`,
        }}
      >
        <For each={stubs().header}>
          {(stub) => <BlockStubView stub={stub} />}
        </For>
      </div>

      <div
        data-testid="editor-surface"
        style={{
          position: "absolute",
          top: `${bodyTop()}px`,
          left: 0,
          right: 0,
          height: `${footerTop() - bodyTop()}px`,
          "margin-top": `${bodyTop()}px`, // Mirror legacy layout-engine expectation
        }}
      >
        <For each={stubs().body}>
          {(stub) => <BlockStubView stub={stub} offsetTop={-bodyTop()} />}
        </For>
      </div>

      <Show when={props.page.bodyBottom !== undefined}>
        <div
          data-testid="editor-page-footer-zone"
          style={{
            position: "absolute",
            top: `${footerTop()}px`,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <For each={stubs().footer}>
            {(stub) => <BlockStubView stub={stub} offsetTop={-footerTop()} />}
          </For>
        </div>
      </Show>
    </div>
  );
}

function BlockStubView(props: { stub: ParagraphStub | TableStub; offsetTop?: number }) {
  if ("rows" in props.stub) {
    return <TableStubView stub={props.stub} offsetTop={props.offsetTop} />;
  }
  return <ParagraphStubView stub={props.stub} offsetTop={props.offsetTop} />;
}

function ParagraphStubView(props: { stub: ParagraphStub; offsetTop?: number }) {
  return (
    <div
      data-paragraph-id={props.stub.paragraphId}
      data-source-paragraph-id={props.stub.paragraphId}
      data-block-id={props.stub.blockId}
      data-testid="editor-line"
      style={{
        position: "absolute",
        left: `${props.stub.left}px`,
        top: `${props.stub.top + (props.offsetTop ?? 0)}px`,
        width: "auto", // Let text define width for parity tests
        height: `${props.stub.height}px`,
        "white-space": "pre",
      }}
    >
      <For each={props.stub.runs}>
        {(run) => (
          <span
            data-testid="editor-run"
            style={{
              "font-family": run.styles?.fontFamily ?? "Calibri",
              "font-size": `${run.styles?.fontSize ?? 15}px`,
              "font-weight": run.styles?.bold ? "bold" : "normal",
              "font-style": run.styles?.italic ? "italic" : "normal",
            }}
          >
            {run.text}
          </span>
        )}
      </For>
    </div>
  );
}

function TableStubView(props: { stub: TableStub; offsetTop?: number }) {
  return (
    <div
      data-testid="editor-table"
      style={{
        position: "absolute",
        left: `${props.stub.left}px`,
        top: `${props.stub.top + (props.offsetTop ?? 0)}px`,
        width: `${props.stub.width}px`,
        height: `${props.stub.height}px`,
        display: "table",
      }}
    >
      <For each={props.stub.rows}>
        {(row) => (
          <div data-testid="editor-table-row" style={{ display: "table-row" }}>
            <For each={row.cells}>
              {(cell) => (
                <div
                  data-testid="editor-table-cell"
                  style={{
                    display: "table-cell",
                    background: cell.shading ?? "transparent",
                  }}
                >
                  <For each={cell.blocks}>
                    {(block) => <BlockStubView stub={block} offsetTop={-props.stub.top} />}
                  </For>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
}

function collectPageStubs(page: EditorLayoutPage): PageStubs {
  const bodyTop = page.bodyTop ?? getPageBodyTop(page.pageSettings);
  const headerTop = page.headerTop ?? getPageHeaderZoneTop(page.pageSettings);
  const footerTop = page.footerTop ?? page.bodyBottom ?? getPageBodyBottom(page.pageSettings);
  const marginX =
    page.pageSettings.margins.left + page.pageSettings.margins.gutter;

  const header: (ParagraphStub | TableStub)[] = [];
  const body: (ParagraphStub | TableStub)[] = [];
  const footer: (ParagraphStub | TableStub)[] = [];

  appendBlockStubs(page.headerBlocks ?? [], header, marginX, headerTop, page);
  appendBlockStubs(page.blocks, body, marginX, bodyTop, page);
  if (page.bodyBottom !== undefined) {
    appendBlockStubs(
      page.footerBlocks ?? [],
      footer,
      marginX,
      footerTop,
      page,
    );
  }

  return { header, body, footer };
}

function appendBlockStubs(
  blocks: EditorLayoutBlock[],
  out: (ParagraphStub | TableStub)[],
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
    const paragraphId = block.paragraphId ?? block.sourceBlock.id;

    if (block.sourceBlock.type === "paragraph" && block.layout) {
      for (let i = 0; i < block.layout.lines.length; i++) {
        const line = block.layout.lines[i]!;
        out.push({
          key: `${page.id}:${blockId}:L${i}`,
          paragraphId,
          blockId,
          top: cursorY + line.top,
          left: originX,
          width: Math.max(1, bodyWidth),
          height: Math.max(1, line.height),
          runs: line.fragments.map((f) => ({
            text: f.text,
            styles: f.styles,
          })),
          paragraphStyleId: block.sourceBlock.style?.styleId,
        });
      }
    } else if (block.sourceBlock.type === "table") {
      // Basic table stubbing for parity tests
      out.push({
        key: `${page.id}:${blockId}`,
        blockId,
        top: cursorY,
        left: originX,
        width: bodyWidth,
        height: block.estimatedHeight,
        rows: block.sourceBlock.rows.map((row) => ({
          cells: row.cells.map((cell) => ({
            shading: cell.style?.shading,
            blocks: [], // Nested blocks would need complex layout projection here
          })),
        })),
      });
    }
    cursorY += Math.max(0, block.estimatedHeight);
  }
}
