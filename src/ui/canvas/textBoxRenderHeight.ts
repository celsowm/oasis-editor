import { type EditorState, type EditorTextBoxData } from "@/core/model.js";
import { projectBlocksLayout } from "@/layoutProjection/blocksPagination.js";

const TEXT_BOX_AUTOFIT_MEASURE_HEIGHT = 100_000;
const TEXT_BOX_AUTOFIT_SAFETY_PX = 2;

export function getTextBoxPadding(textBox: EditorTextBoxData) {
  return {
    left: textBox.body?.paddingLeft ?? 0,
    top: textBox.body?.paddingTop ?? 0,
    right: textBox.body?.paddingRight ?? 0,
    bottom: textBox.body?.paddingBottom ?? 0,
  };
}

function measureTextBoxNaturalHeight(
  textBox: EditorTextBoxData,
  state: EditorState,
  pageIndex: number,
): number {
  const padding = getTextBoxPadding(textBox);

  const innerWidth = Math.max(1, textBox.width - padding.left - padding.right);

  const fakePageSettings = {
    width: innerWidth,
    height: TEXT_BOX_AUTOFIT_MEASURE_HEIGHT,
    orientation: "portrait" as const,
    margins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      header: 0,
      footer: 0,
      gutter: 0,
    },
  };

  const pages = projectBlocksLayout({
    blocks: textBox.blocks,
    pageSettings: fakePageSettings,
    maxPageHeight: TEXT_BOX_AUTOFIT_MEASURE_HEIGHT,
    styles: state.document.styles,
    pageOffset: pageIndex,
    totalPages: undefined,
  });

  const contentHeight = pages.reduce((sum, page) => {
    return (
      sum +
      page.blocks.reduce(
        (blockSum, block) => blockSum + Math.max(0, block.estimatedHeight),
        0,
      )
    );
  }, 0);

  return Math.max(
    1,
    Math.ceil(
      contentHeight + padding.top + padding.bottom + TEXT_BOX_AUTOFIT_SAFETY_PX,
    ),
  );
}

/**
 * The height the text box is actually painted at: its stored height, or the
 * content-measured height when auto-fit is on. Selection overlays must use this
 * so the resize handles match the rendered box rather than the stored height.
 */
export function resolveTextBoxRenderHeight(
  textBox: EditorTextBoxData,
  state: EditorState,
  pageIndex: number,
): number {
  if (!textBox.body?.autoFit) {
    return textBox.height;
  }

  return measureTextBoxNaturalHeight(textBox, state, pageIndex);
}
