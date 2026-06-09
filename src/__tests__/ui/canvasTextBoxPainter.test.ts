import { describe, expect, it } from "vitest";
import type { EditorTextBoxData, EditorPageSettings } from "../../core/model.js";
import {
  getTextBoxFloatingGeometry,
  resolveFloatingObjectRect,
} from "../../layoutProjection/floatingObjects.js";

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
});
