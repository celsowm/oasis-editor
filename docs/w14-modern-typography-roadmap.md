# Modern (w14/w15/w16) Typography — Implementation Roadmap

This document is the implementation plan for the **Modern (w14/w15/w16) typography** row
currently listed under **Not supported** in [ooxml.md](ooxml.md). That row bundles eleven
heterogeneous OOXML features:

`w14:ligatures`, `w14:numForm`, `w14:numSpacing`, `w14:stylisticSets`/`w14:stylisticSet`,
`w14:cntxtAlts`, `w14:textFill`, `w14:textOutline`, `w14:textShadow`,
`w14:glow`/`w14:reflection`, `w14:scene3d`/`w14:props3d`, `w15:collapsed`, `w16du:dateUtc`.

This is a **roadmap only** — no feature is implemented by this document. Each phase is an
independently shippable unit. Phases are ordered by value/effort so the editor gains the
cheapest, highest-impact wins first.

---

## 1. Overview & current state

### Cross-cutting principle: round-trip preservation first

Before any rendering work, **every** feature must at minimum **round-trip losslessly** —
parse it on import, keep it on the model, and re-emit identical (or `mc:AlternateContent`-
wrapped) XML on export. This guarantees the editor never silently drops a property even
where we cannot yet draw it. Rendering (canvas / PDF / HTML) is layered on top afterward.

### What is already modeled vs. what is missing

| Feature | Model | Import | Export | HTML | Canvas | PDF |
|---|---|---|---|---|---|---|
| `w14:ligatures` | ✅ | ✅ | ✅ | ✅ | ⚠️ (`textRendering` hint only) | ✅ (GSUB liga/calt/hlig) |
| `w14:numSpacing` | ✅ | ✅ | ✅ | ✅ | ❌ (no Canvas 2D API) | ✅ (GSUB pnum/tnum) |
| `w14:numForm` | ✅ | ✅ | ✅ | ✅ | ❌ (no Canvas 2D API) | ✅ (GSUB lnum/onum) |
| `w14:stylisticSets`/`stylisticSet` | ✅ | ✅ | ✅ | ✅ | ❌ (no Canvas 2D API) | ✅ (GSUB ss01–ss20) |
| `w14:cntxtAlts` | ✅ | ✅ | ✅ | ✅ | ❌ (no Canvas 2D API) | ✅ (GSUB calt) |
| `w14:textFill` | ✅ | ✅ | ✅ | ✅ | ✅ (solid+gradient) | ✅ (solid; gradient deferred) |
| `w14:textOutline` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Tr mode 2) |
| `w14:textShadow` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (offset copy) |
| `w14:glow` | ✅ | ✅ | ✅ | ✅ | ✅ (`shadowBlur`) | ⚠️ (8-offset approx) |
| `w14:reflection` | ✅ | ✅ | ✅ | ✅ | ⚠️ (mirrored pass, avg alpha) | ⚠️ (shifted copy, no flip) |
| `w14:scene3d`/`props3d` | ✅ (opaque blob) | ✅ | ✅ | n/a | n/a | n/a |
| `w15:collapsed` | ❌ (blocked) | ❌ | ❌ | n/a | n/a | n/a |
| `w16du:dateUtc` | ✅ | ✅ | ✅ | n/a | n/a | n/a |

**Key finding:** the OpenType font-feature subset (the first five rows) is *already* parsed,
stored, exported, and emitted as CSS. The `ooxml.md` "Not supported" label is therefore
**partly stale** — these are supported for round-trip + HTML and only missing on the canvas
and PDF render surfaces. See Phase 1.

### Where things live today (verified)

- **Run-style model:** `EditorTextStyle` in
  [`src/core/model/types/styles.ts`](../src/core/model/types/styles.ts) — feature fields at
  lines 61–65 (`ligatures`, `numberSpacing`, `numberForm`, `stylisticSet`,
  `contextualAlternates`). Enums in
  [`src/core/model/types/primitives.ts`](../src/core/model/types/primitives.ts).
