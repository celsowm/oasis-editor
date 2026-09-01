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
  EditorMoveRangeMarker,
  EditorParagraphListStyle,
  EditorNumberingRevision,
  EditorRevision,
  EditorPropertyRevision,
  EditorStructuralRevision,
  EditorTableRowHeightRule,
} from "./primitives.js";
import type { EditorMathExpression } from "./math.js";
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
  /** Zero-length move range boundary retained for lossless tracked-move round-trip. */
  revisionRangeMarker?: EditorMoveRangeMarker;
  /** Enclosing inline w:sdt wrappers, outermost first. */
  sdtWrappers?: EditorSdtBlockWrapper[];
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
  | (EditorRunBase & { kind: "sym"; sym: { font: string; char: string } })
  | (EditorRunBase & { kind: "math"; math: EditorMathExpression });

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

/**
 * A block-level structured document tag (`w:sdt`, a content control) enclosing
 * one or more blocks, preserved for round-trip. Its content is unwrapped into the
 * normal block flow (so it still renders and edits); this carries the wrapper's
 * properties so export can re-wrap. `groupId` ties together the consecutive blocks
 * that came from the same `w:sdt`; the array on a block lists its enclosing
 * wrappers outermost-first (nested content controls).
 *
 * Recognized `w:sdtPr` children are parsed into the typed `sdtPr` object so the
 * editor can read the control's alias/tag/id/lock/subtype/etc. Unknown children
 * (extension namespaces, future-schema elements) are preserved verbatim in
 * `sdtPr.unknownXml` so export re-emits them byte-for-byte. Likewise `sdtEndPr`
 * is preserved as raw XML; structured-document end properties rarely carry
 * editor-meaningful data beyond run formatting that the content already supplies.
 */
export interface EditorSdtBlockWrapper {
  groupId: string;
  /** Parsed `<w:sdtPr>` properties (alias, tag, id, lock, subtype, etc.). */
  sdtPr: EditorSdtPr;
  /** Raw `<w:sdtEndPr>…</w:sdtEndPr>` XML, when present. */
  sdtEndPrXml?: string;
}

/**
 * Recognized `<w:sdtPr>` children. Every field is optional; a property is only
 * present if the matching element was in the source markup. Property order in
 * OOXML is significant (CT_SdtPr schema sequence: `rPr`, `alias`, `tag`, `id`,
 * `lock`, `placeholder`, `dataBinding`,
 * `temporary`, `equation`/`citation`/`bibliography`/`group`/`picture`/`text`/
 * `richText`/`comboBox`/`dropDownList`/`date`/`repeatingSection`/
 * `repeatingSectionItem`, extension elements). The exporter emits them in this
 * sequence to keep documents schema-valid.
 */
export interface EditorSdtPr {
  /** `<w:alias w:val="…"/>` — friendly display name. */
  alias?: string;
  /** `<w:tag w:val="…"/>` — programmatic tag for template automation. */
  tag?: string;
  /** `<w:id w:val="…"/>` — stable content-control id (stored as a string for fidelity). */
  id?: string;
  /** `<w:lock w:val="…"/>` — sdtLocked/contentLocked/sdtContentLocked combinations. */
  lock?: string;
  /**
   * `<w:appearance w:val="…"/>` — boundingBox|tags|hidden. Editor-UI hint, not layout.
   */
  appearance?: "boundingBox" | "tags" | "hidden" | string;
  /** `<w:showingPlcHdr w:val="…"/>` — true when the control currently shows its placeholder text. */
  showingPlcHdr?: boolean;
  /** `<w:temporary w:val="…"/>` — remove the control after the first edit. */
  temporary?: boolean;
  /** `<w:color w:val="…"/>` — UI color of the content-control chrome. */
  color?: string;
  /** `<w:placeholder><w:docPart w:val="…"/></w:placeholder>` — glossary entry name. */
  placeholderDocPart?: string;
  /** `<w:dataBinding>` — custom-XML store binding. */
  dataBinding?: EditorSdtDataBinding;
  /** Recognized content-control subtype element (`<w:text>`, `<w:dropDownList>`, …). */
  subtype?: EditorSdtSubtype;
  /**
   * Serialized XML of every `w:sdtPr` child the parser did not recognize, in
   * document order, so a future-proof round-trip re-emits extension/future-schema
   * elements (e.g. `w15:storeItem`, `w14:*` extension attributes) without loss.
   */
  unknownXml?: string;
}

