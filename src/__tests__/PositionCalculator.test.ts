import { describe, it, expect, vi } from "vitest";
import { PositionCalculator } from "../app/services/PositionCalculator.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { TextMeasurer } from "../bridge/measurement/TextMeasurementBridge.js";
import { LogicalPosition } from "../core/selection/SelectionTypes.js";

describe("PositionCalculator", () => {
  const mockMeasurer: TextMeasurer = {
    measureText: vi.fn().mockImplementation((input) => ({
      width: input.text.length * 10,
      height: 15,
    })),
  };

  const mockLayout: LayoutState = {
    pages: [],
    fragmentsByBlockId: {
      "block-1": [
        {
          id: "frag-1",
          blockId: "block-1",
          sectionId: "sec-1",
          pageId: "page-1",
          fragmentIndex: 0,
          kind: "text",
          startOffset: 0,
          endOffset: 11,
          text: "Hello World",
          rect: { x: 50, y: 100, width: 200, height: 30 },
          typography: { fontFamily: "Arial", fontSize: 12, fontWeight: 400 },
          marks: {},
          runs: [
            { id: "run-1", text: "Hello ", marks: {} },
            { id: "run-2", text: "World", marks: {} },
          ],
          lines: [
            {
              id: "line-1",
              text: "Hello World",
              width: 110,
              height: 15,
              x: 0,
              y: 100,
              offsetStart: 0,
              offsetEnd: 11,
            },
          ],
          align: "left",
        },
      ],
    },
  };

  it("should calculate offset in block correctly", () => {
    const calculator = new PositionCalculator(mockLayout);
    const pos: LogicalPosition = {
      sectionId: "sec-1",
      blockId: "block-1",
      inlineId: "run-2",
      offset: 1,
    };
    expect(calculator.getOffsetInBlock(pos)).toBe(7);
  });

  it("should calculate Y position correctly", () => {
    const calculator = new PositionCalculator(mockLayout);
    const pos: LogicalPosition = {
      sectionId: "sec-1",
      blockId: "block-1",
      inlineId: "run-1",
      offset: 0,
    };
    expect(calculator.calculateYPosition(pos)).toBe(100);
  });

  it("should calculate X offset correctly", () => {
    const calculator = new PositionCalculator(mockLayout);
    const fragment = mockLayout.fragmentsByBlockId["block-1"][0];
    const pos: LogicalPosition = {
      sectionId: "sec-1",
      blockId: "block-1",
      inlineId: "run-1",
      offset: 5,
    };
    expect(calculator.calculateXOffset(pos, fragment, mockMeasurer)).toBe(50);
  });

  it("should handle justification correctly", () => {
    const justifiedLayout: LayoutState = {
      ...mockLayout,
      fragmentsByBlockId: {
        "block-1": [
          {
            ...mockLayout.fragmentsByBlockId["block-1"][0],
            align: "justify",
            rect: { x: 50, y: 100, width: 210, height: 30 },
            lines: [
              {
                id: "line-1",
                text: "Hello World",
                width: 110,
                height: 15,
                x: 0,
                y: 100,
                offsetStart: 0,
                offsetEnd: 10,
              },
              {
                id: "line-2",
                text: "End",
                width: 30,
                height: 15,
                x: 0,
                y: 115,
                offsetStart: 11,
                offsetEnd: 14,
              },
            ],
          },
        ],
      },
    };

    const calculator = new PositionCalculator(justifiedLayout);
    const fragment = justifiedLayout.fragmentsByBlockId["block-1"][0];

    const posAfterSpace: LogicalPosition = {
      sectionId: "sec-1",
      blockId: "block-1",
      inlineId: "run-2",
      offset: 0,
    };

    expect(
      calculator.calculateXOffset(posAfterSpace, fragment, mockMeasurer),
    ).toBe(160);
  });
});