- **Import (rPr parse):**
  [`src/import/docx/runStyle.ts`](../src/import/docx/runStyle.ts) — w14 features at lines
  322–377. `mc:AlternateContent` is unwrapped to `mc:Fallback` transparently by
  `getChildrenByTagNameNS()` in
  [`src/import/docx/xmlHelpers.ts`](../src/import/docx/xmlHelpers.ts) (lines 28–46).
- **Export (rPr serialize):**
  [`src/export/docx/text/runPropertiesXml.ts`](../src/export/docx/text/runPropertiesXml.ts)
  — w14 features at lines 180–198.
- **HTML/CSS:** [`src/core/html/styleCss.ts`](../src/core/html/styleCss.ts) lines 58–72
  (`font-variant-ligatures`, `font-variant-numeric`, `font-feature-settings`). These helpers
  are the canonical OpenType-tag source of truth — reuse them, don't duplicate.
- **Canvas glyph paint:** `drawStyledText()` in
  [`src/ui/canvas/canvasParagraphPainter.ts`](../src/ui/canvas/canvasParagraphPainter.ts)
  (lines 661–709) already does outline (`strokeText`), shadow
  (`shadowColor`/`shadowBlur`/`shadowOffset*`), emboss and imprint. The fill color is set
  once per fragment at line 376 (`ctx.fillStyle = styles.color ?? "#000000"`). The font
  string is assembled at line 366. **No gradient calls exist anywhere on canvas.**
- **PDF text:** `emitChunk`/`drawText` in
  [`src/export/pdf/draw/drawFragment.ts`](../src/export/pdf/draw/drawFragment.ts) →
  `PdfContentStream.emitTextBlock` in
  [`src/export/pdf/writer/PdfContentStream.ts`](../src/export/pdf/writer/PdfContentStream.ts)
  already supports the text render mode operator (`Tr`: `renderMode: styles.outline ? 1 : 0`
  at `drawFragment.ts:683`), fill/stroke color (`rg`/`RG`), and stroke width (`w`). The
  graphics-state stack (`q`/`Q`), `drawPath`, `clipRect`, and `rotateAbout` exist and are
  used by the shapes pipeline. **There are no PDF gradient/shading dictionaries, and text is
  laid out 1:1 codepoint→glyph by `SimpleTextLayouter`
  ([`src/text/fonts/layout/SimpleTextLayouter.ts`](../src/text/fonts/layout/SimpleTextLayouter.ts))
  with no GSUB/GPOS shaping.**
- **Namespaces:** `WORD_NS` and `WORD14_NS` are defined in the import xml helpers. `WORD15_NS`
  exists only locally in `commentsXml.ts`; `WORD16DU_NS` is undefined.

### The standard per-feature pipeline checklist

Every phase below follows the same checklist; only the per-surface detail differs.

1. **Model** — add fields to `EditorTextStyle` (run-level) or the relevant node type.
2. **Import** — parse in `runStyle.ts` (or the owning parser), honoring `mc:AlternateContent`.
3. **Export** — re-emit in `runPropertiesXml.ts`, wrapping w14 effect markup in
   `mc:AlternateContent` with a graceful `mc:Fallback` so legacy consumers degrade.
4. **HTML** — map to CSS in `styleCss.ts` where a web equivalent exists.
5. **Canvas** — apply in `drawParagraph`/`drawStyledText`.
6. **PDF** — apply in `drawFragment.ts`/`PdfContentStream`.
7. **Tests** — import/export round-trip + per-surface rendering assertions under
   `tests/vitest/__tests__/`.

---

## 2. Phase 1 — Finish the OpenType font features (quick win, already modeled)

**Scope:** `w14:ligatures`, `w14:numForm`, `w14:numSpacing`, `w14:stylisticSets`,
`w14:cntxtAlts`. Model/import/export/HTML are **done**; this phase only adds render surfaces
and corrects the docs.

### 2.1 Documentation correction (do first)

