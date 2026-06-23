/**
 * Document node graph: runs, paragraphs, tables, rows, cells and the union of
 * block-level nodes used everywhere the editor walks the document tree.
 */
import type {
  EditorDocxWidthValue,
  EditorEndnoteReferenceData,
  EditorFieldChar,
  EditorFieldData,
  EditorFootnoteReferenceData,
  EditorImageFloatingLayout,
  EditorImageRunData,
  EditorParagraphListStyle,
  EditorRevision,
  EditorPropertyRevision,
  EditorStructuralRevision,
  EditorTableRowHeightRule,
} from "./primitives.js";
import type {
  EditorParagraphStyle,
  EditorTableCellStyle,
  EditorTableStyle,
  EditorTableConditionalFlags,
  EditorTextStyle,
} from "./styles.js";

/**
 * Geometry/appearance of a text box shape (`wps:spPr`). All values are
 * optional; an unset field means "inherit Word's default / leave as-is".
 */
export interface EditorTextBoxShape {
  /** `a:prstGeom/@prst` preset geometry, e.g. "rect". */
  preset?: string;
  /** Solid fill color (`a:solidFill/a:srgbClr`) as `#RRGGBB`. */
  fill?: string;
  /** Outline color (`a:ln/a:solidFill/a:srgbClr`) as `#RRGGBB`. */
  borderColor?: string;
  /** Outline width in points (`a:ln/@w`, originally EMU). */
  borderWidthPt?: number;
}

/**
 * Text body properties of a text box (`wps:bodyPr`): internal padding (insets),
 * vertical anchoring and wrap behaviour.
 */
export interface EditorTextBoxBody {
  /** Internal insets in px (`@lIns/@tIns/@rIns/@bIns`, originally EMU). */
  paddingLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  /** `@anchor`: vertical anchor of the text (t/ctr/b). */
  anchor?: string;
  /** `@wrap`: text wrap mode inside the box (e.g. "square"). */
  wrap?: string;
  /** True when `a:spAutoFit` is present (auto-resize box to text). */
  autoFit?: boolean;
  /** `@vert`: text flow direction inside the box (DrawingML vertical text). */
  vert?: "horz" | "vert" | "vert270" | "wordArtVert" | null;
}

/**
 * A Word text box (`w:drawing` containing a `wps:wsp` WordprocessingShape with
 * `wps:txbx/w:txbxContent`). Modeled as inline run content (analogous to
 * `EditorImageRunData`): the owning run's text is the object replacement
 * character `\uFFFC`. The text box's own content is a list of block nodes.
 */
export interface EditorTextBoxData {
  /** Box width in px (`wp:extent/@cx`, originally EMU). */
  width: number;
  /** Box height in px (`wp:extent/@cy`, originally EMU). */
  height: number;
  /** Block content of `w:txbxContent` (paragraphs and/or tables). */
  blocks: EditorBlockNode[];
  /** Floating/anchor layout when the drawing is a `wp:anchor`. */
  floating?: EditorImageFloatingLayout;
  /** Shape rotation in degrees (`wps:spPr/a:xfrm/@rot`, originally 1/60000°). */
  rotation?: number;
  /** `wp:docPr/@name`. */
  name?: string;
  /** `wp:docPr/@descr` or `@title`. */
  alt?: string;
  shape?: EditorTextBoxShape;
  body?: EditorTextBoxBody;
}

/**
 * Fields shared by every run kind. `text` is always present (inline objects use
 * the object-replacement character `￼`); `revision` can decorate a run of
 * any kind (insert/delete tracking).
 */
export interface EditorRunBase {
  id: string;
  text: string;
  styles?: EditorTextStyle;
  revision?: EditorRevision;
}

/**
 * A run of text, optionally carrying one inline object. Discriminated by `kind`
 * so adding a new inline object forces every dispatch site to handle it (a
 * missing branch is a compile error) and invalid combinations (e.g. `image` +
 * `textBox`) are unrepresentable (O1). The `kind` values mirror {@link RunKind}.
 */
export type EditorTextRun =
  | (EditorRunBase & { kind: "text" })
  | (EditorRunBase & { kind: "image"; image: EditorImageRunData })
  | (EditorRunBase & { kind: "textBox"; textBox: EditorTextBoxData })
  | (EditorRunBase & { kind: "field"; field: EditorFieldData })
  /**
   * Preserved complex-field control char (`w:fldChar`). Zero-length marker run;
   * see {@link EditorFieldChar}.
   */
  | (EditorRunBase & { kind: "fieldChar"; fieldChar: EditorFieldChar })
  /** Preserved field instruction text (`w:instrText`). Zero-length marker run. */
  | (EditorRunBase & { kind: "fieldInstruction"; fieldInstruction: string })
  /**
   * Inline marker of a footnote whose body lives in
   * `EditorDocument.footnotes.items[footnoteReference.footnoteId]`.
   */
  | (EditorRunBase & {
      kind: "footnoteReference";
      footnoteReference: EditorFootnoteReferenceData;
    })
  /**
   * Inline marker of an endnote whose body lives in
   * `EditorDocument.endnotes.items[endnoteReference.endnoteId]`.
   */
  | (EditorRunBase & {
      kind: "endnoteReference";
      endnoteReference: EditorEndnoteReferenceData;
    })
  /**
   * Round-trip metadata for `w:sym` — a glyph from a named font. `font` is the
   * `w:font` attribute value; `char` is the 4-digit hex `w:char` value. The
   * character is also stored in `text` so the canvas can render it.
   */
  | (EditorRunBase & { kind: "sym"; sym: { font: string; char: string } });

