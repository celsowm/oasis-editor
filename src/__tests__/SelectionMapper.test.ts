import { describe, it, expect, vi } from "vitest";
import { SelectionMapper } from "../app/services/SelectionMapper.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import { LogicalRange } from "../core/selection/SelectionTypes.js";

describe("SelectionMapper", () => {
  const mockMeasurer: TextMeasurer = {
    measureText: vi.fn().mockReturnValue({ width: 50, height: 20 }),
  };

  const mockLayout: LayoutState = {
    pages: [
      {
        id: "page-1",
        sectionId: "section-1",
        pageIndex: 0,
        pageNumber: "1",
        rect: { x: 0, y: 0, width: 800, height: 1000 },
        contentRect: { x: 50, y: 50, width: 700, height: 900 },
        templateId: "default",
        headerRect: null,
        footerRect: null,
        fragments: [
          {
            id: "frag-1",
            blockId: "block-1",
            sectionId: "section-1",
            pageId: "page-1",
            fragmentIndex: 0,
            kind: "paragraph",
            startOffset: 0,
            endOffset: 11,
            text: "Hello World",
            rect: { x: 50, y: 50, width: 700, height: 100 },
            typography: { fontFamily: "Arial", fontSize: 12, fontWeight: 400 },
            marks: {},
            runs: [{ id: "run-1", text: "Hello World", marks: {} }],
            lines: [
              {
                id: "line-1",
                text: "Hello World",
                width: 100,
                height: 20,
                x: 0,
                y: 50,
                offsetStart: 0,
                offsetEnd: 11,
              },
            ],
            align: "left",
          },
          {
            id: "frag-2",
            blockId: "block-2",
            sectionId: "section-1",
            pageId: "page-1",
            fragmentIndex: 0,
            kind: "paragraph",
            startOffset: 0,
            endOffset: 11,
            text: "Next Paragraph",
            rect: { x: 50, y: 150, width: 700, height: 100 },
            typography: { fontFamily: "Arial", fontSize: 12, fontWeight: 400 },
            marks: {},
            runs: [{ id: "run-2", text: "Next Paragraph", marks: {} }],
            lines: [
              {
                id: "line-2",
                text: "Next Paragraph",
                width: 100,
                height: 20,
                x: 0,
                y: 150,
                offsetStart: 0,
                offsetEnd: 14,
              },
            ],
            align: "left",
          },
        ],
      },
    ],
    fragmentsByBlockId: {},
  };
  mockLayout.fragmentsByBlockId["block-1"] = [mockLayout.pages[0].fragments[0]];
  mockLayout.fragmentsByBlockId["block-2"] = [mockLayout.pages[0].fragments[1]];

  it("should return correct selection rect for a single line selection", () => {
    const mapper = new SelectionMapper(mockLayout, mockMeasurer);
    const range: LogicalRange = {
      start: { sectionId: "section-1", blockId: "block-1", inlineId: "run-1", offset: 0 },
      end: { sectionId: "section-1", blockId: "block-1", inlineId: "run-1", offset: 5 },
    };

    const rects = mapper.getSelectionRects(range);
    expect(rects.length).toBe(1);
    expect(rects[0].pageId).toBe("page-1");
    expect(rects[0].y).toBe(50);
    expect(rects[0].height).toBe(20);
  });

  it("should handle reversed range", () => {
    const mapper = new SelectionMapper(mockLayout, mockMeasurer);
    const range: LogicalRange = {
      start: { sectionId: "section-1", blockId: "block-1", inlineId: "run-1", offset: 5 },
      end: { sectionId: "section-1", blockId: "block-1", inlineId: "run-1", offset: 0 },
    };

    const rects = mapper.getSelectionRects(range);
    expect(rects.length).toBe(1);
    expect(rects[0].pageId).toBe("page-1");
  });

  it("should handle multi-block selection", () => {
    const mapper = new SelectionMapper(mockLayout, mockMeasurer);
    const range: LogicalRange = {
      start: { sectionId: "section-1", blockId: "block-1", inlineId: "run-1", offset: 0 },
      end: { sectionId: "section-1", blockId: "block-2", inlineId: "run-2", offset: 5 },
    };

    const rects = mapper.getSelectionRects(range);
    expect(rects.length).toBe(2);
    expect(rects[0].y).toBe(50);
    expect(rects[1].y).toBe(150);
  });

  it("should handle reversed multi-block selection", () => {
    const mapper = new SelectionMapper(mockLayout, mockMeasurer);
    const range: LogicalRange = {
      start: { sectionId: "section-1", blockId: "block-2", inlineId: "run-2", offset: 5 },
      end: { sectionId: "section-1", blockId: "block-1", inlineId: "run-1", offset: 0 },
    };

    const rects = mapper.getSelectionRects(range);
    expect(rects.length).toBe(2);
    expect(rects[0].y).toBe(50);
    expect(rects[1].y).toBe(150);
  });

  it("should return empty array for invalid range", () => {
    const mapper = new SelectionMapper(mockLayout, mockMeasurer);
    const range: LogicalRange = {
      start: null as any,
      end: { sectionId: "section-1", blockId: "block-1", inlineId: "run-1", offset: 5 },
    };

    const rects = mapper.getSelectionRects(range);
    expect(rects).toEqual([]);
  });
});