Move these five out of the **Not supported** "Modern typography" row in
[`ooxml.md`](ooxml.md) and into **Supported** (or a "Partial" row), describing them as:
round-trip through `w:rPr` + emitted as CSS `font-variant-ligatures` /
`font-variant-numeric` / `font-feature-settings`; canvas/PDF rendering tracked here. Leave
the remaining effects (`textFill`, `textOutline`, …) in the Modern-typography row, narrowed
to just those still-unsupported elements, cross-linked to this roadmap.

### 2.2 Canvas

Canvas 2D's `ctx.font` shorthand **cannot carry `font-feature-settings`** (it follows the
CSS `font` shorthand grammar, which excludes feature settings). Options, in order of
preference:

- **Map what the context exposes:** `ctx.fontKerning`, `ctx.fontVariantCaps`, and (where
  supported) `ctx.letterSpacing`/`ctx.wordSpacing`. These cover a subset — notably *not*
  arbitrary stylistic sets.
- **For features with no `ctx` mapping (stylistic sets, discretionary ligatures):** either
  (a) accept a documented canvas limitation (HTML/PDF still honor them), or (b) render the
  affected runs through a hidden DOM element styled with `font-feature-settings` and
  `drawImage` the result. Option (b) is heavier and should only be pursued if visual parity
  on canvas is a hard requirement.

Reuse the tag-mapping helpers already in
[`styleCss.ts`](../src/core/html/styleCss.ts) (`ligaturesToCss`, `numericToCss`,
`fontFeatureSettingsToCss`) as the single source of truth rather than re-deriving tags in the
painter. Note that features changing advance widths must be reflected in measurement (see
§7), so keep canvas painting and `measureCharacterWidth` consistent.

### 2.3 PDF — DONE (GSUB shaping)

**Status: implemented.** A minimal, Latin-focused GSUB shaper now applies these features in
PDF export. The `TextLayouter` interface
([`src/text/fonts/core/types.ts`](../src/text/fonts/core/types.ts)) gained an optional
`features` argument; `OpenTypeLayouter`
([`src/text/fonts/layout/OpenTypeLayouter.ts`](../src/text/fonts/layout/OpenTypeLayouter.ts))
parses GSUB via `GsubTable`
([`src/text/fonts/opentype/GsubTable.ts`](../src/text/fonts/opentype/GsubTable.ts)) — lookup
types 1/2/3/4/6/7, Coverage 1/2, ClassDef 1/2 — and substitutes glyphs for the requested tags.
`createPdfEmbeddableFont` selects it whenever the font carries a GSUB table. The active tags are
resolved once per run by `resolveOpenTypeFeatureTags`
([`src/core/textStyleMappings.ts`](../src/core/textStyleMappings.ts)) and threaded through
`OasisPdfTextOptions.fontFeatures` → `drawText` → `PdfFontTable`. Substituted glyph IDs already
flow through the existing Type0/Identity-H CIDFont, and merged `codePoints` keep ToUnicode
(copy/search) correct.

**GPOS kerning (also DONE).** Pair kerning (`kern`) is now applied in PDF export too. `GposTable`
([`src/text/fonts/opentype/GposTable.ts`](../src/text/fonts/opentype/GposTable.ts)) parses GPOS —
single (1) / pair (2) adjustment and extension (9) lookups, formats 1 & 2 — and adjusts the
glyphs' horizontal advances; `OpenTypeLayouter` routes the `kern` tag to it (substitution first,
then kerning) and writes the result to `positions[].xAdvance`, which the writer already turns into
`TJ` advance adjustments. The shared GSUB/GPOS header (ScriptList/FeatureList, Coverage, ClassDef)
lives in [`otLayoutCommon.ts`](../src/text/fonts/opentype/otLayoutCommon.ts). The `kern` tag is
gated by `resolveOpenTypeFeatureTags(style, fontSizePt)` using Word's `w:kern` (`kerningThreshold`)
minimum-size rule, mirroring the canvas `ctx.fontKerning` gate. Placement/vertical metrics, mark
attachment, and contextual positioning are out of scope (Latin advance kerning only).

