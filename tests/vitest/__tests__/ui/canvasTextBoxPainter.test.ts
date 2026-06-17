import { describe, expect, it } from "vitest";
import type {
  EditorLayoutFragment,
  EditorLayoutLine,
  EditorPageSettings,
  EditorTextBoxData,
} from "@/core/model.js";
import {
  collectParagraphFloatingExclusions,
  getTextBoxFloatingGeometry,
  resolveFloatingObjectRect,
} from "@/layoutProjection/floatingObjects.js";

describe("canvas text box painter", () => {
  it("resolves caixa_texto.docx anchored text box offsets from EMU to canvas px", () => {
    const textBox: EditorTextBoxData = {
      width: Math.round(2360930 / 9525),
      height: Math.round(1404620 / 9525),
      blocks: [],
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: -275590 },
        positionV: { relativeFrom: "paragraph", offset: 87630 },
      },
      shape: {
        preset: "rect",
        fill: "#FFFFFF",
        borderColor: "#000000",
      },
      body: {
        anchor: "t",
        wrap: "square",
        autoFit: true,
        paddingLeft: Math.round(91440 / 9525),
        paddingTop: Math.round(45720 / 9525),
      },
      name: "Caixa de Texto 2",
    };

    const pageSettings: EditorPageSettings = {
      width: 794,
      height: 1123,
      orientation: "portrait",
      margins: {
        top: 96,
        right: 113,
        bottom: 96,
        left: 113,
        header: 48,
        footer: 48,
        gutter: 0,
      },
    };

    const rect = resolveFloatingObjectRect({
      object: getTextBoxFloatingGeometry(textBox),
      pageSettings,
      contentLeft: 113,
      contentTop: 96,
      contentWidth: 568,
      paragraphTop: 120,
      lineTop: 120,
      anchorLeft: 113,
    });

    expect(rect.width).toBe(Math.round(2360930 / 9525));
    expect(rect.height).toBe(Math.round(1404620 / 9525));

    // -275590 EMU / 9525 ~= -28.93 px
    expect(rect.x).toBeCloseTo(113 - 275590 / 9525, 2);

    // 87630 EMU / 9525 ~= 9.2 px
    expect(rect.y).toBeCloseTo(120 + 87630 / 9525, 2);
  });

  it("uses effective text box height via resolveTextBoxHeight in exclusions", () => {
    const textBox: EditorTextBoxData = {
      width: 200,
      height: 150,
      blocks: [],
      body: {
        autoFit: true,
      },
      floating: {
        type: "floating",
        wrap: "square",
        positionH: {
          relativeFrom: "column",
          offset: 0,
        },
        positionV: {
          relativeFrom: "paragraph",
          offset: 0,
        },
      },
    };

    const fragments: EditorLayoutFragment[] = [
      {
        paragraphId: "p1",
        runId: "r1",
        startOffset: 0,
        endOffset: 1,
        text: "\uFFFC",
        textBox,
        chars: [
          {
            char: "\uFFFC",
            paragraphOffset: 0,
            runOffset: 0,
          },
        ],
      },
    ];

    const preliminaryLines: EditorLayoutLine[] = [
      {
        paragraphId: "p1",
        index: 0,
        startOffset: 0,
        endOffset: 1,
        top: 0,
        height: 20,
        slots: [
          {
            paragraphId: "p1",
            offset: 0,
            left: 0,
            top: 0,
            height: 20,
          },
        ],
        fragments,
      },
    ];

    const pageSettings: EditorPageSettings = {
      width: 800,
      height: 1000,
      orientation: "portrait",
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

    const exclusions = collectParagraphFloatingExclusions({
      fragments,
      preliminaryLines,
      pageSettings,
      contentWidth: 600,
      resolveTextBoxHeight: () => 32,
    });

    expect(exclusions).toHaveLength(1);
    expect(exclusions[0]!.height).toBe(32);
  });

  it("uses raw textBox.height when resolveTextBoxHeight is not provided", () => {
    const textBox: EditorTextBoxData = {
      width: 200,
      height: 150,
      blocks: [],
      body: {
        autoFit: true,
      },
      floating: {
        type: "floating",
        wrap: "square",
        positionH: {
          relativeFrom: "column",
          offset: 0,
        },
        positionV: {
          relativeFrom: "paragraph",
          offset: 0,
        },
      },
    };

    const fragments: EditorLayoutFragment[] = [
      {
        paragraphId: "p1",
        runId: "r1",
        startOffset: 0,
        endOffset: 1,
        text: "\uFFFC",
        textBox,
        chars: [
          {
            char: "\uFFFC",
            paragraphOffset: 0,
            runOffset: 0,
          },
        ],
      },
    ];

    const preliminaryLines: EditorLayoutLine[] = [
      {
        paragraphId: "p1",
        index: 0,
        startOffset: 0,
        endOffset: 1,
        top: 0,
        height: 20,
        slots: [
          {
            paragraphId: "p1",
            offset: 0,
            left: 0,
            top: 0,
            height: 20,
          },
        ],
        fragments,
      },
    ];

    const pageSettings: EditorPageSettings = {
      width: 800,
      height: 1000,
      orientation: "portrait",
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

    const exclusions = collectParagraphFloatingExclusions({
      fragments,
      preliminaryLines,
      pageSettings,
      contentWidth: 600,
    });

    expect(exclusions).toHaveLength(1);
    expect(exclusions[0]!.height).toBe(150);
  });
});
