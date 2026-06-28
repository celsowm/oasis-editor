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

**Severity:** high — **Status: ✅ resolved.** Centralized as
`DEFAULT_FONT_SIZE_PX` in `src/core/units.ts`; layer modules re-export it.

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

**Severity:** high — **Status: ✅ resolved.** EMU/twips factors plus
`OOXML_PERCENT_DENOMINATOR` and `OOXML_ROTATION_UNITS` now live solely in
`src/core/units.ts`; `import/docx/units.ts`, `import/docx/runs/units.ts` and
`export/docx/text/constants.ts` re-export them.

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

**Severity:** high — **Status: ✅ resolved.** `src/core/color.ts` is now the
single source (`stripHashPrefix`, `normalizeHex6`, `parseHexColorToRgb255`,
`rgb255ToHex`); PDF/DOCX export and the DOCX import path consume it instead of
re-deriving the `/^[0-9a-fA-F]{6}$/` regex.

`.trim().replace(/^#/, "")` plus the `/^[0-9a-fA-F]{6}$/` regex repeated in:

- `src/export/pdf/writer/pdfPrimitives.ts:51`
- `src/export/docx/xmlUtils.ts:53`
- `src/export/docx/text/runPropertiesXml.ts:216`
- `src/export/pdf/draw/drawFragment.ts:91`

**Fix:** A single `color` module: `normalizeHexColor`, `hexToRgb255`,
`hexToRgbUnit`, `blendHexWithWhite`.

### 4. Duplicated table metadata maps between import and export

**Severity:** med — **Status: ✅ resolved.**

New `src/core/docxTableMaps.ts` exports:
- `TABLE_CONDITIONAL_FLAG_ATTRIBUTES` — the 12-entry `[xmlAttr, modelKey][]`
  map consumed by `import/docx/tableProperties.ts` (parse) and
  `export/docx/tableXml.ts` (serialize)
- `TABLE_BORDER_EDGE_KEYS` — the 6-entry `[xmlTag, modelKey][]` map consumed by
  `export/docx/tableXml.ts` and `export/docx/stylesXml.ts`

The `tblLook` bitmask and cell-margin edge iteration were different enough (bit
flags vs XML child lookup) to not warrant further sharing at this time.

### 5. Copy-pasted table commands (horizontal merge/split ≈ vertical)

**Severity:** high — **Status: ✅ resolved.**

Two helpers added to `src/app/controllers/tableOpsMutationCommands.ts`:
- `resolveLocationTableMutation(current, getTargetBlocks)` — collapses the
  13-line `findParagraphTableLocation → cloneBlocks → tableBlock validate`
  prologue to 3 lines; used in all 4 row/column commands and both split-cell
  commands (6 call sites).
- `commitTableMutation(current, targetBlocks, zone, nextParagraph)` — collapses
  the 7-line commit-and-set-selection epilogue to 1 line; used in 13 places
  across both files.

Net result: 657 + 470 → 487 + 400 lines (−240 in the two controller files, +39
in the mutations file; net **−201 lines**).

### 6. Inline text-box geometry duplicated between painting and hit-test/snapshot

**Severity:** high (correctness risk) — **Status: ✅ resolved.** Added
`resolveInlineObjectRect(...)` in `src/ui/canvas/canvasInlineReaders.ts`,
the single source for the bottom-aligned inline rect formula. The painter
(`canvasParagraphPainter.ts`) and the snapshot readers
(`collectInlineImagesFromLines` / `collectInlineTextBoxesFromLines`) now both
call it, so click geometry can no longer drift from rendered geometry. Slot
resolution stays at each call site.

Original finding: a `// Geometry mirrors collectInlineTextBoxesFromLines ...`
comment at `src/ui/canvas/canvasParagraphPainter.ts:443` confirmed duplication
with `src/ui/canvas/CanvasLayoutSnapshot.ts:391,593`.

### 7. Near-identical single-field dialog components

**Severity:** high — **Status: ✅ resolved.**

New `src/ui/components/Dialogs/TextInputDialog.tsx` holds the shared
`createSignal` / `createEffect` / focus / Enter-to-confirm / footer scaffolding.
`LinkDialog`, `ImageAltDialog`, `ImageCaptionDialog` are now thin wrappers (≈15
lines each) that pass i18n strings and optional `testIds` through.

New `src/ui/components/Dialogs/DialogFooter.tsx` extracts the cancel+confirm
button pair; used by `TextInputDialog`, `ParagraphDialog`, and
`TablePropertiesDialog` (5 call sites total, replacing 5× 14-line inline blocks).

### 8. Image commands repeat "find → map paragraphs → clone runs → preserve selection"

**Severity:** high — **Status: ✅ resolved.**

New `patchSelectedImage(state, updater)` holds the common scaffolding (get
selected run, clone paragraphs, patch matched run, preserve selection).
`resizeSelectedImage`, `rotateSelectedImage`, `setSelectedImageAlt` are now
one-liners; `patchSelectedImageFloating` delegates to it too. `setImageWrapPolygon`
matches by run id rather than selection so stays separate.

### 9. Parallel, un-abstracted pagination control flow

**Severity:** high — **Status: ✅ resolved.**