**Render-only & safe:** shaping happens inside each independently-positioned PDF chunk (word), so a
ligature or kern rendering marginally narrower than its reserved slot span causes no cumulative
drift; on-screen measurement stays 1:1 (no caret/justification change).

**Deferred follow-ons:** complex-script shaping (Arabic/Indic/bidi) and GPOS mark positioning
remain out of scope.

### 2.4 Tests

Round-trip tests cover import/export. GSUB shaping is covered by
`tests/vitest/__tests__/text/openTypeLayouter.test.ts` (parser + layouter against the bundled
Carlito font), `tests/vitest/__tests__/core/openTypeFeatureTags.test.ts` (tag resolver), and a
PDF integration assertion in `pdfWriter.test.ts` ("applies GSUB ligature substitution …").

**Effort:** Canvas mapping = small. Full canvas parity via DOM rasterization = medium. PDF
shaping = **done** (GSUB substitution + GPOS pair kerning).

---

## 3. Phase 2 — `w14:textFill` & `w14:textOutline`

Rich glyph fill (solid or gradient) and a real outline (width + color + fill), distinct from
the legacy boolean `w:outline`.

### 3.1 Model

Add to `EditorTextStyle`:

- `textFill?: { type: "solid"; color: string } | { type: "gradient"; stops: GradientStop[]; angle?: number } | null`
- `textOutline?: { widthPt: number; color?: string; fill?: TextFill } | null`

Reuse/define a shared `GradientStop` (`{ position: number; color: string; alpha?: number }`).
Keep `outline` (the legacy boolean) separate — `textOutline` supersedes it when present.

### 3.2 Import / export (round-trip)

Parse `w14:textFill`/`w14:textOutline` (which contain DrawingML-style
`w14:solidFill`/`w14:gradFill`/`w14:srgbClr`) in `runStyle.ts`. On export, emit them inside
`mc:AlternateContent` → `mc:Choice Requires="w14"`, with an `mc:Fallback` carrying a plain
`w:color` (fill) so legacy Word still shows a sensible color. Add a `WORD14_NS`-scoped
serializer alongside the existing w14 block in `runPropertiesXml.ts`.

### 3.3 Canvas

- **Solid fill:** replace the single `ctx.fillStyle = styles.color` at
  `canvasParagraphPainter.ts:376` with a resolver that returns the solid color **or** a
  `CanvasGradient` built via `ctx.createLinearGradient()` across the run's measured bounds.
- **Outline:** extend the existing `strokeText` branch in `drawStyledText` to honor real
  width (`textOutline.widthPt` → px) and color, instead of the hard-coded boolean-outline
  styling.

### 3.4 PDF

- **Solid fill:** already supported via `rg` (`emitTextBlock`).
- **Outline:** already wired — `Tr` mode 1 (stroke) and `RG` + `w` width. For fill **and**
  outline together, use **`Tr` mode 2** (fill+stroke), which the writer supports but does not
  yet emit.
- **Gradient fill (Phase 2b, deferred):** requires PDF shading dictionaries (type 2/3) — a
  new subsystem in the PDF writer. Phase 2a ships solid only; gradients flatten to their
  first stop until 2b lands.

### 3.5 HTML

Map solid fill to `color`; gradient fill to `background: linear-gradient(...)` +
`-webkit-background-clip: text` + `color: transparent`; outline to `-webkit-text-stroke`.

**Effort:** Solid fill + outline (canvas + PDF + HTML) = medium. Gradients = medium-large
(canvas easy, PDF shading dicts large).

---

## 4. Phase 3 — `w14:textShadow`, `w14:glow`, `w14:reflection`

Three DrawingML effects. Round-trip all three first; render with documented fidelity limits.

### 4.1 Model & round-trip