/** Recognized content-control subtypes (the single typed child of `w:sdtPr`). */
export type EditorSdtSubtype =
  | { kind: "text"; multiline?: boolean }
  | { kind: "richText" }
  | { kind: "picture" }
  | { kind: "group" }
  | { kind: "equation" }
  | { kind: "citation" }
  | { kind: "bibliography" }
  | {
      kind: "comboBox";
      /** Display/value pairs from `<w:listItem>` children. */
      listItems?: EditorSdtListItem[];
      /** `<w:lastSelectedValue w:val="…"/>` if a value was chosen on last save. */
      lastSelectedValue?: string;
    }
  | {
      kind: "dropDownList";
      listItems?: EditorSdtListItem[];
      lastSelectedValue?: string;
    }
  | {
      kind: "date";
      /** `<w:date w:fullDate="…"/>` — the chosen date-time (ISO 8601). */
      fullDate?: string;
      /** `<w:dateFormat w:val="…"/>` — display format string (e.g. `M/d/yyyy`). */
      dateFormat?: string;
      /** `<w:lid w:val="…"/>` — locale id for calendar formatting. */
      lid?: string;
      /** `<w:calendar w:val="…"/>` — gregorian|gregorianUs|gregorianUsFrench|… */
      calendar?: string;
      /** `<w:storeMappedDataAs w:val="…"/>` — storage format for data binding. */
      storeMappedDataAs?: string;
    }
  | {
      kind: "checkbox";
      /** `<w14:checked w14:val="…"/>` — current boolean state (default false). */
      checked?: boolean;
      /** `<w14:checkedState w14:font="…" w14:char="…"/>` — checked-glyph spec. */
      checkedStateFont?: string;
      checkedStateChar?: string;
      /** `<w14:uncheckedState w14:font="…" w14:char="…"/>` — unchecked-glyph spec. */
      uncheckedStateFont?: string;
      uncheckedStateChar?: string;
    }
  | { kind: "repeatingSection" }
  | { kind: "repeatingSectionItem" };

/** Single item in a `<w:comboBox>` or `<w:dropDownList>`. */
export interface EditorSdtListItem {
  /** `<w:listItem w:displayText="…"/>` — what the user sees. */
  displayText?: string;
  /** `<w:listItem w:value="…"/>` — the stored value. */
  value?: string;
}

/** `<w:dataBinding>` — XPath binding into a custom-XML storage part. */
export interface EditorSdtDataBinding {
  /** `<w:prefixMappings w:val="…"/>` — namespace prefixes for the XPath. */
  prefixMappings?: string;
  /** `<w:xpath w:val="…"/>` — the XPath expression selecting the bound node. */
  xpath?: string;
  /** `<w:storeItemID w:val="…"/>` — id of the `customXml/itemN.xml` part. */
  storeItemID?: string;
}

export interface EditorParagraphNode {
  id: string;
  type: "paragraph";
  runs: EditorTextRun[];
  style?: EditorParagraphStyle;
  list?: EditorParagraphListStyle;
  /** Tracked previous numbering metadata from `w:numPr/w:numberingChange`. */
  numberingRevision?: EditorNumberingRevision;
  /** Drop cap that body text in this paragraph wraps around, when present. */
  dropCap?: EditorDropCap;
  /** Enclosing block-level `w:sdt` content controls, preserved for round-trip. */
  sdtWrappers?: EditorSdtBlockWrapper[];
}

export interface EditorTableCellNode {
  id: string;
  /** Ordered block story inside the cell; Word permits paragraphs and tables. */
  blocks: EditorBlockNode[];
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
  /** Semantic previous row table-property exceptions from `w:tblPrExChange`. */
  propertyExceptionsRevision?: EditorPropertyRevision<EditorTableStyle>;
  /** Exact imported `<w:tblPrExChange ...>` retained as a preservation fallback. */
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
  /** Enclosing block-level `w:sdt` content controls, preserved for round-trip. */
  sdtWrappers?: EditorSdtBlockWrapper[];
}

export type EditorBlockNode = EditorParagraphNode | EditorTableNode;
