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

- `src/export/pdf/draw/drawFragment.ts` (`drawFragmentText`): ~~one function
  handles images, tabs, text boxes, gradients, shadow, glow, outline,
  reflection, chunking, and text emission.~~ **✅ resolved.** The ~90-line
  `emitChunk` closure (emboss/imprint, glow, shadow, reflection, gradient,
  outline, primary text) extracted to top-level `emitTextChunk(ctx, leftPx,
  text)` with a `TextChunkCtx` context object. `drawFragmentText` is now
  ~265 lines; all other concerns (image, textbox, highlight, shading, border,
  tab leaders, decorations, emphasis) were already dedicated top-level
  functions. Net: `drawFragmentText` −90 lines, `emitTextChunk` +100 lines
  (new top-level function).
- `src/ui/components/Dialogs/TablePropertiesDialog.tsx`: ~~40+ local signals;
  should be split into per-tab subcomponents with a form store.~~ **✅
  resolved.** 40+ `createSignal` calls replaced with one
  `createStore<TableFormState>` + `reconcile` reset. Five per-tab subcomponents
  (`TableTabPanel`, `RowTabPanel`, `ColumnTabPanel`, `CellTabPanel`,
  `AltTextTabPanel`) each own their slice of JSX and call `useI18n()` directly.
  `numericInput` / `checkbox` JSX factories moved to module level. Main
  `TablePropertiesDialog` component: 900 lines → ~80 lines (store init + effect
  + `handleApply` + `<Tabs>` wiring). Total file: 1030 → 880 lines (−150).
- ~~`src/import/docx/importDocxToEditorDocument.ts` and
  `src/export/docx/exportEditorDocumentToDocx.ts`: orchestrate dozens of
  unrelated DOCX parts; split into small `read/parse/build/write` steps.~~
  **✅ resolved (DRY pass).** Import: `walkSectionBlocks` helper eliminates the
  8-line zone-iteration loop duplicated in both remap functions; `finalize`
  settings patch collapsed from 6 × 4-line `doc.settings = { ...(doc.settings
  ?? {}), ... }` blocks into a single `settingsPatch` object spread (−22 lines).
  Export: `annotateContext` helper eliminates the 4-line id-map annotation block
  duplicated for bodyContext and each header/footer part context; `writeNotePart`
  helper collapses the identical 7-line footnotes/endnotes write blocks into two
  one-liner calls (−20 lines).
- ~~`src/app/controllers/useEditorSurfaceEvents.ts:84`: 600+ lines mixing
  hit-testing, zone switching, selection, dragging, and image/textbox behavior.~~
  **✅ resolved.** `handleSurfaceMouseDown` (245 lines, 7 dispatch branches)
  decomposed into 6 named closure handlers defined just before it:
  `handleZoneTransitionDown`, `handleTextBoxDown`, `handleImageDown`,
  `handleShiftClickDown`, `handleTripleClickDown`, `handleDoubleClickDown`. The
  main function shrinks to ~70 lines (shared setup + dispatch table). All 6
  handlers close over `dragAnchor`, `stopDragging`, `deps`, and `applyWithZone`
  — no parameter bloat needed.
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

**Severity:** med — **Status: ✅ resolved.**

`clampTo(value, max)` and `resolveSelectionIndexes(selection, paragraphCount)`
already extracted in `src/core/editorState.ts`. All `Math.max(0, Math.min(...))`
call sites use `clampTo`; block-index resolution is centralised in
`resolveSelectionIndexes`, shared by both `createEditorStateFromTexts` and
`createEditorStateFromParagraphRuns`.

### 14. Manual repeated table border propagation

**Severity:** med — **Status: ✅ resolved.**

`applyBorderIfMissing(style, key, border, condition)` added as a file-local
helper in `src/import/docx/tableProperties.ts`. The 6 × 5-line conditional
blocks in `applyTableBordersToRows` collapsed to 6 one-liner calls (−24 lines).

### 15. Duplicated GSUB/GPOS lookup parsing between GsubTable and GposTable

**Severity:** med — **Status: ✅ resolved.**