Add `textShadow?`, `glow?`, `reflection?` to `EditorTextStyle`, each capturing the relevant
DrawingML params: shadow → `{ color, alpha, blurPt, distPt, dirDeg }`; glow →
`{ color, radiusPt, alpha }`; reflection → `{ blurPt, startAlpha, endAlpha, distPt }`. Parse
and re-emit under `mc:AlternateContent`/`w14`.

### 4.2 Canvas

- **Shadow & glow:** map directly onto the `shadowColor`/`shadowBlur`/`shadowOffsetX/Y`
  properties already used by emboss/imprint in `drawStyledText`. Glow = zero-offset, larger
  blur, color-tinted; may need multiple stacked passes for intensity.
- **Reflection:** a second `drawStyledText` pass, vertically mirrored (`ctx.scale(1, -1)`
  about the baseline) with a top-to-bottom alpha fade. Approximate the soft fade with a
  clipped gradient alpha mask.

### 4.3 PDF

No native blur or soft-alpha gradients. Approximate using the `q`/`Q` graphics-state stack:

- **Shadow/glow:** draw offset, lower-alpha copies of the glyph run behind the main text
  (stepped multi-copy "blur" simulation).
- **Reflection:** a flipped, clipped draw (`clipRect` + transform) with **stepped** alpha
  bands to fake the fade.

Document that PDF effect fidelity is approximate; tests assert presence and positioning, not
pixel parity.

**Effort:** Canvas = medium. PDF approximations = medium-hard.

---

## 5. Phase 4 — `w14:scene3d` & `w14:props3d` (3D text)

Neither Canvas 2D nor the PDF writer can render true 3D extrusion/lighting.

**Status: implemented (round-trip only).** `w14:scene3d` and `w14:props3d` are parsed in
[`runStyle.ts`](../src/import/docx/runStyle.ts) and stored verbatim as opaque XML blobs
(`scene3dXml`/`props3dXml` on `EditorTextStyle`, serialized via `XMLSerializer`). On export
([`runPropertiesXml.ts`](../src/export/docx/text/runPropertiesXml.ts)) each blob is re-emitted
inside `mc:AlternateContent`/`mc:Choice Requires="w14"` with an empty `mc:Fallback`. The blob
is also carried through the export materializer
([`styleMaterialization.ts`](../src/export/docx/text/styleMaterialization.ts)). No rendering on
any surface. Tests: `docxImport.runStyles.test.ts` (scene3d/props3d round-trip + mc unwrap).

- **Original recommendation (now done):** **round-trip preservation only** — parse and
  re-emit the `scene3d`/`props3d` XML losslessly on the run (stored as an opaque preserved blob
  on `EditorTextStyle`), with **no rendering**.
- **Optional (future):** a cheap bevel/extrude approximation (offset duplicate layers with
  shaded fills) — explicitly flagged as low priority and not part of the core deliverable.

This is the lowest-priority phase.

**Effort:** Round-trip = small. Any rendering = large and optional.

---

## 6. Phase 5 — Structural / metadata leftovers

These are not run-style effects and render nowhere on the text surfaces.

### 6.1 `w15:collapsed` — BLOCKED (not implemented)

The collapsed-display state of a structured document tag (`w:sdt`). **This cannot be a small
round-trip flag as the roadmap assumed:** there is no SDT model node to host the flag. `w:sdt`
(block, row, cell, and run contexts) is currently **dropped entirely on import** — the
block/run parsers whitelist `w:p`/`w:tbl`/`w:r`/etc. and silently discard the `w:sdt` wrapper
(see the Content controls rows in [`ooxml.md`](ooxml.md)). Preserving `w15:collapsed` therefore
requires first building SDT round-trip infrastructure (a new node type or an opaque
block/run-level passthrough that retains `w:sdtPr`/`w:sdtContent`), which is **not small** and
is out of scope for this metadata task. Deferred until SDT support exists.

### 6.2 `w16du:dateUtc` — implemented

