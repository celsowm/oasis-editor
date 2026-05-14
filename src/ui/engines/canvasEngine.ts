import { createEffect, For, createMemo, Index, Show } from "solid-js";
import type { IRenderingEngine, ITextMeasurer, TextMeasureOptions } from "../../core/engine.js";
import type { EditorSurfaceProps } from "../editorUiTypes.js";
import { 
  type EditorLayoutLine, 
  type EditorLayoutPage, 
  type EditorLayoutBlock,
  type EditorLayoutParagraph,
  type EditorLayoutFragment,
  type EditorState,
  resolveEffectiveTextStyleForParagraph,
  resolveImageSrc,
  getPageContentWidth,
  getPageBodyTop,
} from "../../core/model.js";
import { domTextMeasurer } from "../textMeasurement.js";
import { projectDocumentLayout } from "../layoutProjection.js";
import { PageBreak } from "../components/PageBreak.js";

/**
 * Word-specific metric adjustments.
 * Word/DirectWrite often have slightly different advances for specific character pairs
 * or certain fonts. These constants help bridge the gap between Canvas and Word.
 */
const WORD_METRIC_ADJUSTMENT = 1.0115; // Refined calibration factor
const WORD_SPACE_WIDTH_FACTOR = 1.02;  // Word spaces are often slightly wider

/**
 * CanvasTextMeasurer
 */
const canvasTextMeasurer: ITextMeasurer = {
  composeMeasuredParagraphLines(options: TextMeasureOptions): EditorLayoutLine[] {
    // 1. Run the base measurement logic (which uses Canvas 2D)
    const lines = domTextMeasurer.composeMeasuredParagraphLines(options);
    const { paragraph, styles, contentWidth } = options;
    const paragraphStyle = paragraph.style ? resolveEffectiveParagraphStyle(paragraph.style, styles) : {};
    
    const availableWidth = (contentWidth ?? 624) - (paragraphStyle.indentLeft ?? 0) - (paragraphStyle.indentRight ?? 0);

    // 2. Refine character metrics and apply Word-compatible justification
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineChars = line.fragments.flatMap(f => f.chars);
      if (lineChars.length === 0) continue;

      // Apply sub-pixel metric scaling to simulate Word's DirectWrite behavior
      // We update both the slots and the internal width records
      let currentX = line.slots[0]?.left ?? 0;
      for (let s = 0; s < line.slots.length; s++) {
        const slot = line.slots[s]!;
        const charInfo = lineChars.find(c => c.paragraphOffset === slot.offset);
        
        if (charInfo) {
          // Micro-adjustment for font-specific behavior
          const isSpace = charInfo.char === " ";
          const adjFactor = isSpace ? WORD_SPACE_WIDTH_FACTOR : WORD_METRIC_ADJUSTMENT;
          
          slot.left = currentX;
          currentX += charInfo.width * adjFactor;
        }
      }

      // 3. Justification Logic (DirectWrite style)
      const isLastLine = i === lines.length - 1;
      const endsWithNewline = line.fragments.some(f => f.text.endsWith("\n"));
      
      if (paragraphStyle.align === "justify" && !isLastLine && !endsWithNewline) {
        const spaces = lineChars.filter(c => c.char === " ");
        if (spaces.length > 0) {
          const lastChar = lineChars[lineChars.length - 1]!;
          const lastSlot = line.slots.find(s => s.offset === lastChar.paragraphOffset);
          
          if (lastSlot) {
            const currentLineWidth = lastSlot.left + (lastChar.width * WORD_METRIC_ADJUSTMENT);
            const extraSpace = availableWidth - currentLineWidth;
            
            if (extraSpace > 0) {
              // Word distributes space with sub-pixel precision across all word gaps
              const spaceIncrement = extraSpace / spaces.length;
              let cumulativeAdjustment = 0;
              const spaceOffsets = new Set(spaces.map(s => s.paragraphOffset));

              for (const slot of line.slots) {
                slot.left += cumulativeAdjustment;
                if (spaceOffsets.has(slot.offset)) {
                  cumulativeAdjustment += spaceIncrement;
                }
              }
            }
          }
        }
      }
    }

    return lines;
  },
  resolveRenderedLineHeightPx(styles: any, lineHeightMultiple: number): number {
    return domTextMeasurer.resolveRenderedLineHeightPx(styles, lineHeightMultiple);
  }
};

