import {
  EditorSelection,
  LogicalRange,
  LogicalPosition,
} from "../../core/selection/SelectionTypes.js";
import { normalizeSelection as normalizeSelectionRange } from "../../core/selection/SelectionService.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { TextMeasurer } from "../../bridge/measurement/TextMeasurementBridge.js";
import { SelectionMapper } from "../../app/services/SelectionMapper.js";
import { setStore } from "../EditorStore.tsx";
import { Logger } from "../../core/utils/Logger.js";

export class PageViewport {
  private measurer: TextMeasurer;
  private readonly tempDisableSelectionVisuals = true;

  constructor(measurer: TextMeasurer) {
    this.measurer = measurer;
  }

  render(
    layout: LayoutState,
    selection: EditorSelection | null,
    editingMode: "main" | "header" | "footer" | "footnote" = "main",
  ): void {
    Logger.debug("VIEWPORT: render:start", {
      editingMode,
      selection,
      pages: layout.pages.length,
    });
    // Update the store — PageLayerComponent in the root reads from it
    setStore("pageLayout", layout);
    setStore("editingMode", editingMode);

    if (this.tempDisableSelectionVisuals) {
      setStore("caretRect", null);
      setStore("selectionRects", []);
      Logger.debug("VIEWPORT: visuals disabled", {
        editingMode,
        selection,
        pages: layout.pages.length,
      });
      return;
    }

    // Use a default SelectionMapper for this layout
    const mapper = new SelectionMapper(layout, this.measurer);

    if (!selection) {
      setStore("caretRect", null);
      setStore("selectionRects", []);
      Logger.debug("VIEWPORT: render:end", {
        caretRect: null,
        selectionRects: 0,
      });
      return;
    }

    // Handle caret (collapsed selection)
    if (
      !selection.anchor ||
      (selection.anchor.offset === selection.focus.offset &&
        selection.anchor.blockId === selection.focus.blockId)
    ) {
      const caretRect = mapper.getCaretRect(
        selection.anchor || selection.focus,
      );
      if (caretRect) {
        setStore("caretRect", {
          x: caretRect.x,
          y: caretRect.y,
          height: caretRect.height,
          pageId: caretRect.pageId,
        });
        setStore("selectionRects", []);
        Logger.debug("VIEWPORT: caret", {
          caretRect,
          selectionRects: 0,
        });
      }
    } else {
      // Handle selection range
      const range = normalizeSelectionRange(selection)!;
      const rects = mapper.getSelectionRects(range);
      setStore("caretRect", null);
      setStore(
        "selectionRects",
        rects.map((r) => ({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          pageId: r.pageId,
        })),
      );
      Logger.debug("VIEWPORT: selection", {
        rectCount: rects.length,
        range,
      });
    }
  }
}
