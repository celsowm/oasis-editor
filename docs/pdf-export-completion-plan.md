# PDF Export Completion Plan

> Status: proposed.
> Scope: the PDF export pipeline under [`src/export/pdf/`](../src/export/pdf/) —
> the writer ([`OasisPdfWriter.ts`](../src/export/pdf/OasisPdfWriter.ts)), the
> serializer ([`PdfDocumentSerializer.ts`](../src/export/pdf/writer/PdfDocumentSerializer.ts)),
> and the draw pipeline ([`src/export/pdf/draw/`](../src/export/pdf/draw/)).
> Compatibility: **greenfield** — internal writer/serializer signatures change as
> needed. No backward-compat shims.

## 1. Problem

The PDF export's **visual rendering** is thorough: text styling, gradients,
shadows/glow/reflection, underline variants, emphasis marks, tab leaders, run
borders/shading/highlight, floating & inline images, text boxes/shapes, tables,
columns, headers/footers, footnotes, and hyphenation all render. See
[`drawFragment.ts`](../src/export/pdf/draw/drawFragment.ts).

What is missing is **PDF document structure**. The serializer only ever emits
`/Catalog`, `/Pages`, `/Page`, fonts, images, and shadings
([`PdfDocumentSerializer.ts`](../src/export/pdf/writer/PdfDocumentSerializer.ts)).
There are no annotations, named destinations, outline, metadata, structure tree,
or stream compression. The result is a PDF that *looks* right but is not
navigable, not clickable, not accessible, and larger than necessary.

Key facts verified in code:

