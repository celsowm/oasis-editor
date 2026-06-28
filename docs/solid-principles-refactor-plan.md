# SOLID Principles Refactor Plan

> Status: proposed.
> Scope: the five largest source files (by line count), all of which concentrate
> multiple responsibilities in one module or one function:
> - [`canvasParagraphPainter.ts`](../src/ui/canvas/canvasParagraphPainter.ts) — 1187 lines
> - [`families.ts`](../src/layoutProjection/presetGeometry/families.ts) — 1168 lines
> - [`TablePropertiesDialog.tsx`](../src/ui/components/Dialogs/TablePropertiesDialog.tsx) — 1092 lines
> - [`drawFragment.ts`](../src/export/pdf/draw/drawFragment.ts) — 957 lines
> - [`CanvasTableLayout.ts`](../src/ui/canvas/CanvasTableLayout.ts) — 950 lines
>
> Compatibility: **greenfield** — internal signatures change as needed, no
> backward-compat shims or feature flags. Fix the wrong thing at the source.

## 1. Problem

These files have grown into "god modules": each one mixes several unrelated
rendering/UI/layout concerns behind a single name. The cost is concrete:

- A change to text-effect rendering (glow, shadow, reflection) forces a reader to
  scan a 1000-line file and risks touching image, decoration, or table-box code.
- The Canvas painter and the PDF painter independently reimplement the *same*
  concerns (decoration geometry, tab leaders, emphasis glyphs, gradient axis,
  fragment paint bounds) with subtly divergent magic numbers. There is no shared
  contract, so they drift.
- The table layout builder is one 630-line function doing three sequential passes,
  so it cannot be unit-tested pass-by-pass.

This is primarily a **Single Responsibility** (SRP) problem, with a secondary
**Dependency Inversion / Open–Closed** (DIP/OCP) opportunity where Canvas and PDF
share rendering intent but not code.

This plan does not change any rendered output. It is a pure structural refactor;
every phase must keep the existing test suite green.

## 2. Goals

1. No source file over ~400 lines after the refactor (soft target, not a hard
   rule — `families.ts` is a justified exception, see §3.2).
2. Each new module has one reason to change, named for that reason.
3. The Canvas and PDF painters share a single source of truth for the geometry
   and constants they currently duplicate.
4. `buildCanvasTableLayout` reads as three named, individually testable passes.
5. Zero behavior change: same pixels on canvas, same bytes in PDF (verified by
   existing snapshot/inflation tests).

Out of scope: introducing a new rendering abstraction layer that unifies Canvas
and PDF into one drawer interface. That is a larger architectural bet tracked
separately; this plan only extracts *shared pure helpers*, not a shared drawer.

## 3. Per-file analysis & target structure

### 3.1 `canvasParagraphPainter.ts` — SRP: failing

Today this single file owns 7+ concerns: paragraph/line orchestration, inline
image drawing (crop/rotate/flip/tile), inline text-box dispatch, list-prefix
drawing, glyph-level text effects (shadow/glow/emboss/imprint/outline/reflection),
text decorations (underline variants/strike/double-strike), tab leaders, emphasis
marks, shading, highlight, and run borders.

Proposed split under [`src/ui/canvas/paragraph/`](../src/ui/canvas/):

| New module | Responsibility | Moved from |
| --- | --- | --- |
| `drawParagraph.ts` | Orchestration only: iterate lines/fragments, dispatch | `drawParagraph` |
| `canvasInlineImage.ts` | Inline image fragment incl. crop/rotate/flip/tile | `drawImageFragment`, `clamp01` |
| `canvasFloatingImages.ts` | Floating image layer placement | `drawFloatingImagesForParagraph` |
| `canvasTextEffects.ts` | Glyph effects + scaled/styled text | `drawStyledText`, `drawScaledText`, `drawTextFragment`, `drawFragmentReflection` |
| `canvasTextDecoration.ts` | Underline/strike/wavy/double | `drawTextDecoration`, `drawUnderlineWithStyle`, `drawWavyLine` |
| `canvasRunBackground.ts` | Shading, highlight, run border, color rect | `drawFragment{Shading,Highlight,Border}`, `drawFragmentColorRect` |
| `canvasTabLeaders.ts` | Tab leader resolution + draw | `resolveTabLeader`, `drawTabLeader` |
| `canvasEmphasis.ts` | Emphasis mark glyphs | `drawFragmentEmphasis`, `EMPHASIS_GLYPH` |