Generic `parseLookupList<TSubtable>(reader, lookupListOffset, parseSubtable)`
exported from `otLayoutCommon.ts`. Both `GsubTable.ts` and `GposTable.ts`
deleted their local 24-line copies and call the shared function, passing their
own `parseSubtable` as a callback. Net: **~−25 lines** across the two files.

### 16. `readU16Array` — count+fill loop duplicated across OpenType parsers

**Severity:** high — **Status: ✅ resolved.**

`readU16Array(reader, count)` and `readU16OffsetArray(reader, count, baseOffset)`
exported from `otLayoutCommon.ts`. Applied across **19 sites** in `GsubTable.ts`,
`GposTable.ts`, and `otLayoutCommon.ts` itself. Net: ~−60 lines across the three
files.

### 17. `readU16OffsetArray` — count+fill with base-relative offsets duplicated across OpenType parsers

**Severity:** high — **Status: ✅ resolved** (fixed together with #16 above).

### 18. Degree-to-radian inline conversion repeated in canvas painters

**Severity:** low — **Status: ✅ resolved.**

`DEG_TO_RAD = Math.PI / 180` exported from `canvasBorders.ts`. Applied at
**5 sites** across `canvasParagraphPainter.ts` (×4) and `canvasTextBoxPainter.ts`
(×1). All `(x * Math.PI) / 180` expressions replaced with `x * DEG_TO_RAD`.

---

### 19. Identical highlight/shading rect drawing in canvas and PDF painters

**Severity:** high (correctness risk)

**Canvas:** `drawFragmentHighlight` and `drawFragmentShading` in
`src/ui/canvas/canvasParagraphPainter.ts` (~lines 599–673): two ~15-line
functions sharing the same `resolveFragmentPaintBounds` guard, `ctx.save/restore`,
and `fillRect` geometry; only `globalAlpha = 0.35` distinguishes them.

**PDF:** `drawFragmentHighlight`, `drawFragmentShading`, and `drawFragmentBorder`
in `src/export/pdf/draw/drawFragment.ts` (~lines 105–244): three functions each
repeating the same 7-line `resolveFragmentBounds → writer.drawRect(pxToPt(…))`
block.

**Status: ✅ resolved.**

- Canvas: `drawFragmentColorRect(ctx, line, fragment, originX, originY, color, alpha?)` 
  extracted; `drawFragmentHighlight` and `drawFragmentShading` reduced to 1-liners.
- PDF: `fragmentRectPt(line, fragment, styles, originX, originY, yOffset, heightShrink)`
  extracted; all three functions reduced to 2-liners (guard + spread into `drawRect`).
  Net: canvas −10 lines, PDF −14 lines.

### 20. Hex color parsing repeated 3× in canvas painter

**Severity:** med — **Status: ✅ resolved.**

`parseHexColorToRgb255` from `@/core/color.js` (already used in the PDF path) now
imported into `canvasParagraphPainter.ts`. A private `hexToRgba(color, alpha)`
helper replaces the 4-line `parseInt(slice…)` × 3 blocks for gradient stops,
`textShadow`, and `glow`. Net: −9 lines.

### 21. Wavy underline constants split between canvas and PDF

**Severity:** med — **Status: ✅ resolved.**

`WAVY_UNDERLINE_AMPLITUDE_PX = 1.5` and `WAVY_UNDERLINE_WAVELENGTH_PX = 4`
exported from `src/core/textStyleMappings.ts` (already imported by both painters).
`canvasParagraphPainter.ts` removed its local `const` definitions; `drawFragment.ts`
removed its inline `const wavelength = 4; const amplitude = 1.5;`. Net: −4 lines,
single source of truth for wavy underline geometry.

### 22. Explicit row height check repeated 3× in CanvasTableLayout

**Severity:** low — **Status: ✅ resolved.**

`const hasExplicitRowHeight = explicitRowHeightPx !== null && explicitRowHeightPx > 0`
hoisted once after `parseDimensionToPx` in `src/ui/canvas/CanvasTableLayout.ts`.
Two inner-scope redeclarations removed. Net: −2 lines.

## Suggested prioritization

```
Done
  - #1 documentDefaults    - #2 OOXML units
  - #3 hex color           - #6 inline geometry (click != render risk)
  - #11 named constants

Done (continued)
  - #4 table maps          - #13 selection clamping
  - #8 image commands      - #5 table commands

Done (continued 2)
  - #7 dialogs          - #14 border propagation

Done (continued 3)
  - #12 canvas text style  - #9 pagination engine

Done (continued 4)
  - #10 god functions

Do next
  - #16 readU16Array       - #17 readU16OffsetArray (same files, same fix shape)
  - #15 parseLookupList    - #18 deg-to-rad (trivial)
  - #13 selection clamping (editorState.ts)
```

The **inline text-box geometry duplication (#6)** is the most dangerous: the
geometry is maintained in two places with a comment admitting the mirroring, so
future tweaks tend to diverge between click handling and rendering.

The quick wins (#1, #2, #3, #11) are mechanical and covered by the
`test:word-parity` suite, making them safe to land first.

---

## New findings — June 2026 audit

### 23. Inline unit conversions `96/72` and `72/96` repeated 5+ times

**Severity:** med — **Status: ✅ resolved.** All inline `96/72` and `72/96` expressions replaced with `PX_PER_POINT` / `PT_PER_PX` from `src/core/units.ts` across 4 files.

Constants `PX_PER_POINT` and `PT_PER_PX` already exist in `src/core/units.ts` but are not universally imported. Redefined locally in:

- `src/core/html/styleCss.ts` lines 92, 98, 99, 102, 114 (`96 / 72` × 5)
- `src/app/controllers/useEditorTableDrag.ts` line 124 (`72 / 96`)
- `src/ui/textMeasurement/composer.ts` line 38 (`PT_TO_PX = 96 / 72` local const)
- `src/testing/wordLayoutParity.ts` line 35 (`PX_TO_POINTS = 72 / 96` local const)

**Fix:** Replace all inline `96 / 72` / `72 / 96` expressions with imports of `PX_PER_POINT` / `PT_PER_PX` from `src/core/units.ts`.

---

### 24. Hit-test scoring formula `* 1000` duplicated 4×

**Severity:** med — **Status: ✅ resolved.** `VERTICAL_HIT_WEIGHT = 1000` extracted to `src/core/layoutConstants.ts` and imported at all 3 hit-test sites.

Identical code:
```ts
const score = verticalDelta * 1000 + horizontalDelta;
```
appears in:

- `src/layoutProjection/paragraphPagination.ts` line 499
- `src/ui/caretGeometry.ts` line 203
- `src/ui/canvas/CanvasHitTestService.ts` lines 85, 157

**Fix:** Define `VERTICAL_DISTANCE_WEIGHT = 1000` in `src/core/hittestConstants.ts` (or `units.ts`) and import at all 4 sites.

---

### 25. Text baseline ratio `0.8` repeated across canvas and PDF

**Severity:** med — **Status: ✅ resolved.** `TEXT_BASELINE_RATIO = 0.8` extracted to `src/core/layoutConstants.ts` and applied across canvas and PDF draw sites. The small-caps `0.8` in `drawFragment.ts` was intentionally left as an inline literal (different semantic).

The same ratio for computing text baseline Y position appears without a named constant in:

- `src/ui/canvas/canvasParagraphPainter.ts` lines 206, 384
- `src/export/pdf/draw/drawFragment.ts` line 206
- `src/export/pdf/draw/lists.ts` line 70

**Fix:** Define `TEXT_BASELINE_RATIO = 0.8` in a shared constants module; same pass should name `SMALL_CAPS_SCALE = 0.8` (different semantic) and `SUPERSCRIPT_SUBSCRIPT_SCALE = 0.75` — all currently inline in `src/ui/textMeasurement/fontMetrics.ts` line 38, `src/ui/canvas/canvasFontResolution.ts` lines 68, 74, 80, `src/export/pdf/draw/drawFragment.ts` line 203.

---

### 26. `NO_WRAP_MEASURE_WIDTH_PX = 100000` defined three times

**Severity:** low — **Status: ✅ resolved.** Single `NO_WRAP_MEASURE_WIDTH_PX = 100000` in `src/core/layoutConstants.ts`; all 3 local definitions removed and unified to the same name.

Note: `src/layoutProjection/tablePagination.ts` already has a named constant, but it is redefined independently in:

- `src/layoutProjection/tableBlockPagination.ts` line 15
- `src/ui/tableGeometry.ts` line 17
- `src/ui/canvas/table/prepareCells.ts` line 31

**Fix:** Export the single constant from `src/core/units.ts` (or the existing `tablePagination.ts`) and import at the other three sites.

---

### 27. Rounding precision multipliers `100` / `10000` repeated inline

**Severity:** low — **Status: ✅ resolved.** `roundTo(value, decimals)` helper added in `src/utils/round.ts`; replaces all `Math.round(x * N) / N` patterns across 12 files.

`Math.round(x * 10000) / 10000` (4-decimal precision) and `Math.round(x * 100) / 100` (2-decimal) scattered without named constants:

- `src/utils/performanceMetrics.ts` lines 61, 88, 97, 201 (`* 100`)
- `src/import/docx/borders.ts` line 33 (`* 10000`)
- `src/import/docx/tableProperties.ts` lines 66, 594 (`* 10000`)
- `src/import/docx/units.ts` lines 38, 49 (`* 10000`)
- `src/ui/fontSizeUnits.ts` line 42 (`* 10000`)

**Fix:** A small `round2(x)` / `round4(x)` utility, or named constants `PRECISION_2 = 100` / `PRECISION_4 = 10000`.

---

### 28. `DEFAULT_CARET_HEIGHT = 28` hard-coded 4× in caretGeometry

**Severity:** low — **Status: ✅ resolved.** `const DEFAULT_CARET_HEIGHT_PX = 28` added at top of `src/ui/caretGeometry.ts`; all 4 literal occurrences replaced.

Literal `28` appears as caret height fallback in `src/ui/caretGeometry.ts` lines 32, 49, 100, 102 without a named constant.

**Fix:** `const DEFAULT_CARET_HEIGHT_PX = 28;` at the top of the file.

---

### 29. Imported document content logged at `info` level

**Severity:** high (privacy/security) — **Status: ✅ resolved.** Downgraded to `logger.debug`; removed raw paragraph text from the payload (replaced with `textLength` counter).

`DocumentImporter.ts` collects `firstParagraphs` (raw text, up to 160 chars × 30 paragraphs, plus styles and metadata) and sends it via `deps.logger.info("import:document-diagnostics", ...)`. The logger only suppresses `debug`; `info` always reaches `console.info` — including in production builds or telemetry-collecting environments.

**Fix:** Downgrade to `logger.debug`, strip paragraph text content from the payload, or gate behind an explicit env flag (`OASIS_DEBUG_IMPORT_CONTENT=1`).

---

### 30. Hyphenation state is implicit global in `paragraphPagination.ts`

**Severity:** med — **Status: ✅ resolved.** `LayoutProjectionContext` struct introduced in `paragraphPagination.ts`; threaded explicitly through the entire layout pipeline (`sectionPagination` → `blocksPagination` → `paragraphBlockPagination`/`tableBlockPagination`/`tableRowSlicing`/`headerFooterFootnotes`). Module-level globals and `setActiveHyphenation` removed.

`activeHyphenation` and `activeHyphenationSignature` are module-level variables set once by `setActiveHyphenation()` and read inside `projectParagraphLayout` without passing through the call chain. This creates invisible, non-reentrant coupling that will cause phantom bugs if layout ever runs in parallel, inside a shared worker, or for multiple simultaneous documents.

**Fix:** Create a `LayoutProjectionContext` struct and thread `hyphenation` explicitly through `projectParagraphLayout` / `projectParagraphLayoutWithExclusions`.

---

### 31. Lint and format scripts exclude `.tsx` files

**Severity:** med — **Status: ✅ resolved.** Lint now covers `--ext .ts,.tsx`; format covers `src/**/*.{ts,tsx}`; `typecheck` script (`tsc --noEmit`) added to `package.json`.

`package.json` lint runs `eslint src --ext .ts`; format runs `prettier --write "src/**/*.ts"`. `.tsx` components — which include large interactive dialogs — are never checked for `no-console`, `no-explicit-any`, unused vars, etc.

**Fix:**
```json
"lint": "eslint src site tests --ext .ts,.tsx",
"format": "prettier --write \"{src,site,tests}/**/*.{ts,tsx}\""
```

---

### 32. `src/packages/vue` is live code excluded from `tsconfig.json`

**Severity:** med — **Status: ✅ resolved.** `src/packages/` deleted; typed adapter sources now live in `src/adapters/` (covered by typecheck). Exclude removed from `tsconfig.json`.

`tsconfig.json` includes `src`, `site`, `tests` but excludes `src/packages`. The Vue adapter in `src/packages/vue/index.ts` contains real-looking adapter code with `Function as unknown as …` casts and "in a real impl…" comments, but it is never type-checked.

**Fix:** Either delete `src/packages/vue` (if superseded by the generated adapter), or add it to `tsconfig.json` includes and fix the types, or make it the source of truth that `scripts/build-adapters.mjs` compiles instead of generating strings.

---

### 33. `scripts/build-adapters.mjs` generates adapter code as template strings

**Severity:** med — **Status: ✅ resolved.** `scripts/build-adapters.mjs` deleted; adapters live as typed source in `src/adapters/{ui,react,vue}.ts`; `vite.adapters.config.js` compiles them with `oasis-editor`/`react`/`vue` externalized and generates `.d.ts` via `vite-plugin-dts`.

`build-adapters.mjs` writes `ui.js`, `react.js`, `vue.js` and their `.d.ts` files by string concatenation. The generated JS and its type declarations are never type-checked before publish, making refactors silently break consumers at runtime.

**Fix:** Keep adapters in `src/adapters/react.tsx`, `src/adapters/vue.ts`, etc. and let Vite/Rollup emit the subpath exports. If string generation is kept, run `tsc --noEmit` on a temp copy of the output before publish.

---

### 34. IndexedDB `putItem`/`deleteItem` resolve on `request.onsuccess`, not `transaction.oncomplete`

**Severity:** med — **Status: ✅ resolved.** Both `putItem` and `deleteItem` now resolve in `transaction.oncomplete` and reject in `transaction.onerror`/`transaction.onabort`. Covered by new vitest tests using `fake-indexeddb`.

In `src/…/indexeddb.ts`, both `putItem` and `deleteItem` resolve the returned `Promise` inside `request.onsuccess`. A request can succeed while its enclosing transaction still aborts, causing a resolved promise that maps to uncommitted data.

**Fix:** Move the resolve to `transaction.oncomplete` and reject on `transaction.onerror` / `transaction.onabort`.

---

### 35. HTML/clipboard `<img src>` accepted without URL policy

**Severity:** high (security) — **Status: ✅ resolved.** `isAllowedImageSrc()` helper added to `src/core/html/inlineImageParser.ts`; only `data:image/` and `blob:` schemes accepted. Covered by 5 new vitest tests.

The clipboard HTML parser does `template.innerHTML = html` and then `parseInlineImage` accepts any non-empty `src` attribute, forwarding it into the document model without validation.

**Fix:** Allowlist only `data:image/…;base64,…` and `blob:` URLs controlled by the app; block `http(s)` by default; validate MIME type and payload size before converting to an image run.

---

### 36. `drawFragmentText` still handles too many concerns

**Severity:** med — **Status: open**

After the previous refactor (#10), `drawFragmentText` still decides: inline image, inline textbox, effective styles, link annotation, shading/highlight/border, tab leaders, text chunks, hyphenation, underline/strike/emphasis. Each new visual effect increases regression risk across all other concerns.

**Fix:** Decompose into a small explicit pipeline:
```ts
drawInlineObjectIfAny(...)
drawTextBackground(...)    // shading / highlight / border
drawTextGlyphs(...)        // chunks + hyphenation
drawTextDecorations(...)   // underline / strike / emphasis
drawAnnotations(...)       // links
```