- Runs carry a `link` URL ([`styles.ts:98`](../src/core/model/types/styles.ts#L98));
  [`drawFragment.ts`](../src/export/pdf/draw/drawFragment.ts) paints links as
  styled text but emits no `/Link` annotation.
- Bookmarks are described as "the hyperlink / cross-reference target"
  ([`documentBookmarks.ts`](../src/core/model/types/documentBookmarks.ts)), but no
  named destinations or internal links are produced. TOC entries export as static
  text.
- The serializer trailer is only `/Size` and `/Root`; there is no `/Info` dict.
- Image `alt` text exists in the model but is never emitted as `/Alt`; there is no
  `/StructTreeRoot`.
- Content streams are written raw with a plain `/Length` and no `/Filter`
  ([`PdfDocumentSerializer.ts:36`](../src/export/pdf/writer/PdfDocumentSerializer.ts#L36)).
- Document comments ([`CommentHighlightOverlay`](../src/ui/components/CommentHighlightOverlay.tsx))
  and tracked changes ([`RevisionOverlay`](../src/ui/components/RevisionOverlay.tsx))
  never enter the PDF draw pipeline.

## 2. Goals

Deliver, in priority order:

1. **Clickable external hyperlinks** (`/Link` + `/URI` annotations).
2. **Working internal navigation** — named destinations for bookmarks/headings +
   internal `/Link` annotations from TOC entries and cross-references.
3. **Document outline** (`/Outlines`) generated from heading paragraphs.
4. **Document metadata** (`/Info`: Title, Author, Subject, Keywords, Producer,
   CreationDate).
5. **Stream compression** (FlateDecode on content streams).
6. **Accessibility** (tagged PDF: `/StructTreeRoot`, image `/Alt`, `/Lang`).

Comments / tracked changes export is explicitly **out of scope** for this plan
(tracked separately; they are UI/DOCX concerns today).

## 3. Architectural foundation: annotations in the writer

All of goals 1–3 need the writer to attach per-page **annotations** and the
serializer to emit a document-level **names tree** and **outline tree**. This is
the load-bearing prerequisite.

### 3.1 Writer surface

Extend [`OasisPdfWriter`](../src/export/pdf/OasisPdfWriter.ts) and
[`pdfTypes.ts`](../src/export/pdf/writer/pdfTypes.ts):

- `OasisPdfPage` gains `annotations: OasisPdfAnnotation[]`.
- New `addLinkAnnotation(pageIndex, { rect, target })` where `target` is either
  `{ kind: "uri", uri }` or `{ kind: "dest", name }`.
- New `addNamedDestination(name, { pageIndex, x, y })` (document-level; resolves
  to a `/XYZ` destination at serialize time once page object IDs are known).
- New `addOutlineItem({ title, level, dest })` building a flat list the
  serializer folds into a nested `/Outlines` tree by `level`.
- New `setDocumentInfo({ title?, author?, subject?, keywords? })`.

Rects are supplied in the writer's existing top-left point space and converted to
PDF bottom-left at serialize time (annotations use `[x1 y1 x2 y2]` in default user
space, so y must be flipped against `page.height`, mirroring how content is
already positioned).

### 3.2 Serializer changes

In [`PdfDocumentSerializer.ts`](../src/export/pdf/writer/PdfDocumentSerializer.ts):

- Emit one annotation object per page annotation; add `/Annots [ ... ]` to the
  page dict (currently absent).
- Emit a `/Names << /Dests <names tree> >>` referenced from `/Catalog`.
- Emit `/Outlines` (with `/First`, `/Last`, `/Count`, and per-item `/Parent`,
  `/Prev`, `/Next`, `/Dest`) and reference it from `/Catalog`.
- Emit an `/Info` dict and reference it from the trailer (`/Info N 0 R`).

Object-emission order is load-bearing for xref offsets — append the new objects
through the existing `addObject` closure so IDs stay sequential; do not reorder
the catalog/pages/fonts/images blocks.

## 4. Phased delivery

### Phase 1 — External hyperlinks (goal 1) — ✅ done

Implemented: `OasisPdfLinkAnnotation` + `page.annotations`
([`pdfTypes.ts`](../src/export/pdf/writer/pdfTypes.ts)),
`OasisPdfWriter.addLinkAnnotation`
([`OasisPdfWriter.ts`](../src/export/pdf/OasisPdfWriter.ts)), `/Annots` + `/Link`
`/URI` emission ([`PdfDocumentSerializer.ts`](../src/export/pdf/writer/PdfDocumentSerializer.ts)),
and per-run annotation collection over fragment bounds in
[`drawFragment.ts`](../src/export/pdf/draw/drawFragment.ts) (internal `#anchor`
links skipped, deferred to Phase 2). Covered by a `pdfWriter.test.ts` case.


- Threading: link rects must be collected during fragment drawing, where line/
  fragment geometry and `originX/originY` are known
  ([`drawFragment.ts`](../src/export/pdf/draw/drawFragment.ts) `drawFragmentText`).
- When `styles.link` is a real URL (not an internal `#bookmark` ref), compute the
  fragment bounds via the existing `resolveFragmentBounds` and call
  `writer.addLinkAnnotation`. Coalesce adjacent fragments of the same link on the
  same line into one rect where practical (acceptable to emit per-fragment
  initially).
- Acceptance: external links in the exported PDF are clickable in a viewer; rects
  align with the visible link text across wrapped lines.

### Phase 2 — Internal destinations + TOC/cross-reference links (goal 2) — ✅ done

Implemented: `OasisPdfNamedDestination` + `destName` on link annotations
([`pdfTypes.ts`](../src/export/pdf/writer/pdfTypes.ts)),
`OasisPdfWriter.addNamedDestination` (first-write-wins de-dup), a `/Names`
`/Dests` name tree (sorted, `[page /XYZ x y null]`) referenced from `/Catalog`
and `/GoTo /D` actions on internal links
([`PdfDocumentSerializer.ts`](../src/export/pdf/writer/PdfDocumentSerializer.ts)).
`drawFragment.ts` now emits `#anchor` runs as GoTo links;
[`exportEditorDocumentToPdf.ts`](../src/export/pdf/exportEditorDocumentToPdf.ts)
maps bookmark start anchors to paragraphs and registers a destination at each
paragraph's drawn top via a new `onParagraphDrawn` hook on `drawBlockList`.
Covered by a `pdfWriter.test.ts` case.

> Known limitation: destinations are registered only for top-level body
> paragraphs (the `drawBlockList` body pass). Bookmarks whose start anchor lives
> inside a table cell are not yet given a destination (table cells recurse through
> `drawTableBlock`, not `drawBlockList`). Headings get destinations in Phase 3.


- Emit a named destination at every bookmark anchor
  ([`bookmarkAnchors.ts`](../src/core/document/bookmarkAnchors.ts) /
  [`documentBookmarks.ts`](../src/core/model/types/documentBookmarks.ts)) and at
  every heading paragraph (reuse the same destination naming used by the outline
  in Phase 3 so they share one table).
- Internal links: a `styles.link` of the form `#name` (and TOC entries, which
  reference bookmarks) become `{ kind: "dest", name }` annotations.
- Acceptance: clicking a Sumário/TOC entry jumps to the target; cross-references
  navigate.

### Phase 3 — Document outline (goal 3) — ✅ done

Implemented: `OasisPdfOutlineItem` + `OasisPdfWriter.addOutlineItem`, and a nested
`/Outlines` tree in
[`PdfDocumentSerializer.ts`](../src/export/pdf/writer/PdfDocumentSerializer.ts)
(folds the flat document-ordered list by `level`, emits `/Parent` `/Prev` `/Next`
`/First` `/Last` `/Count` + `/Dest`, references `/Outlines` and `/PageMode
/UseOutlines` from `/Catalog`; titles are UTF-16BE-with-BOM text strings so
accented headings render). [`exportEditorDocumentToPdf.ts`](../src/export/pdf/exportEditorDocumentToPdf.ts)
reuses `outlineFrom` to map heading paragraphs and, in the same `onParagraphDrawn`
hook as Phase 2, registers a `__oasis_heading_<id>` destination + outline item per
heading. Covered by a `pdfWriter.test.ts` case that also asserts xref/`/Size`
integrity after the added objects.

> Same body-only limitation as Phase 2: headings inside table cells are not added
> to the outline.


- During layout iteration in
  [`exportEditorDocumentToPdf.ts`](../src/export/pdf/exportEditorDocumentToPdf.ts),
  detect heading paragraphs (Word headings are PascalCase style IDs — see the
  Table of Contents memory) and call `addOutlineItem` with the heading text,
  level (Heading1→1, …), and the destination registered in Phase 2.
- Serializer folds the flat list into the nested outline tree.
- Acceptance: the PDF outline/bookmarks sidebar mirrors the document heading
  structure and each entry navigates correctly.

### Phase 4 — Metadata (goal 4) — ✅ done

Implemented: `OasisPdfDocumentInfo` + `OasisPdfWriter.setDocumentInfo`, and an
`/Info` dictionary referenced from the trailer
([`PdfDocumentSerializer.ts`](../src/export/pdf/writer/PdfDocumentSerializer.ts);
Title/Author/Subject/Keywords as UTF-16BE text strings, Producer literal,
`/CreationDate (D:YYYYMMDDHHmmSS+00'00')`).
[`exportEditorDocumentToPdf.ts`](../src/export/pdf/exportEditorDocumentToPdf.ts)
sources Title/Author/Subject/Keywords from `document.metadata`, sets Producer to
"Oasis Editor" and CreationDate to export time. Covered by a `pdfWriter.test.ts`
case.


- Source Title from the document (filename/first heading fallback), Producer as a
  constant ("Oasis Editor"), CreationDate as the export timestamp; Author/Subject/
  Keywords from document properties if present.
- `setDocumentInfo` → `/Info` dict + trailer reference.
- Acceptance: viewer "Document Properties" shows the populated fields.

### Phase 5 — Stream compression (goal 5) — ✅ done

Implemented with **fflate** (`zlibSync`, chosen over async `CompressionStream` to
keep the serializer synchronous). Page content streams are now emitted
FlateDecode-compressed
([`PdfDocumentSerializer.ts`](../src/export/pdf/writer/PdfDocumentSerializer.ts)).
This required moving final assembly from string concatenation to **byte-chunk
assembly** (`PdfObject.body` widened to `string | Uint8Array`) so deflated binary
survives — offsets for the xref table are tracked in bytes. Test helpers gained an
inflating `decodePdf` (in both `pdfWriter.test.ts` and the shared
`docxTestHelpers.ts`) that splices each `/FlateDecode` stream's inflated text in
place; a new `pdfWriter.test.ts` case asserts the stream is compressed (operators
absent as plaintext) yet inflates back to the original text. Full suite green.


- Add an optional FlateDecode pass on each content stream in the serializer,
  emitting `/Filter /FlateDecode` and the compressed `/Length`. Use the platform
  deflate (`CompressionStream` in browser/Node 18+); keep an uncompressed
  fallback if unavailable.
- Acceptance: byte-identical rendering; measurable size reduction on a
  text-heavy document.

### Phase 6 — Accessibility / tagged PDF (goal 6)

- This is the largest item: a `/StructTreeRoot` with a parallel structure tree
  (`/Document` → `/P`, `/H1`…, `/Table`/`/TR`/`/TD`, `/Figure`), marked-content
  IDs (`/MCID`) tied into each content stream, `/MarkInfo << /Marked true >>`,
  document `/Lang`, and image `/Alt` from the model.
- Recommend scoping this to its own follow-up plan after Phases 1–5 land, since it
  touches every drawer (each must wrap its marked content) rather than just the
  writer/serializer.
- Acceptance: a PDF/UA checker reports a valid structure tree; screen-reader
  reading order matches document order; images expose alt text.

## 5. Testing

- Unit: extend the PDF writer/serializer tests to assert `/Annots`, `/Names`,
  `/Outlines`, and `/Info` objects appear and reference valid object IDs; assert
  annotation rect y-flip math.
- Golden/integration: export a fixture document containing an external link, an
  internal cross-reference, a TOC, and headings; parse the output and assert link
  targets and destination coordinates.
- Manual: open in at least two viewers (Acrobat + a browser PDF viewer) to confirm
  clickable links and a populated outline.

## 6. Sequencing rationale

Phases 1–3 deliver the highest user-visible value (clickable links + working TOC
+ outline) and all build on the single annotation/destination foundation in
§3, so they should land together or in quick succession. Phase 4 is cheap and
independent. Phase 5 is isolated to the serializer. Phase 6 is deferred because
its blast radius (every drawer) is disproportionate to the rest and warrants its
own plan.