Keep `resolveFragmentPaintBounds` in a shared geometry module (see §3.6) — both
this file and the run-background module depend on it.

### 3.2 `families.ts` — SRP: acceptable, OCP: minor

This file is large only because OOXML defines many preset shape families; every
export returns `PresetPathSegment[]` and shares no mutable state. It is **not** an
SRP violation in the harmful sense. The only smell is that unrelated families
(arrows, callouts, connectors, flowchart, ribbons, math symbols, action buttons)
live together.

Recommendation: **low priority.** Optionally split by family into
[`src/layoutProjection/presetGeometry/families/`](../src/layoutProjection/presetGeometry/)
(`arrows.ts`, `callouts.ts`, `connectors.ts`, `flowchart.ts`, `ribbons.ts`,
`math.ts`, `symbols.ts`, `misc.ts`) re-exported by an `index.ts`. This is purely
navigational; do it only if the file is actively churning. No logic changes.

### 3.3 `TablePropertiesDialog.tsx` — SRP: moderate

The dialog colocates 5 independent tab panels, private UI factories, 3 large
interfaces, parsing helpers, and the form-store schema. The orchestrating
component is only ~250 lines.

Proposed split under [`src/ui/components/Dialogs/TableProperties/`](../src/ui/components/Dialogs/):

| New module | Responsibility |
| --- | --- |
| `TablePropertiesDialog.tsx` | Store init/reconcile, `handleApply`, `<Tabs>` wiring |
| `types.ts` | `…InitialValues`, `…ApplyValues`, `…Borders`, `TableFormState` |
| `formControls.tsx` | `numericInput`, `checkbox` factories |
| `parse.ts` | `parseNumber`, `parseWidth`, `resolveBorder` + border constants |
| `TableTabPanel.tsx` | Table size/alignment/wrapping panel |
| `RowTabPanel.tsx` | Row height/header/break panel |
| `ColumnTabPanel.tsx` | Column width panel |
| `CellTabPanel.tsx` | Cell size/direction/margins/borders + preview |
| `AltTextTabPanel.tsx` | Alt title/description panel |

`handleApply`'s mapping from `TableFormState` → `…ApplyValues` is itself a
candidate for `parse.ts` as `buildApplyValues(form)`, isolating the
form→model transform from the component.

### 3.4 `drawFragment.ts` — SRP: failing (PDF mirror of §3.1)

Same structural problem as the Canvas painter, with the same concerns. Crucially,
several helpers are near-duplicates of Canvas equivalents and should converge on
the shared helpers in §3.6.

Proposed split under [`src/export/pdf/draw/fragment/`](../src/export/pdf/draw/):

| New module | Responsibility | Moved from |
| --- | --- | --- |
| `drawFragmentText.ts` | Orchestration + dispatch (image/textbox/text) | `drawFragmentText` |
| `pdfTextChunks.ts` | Per-chunk glyph effects + chunk grouping | `emitTextChunk`, `groupSlotChunksBy*`, `TextChunkCtx` |
| `pdfFloatingImages.ts` | Floating image placement | `drawFloatingImagesForParagraph` |
| `pdfRunBackground.ts` | Highlight/shading/border + `fragmentRectPt` | `drawFragment{Highlight,Shading,Border}` |
| `pdfGradient.ts` | Axial gradient registration | `resolveGradientShadingName` |
| `pdfTextDecoration.ts` | Underline/strike/wavy | `drawFragmentDecoration`, `drawUnderlineWithStyle`, `drawWavyUnderline` |
| `pdfTabLeaders.ts` | Tab leaders | `resolveTabLeader`, `drawTabLeaders` |
| `pdfEmphasis.ts` | Emphasis glyphs | `drawFragmentEmphasis`, `PDF_EMPHASIS_GLYPH` |
| `pdfColor.ts` | `blendColorWithWhite` | (color util) |

### 3.5 `CanvasTableLayout.ts` — SRP: moderate–heavy