A UTC timestamp companion to a comment's local `w:date`. **Status: done.** `WORD16DU_NS`
(`http://schemas.microsoft.com/office/word/2023/wordml/word16du`) is defined in both the
importer ([`import/docx/commentsXml.ts`](../src/import/docx/commentsXml.ts)) and exporter
([`export/docx/commentsXml.ts`](../src/export/docx/commentsXml.ts)); the attribute is parsed
into `EditorComment.dateUtc` (epoch ms), plumbed through the import driver, and re-emitted on
`w:comment` (with the `xmlns:w16du` declaration added to the comments part). Pure metadata —
no rendering. Tests: `docxImport.comments.test.ts` (dateUtc round-trip).

**Effort:** `w16du:dateUtc` small (done); `w15:collapsed` blocked on SDT support (large).

---

## 7. Cross-cutting concerns

- **Namespaces:** introduce shared `WORD15_NS` and `WORD16DU_NS` constants next to the
  existing `WORD_NS`/`WORD14_NS`; stop defining them locally.
- **`mc:AlternateContent` on export:** all w14 effect markup (fill/outline/shadow/glow/
  reflection/3d) must be wrapped in `mc:Choice Requires="w14"` with a meaningful
  `mc:Fallback`, so non-w14 consumers degrade gracefully (Word, LibreOffice).
- **Advance-width consistency:** any feature that changes glyph advances (ligatures,
  proportional/tabular figures, stylistic sets) must be applied **consistently in both
  measurement and painting** — `measureCharacterWidth`
  ([`src/ui/textMeasurement/characterWidth.ts`](../src/ui/textMeasurement/characterWidth.ts))
  and the canvas painter must agree, or the caret/slots drift.
- **Canvas-vs-PDF parity matrix:** keep a small table (in this doc / `ooxml.md`) of which
  surfaces honor each feature, since several features will render on canvas/HTML but only
  approximate (or skip) in PDF.

---

## 8. Suggested ordering & effort

| Order | Feature(s) | Effort | Notes |
|---|---|---|---|
| 1 | Doc correction for the 5 font features | trivial | `ooxml.md` only |
| 2 | Font features — canvas | small–medium | `ctx` props; DOM raster only if parity required |
| 3 | `textFill`/`textOutline` — solid (canvas + PDF + HTML) | medium | `Tr` mode 2 already in writer |
| 4 | `textShadow`/`glow` — canvas | medium | reuse `shadowBlur` path |
| 5 | `reflection` — canvas | medium | mirror pass + alpha fade |
| 6 | Effects — PDF approximations | medium–hard | `q/Q` copies; stepped alpha |
| 7 | `w15:collapsed`, `w16du:dateUtc` — round-trip | small | metadata only |
| 8 | `scene3d`/`props3d` — round-trip only | small | no render |
| — | Gradient fills (PDF shading dicts) | large | deferred (Phase 2b) |
| 9 | GSUB shaping for PDF font features | large | **done** (P1-PDF) |
| 10 | GPOS pair kerning for PDF | medium | **done**; gated by `w:kern` threshold |

---

## 9. Verification (per implemented phase)

- `npm run test` (vitest), `npm run lint`, `tsc`, and `npm run check:imports` all green.
- **Import-graph gate:** rendering/engine code stays out of `src/core` (consumed via the
  existing measurer/render abstractions), matching the constraint used by the hyphenation
  work.
- **Manual:** open a DOCX exercising the feature, confirm the canvas surface and a PDF export
  match expectations, then round-trip the file and confirm the markup survives (and, for
  effects, that the `mc:Fallback` is present for legacy consumers).

---

## Out of scope

- This document is the roadmap; most phases are now implemented (see per-section status).
- A PDF gradient/shading subsystem (prerequisite for gradient fills) remains a **named
  prerequisite** for that deferred sub-task. The PDF font features no longer need a full
  HarfBuzz-class engine — a minimal Latin GSUB shaper plus GPOS pair kerning (§2.3) covers the
  five substitution features and `w:kern`; complex-script shaping (Arabic/Indic/bidi) and GPOS
  mark positioning remain the named prerequisites for their follow-ons.
