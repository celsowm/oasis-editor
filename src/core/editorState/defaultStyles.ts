import type { EditorBorderStyle, EditorNamedStyle } from "../model.js";
import { DEFAULT_FONT_SIZE_PX } from "../units.js";

const TABLE_ACCENTS = [
  { accent: "#4472c4", tint: "#d9e2f3" },
  { accent: "#ed7d31", tint: "#fce4d6" },
  { accent: "#a5a5a5", tint: "#e7e6e6" },
  { accent: "#ffc000", tint: "#fff2cc" },
  { accent: "#5b9bd5", tint: "#ddebf7" },
  { accent: "#70ad47", tint: "#e2f0d9" },
] as const;

const tableBorder = (color: string): EditorBorderStyle => ({
  width: 0.5,
  type: "solid" as const,
  color,
});

function accentTableStyle(
  index: number,
  palette: (typeof TABLE_ACCENTS)[number],
  medium: boolean,
): EditorNamedStyle {
  const id = `${medium ? "MediumShading1" : "LightShading"}-Accent${index}`;
  const border = tableBorder(medium ? "#ffffff" : palette.accent);
  return {
    id,
    name: `${medium ? "Medium Shading 1" : "Light Shading"} Accent ${index}`,
    type: "table",
    qFormat: true,
    uiPriority: (medium ? 40 : 20) + index,
    tableStyle: {
      rowBandSize: 1,
      tblLook: {
        firstRow: true,
        lastRow: false,
        firstCol: false,
        lastCol: false,
        noHBand: false,
        noVBand: true,
      },
      borders: {
        borderTop: border,
        borderRight: border,
        borderBottom: border,
        borderLeft: border,
        borderInsideH: border,
        borderInsideV: border,
      },
      conditionalFormats: {
        wholeTable: {
          shading: medium ? palette.tint : "#ffffff",
        },
        firstRow: {
          shading: palette.accent,
          textStyle: { bold: true, color: "#ffffff" },
        },
        band1Horz: { shading: palette.tint },
      },
    },
  };
}

export const DEFAULT_TABLE_STYLES: Record<string, EditorNamedStyle> = {
  TableNormal: {
    id: "TableNormal",
    name: "Table Normal",
    type: "table",
    isDefault: true,
    uiPriority: 0,
    tableStyle: {
      tblLook: {
        firstRow: false,
        lastRow: false,
        firstCol: false,
        lastCol: false,
        noHBand: true,
        noVBand: true,
      },
    },
  },
  TableGrid: {
    id: "TableGrid",
    name: "Table Grid",
    type: "table",
    qFormat: true,
    uiPriority: 1,
    tableStyle: {
      borders: {
        borderTop: tableBorder("#7f7f7f"),
        borderRight: tableBorder("#7f7f7f"),
        borderBottom: tableBorder("#7f7f7f"),
        borderLeft: tableBorder("#7f7f7f"),
        borderInsideH: tableBorder("#7f7f7f"),
        borderInsideV: tableBorder("#7f7f7f"),
      },
      tblLook: {
        firstRow: false,
        lastRow: false,
        firstCol: false,
        lastCol: false,
        noHBand: true,
        noVBand: true,
      },
    },
  },
  ...Object.fromEntries(
    TABLE_ACCENTS.flatMap((palette, offset) => {
      const index = offset + 1;
      const light = accentTableStyle(index, palette, false);
      const medium = accentTableStyle(index, palette, true);
      return [
        [light.id, light],
        [medium.id, medium],
      ];
    }),
  ),
};

export const DEFAULT_EDITOR_STYLES: Record<string, EditorNamedStyle> = {
  normal: {
    id: "normal",
    name: "Normal",
    type: "paragraph",
    qFormat: true,
    uiPriority: 0,
    paragraphStyle: {
      spacingAfter: 8,
      lineHeight: 1.15,
    },
    textStyle: {
      fontFamily: "Calibri, sans-serif",
      fontSize: DEFAULT_FONT_SIZE_PX, // 11pt
    },
  },
  header: {
    id: "header",
    name: "Header",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "header",
    paragraphStyle: {
      spacingAfter: 0,
    },
  },
  footer: {
    id: "footer",
    name: "Footer",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "footer",
    paragraphStyle: {
      spacingAfter: 0,
    },
  },
  heading1: {
    id: "heading1",
    name: "Heading 1",
    type: "paragraph",
    qFormat: true,
    uiPriority: 10,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 24,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 27,
      color: "#2e74b5",
    },
  },
  heading2: {
    id: "heading2",
    name: "Heading 2",
    type: "paragraph",
    qFormat: true,
    uiPriority: 11,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 13,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 17,
      color: "#2e74b5",
    },
  },
  heading3: {
    id: "heading3",
    name: "Heading 3",
    type: "paragraph",
    qFormat: true,
    uiPriority: 12,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 13,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 16,
      color: "#1f4d78",
    },
  },
  footnoteText: {
    id: "footnoteText",
    name: "Footnote Text",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "footnoteText",
    paragraphStyle: {
      spacingAfter: 0,
      lineHeight: 1.0,
    },
    textStyle: {
      fontSize: 10,
    },
  },
  footnoteReference: {
    id: "footnoteReference",
    name: "Footnote Reference",
    type: "character",
    semiHidden: true,
    basedOn: "normal",
    textStyle: {
      superscript: true,
    },
  },
  Caption: {
    id: "Caption",
    name: "Caption",
    type: "paragraph",
    qFormat: true,
    uiPriority: 35,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      align: "center",
      spacingBefore: 4,
      spacingAfter: 8,
    },
    textStyle: {
      fontFamily: "Calibri, sans-serif",
      fontSize: 12,
      italic: true,
    },
  },
  ...DEFAULT_TABLE_STYLES,
};