New `src/layoutProjection/paginationSegmentEngine.ts` exports
`PaginationSegmenter` interface and `paginateSegments(track, sourceId, segmenter)`
function. The engine owns the outer `while`/flush/push/flush skeleton;
callers supply `hasMore`, `fit`, `force`, `onBeforeFlush`, and `onAfterPush`
callbacks.

`paragraphBlockPagination.ts`: main segment loop replaced with a
`paginateSegments` call; duplicate "undo contextual spacing + flush" block
(appeared twice) collapsed into the single `onBeforeFlush` callback; floating
exclusion registration moved to `onAfterPush`.

`tableBlockPagination.ts`: main segment loop replaced with a `paginateSegments`
call; `buildTableBlock` and `advanceCursor` extracted as file-local helpers
shared by `fit` and `force`, eliminating the cursor-advance duplication.

Net: +1 new file (~65 lines), paragraph file −40 lines, table file −60 lines.

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
- `src/app/controllers/EditorCommandsController.ts`: ~~god controller repeating
  command ceremony (`clearPreferredColumn` → `resetTransactionGrouping` →
  apply → `focusInput`).~~ **✅ resolved.** Four ceremony wrappers
  (`execState`, `execText`, `execParagraph`, `execTransactional`) added at the
  top of the factory function; 20 of 22 command functions replaced with
  one-liner calls. Two exceptions left manual: `handleListEnter` (branches two
  different `apply*` calls inside shared ceremony) and
  `handleListBoundaryBackspace` (extra `event.currentTarget.value = ""`
  between apply and `focusInput`). Net: 520 → 375 lines (−145).

### 11. Unnamed magic numbers

**Severity:** med / low — **Status: ✅ resolved.**

All originally-flagged magic numbers are now named constants:

- `REUSE_MOUSE_DOWN_HIT_MAX_AGE_MS = 600` / `…DISTANCE_PX = 8`
  (`src/app/controllers/useEditorSurfaceEvents.ts`) — was already named
- `PARAGRAPH_FIT_HEIGHT_TOLERANCE_PX = 1.5`
  (`src/layoutProjection/paragraphBlockPagination.ts`)
- `NO_WRAP_MEASURE_WIDTH_PX = 100000`
  (`src/layoutProjection/tablePagination.ts`) — was already named
- `TEXT_BOX_AUTOFIT_SAFETY_PX = 2`
  (`src/layoutProjection/paragraphBlockPagination.ts`) — was already named
- `CANVAS_DASH_DASHED = [5, 3]` / `CANVAS_DASH_DOTTED = [1, 3]` exported from
  `src/ui/canvas/canvasBorders.ts`; consumed by `canvasParagraphPainter.ts` and
  `canvasTablePainter.ts`
- `DOUBLE_STRIKE_OFFSET_PX = 1.3`, `DOUBLE_UNDERLINE_OFFSET_PX = 1.5`,
  `WAVY_UNDERLINE_AMPLITUDE_PX = 1.5`, `WAVY_UNDERLINE_WAVELENGTH_PX = 4`
  (`src/ui/canvas/canvasParagraphPainter.ts`)

### 12. Repeated canvas text style / font setup

**Severity:** med — **Status: ✅ resolved.**

`resolveCanvasRunPaintStyle(styles)` exported from
`src/ui/canvas/canvasFontResolution.ts` returns `{ font, fillStyle, renderMetrics, scale }`.
The 5 call sites that previously inlined `fontWeight`/`fontStyle`/`ctx.font`
assembly now call it instead:

- `canvasParagraphPainter.ts`: list prefix, fragment loop, trailing hyphen
- `canvasDropCapPainter.ts`: drop cap glyph
- `verticalText.ts`: stacked glyph loop

Net: ~−20 lines across the 5 sites.

### 13. Duplicated selection/range clamping math

**Severity:** med

`src/core/editorState.ts:572,590,596,633,651,654` repeat
`Math.max(0, Math.min(value, length - 1))` index clamping across
`createEditorStateFromTexts` and `createEditorStateFromParagraphRuns`.

**Fix:** Shared helpers `clampIndex`, `resolveSelectionIndexes`,
`createSelectionFromParagraphOffsets`.

### 14. Manual repeated table border propagation

**Severity:** med — **Status: ✅ resolved.**

`applyBorderIfMissing(style, key, border, condition)` added as a file-local
helper in `src/import/docx/tableProperties.ts`. The 6 × 5-line conditional
blocks in `applyTableBordersToRows` collapsed to 6 one-liner calls (−24 lines).

---

## Suggested prioritization

```
Done
  - #1 documentDefaults    - #2 OOXML units
  - #3 hex color           - #6 inline geometry (click != render risk)
  - #11 named constants

Done (continued)
  - #4 table maps          - #13 selection clamping
  - #8 image commands      - #5 table commands

Do next (medium refactor)

Done (continued 2)
  - #7 dialogs          - #14 border propagation

Done (continued 3)
  - #12 canvas text style  - #9 pagination engine

Larger (architectural)
  - #10 god functions
```

The **inline text-box geometry duplication (#6)** is the most dangerous: the
geometry is maintained in two places with a comment admitting the mirroring, so
future tweaks tend to diverge between click handling and rendering.

The quick wins (#1, #2, #3, #11) are mechanical and covered by the
`test:word-parity` suite, making them safe to land first.