`buildCanvasTableLayout` is a ~630-line function with three labeled passes plus
embedded utilities. Extract the passes into named functions (DIP via plain data
hand-off between passes) and move utilities out.

Proposed structure under [`src/ui/canvas/table/`](../src/ui/canvas/):

| New module | Responsibility |
| --- | --- |
| `buildCanvasTableLayout.ts` | Thin orchestrator calling the three passes |
| `resolveColumnWidths.ts` | Grid/budget/cell-spacing column math + offsets |
| `prepareCells.ts` | Pass 1: geometry, padding, borders, paragraph projection, fitText/noWrap/vertical |
| `resolveRowHeights.ts` | Pass 2: row heights, explicit minimums, contextual-spacing collapse |
| `assembleCellEntries.ts` | Pass 3: final positions + public entries |
| `tableCellGeometry.ts` | `resolveBorder`, `resolveCellPadding`, `resolveVerticalContentOffset`, `fitImagesToCellWidth`, `applyFitTextScale`, dimension parsers |
| `types.ts` | `CanvasTable*` interfaces, `PreparedCell` |

The `PreparedCell[]` array is already the natural data boundary between Pass 1 and
Pass 2/3, so the passes hand off plain data with no shared mutable closure.

### 3.6 Shared rendering helpers (DIP/OCP)

The Canvas and PDF painters duplicate pure geometry and constants. Extract these
into provider-agnostic modules (no `ctx`, no `writer`) that both painters import:

- `src/layoutProjection/fragmentDecorationGeometry.ts` — decoration Y offsets
  (underline/strike/double-strike), wavy-line point generation, double-line
  offsets. Today these constants (`1.3`, `1.5`, `0.52`, wavy amplitude/wavelength)
  are repeated with subtle drift between the two files.
- The emphasis glyph map (`{dot, comma, circle, underDot}`) is identical in both
  files — promote one copy to `@/core/textStyleMappings.ts` (already the home of
  `WAVY_UNDERLINE_*`).
- The gradient axis computation (center + rotated diagonal) is identical math in
  `resolveCanvasTextFill` and `resolveGradientShadingName` — extract
  `resolveGradientAxis(bounds, lineTop, lineHeight, angle)` returning the two
  endpoints; each painter maps the endpoints to its own gradient API.

This is the only cross-cutting change and the highest-leverage one: it removes the
silent-divergence class of bugs between the two renderers.

## 4. Phasing

Each phase is independently shippable and must leave the test suite green.

1. **Phase 0 — Shared helpers (§3.6).** Lowest risk, highest leverage. Extract
   geometry/constants; update both painters to consume them. Snapshot tests prove
   no pixel/byte change.
2. **Phase 1 — `CanvasTableLayout.ts` (§3.5).** Split into three passes +
   geometry utils. Pure data hand-off; high test value.
3. **Phase 2 — `canvasParagraphPainter.ts` (§3.1).** Mechanical module
   extraction once §3.6 lands.
4. **Phase 3 — `drawFragment.ts` (§3.4).** Mirror of Phase 2; now consumes the
   same shared helpers.
5. **Phase 4 — `TablePropertiesDialog.tsx` (§3.3).** UI-only split; per-panel.
6. **Phase 5 (optional) — `families.ts` (§3.2).** Navigational only; do last or
   skip.

## 5. Verification

- `check:imports` must still pass: zero new cycles, no `core → ui` edges. The new
  `paragraph/`, `fragment/`, and `table/` folders introduce intra-folder edges
  only; shared helpers live in `core`/`layoutProjection` (allowed direction).
- Existing Canvas snapshot tests and PDF inflation/decode tests must be unchanged.
- After each phase, re-run the line-count check to confirm the target in §2.

## 6. Non-goals / explicit decisions

- **No backward-compat exports.** The re-export block at the top of
  `canvasParagraphPainter.ts` (re-exporting from `canvasFontResolution.js`) should
  move to the new orchestrator only if importers still need it; otherwise importers
  are updated to import from source. No shim modules.
- **No new runtime abstraction.** We extract *pure functions*, not a `Renderer`
  interface. Unifying Canvas+PDF behind one drawer is a separate, larger proposal.
- **`families.ts` stays as-is unless it churns.** Size alone is not a violation.
