import { describe, it, expect, beforeEach } from "vitest";
import { SelectionMapper } from "../app/services/SelectionMapper.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { LayoutFragment } from "../core/layout/LayoutFragment.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import {
  LogicalPosition,
  LogicalRange,
} from "../core/selection/SelectionTypes.js";

describe("SelectionMapper", () => {
  let mockMeasurer: TextMeasurer;
  let mockLayout: LayoutState;
  let selectionMapper: SelectionMapper;

  beforeEach(() => {
    mockMeasurer = {
      measureText: (input) => ({
        width: input.text.length * 10,
        height: 20,
      }),
    };

    const fragment1: LayoutFragment = {
      id: "f1",
      blockId: "b1",
      sectionId: "s1",
      pageId: "p1",
      fragmentIndex: 0,
      kind: "paragraph",
      startOffset: 0,
      endOffset: 20,
      text: "01234567890123456789",
      rect: { x: 50, y: 50, width: 200, height: 100 },
      typography: { fontFamily: "Arial", fontSize: 12, fontWeight: 400 },
      marks: {},
      runs: [
        { id: "r1", text: "0123456789", marks: {} },
        { id: "r2", text: "0123456789", marks: {} },
      ],
      lines: [
        {
          id: "l1",
          text: "0123456789",
          width: 100,
          height: 15,
          x: 0,
          y: 50,
          offsetStart: 0,
          offsetEnd: 10,
        },
        {
          id: "l2",
          text: "0123456789",
          width: 100,
          height: 15,
          x: 0,
          y: 65,
          offsetStart: 10,
          offsetEnd: 20,
        },
      ],
      align: "left",
    };

    const fragment2: LayoutFragment = {
      id: "f2",
      blockId: "b2",
      sectionId: "s1",
      pageId: "p2",
      fragmentIndex: 0,
      kind: "paragraph",
      startOffset: 0,
      endOffset: 10,
      text: "fragment 2",
      rect: { x: 50, y: 50, width: 200, height: 100 },
      typography: { fontFamily: "Arial", fontSize: 12, fontWeight: 400 },
      marks: {},
      runs: [{ id: "r3", text: "fragment 2", marks: {} }],
      lines: [
        {
          id: "l3",
          text: "fragment 2",
          width: 100,
          height: 15,
          x: 0,
          y: 50,
          offsetStart: 0,
          offsetEnd: 10,
        },
      ],
      align: "left",
    };

    mockLayout = {
      pages: [
        {
          id: "p1",
          sectionId: "s1",
          pageIndex: 0,
          pageNumber: "1",
          rect: { x: 0, y: 0, width: 600, height: 800 },
          contentRect: { x: 50, y: 50, width: 500, height: 700 },
          templateId: "t1",
          headerRect: null,
          footerRect: null,
          fragments: [fragment1],
          headerFragments: [],
          footerFragments: [],
          footnoteFragments: [],
          footnoteAreaRect: null,
        },
        {
          id: "p2",
          sectionId: "s1",
          pageIndex: 1,
          pageNumber: "2",
          rect: { x: 0, y: 800, width: 600, height: 800 },
          contentRect: { x: 50, y: 850, width: 500, height: 700 },
          templateId: "t1",
          headerRect: null,
          footerRect: null,
          fragments: [fragment2],
          headerFragments: [],
          footerFragments: [],
          footnoteFragments: [],
          footnoteAreaRect: null,
        },
      ],
      fragmentsByBlockId: {
        b1: [fragment1],
        b2: [fragment2],
      },
      footnotesByPage: {},
      editingFootnoteId: null,
    };

    selectionMapper = new SelectionMapper(mockLayout, mockMeasurer);
  });

  describe("getCaretRect", () => {
    it("should return correct rect for a valid position in the middle of a line", () => {
      const pos: LogicalPosition = {
        sectionId: "s1",
        blockId: "b1",
        inlineId: "r1",
        offset: 5,
      };

      const rect = selectionMapper.getCaretRect(pos);

      expect(rect).not.toBeNull();
      // fragment.rect.x (50) + line.x (0) + 5 chars * 10px (50) = 100
      expect(rect?.x).toBe(100);
      expect(rect?.y).toBe(50);
      expect(rect?.height).toBe(15);
      expect(rect?.pageId).toBe("p1");
    });

    it("should return correct rect for a position at the start of a line", () => {
      const pos: LogicalPosition = {
        sectionId: "s1",
        blockId: "b1",
        inlineId: "r1",
        offset: 0,
      };

      const rect = selectionMapper.getCaretRect(pos);

      expect(rect?.x).toBe(50);
      expect(rect?.y).toBe(50);
    });

    it("should return correct rect for a position at the end of a line", () => {
      const pos: LogicalPosition = {
        sectionId: "s1",
        blockId: "b1",
        inlineId: "r1",
        offset: 10,
      };

      const rect = selectionMapper.getCaretRect(pos);

      // offset 10 is the end of line 1, which might also be start of line 2.
      // PositionCalculator seems to prefer the line it finds first if it's inclusive.
      // l1 offsetEnd is 10. l2 offsetStart is 10.
      // let's see where it lands.
      expect(rect?.y).toBe(50);
      expect(rect?.x).toBe(150);
    });

    it("should return correct rect for a position in the second line", () => {
      const pos: LogicalPosition = {
        sectionId: "s1",
        blockId: "b1",
        inlineId: "r2",
        offset: 5,
      };

      const rect = selectionMapper.getCaretRect(pos);

      expect(rect?.y).toBe(65);
      // r2 starts at block offset 10. offset 5 in r2 is block offset 15.
      // l2 starts at block offset 10. so offset in l2 is 5.
      // x = 50 + 50 = 100
      expect(rect?.x).toBe(100);
    });

    it("should return null for invalid position", () => {
      const pos: LogicalPosition = {
        sectionId: "s1",
        blockId: "invalid",
        inlineId: "r1",
        offset: 0,
      };

      const rect = selectionMapper.getCaretRect(pos);
      expect(rect).toBeNull();
    });
  });

  describe("getSelectionRects", () => {
    it("should return a single rect for a single-line selection", () => {
      const range: LogicalRange = {
        start: { sectionId: "s1", blockId: "b1", inlineId: "r1", offset: 2 },
        end: { sectionId: "s1", blockId: "b1", inlineId: "r1", offset: 8 },
      };

      const rects = selectionMapper.getSelectionRects(range);

      expect(rects.length).toBe(1);
      // start: 50 + 0 + 20 = 70
      // end: 50 + 0 + 80 = 130
      // width: 130 - 70 = 60
      expect(rects[0]).toEqual({
        x: 70,
        y: 50,
        width: 60,
        height: 15,
        pageId: "p1",
      });
    });

    it("should handle reversed selection range", () => {
      const range: LogicalRange = {
        start: { sectionId: "s1", blockId: "b1", inlineId: "r1", offset: 8 },
        end: { sectionId: "s1", blockId: "b1", inlineId: "r1", offset: 2 },
      };

      const rects = selectionMapper.getSelectionRects(range);

      expect(rects.length).toBe(1);
      expect(rects[0].x).toBe(70);
      expect(rects[0].width).toBe(60);
    });

    it("should return multiple rects for a multi-line selection within the same fragment", () => {
      const range: LogicalRange = {
        start: { sectionId: "s1", blockId: "b1", inlineId: "r1", offset: 5 },
        end: { sectionId: "s1", blockId: "b1", inlineId: "r2", offset: 5 },
      };

      const rects = selectionMapper.getSelectionRects(range);

      expect(rects.length).toBe(2);

      // First line: from offset 5 to end of line (10)
      // x: 50 + 50 = 100. width: 150 - 100 = 50
      expect(rects[0]).toEqual({
        x: 100,
        y: 50,
        width: 50,
        height: 15,
        pageId: "p1",
      });

      // Second line: from start of line (offset 10) to offset 15 (which is r2 offset 5)
      // x: 50. width: 100 - 50 = 50
      expect(rects[1]).toEqual({
        x: 50,
        y: 65,
        width: 50,
        height: 15,
        pageId: "p1",
      });
    });

    it("should return rects spanning across multiple pages/fragments", () => {
      const range: LogicalRange = {
        start: { sectionId: "s1", blockId: "b1", inlineId: "r1", offset: 5 },
        end: { sectionId: "s1", blockId: "b2", inlineId: "r3", offset: 5 },
      };

      const rects = selectionMapper.getSelectionRects(range);

      // b1 l1 (partial), b1 l2 (full), b2 l3 (partial)
      expect(rects.length).toBe(3);

      // b1 l1
      expect(rects[0].pageId).toBe("p1");
      expect(rects[0].y).toBe(50);
      expect(rects[0].width).toBe(50);

      // b1 l2
      expect(rects[1].pageId).toBe("p1");
      expect(rects[1].y).toBe(65);
      expect(rects[1].width).toBe(100);

      // b2 l3
      expect(rects[2].pageId).toBe("p2");
      expect(rects[2].y).toBe(50);
      // r3 offset 5 -> "fragm" -> 50px
      expect(rects[2].width).toBe(50);
      expect(rects[2].x).toBe(50);
    });
  });
});