import { resolveEffectiveParagraphStyle } from "../../core/model.js";


/**
 * CanvasEditorSurface
 */
function CanvasEditorSurface(props: EditorSurfaceProps) {
  const documentLayout = createMemo(() => {
    return projectDocumentLayout(
      props.state().document,
      undefined,
      props.measuredBlockHeights?.(),
      props.measuredParagraphLayouts?.(),
      { 
        layoutMode: props.layoutMode ?? "fast",
        measurer: canvasTextMeasurer
      },
    );
  });

  return (
    <div class="oasis-editor-paper-stack">
      <Index each={documentLayout().pages}>
        {(page, index) => (
          <>
            <Show when={index > 0}>
              <PageBreak pageIndex={index} />
            </Show>
            <CanvasPage 
              page={page()} 
              index={index} 
              state={props.state()} 
            />
          </>
        )}
      </Index>
    </div>
  );
}

function CanvasPage(props: { page: EditorLayoutPage; index: number; state: EditorState }) {
  let canvasRef: HTMLCanvasElement | undefined;
  const pageSettings = () => props.page.pageSettings;

  createEffect(() => {
    const canvas = canvasRef;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = pageSettings().width * dpr;
    canvas.height = pageSettings().height * dpr;
    canvas.style.width = `${pageSettings().width}px`;
    canvas.style.height = `${pageSettings().height}px`;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageSettings().width, pageSettings().height);

    // Draw blocks
    const marginX = pageSettings().margins.left + pageSettings().margins.gutter;
    const marginY = props.page.bodyTop ?? getPageBodyTop(pageSettings());

    ctx.save();
    ctx.translate(marginX, marginY);

    for (const block of props.page.blocks) {
      if (block.sourceBlock.type === "paragraph" && block.layout) {
        const height = drawParagraph(ctx, block.sourceBlock, block.layout, props.state);
        ctx.translate(0, height);
      }
    }
    ctx.restore();
  });

  return (
    <div
      class="oasis-editor-paper"
      data-page-index={props.index}
      data-testid="editor-page"
      style={{
        width: `${pageSettings().width}px`,
        "min-height": `${pageSettings().height}px`,
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

function drawParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: any,
  layout: EditorLayoutParagraph,
  state: EditorState,
): number {
  let totalHeight = 0;
  for (const line of layout.lines) {
    ctx.save();
    ctx.translate(0, line.top);
    
    // Create a map for fast slot lookup
    const slotMap = new Map(line.slots.map(s => [s.offset, s.left]));

    for (const fragment of line.fragments) {
      const styles = resolveEffectiveTextStyleForParagraph(
        fragment.styles,
        paragraph.style?.styleId,
        state.document.styles,
      );

      const fontSize = styles.fontSize ?? 15;
      ctx.font = `${styles.italic ? "italic " : ""}${styles.bold ? "700 " : "400 "}${fontSize}px ${styles.fontFamily ?? "Calibri"}`;
      ctx.fillStyle = styles.color ?? "#000000";
      
      // Render character by character to respect adjusted slot positions
      for (const char of fragment.chars) {
        if (char.char === "\n" || char.char === "\t") continue;
        const left = slotMap.get(char.paragraphOffset);
        if (left !== undefined) {
          ctx.fillText(char.char, left, line.height * 0.8);
        }
      }
    }
    ctx.restore();
    totalHeight = Math.max(totalHeight, line.top + line.height);
  }
  return totalHeight;
}

export const canvasEngine: IRenderingEngine = {
  id: "canvas",
  measurer: canvasTextMeasurer,
  SurfaceComponent: CanvasEditorSurface,
};