/**
 * A drop cap (Word's `w:framePr/@dropCap`): a large initial letter sunk into
 * the first lines of the paragraph, with body text wrapping around it. In OOXML
 * the cap lives in a separate preceding frame paragraph; we attach it to the
 * wrapping paragraph so the per-paragraph layout owns its own exclusion + glyph.
 */
export interface EditorDropCap {
  /** Cap letter(s), e.g. "L". */
  text: string;
  /** `w:framePr/@lines` — number of body lines the cap spans (default 3). */
  lines: number;
  /** `w:framePr/@dropCap`: "drop" (in text) or "margin" (in the left margin). */
  type: "drop" | "margin";
  /** Cap run style: fontSize (`w:sz`), font, color, baselineShift (`w:position`). */
  style?: EditorTextStyle;
}

export interface EditorParagraphNode {
  id: string;
  type: "paragraph";
  runs: EditorTextRun[];
  style?: EditorParagraphStyle;
  list?: EditorParagraphListStyle;
  /** Drop cap that body text in this paragraph wraps around, when present. */
  dropCap?: EditorDropCap;
}

export interface EditorTableCellNode {
  id: string;
  blocks: EditorParagraphNode[];
  colSpan?: number;
  rowSpan?: number;
  vMerge?: "restart" | "continue";
  style?: EditorTableCellStyle;
  conditionalStyle?: EditorTableConditionalFlags;
  /** Exact pre-change cell grid retained while a tracked merge/split is pending. */
  mergeRevisionState?: EditorTableMergeRevisionState;
  /** Extension attributes (e.g. `w14:paraId`) preserved for round-trip. */
  extAttributes?: Record<string, string>;
}

export interface EditorTableMergeRevisionState {
  revisionId: string;
  orientation: "horizontal" | "vertical";
  /** Number of cells occupying the changed horizontal range in current markup. */
  currentCellCount: number;
  previousCells: EditorTableCellNode[];
}

export interface EditorTableRowStyle {
  isHeader?: boolean;
  height?: number | string;
  heightRule?: EditorTableRowHeightRule;
  gridBefore?: number;
  gridAfter?: number;
  widthBefore?: EditorDocxWidthValue;
  widthAfter?: EditorDocxWidthValue;
  /** `w:jc` in `w:trPr`: horizontal alignment of the row within the table width. */
  align?: "left" | "center" | "right";
  /** `w:cantSplit`: keep this row together during pagination. */
  cantSplit?: boolean;
  /** `w:hidden`: do not display this row in normal view. */
  hidden?: boolean;
  /** Row-level cell spacing override (`w:trPr/w:tblCellSpacing`). */
  cellSpacing?: EditorDocxWidthValue;
  /** Structural row `w:ins`/`w:del` revision. */
  revision?: EditorStructuralRevision;
  /** Previous row properties from `w:trPrChange`. */
  propertyRevision?: EditorPropertyRevision<EditorTableRowStyle>;
}

export interface EditorTableRowNode {
  id: string;
  cells: EditorTableCellNode[];
  isHeader?: boolean;
  style?: EditorTableRowStyle;
  conditionalStyle?: EditorTableConditionalFlags;
  /**
   * `w:tblPrEx` — per-row table property exceptions. These override the table's
   * own properties (borders, cell margins, cell spacing, indent, width, layout,
   * alignment) for the cells in this row. Applied during cell formatting
   * resolution and re-serialized before `w:trPr` on export.
   */
  propertyExceptions?: EditorTableStyle;
  /** Raw `<w:tblPrExChange ...>` XML preserved for DOCX round-trip. */
  tblPrExChangeXml?: string;
  /** Extension attributes (e.g. `w14:paraId`, `w15:*`) preserved for round-trip. */
  extAttributes?: Record<string, string>;
}

export interface EditorTableNode {
  id: string;
  type: "table";
  rows: EditorTableRowNode[];
  gridCols?: number[];
  style?: EditorTableStyle;
  /** Preservation-only `w:tblGridChange` XML. */
  gridRevision?: EditorPropertyRevision<number[]>;
}

export type EditorBlockNode = EditorParagraphNode | EditorTableNode;
