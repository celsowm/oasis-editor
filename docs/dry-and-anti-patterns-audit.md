# DRY Violations & Anti-Patterns Audit

This document records concrete DRY (Don't Repeat Yourself) violations and
anti-patterns found in the Oasis Editor codebase (~517 TypeScript files). Each
finding was confirmed with `rg` and direct file reads. Line numbers reflect the
state of the code at audit time and may drift as the code evolves.

## How to read this

- **Severity** is a rough prioritization signal (high / med / low), not a strict
  ranking.
- **Fix** is intentionally the smallest correct change, not a large rewrite.
- Findings are grouped into _DRY violations_ and _structural anti-patterns_.

---

## Most severe DRY violations (verified)

### 1. Duplicated magic constant `14.6667` (11pt default font size)

**Severity:** high

Redefined in 10+ files, several as a local `const DEFAULT_FONT_SIZE`:

- `src/core/editorState.ts:239`
- `src/core/model/styleDefaults.ts:70`
- `src/layoutProjection/paragraphPagination.ts:36`
- `src/layoutProjection/tablePagination.ts:11`
- `src/ui/textMeasurement/constants.ts:2`
- `src/ui/canvas/canvasDropCapPainter.ts:8`
- `src/export/pdf/units.ts:6`
- `src/import/docx/sectionProperties.ts:216`
- `src/testing/wordLayoutParity.ts:35`
- `src/ui/canvas/canvasParagraphPainter.ts:323`

**Fix:** Centralize document defaults in a single module
(e.g. `core/documentDefaults.ts`) and import everywhere.

### 2. Repeated OOXML unit conversions (EMU `12700`, percent `100000`, half-points)

**Severity:** high

Conversion literals are scattered across both import and export paths.

- Import: `src/import/docx/runStyle.ts:63,73,103,114,115,130,146-149`
- Export: `src/export/docx/text/runPropertiesXml.ts:96,128`

```ts
// import
const blurPt = blurRaw ? Number(blurRaw) / 12700 : 0;
const alpha = Number(alphaRaw) / 100000;
// export
const blurEmu = Math.round(Math.max(0, shadow.blurPt) * 12700);
const stA = Math.round(reflection.startAlpha * 100000);
```

**Fix:** Add shared constants and helpers: `EMU_PER_POINT = 12700`,
`OOXML_PERCENT = 100000`, `emuToPt`, `ptToEmu`, `ooxmlPercentToUnit`,
`unitToOoxmlPercent`.

### 3. Duplicated hex color parsing / normalization (4+ modules)

**Severity:** high

`.trim().replace(/^#/, "")` plus the `/^[0-9a-fA-F]{6}$/` regex repeated in:

- `src/export/pdf/writer/pdfPrimitives.ts:51`
- `src/export/docx/xmlUtils.ts:53`
- `src/export/docx/text/runPropertiesXml.ts:216`
- `src/export/pdf/draw/drawFragment.ts:91`

**Fix:** A single `color` module: `normalizeHexColor`, `hexToRgb255`,
`hexToRgbUnit`, `blendHexWithWhite`.

### 4. Duplicated table metadata maps between import and export

**Severity:** med

- Conditional flags: `src/import/docx/tableProperties.ts:87` vs
  `src/export/docx/tableXml.ts:51`
- `tblLook` bitmask: `src/import/docx/tableConditionalFormatting.ts:30` vs
  `src/import/docx/tableProperties.ts:342`
- Table margin edges: `src/import/docx/tableProperties.ts:198` vs
  `src/export/docx/tableXml.ts:209`
- Table border edges: `src/export/docx/tableXml.ts:150,478`,
  `src/export/docx/stylesXml.ts:110`

**Fix:** Shared constants (`TABLE_*_EDGES`,
`TABLE_CONDITIONAL_FLAG_ATTRIBUTES`) iterated by both import and export.

### 5. Copy-pasted table commands (horizontal merge/split ≈ vertical)

**Severity:** high

- Command prologue `findLocation → clone → validate → commit selection`
  repeated in `src/app/controllers/tableOpsRowColumnCommands.ts:42,51,152`
- Near-duplicate merge/split logic in
  `src/app/controllers/tableOpsCellSpanCommands.ts:84,189` (merge) and
  `:295,390` (split)

**Fix:** `withSelectedTableMutation(current, deps, mutate)` helper plus
`buildMergedTableCell({ orientation, spanPatch })`.

### 6. Inline text-box geometry duplicated between painting and hit-test/snapshot

**Severity:** high (correctness risk)

A `// Geometry mirrors collectInlineTextBoxesFromLines ...` comment at
`src/ui/canvas/canvasParagraphPainter.ts:443` confirms duplication with
`src/ui/canvas/CanvasLayoutSnapshot.ts:391,593`.

**Fix:** A single
`resolveInlineObjectPaintRect(line, slot, object, origin, state, pageIndex)`
used by both painter and snapshot readers. This is the highest-risk finding:
the two copies can drift, causing click geometry to diverge from rendered
geometry.

### 7. Near-identical single-field dialog components

**Severity:** high

`src/ui/components/Dialogs/LinkDialog.tsx:17`,
`src/ui/components/Dialogs/ImageAltDialog.tsx:17`,
`src/ui/components/Dialogs/ImageCaptionDialog.tsx:17` repeat the same
reset + `setTimeout(focus, 50)` + Enter-to-confirm + footer scaffolding.

```ts
if (props.isOpen) {
  setHref(props.initialHref);
  setTimeout(() => inputRef?.focus(), 50);
}
```

**Fix:** A generic `TextInputDialog` (or `useSingleFieldDialog` hook) plus a
shared `DialogFooter`/`DialogActions` component (also duplicated in
`ParagraphDialog.tsx:206` and `TablePropertiesDialog.tsx:402`).

### 8. Image commands repeat "find → map paragraphs → clone runs → preserve selection"

**Severity:** high

`src/core/commands/image.ts:98,151,341` repeat the same selection-preserving
paragraph remap pattern.

**Fix:** Generalize the existing `patchSelectedImageFloating` into
`patchSelectedImage(state, imageUpdater)` and reuse for resize, rotate, alt,
floating, and polygon.

### 9. Parallel, un-abstracted pagination control flow

**Severity:** high

`src/layoutProjection/paragraphBlockPagination.ts:291,317,413,437` and
`src/layoutProjection/tableBlockPagination.ts:173,230,399,447` repeat the same
"fit segment → push layout block → advance → flush" loop.

**Fix:** A generic `paginateSegments(track, sourceBlock, index, segmenter)`
engine, with paragraph/table-specific measurement and split decisions as
strategy callbacks.

---

## Structural anti-patterns

### 10. God functions / god components

**Severity:** high / med

- `src/export/pdf/draw/drawFragment.ts:572` (`drawFragmentText`): one function
  handles images, tabs, text boxes, gradients, shadow, glow, outline,
  reflection, chunking, and text emission.
- `src/ui/components/Dialogs/TablePropertiesDialog.tsx:150-349`: 40+ local
  signals; should be split into per-tab subcomponents with a form store.
- `src/import/docx/importDocxToEditorDocument.ts:59` and
  `src/export/docx/exportEditorDocumentToDocx.ts:140`: orchestrate dozens of
  unrelated DOCX parts; split into small `read/parse/build/write` steps.
- `src/app/controllers/useEditorSurfaceEvents.ts:84`: 600+ lines mixing
  hit-testing, zone switching, selection, dragging, and image/textbox behavior.
- `src/app/controllers/EditorCommandsController.ts`: god controller repeating
  command ceremony (`clearPreferredColumn` → `resetTransactionGrouping` →
  apply → `focusInput`).

### 11. Unnamed magic numbers

**Severity:** med / low

- `Date.now() - lastMouseDownAt <= 600 && distance <= 8`
  (`src/app/controllers/useEditorSurfaceEvents.ts`)
- `const tolerance = 1.5` (`src/layoutProjection/paragraphBlockPagination.ts:317`)
- `cell.style?.noWrap ? 100000 : cellContentWidth`
  (`src/layoutProjection/tablePagination.ts:255`)
- `TEXT_BOX_AUTOFIT_SAFETY_PX = 2`
  (`src/layoutProjection/paragraphBlockPagination.ts:28`)
- Canvas dash arrays `[5, 3]` / `[1, 3]` and wavy-underline parameters
  (`offset = 1.3`, `amplitude = 1.5`, `wavelength = 4`) in
  `src/ui/canvas/canvasBorders.ts` and `src/ui/canvas/canvasParagraphPainter.ts`.

**Fix:** Replace with named constants documenting units/source; move shared
layout/drawing constants into dedicated modules.

### 12. Repeated canvas text style / font setup

**Severity:** med

`src/ui/canvas/canvasParagraphPainter.ts:323-329,359-368,544-558` and
`src/ui/canvas/verticalText.ts:272-278` repeat font-string assembly:

```ts
const fontWeight = styles.bold ? "700" : "400";
const fontStyle = styles.italic ? "italic" : "normal";
ctx.font = `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`;
```

**Fix:** `resolveCanvasRunPaintStyle(styles)` returning
`{ font, fillStyle, renderMetrics, scale }` plus a `withCanvasTextStyle` helper.

### 13. Duplicated selection/range clamping math

**Severity:** med

`src/core/editorState.ts:572,590,596,633,651,654` repeat
`Math.max(0, Math.min(value, length - 1))` index clamping across
`createEditorStateFromTexts` and `createEditorStateFromParagraphRuns`.

**Fix:** Shared helpers `clampIndex`, `resolveSelectionIndexes`,
`createSelectionFromParagraphOffsets`.

### 14. Manual repeated table border propagation

**Severity:** med

`src/import/docx/tableProperties.ts:768` has six near-identical conditional
blocks of the form "if edge applies and style is missing, assign border".

**Fix:** `applyBorderIfMissing(style, key, border, condition)` driven by an edge
rule table.

---

## Suggested prioritization

```
Do first (low risk, high payoff)
  - #1 documentDefaults    - #2 OOXML units
  - #3 hex color           - #11 named constants

Medium term (refactor with tests)
  - #4 table maps          - #5 table commands
  - #6 inline geometry (click != render bug risk)
  - #7 dialogs             - #8 image commands

Larger (architectural)
  - #9 pagination engine   - #10 god functions
  - #12 canvas text style
```

The **inline text-box geometry duplication (#6)** is the most dangerous: the
geometry is maintained in two places with a comment admitting the mirroring, so
future tweaks tend to diverge between click handling and rendering.

The quick wins (#1, #2, #3, #11) are mechanical and covered by the
`test:word-parity` suite, making them safe to land first.
