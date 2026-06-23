# Expanded OOXML / DOCX Importer Coverage Matrix

This file completes the previous table-only checklist into a broader importer-oriented matrix for **DOCX / WordprocessingML**.

It is intentionally not a raw dump of every XSD production in ECMA-376 / ISO/IEC 29500. For an importer, a raw schema dump is less useful than a normalized list of the tags, parts, attributes, and value groups that materially affect parsing, rendering, layout, pagination, styling, forms, images, and round-trip preservation.

Generated/expanded: 2026-06-04
Completion pass added: 2026-06-04
Last source audit: 2026-06-22

## What was missing from the previous file

The previous file was strong on `w:tbl`, `w:tr`, `w:tc`, table properties, borders, margins, grid, merges, floating tables, conditional table styles, table revisions, and table-specific compatibility switches.

The missing coverage was mainly:

- OPC package structure, `[Content_Types].xml`, `.rels`, part content types, relationship resolution, metadata, and markup compatibility.
- Main document structure: `w:document`, `w:body`, paragraphs, runs, section breaks, block wrappers, and secondary stories.
- Paragraph formatting: spacing, indentation, alignment, borders, tabs, numbering properties, pagination flags, bidi/CJK layout flags.
- Run content and formatting: text preservation, breaks, tabs, symbols, field instructions, drawings, VML, font selection, colors, size, emphasis, hidden text, script-specific formatting.
- Styles and defaults: document defaults, style inheritance, paragraph/character/table/numbering styles, latent styles, linked styles.
- Numbering/list system: abstract numbering, concrete numbering instances, levels, overrides, labels, bullet fonts, restarts.
- Hyperlinks, fields, bookmarks, cross-references, legacy form fields.
- Headers, footers, footnotes, endnotes, comments, annotations, and glossary/building blocks.
- DrawingML/VML: images, inline/floating drawings, wrapping, positioning, crop, theme colors, text boxes, OLE placeholders, charts.
- Content controls, custom XML bindings, repeating sections, and `altChunk`.
- Office Math / OMML.
- Document settings, compatibility flags, font table, theme resolution, web settings, document variables, protection, revision view.

## Scope note

- **Included:** WordprocessingML-focused DOCX import concerns, plus the surrounding OPC package and the DrawingML/VML pieces that commonly appear inside DOCX.
- **Not guaranteed:** every vendor extension, every rarely used Transitional artifact, every DrawingML chart/diagram subelement, every cryptographic/signature element, and every possible Microsoft `w16*` extension.
- **Recommended policy:** parse known elements into a normalized model; preserve unknown elements/attributes as raw XML when round-trip fidelity matters.
- **Completion pass:** adds edge-case package parts, modern Word extensions, CJK/RTL details, SDT/form controls, DrawingML shape variants, compatibility switches, and validation fixtures.

## Priority legend

| Priority | Meaning |
|---|---|
| P0 | Required for basic import, text extraction, document order, or visible layout. |
| P1 | Important for Word-like layout/rendering fidelity. |
| P2 | Needed for advanced formatting, pagination, styles, references, or complex documents. |
| P3 | Preserve or approximate; lower visual impact in many documents, but relevant for round-trip. |
| P4 | Usually out of scope unless strict archival/round-trip fidelity is required. |

## Status legend (oasis editor)

The **Status** column tracks what `oasis-editor`'s DOCX import/export pipeline already handles in the current source tree (`src/import/docx/*` and `src/export/docx/*`). Use it to prioritize work and to know what falls back to defaults or is silently dropped.

| Status | Meaning |
|---|---|
| Supported | Fully imported and exported (round-trip preserves the property in practice). |
| Partial | Imported or exported with real limitations (only one direction, only a subset of values, layout approximated, or only a specific shape of the element is handled). |
| Not supported | Not implemented: silently dropped on import and/or never written on export. |
| N/A | Not an importer concern in the canonical WordprocessingML model (e.g. UI-only settings, internal generator metadata). |

Import is driven by `importDocxToEditorDocument.ts` (with `paragraphs.ts`, `runs.ts`, `tables.ts`, `styles.ts`, `numbering.ts`, `sectionProperties.ts`, `settings.ts`, `themeFonts.ts`, `relationships.ts`, `assetRegistry.ts`, `footnotes.ts`, `headerFooter.ts`, `xmlHelpers.ts`, `units.ts`). Export is driven by `exportEditorDocumentToDocx.ts` (with `textXml.ts`, `tableXml.ts`, `footnotesXml.ts`, `xmlUtils.ts`).

## Added non-table DOCX / WordprocessingML coverage

## Package, relationships, metadata, and markup compatibility

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Package / OPC | `[Content_Types].xml` / `ct:Types` | Package root | — | Content type registry for every part in the package. | Importer must read this before locating document parts; do not assume every DOCX uses the same set of parts. | P0 | Not supported |
| Package / OPC | `ct:Default` | `ct:Types` | `Extension`, `ContentType` | Default content type by file extension. | Needed for media, XML, relationship parts, and extension-based dispatch. | P0 | Not supported |
| Package / OPC | `ct:Override` | `ct:Types` | `PartName`, `ContentType` | Explicit content type for a package part. | Main document, styles, numbering, settings, footnotes, endnotes, comments and glossary are normally found here. | P0 | Not supported |
| Package / OPC | `_rels/.rels` / `pr:Relationships` | Package root relationships | — | Top-level relationship set. | Find the office document relationship instead of hard-coding `word/document.xml`. | P0 | Partial |
| Package / OPC | `pr:Relationship` | Any `.rels` part | `Id`, `Type`, `Target`, `TargetMode` | Relationship from one part to another or to an external resource. | Preserve unknown relationship types; validate external targets before dereferencing. | P0 | Partial |
| Package / OPC | Main document part | Relationship type `officeDocument` | part path | Root WordprocessingML document story. | Usually `/word/document.xml`, but the relationship is authoritative. | P0 | Partial |
| Package / OPC | `word/_rels/document.xml.rels` | Main document part | relationship IDs | Relationships used by the main story. | Resolve `r:id` from hyperlinks, images, headers, footers, altChunk, footnotes, etc. | P0 | Supported |
| Package / OPC | `word/styles.xml` | Main document related part | — | Style definitions. | Essential for paragraph/run/table/list style cascade. | P0 | Supported |
| Package / OPC | `word/numbering.xml` | Main document related part | — | Numbering and list definitions. | Required to render bullets, outline numbering and list indentation. | P0 | Partial |
| Package / OPC | `word/settings.xml` | Main document related part | — | Document-level settings. | Affects compatibility, track changes, hyphenation, proofing, zoom, fields, math and layout switches. | P1 | Partial |
| Package / OPC | `word/fontTable.xml` | Main document related part | — | Font table. | Map font names, aliases, charset, family and embedded font relationships when present. | P1 | Not supported |
| Package / OPC | `word/theme/theme1.xml` | Theme relationship | — | Theme colors, fonts and effects. | Needed to resolve `themeColor`, `themeFill`, `themeFont`, tint/shade and theme font slots. | P1 | Partial |
| Package / OPC | `docProps/core.xml` | Package relationship | `cp:*`, `dc:*`, `dcterms:*` | Core metadata. | Useful for round-trip, search, audit and generated output metadata. | P3 | Not supported |
| Package / OPC | `docProps/app.xml` | Package relationship | `Application`, `Pages`, `Words`, etc. | Extended application metadata. | Usually not needed for rendering; preserve if round-tripping. | P4 | Not supported |
| Package / OPC | `docProps/custom.xml` | Package relationship | `property`, `fmtid`, `pid`, `name`, `vt:*` | Custom document properties. | Often used by legal templates and document automation systems. | P2 | Not supported |
| Package / OPC | Digital signatures / encryption | Package-level facilities | signature parts, encrypted package | Security and integrity features. | Out of scope for many importers, but detect and fail clearly if encrypted. | P4 | Not supported |
| Markup compatibility | `mc:AlternateContent` | Anywhere allowed | `mc:Ignorable`, `mc:Choice`, `mc:Fallback`, `Requires` | Versioned fallback mechanism. | Choose supported branch; otherwise fallback; preserve original XML for round-trip. | P1 | Not supported |
| Markup compatibility | `mc:Ignorable` / `mc:PreserveElements` / `mc:PreserveAttributes` / `mc:ProcessContent` | Any element with MC attributes | prefix lists | Compatibility processing hints. | Do not drop unknown `w14`, `w15`, `w16*`, `wp14`, `wps`, etc. blindly. | P1 | Not supported |
| Generic attributes | Common `w:*` and XML attrs | Many elements | `xml:space`, `w:rsid*`, `w14:paraId`, `w14:textId`, `r:id`, `w:val` | Cross-cutting attributes. | Normalize for rendering, preserve originals for round-trip. | P1 | Partial |

## Main document story and block-level structure

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Main document | `w:document` | Main document part root | `mc:*`, `w:conformance` | Root of the main WordprocessingML document. | Read namespace declarations and conformance/compatibility before walking content. | P0 | Supported |
| Main document | `w:body` | `w:document` | — | Main story content container. | Children are block-level elements; final `w:sectPr` may define page layout for the last section. | P0 | Supported |
| Main document | `w:p` | Body, cell, header/footer, note, comment, text box, glossary, etc. | `w:rsidR`, `w:rsidRPr`, `w:rsidRDefault`, `w14:paraId`, `w14:textId` | Paragraph block. | Core unit for text layout; contains `pPr` and inline content. | P0 | Supported |
| Main document | `w:tbl` | Any block-level story context | common attrs | Table block. | Detailed table coverage is retained in the table matrix below. | P0 | Supported |
| Main document | `w:sectPr` | `w:body`, `w:pPr` | `w:rsidR`, `w:rsidSect` | Section properties. | Can appear at end of body or inside a paragraph's `pPr` to end a section. | P0 | Partial |
| Main document | `w:proofErr` | Body or run-level context | `w:type` | Proofing error range marker. | Usually invisible; preserve or ignore for display. | P3 | Not supported |
| Main document | `w:permStart` / `w:permEnd` | Block/inline contexts | `w:id`, `w:edGrp`, `w:ed` | Editable range permissions. | Important when importing protected forms/templates. | P3 | Not supported |
| Main document | `w:bookmarkStart` / `w:bookmarkEnd` | Block/inline contexts | `w:id`, `w:name`, `w:colFirst`, `w:colLast` | Bookmark range. | Needed for cross-references, hyperlinks and legal-document anchors. | P1 | Partial |
| Main document | `w:moveFromRangeStart` / `w:moveFromRangeEnd` | Block/inline contexts | `w:id`, `w:name`, `w:author`, `w:date` | Tracked moved-from range. | Revision-aware rendering; otherwise preserve/accept-final behavior. | P3 | Not supported |
| Main document | `w:moveToRangeStart` / `w:moveToRangeEnd` | Block/inline contexts | `w:id`, `w:name`, `w:author`, `w:date` | Tracked moved-to range. | Revision-aware rendering. | P3 | Not supported |
| Main document | `w:customXml` | Block or run context | `w:element`, `w:uri` | Custom XML wrapper around content. | Unwrap for display; preserve metadata for round-trip and template semantics. | P2 | Not supported |
| Main document | `w:sdt` | Block, row, cell, run and rich contexts | — | Structured document tag / content control. | Handle `sdtPr`, `sdtContent`; common in forms and generated legal templates. | P1 | Not supported |
| Main document | `w:altChunk` | Body/block context | `r:id` | External imported content chunk. | May point to HTML, MHT, RTF or another WordprocessingML part; Word expands it on open. | P2 | Not supported |
| Main document | `w:subDoc` | Run context | `r:id` | Subdocument reference. | Often rare; preserve or resolve relationship if building a full renderer. | P4 | Not supported |
| Main document | `w:background` | `w:document` | `w:color`, `w:themeColor`, `w:themeTint`, `w:themeShade` | Document background. | Affects page/background rendering; may contain VML background shape. | P2 | Not supported |
| Main document | `w:del` / `w:ins` | Block or run contexts | `w:id`, `w:author`, `w:date` | Tracked deletion/insertion container. | Choose display mode: original/final/show-revisions; preserve metadata. | P2 | Not supported |
| Main document | `w:commentRangeStart` / `w:commentRangeEnd` | Block/inline contexts | `w:id` | Comment anchor range. | Resolve to `comments.xml` and render comment marker if needed. | P2 | Not supported |
| Main document | `w:footnoteReference` / `w:endnoteReference` | Run context | `w:id`, `w:customMarkFollows` | Footnote/endnote marker. | Needs notes part plus style/counter handling. | P1 | Partial |
| Main document | `w:annotationRef` / `w:commentReference` | Run context | `w:id` | Annotation/comment marker. | Used for comment display and round-trip. | P2 | Not supported |

## Sections, pages, margins, columns, headers, and footers

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Section/page | `w:pgSz` | `w:sectPr` | `w:w`, `w:h`, `w:orient`, `w:code` | Page size and orientation. | Core for pagination, PDF export and layout width. | P0 | Supported |
| Section/page | `w:pgMar` | `w:sectPr` | `w:top`, `w:right`, `w:bottom`, `w:left`, `w:header`, `w:footer`, `w:gutter` | Page margins. | Twips; header/footer distances affect vertical layout. | P0 | Supported |
| Section/page | `w:cols` | `w:sectPr` | `w:num`, `w:space`, `w:sep`, `w:equalWidth` | Column layout settings. | Equal/unequal columns, gaps, separators, balanced final pages, canvas/PDF layout, and DOCX export are implemented. | P1 | Supported |
| Section/page | `w:col` | `w:cols` | `w:w`, `w:space` | Single section column. | Explicit unequal column widths and spacing import/export through section page settings. | P1 | Supported |
| Section/page | `w:type` | `w:sectPr` | `w:val` | Section break type. | Values include nextPage, continuous, evenPage, oddPage, nextColumn. | P1 | Not supported |
| Section/page | `w:docGrid` | `w:sectPr` | `w:type`, `w:linePitch`, `w:charSpace` | Document grid. | Affects East Asian and grid-snapped layout; can affect table line heights. | P2 | Partial |
| Section/page | `w:pgNumType` | `w:sectPr` | `w:start`, `w:fmt`, `w:chapStyle`, `w:chapSep` | Page numbering format. | Needed for generated page numbers and fields. | P2 | Not supported |
| Section/page | `w:headerReference` | `w:sectPr` | `w:type`, `r:id` | Header relationship for default/even/first page. | Resolve `r:id`; section can have multiple header types. | P1 | Supported |
| Section/page | `w:footerReference` | `w:sectPr` | `w:type`, `r:id` | Footer relationship for default/even/first page. | Required for pagination/PDF export. | P1 | Supported |
| Section/page | `w:titlePg` | `w:sectPr` | `w:val` | Different first page header/footer flag. | Impacts which header/footer applies to page 1 of a section. | P1 | Partial |
| Section/page | `w:evenAndOddHeaders` | `w:settings` | `w:val` | Enable distinct even/odd headers/footers. | Use with section header/footer references. | P1 | Partial |
| Section/page | `w:pageBorders` | `w:sectPr` | `w:zOrder`, `w:display`, `w:offsetFrom` | Page border container. | Render if exporting high-fidelity pages. | P2 | Not supported |
| Section/page | `w:top` / `w:left` / `w:bottom` / `w:right` | `w:pageBorders` | border attrs | Page border edge. | Use common border parser. | P2 | Not supported |
| Section/page | `w:lnNumType` | `w:sectPr` | `w:countBy`, `w:start`, `w:restart`, `w:distance` | Line numbering. | Relevant in legal and academic documents. | P3 | Not supported |
| Section/page | `w:footnotePr` / `w:endnotePr` | `w:sectPr` | children | Section-level footnote/endnote settings. | Controls placement and numbering restarts. | P2 | Not supported |
| Section/page | `w:rtlGutter` | `w:sectPr` | `w:val` | Right-to-left gutter placement. | Needed for RTL page layout. | P3 | Not supported |
| Section/page | `w:bidi` | `w:sectPr` | `w:val` | Bidi section layout. | Affects page flow and margins in RTL sections. | P2 | Not supported |
| Section/page | `w:textDirection` | `w:sectPr` | `w:val` | Text direction for section. | Vertical/rotated document layouts. | P3 | Not supported |
| Section/page | `w:vAlign` | `w:sectPr` | `w:val` | Vertical justification of page contents. | Values top/center/both/bottom; affects page vertical placement. | P2 | Not supported |
| Section/page | `w:paperSrc` | `w:sectPr` | `w:first`, `w:other` | Printer paper source. | Usually not relevant to web rendering; preserve. | P4 | Not supported |

## Paragraph-level markup and properties

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Paragraph | `w:pPr` | `w:p`, styles, numbering levels | — | Paragraph property set. | Resolve cascade: defaults → style → numbering level → direct formatting. | P0 | Supported |
| Paragraph | `w:pStyle` | `w:pPr` | `w:val` | Paragraph style reference. | Resolve style ID from `styles.xml`. | P0 | Supported |
| Paragraph | `w:jc` | `w:pPr` | `w:val` | Paragraph alignment. | Values include left, right, center, both, distribute, start/end variants. | P0 | Supported |
| Paragraph | `w:spacing` | `w:pPr` | `w:before`, `w:after`, `w:line`, `w:lineRule`, `w:beforeAutospacing`, `w:afterAutospacing` | Paragraph spacing and line spacing. | Critical for Word-like vertical layout; handle auto spacing and contextual suppression. | P0 | Supported |
| Paragraph | `w:ind` | `w:pPr` | `w:left`, `w:right`, `w:firstLine`, `w:hanging`, `w:start`, `w:end`, `w:firstLineChars`, `w:hangingChars` | Paragraph indentation. | Bidi-aware start/end supersede left/right in newer docs. | P0 | Partial |
| Paragraph | `w:tabs` | `w:pPr` | — | Tab stop collection. | Needed for legal templates, TOCs and aligned signature blocks. | P1 | Supported |
| Paragraph | `w:tab` | `w:tabs` | `w:val`, `w:pos`, `w:leader` | Single tab stop. | Explicit stops round-trip in the paragraph model and drive tab advance/leader rendering. | P1 | Supported |
| Paragraph | `w:numPr` | `w:pPr` | — | Numbering properties. | Contains `ilvl` and `numId`; list layout cannot be correct without it. | P0 | Supported |
| Paragraph | `w:ilvl` | `w:numPr` | `w:val` | List level. | Map to `abstractNum/lvl`. | P0 | Supported |
| Paragraph | `w:numId` | `w:numPr` | `w:val` | List instance id. | Map to `num` and then `abstractNum`. | P0 | Supported |
| Paragraph | `w:outlineLvl` | `w:pPr` | `w:val` | Outline level. | Needed for headings, navigation and generated TOC structure. | P1 | Supported |
| Paragraph | `w:keepNext` | `w:pPr` | `w:val` | Keep paragraph with next paragraph. | Pagination fidelity. Explicit `w:val="0"` is honored. | P1 | Supported |
| Paragraph | `w:keepLines` | `w:pPr` | `w:val` | Keep lines together. | Avoids splitting paragraph across pages. Explicit `w:val="0"` is honored. | P1 | Supported |
| Paragraph | `w:pageBreakBefore` | `w:pPr` | `w:val` | Start paragraph on new page. | Core for pagination. Explicit `w:val="0"` is honored. | P1 | Supported |
| Paragraph | `w:widowControl` | `w:pPr` | `w:val` | Widow/orphan control. | Can change page breaks in Word. | P2 | Supported |
| Paragraph | `w:suppressLineNumbers` | `w:pPr` | `w:val` | Suppress line numbering for paragraph. | Relevant when section line numbering is enabled. | P3 | Not supported |
| Paragraph | `w:pBdr` | `w:pPr` | — | Paragraph border container. | Includes top/left/bottom/right/between/bar border edges. | P1 | Partial |
| Paragraph | `w:top` / `w:left` / `w:bottom` / `w:right` / `w:between` / `w:bar` | `w:pBdr` | border attrs | Paragraph border edge. | Use common border parser; `between` applies between adjacent matching paragraphs. | P1 | Partial |
| Paragraph | `w:shd` | `w:pPr` | `w:val`, `w:color`, `w:fill`, theme attrs | Paragraph shading. | Resolve theme colors when possible. | P1 | Supported |
| Paragraph | `w:framePr` | `w:pPr` | `w:w`, `w:h`, `w:x`, `w:y`, `w:hSpace`, `w:vSpace`, `w:wrap`, `w:hAnchor`, `w:vAnchor`, `w:dropCap`, `w:lines` | Text frame / positioned paragraph. | Used by old Word text boxes/drop caps; difficult in browser layout. | P2 | Not supported |
| Paragraph | `w:rPr` | `w:pPr` | run property children | Default run props for paragraph mark. | Affects paragraph mark and sometimes inherited run formatting. | P1 | Supported |
| Paragraph | `w:sectPr` | `w:pPr` | section children | Section break after this paragraph. | Do not only scan `body/sectPr`; sections may be paragraph-scoped. | P0 | Supported |
| Paragraph | `w:bidi` | `w:pPr` | `w:val` | Right-to-left paragraph layout. | Affects alignment, indentation and text flow. | P1 | Not supported |
| Paragraph | `w:mirrorIndents` | `w:pPr` | `w:val` | Mirror paragraph indents. | Relevant for facing pages/book layout. | P3 | Not supported |
| Paragraph | `w:snapToGrid` | `w:pPr` | `w:val` | Snap paragraph to document grid. | East Asian/grid documents; may affect line height. | P2 | Partial |
| Paragraph | `w:suppressAutoHyphens` | `w:pPr` | `w:val` | Disable auto hyphenation. | Line breaking fidelity. | P2 | Not supported |
| Paragraph | `w:kinsoku` | `w:pPr` | `w:val` | East Asian line-breaking rule. | Preserve/approximate unless implementing full CJK line breaking. | P3 | Not supported |
| Paragraph | `w:wordWrap` | `w:pPr` | `w:val` | Allow line break inside Latin words. | Layout fidelity for CJK mixed text. | P3 | Not supported |
| Paragraph | `w:overflowPunct` | `w:pPr` | `w:val` | Punctuation overflow behavior. | CJK typography. | P3 | Not supported |
| Paragraph | `w:topLinePunct` | `w:pPr` | `w:val` | Compress punctuation at line start. | CJK typography. | P3 | Not supported |
| Paragraph | `w:autoSpaceDE` / `w:autoSpaceDN` | `w:pPr` | `w:val` | Auto spacing between East Asian/Latin or digits. | Can alter measured text widths. | P3 | Not supported |
| Paragraph | `w:textAlignment` | `w:pPr` | `w:val` | Vertical text alignment within line. | Values such as auto/top/center/baseline/bottom. | P2 | Not supported |
| Paragraph | `w:textboxTightWrap` | `w:pPr` | `w:val` | Tight wrap behavior in text boxes. | Rare but relevant for shapes/text boxes. | P3 | Not supported |
| Paragraph | `w:divId` | `w:pPr` | `w:val` | HTML import mapping id. | Preserve only for most importers. | P4 | Not supported |
| Paragraph | `w:cnfStyle` | `w:pPr` | conditional flags | Conditional style flags. | Most visible in table style contexts. | P2 | Not supported |
| Paragraph | `w:pPrChange` | `w:pPr` | `w:id`, `w:author`, `w:date` | Tracked paragraph property change. | Preserve or use for revision-aware rendering. | P3 | Not supported |

## Run-level content

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Run/content | `w:r` | `w:p`, `w:hyperlink`, revision containers, SDT content | `w:rsidR`, `w:rsidRPr`, `w:rsidDel` | Run: inline content sharing common properties. | Core inline unit; contains optional `rPr` then text/control/drawing children. | P0 | Supported |
| Run/content | `w:rPr` | `w:r`, `w:pPr`, styles, numbering levels | — | Run property set. | Resolve style/default cascade before direct formatting. | P0 | Supported |
| Run/content | `w:t` | `w:r` | `xml:space` | Text node. | Preserve leading/trailing spaces with `xml:space='preserve'`; concatenate only with care. | P0 | Supported |
| Run/content | `w:tab` | `w:r` | — | Tab character. | Uses paragraph tab-stop resolution, including explicit stops and default stops. | P0 | Supported |
| Run/content | `w:br` | `w:r` | `w:type`, `w:clear` | Line/page/column break. | `type='page'` and `type='column'` affect pagination/columns. | P0 | Supported |
| Run/content | `w:cr` | `w:r` | — | Carriage return. | Similar visual effect to line break in many cases. | P1 | Supported |
| Run/content | `w:noBreakHyphen` | `w:r` | — | Non-breaking hyphen. | Imported as U+2011 and exported back as `w:noBreakHyphen`. | P1 | Supported |
| Run/content | `w:softHyphen` | `w:r` | — | Optional hyphen. | Imported as U+00AD and exported back as `w:softHyphen`. | P2 | Supported |
| Run/content | `w:sym` | `w:r` | `w:font`, `w:char` | Symbol character from a font. | Map legacy symbol fonts when possible; otherwise preserve. | P1 | Not supported |
| Run/content | `w:ptab` | `w:r` | `w:alignment`, `w:relativeTo`, `w:leader` | Positioned tab. | Used in headers/footers and page-number layouts. | P2 | Not supported |
| Run/content | `w:object` | `w:r` | children/relationship attrs | Embedded OLE/VML object. | Usually preserve/placeholder unless OLE rendering is in scope. | P4 | Not supported |
| Run/content | `w:drawing` | `w:r` | DrawingML children | Modern drawing/image/chart container. | Parse `wp:inline`/`wp:anchor`; resolve image relationships. | P1 | Partial |
| Run/content | `w:pict` | `w:r` | VML children | Legacy VML picture/shape container. | Common in old DOCX/templates; support at least image extraction and text boxes. | P2 | Partial |
| Run/content | `w:lastRenderedPageBreak` | `w:r` | — | Producer-saved rendered page break marker. | Useful debug hint but not normative for a new layout engine. | P3 | Supported |
| Run/content | `w:instrText` | `w:r` | `xml:space` | Field instruction text. | Needed for complex fields like PAGE, NUMPAGES, TOC, REF, HYPERLINK. | P1 | Supported |
| Run/content | `w:fldChar` | `w:r` | `w:fldCharType`, `w:fldLock`, `w:dirty` | Complex field delimiter. | Track begin/separate/end state to reconstruct field instructions and result. | P1 | Partial |
| Run/content | `w:fldSimple` | Paragraph inline context | `w:instr`, `w:fldLock`, `w:dirty` | Simple field wrapper. | May contain field result runs; evaluate or preserve current result. | P1 | Partial |
| Run/content | `w:delText` | `w:r` in deletion context | `xml:space` | Deleted text. | Show only in revision mode; include in original-mode text extraction. | P2 | Not supported |
| Run/content | `w:commentReference` | `w:r` | `w:id` | Visible comment reference marker. | Resolve comments part for UI/sidebar. | P2 | Not supported |
| Run/content | `w:separator` / `w:continuationSeparator` | Footnote/endnote special notes | — | Footnote/endnote separator markers. | Special note content. | P3 | Supported |
| Run/content | `w:dayShort` / `w:monthLong` / date tokens | `w:r` | — | Legacy date field result tokens. | Mostly preserve. | P4 | Not supported |

## Run properties

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Run properties | `w:rStyle` | `w:rPr` | `w:val` | Character style reference. | Resolve to `style[type='character']`. | P0 | Partial |
| Run properties | `w:rFonts` | `w:rPr` | `w:ascii`, `w:hAnsi`, `w:eastAsia`, `w:cs`, `w:asciiTheme`, `w:hAnsiTheme`, `w:eastAsiaTheme`, `w:cstheme`, `w:hint` | Run font family selection. | Resolve theme font slots and script-specific fonts. | P0 | Partial |
| Run properties | `w:b` / `w:bCs` | `w:rPr` | `w:val` | Bold for Latin / complex script. | Either variant sets the model's bold flag on import; export emits both `w:b` and `w:bCs` so bold applies to every script. | P0 | Supported |
| Run properties | `w:i` / `w:iCs` | `w:rPr` | `w:val` | Italic for Latin / complex script. | Either variant sets the model's italic flag on import; export emits both `w:i` and `w:iCs`. | P0 | Supported |
| Run properties | `w:sz` / `w:szCs` | `w:rPr` | `w:val` | Font size in half-points. | Falls back to `w:szCs` on import when `w:sz` is absent; export emits both. | P0 | Supported |
| Run properties | `w:color` | `w:rPr` | `w:val`, `w:themeColor`, `w:themeTint`, `w:themeShade` | Text color. | Literal `w:val` and `w:themeColor` are both resolved on import: theme tokens map to the `theme1.xml` color scheme (with `w:themeTint`/`w:themeShade` applied) and flatten to a concrete hex on export; `auto` resolves to the default. The non-default `w:clrSchemeMapping` override (settings.xml) is not honored. | P0 | Supported |
| Run properties | `w:u` | `w:rPr` | `w:val`, `w:color`, theme attrs | Underline. | Many styles beyond single; supports underline color. | P1 | Supported |
| Run properties | `w:strike` / `w:dstrike` | `w:rPr` | `w:val` | Single/double strikethrough. | Visible formatting. Explicit `w:val="0"` is honored so a run can switch the toggle off against an inherited style. | P1 | Supported |
| Run properties | `w:vertAlign` | `w:rPr` | `w:val` | Superscript/subscript/baseline. | Affects baseline and line height. | P1 | Supported |
| Run properties | `w:highlight` | `w:rPr` | `w:val` | Highlight color. | Limited named colors; distinct from `shd`. | P1 | Supported |
| Run properties | `w:shd` | `w:rPr` | `w:val`, `w:color`, `w:fill`, theme attrs | Run shading. | Literal `w:fill` is imported as solid run background, rendered in canvas/PDF, and exported as `w:shd`; theme fills are not resolved yet. | P1 | Partial |
| Run properties | `w:caps` / `w:smallCaps` | `w:rPr` | `w:val` | All caps / small caps. | Text transform affects measurement. Explicit `w:val="0"` is honored. | P1 | Supported |
| Run properties | `w:vanish` | `w:rPr` | `w:val` | Hidden text. | Obey `settings/displayHiddenText` or importer mode. Explicit `w:val="0"` is honored. | P1 | Supported |
| Run properties | `w:webHidden` | `w:rPr` | `w:val` | Hidden in web view. | Imported into run style metadata, available through toggle-style commands, and exported back as `w:webHidden` when enabled; it does not alter the normal print/canvas view. | P3 | Supported |
| Run properties | `w:rtl` | `w:rPr` | `w:val` | Right-to-left run. | Bidi text shaping and ordering. | P1 | Not supported |
| Run properties | `w:cs` | `w:rPr` | `w:val` | Complex-script formatting flag. | Affects font selection and shaping. | P2 | Not supported |
| Run properties | `w:lang` | `w:rPr` | `w:val`, `w:eastAsia`, `w:bidi` | Language tags. | Imported into run style language metadata, available to style commands, preserved in HTML serialization, and exported back with concrete `val`, `eastAsia`, and `bidi` attributes when present. | P1 | Supported |
| Run properties | `w:kern` | `w:rPr` | `w:val` | Kerning threshold. | Text measurement fidelity. | P2 | Supported |
| Run properties | `w:spacing` | `w:rPr` | `w:val` | Character spacing. | Twips; affects text width. | P1 | Supported |
| Run properties | `w:w` | `w:rPr` | `w:val` | Character scaling percentage. | Affects text width; do not confuse with width attrs elsewhere. | P2 | Supported |
| Run properties | `w:position` | `w:rPr` | `w:val` | Raised/lowered text position. | Half-points; affects baseline but not semantic subscript. | P2 | Supported |
| Run properties | `w:fitText` | `w:rPr` | `w:val`, `w:id` | Fit text into fixed width. | Word compresses/expands run; preserve or approximate. | P3 | Not supported |
| Run properties | `w:effect` | `w:rPr` | `w:val` | Legacy animated text effect. | Imported into run style metadata, available through value-style commands, and exported back as `w:effect`; obsolete animation behavior is preserved as metadata rather than rendered in the normal canvas view. | P4 | Supported |
| Run properties | `w:em` | `w:rPr` | `w:val` | Emphasis mark. | East Asian typography. | P3 | Not supported |
| Run properties | `w:bdr` | `w:rPr` | border attrs | Run border. | Visible in some templates; use common border parser. | P2 | Not supported |
| Run properties | `w:imprint` / `w:outline` / `w:shadow` | `w:rPr` | `w:val` | Legacy text effects. | Preserve/approximate with CSS when possible. | P3 | Not supported |
| Run properties | `w:emboss` | `w:rPr` | `w:val` | Emboss effect. | Legacy visual effect. | P3 | Not supported |
| Run properties | `w:snapToGrid` | `w:rPr` | `w:val` | Snap run to document grid. | May affect line height in CJK layouts. | P3 | Not supported |
| Run properties | `w:noProof` | `w:rPr` | `w:val` | Do not check spelling/grammar. | Imported into run style metadata, available through toggle-style commands, and exported back as `w:noProof` when enabled. | P3 | Supported |
| Run properties | `w:oMath` | `w:rPr` | `w:val` | Run contains Office Math. | Use with MathML/OMML parsing. | P2 | Not supported |
| Run properties | `w:specVanish` | `w:rPr` | `w:val` | Special hidden placeholder behavior. | Imported into run style metadata, available through toggle-style commands, and exported back as `w:specVanish` when enabled; it is preserved for field/numbering internals without changing normal canvas rendering. | P4 | Supported |
| Run properties | `w:stylePaneFormatFilter` / `w:stylePaneSortMethod` | settings/style UI | `w:val` | Style pane UI settings. | Not layout-relevant. | P4 | Not supported |
| Run properties | `w:rPrChange` | `w:rPr` | `w:id`, `w:author`, `w:date` | Tracked run property change. | Revision-aware rendering or preserve. | P3 | Not supported |

## Styles and defaults

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Styles | `w:styles` | `word/styles.xml` root | — | Style definitions part root. | Must be parsed before rendering document body for fidelity. | P0 | Supported |
| Styles | `w:docDefaults` | `w:styles` | — | Document default paragraph/run properties. | Base of formatting cascade. | P0 | Supported |
| Styles | `w:rPrDefault` / `w:pPrDefault` | `w:docDefaults` | — | Default run/paragraph props. | Apply when no more specific formatting exists. | P0 | Supported |
| Styles | `w:latentStyles` | `w:styles` | `w:defLockedState`, `w:defUIPriority`, `w:defSemiHidden`, `w:defUnhideWhenUsed`, `w:defQFormat`, `w:count` | Latent built-in style metadata. | Mostly UI metadata; can help map built-in styles. | P3 | Not supported |
| Styles | `w:lsdException` | `w:latentStyles` | `w:name`, `w:locked`, `w:uiPriority`, `w:semiHidden`, `w:unhideWhenUsed`, `w:qFormat` | Latent style exception. | Preserve for round-trip. | P4 | Not supported |
| Styles | `w:style` | `w:styles` | `w:type`, `w:styleId`, `w:default`, `w:customStyle` | Style definition. | Types include paragraph, character, table, numbering. | P0 | Partial |
| Styles | `w:name` | `w:style` | `w:val` | Human-readable style name. | Not always equal to `styleId`. | P1 | Supported |
| Styles | `w:basedOn` | `w:style` | `w:val` | Base style reference. | Follow inheritance chain while avoiding cycles. | P0 | Supported |
| Styles | `w:next` | `w:style` | `w:val` | Next paragraph style. | Useful for editing, less for static rendering. | P3 | Partial |
| Styles | `w:link` | `w:style` | `w:val` | Linked paragraph/character style. | Used by Word's linked style model. | P2 | Not supported |
| Styles | `w:aliases` | `w:style` | `w:val` | Alternate style names. | UI/search metadata. | P4 | Not supported |
| Styles | `w:uiPriority` | `w:style` | `w:val` | Style UI priority. | Imported, exported, and used to order the quick-style gallery. | P4 | Supported |
| Styles | `w:qFormat` | `w:style` | `w:val` | Primary style flag. | Imported, exported, and used to select quick styles. | P4 | Supported |
| Styles | `w:semiHidden` / `w:hidden` / `w:unhideWhenUsed` | `w:style` | `w:val` | Style visibility flags. | `semiHidden` and `unhideWhenUsed` round-trip and drive gallery visibility; `hidden` remains unsupported. | P4 | Partial |
| Styles | `w:autoRedefine` | `w:style` | `w:val` | Automatically redefine style. | Editing behavior, not layout. | P4 | Not supported |
| Styles | `w:locked` | `w:style` | `w:val` | Style locked. | Editing/protection behavior. | P4 | Not supported |
| Styles | `w:personal` / `w:personalCompose` / `w:personalReply` | `w:style` | `w:val` | Email/personal style metadata. | Preserve. | P4 | Not supported |
| Styles | `w:pPr` / `w:rPr` / `w:tblPr` / `w:trPr` / `w:tcPr` | `w:style` | property children | Style-contained properties. | Merge into cascade based on style type and context. | P0 | Partial |
| Styles | `w:tblStylePr` | `w:style[type='table']` | `w:type` | Conditional table style bucket. | Already covered in table matrix; essential for banded/header rows. | P2 | Not supported |
| Styles | `w:numPr` | `w:pPr` in style | `ilvl`, `numId` | Style-level numbering. | Paragraph may become list item via style alone. | P1 | Not supported |
| Styles | `w:rsid` | `w:style` | `w:val` | Revision session id for style. | Preserve only. | P4 | Not supported |

## Numbering and lists

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Numbering | `w:numbering` | `word/numbering.xml` root | — | Numbering definitions root. | Parse before laying out paragraphs with `numPr`. | P0 | Partial |
| Numbering | `w:abstractNum` | `w:numbering` | `w:abstractNumId`, `w15:restartNumberingAfterBreak` | Abstract list template. | Contains levels shared by concrete numbering instances. | P0 | Partial |
| Numbering | `w:num` | `w:numbering` | `w:numId` | Concrete numbering instance. | Distinct instances keep independent counters and remain distinct on export. | P0 | Supported |
| Numbering | `w:abstractNumId` | `w:num` | `w:val` | Reference to abstract numbering. | Resolve before rendering list label. | P0 | Supported |
| Numbering | `w:lvl` | `w:abstractNum`, `w:lvlOverride` | `w:ilvl`, `w:tplc`, `w:tentative` | Numbering level definition. | Contains format, text, indentation and style info per level. | P0 | Partial |
| Numbering | `w:start` | `w:lvl` | `w:val` | Starting number for level. | Counter initialization is imported, rendered, and exported. | P0 | Supported |
| Numbering | `w:numFmt` | `w:lvl` | `w:val`, `w:format` | Number format. | Decimal, bullet, roman, letter, ordinal, etc. | P0 | Partial |
| Numbering | `w:lvlText` | `w:lvl` | `w:val`, `w:null` | Label text pattern. | Literal text and `%1`…`%9` multilevel placeholders render and round-trip; `w:null` is not modeled. | P0 | Partial |
| Numbering | `w:lvlJc` | `w:lvl` | `w:val` | Number label alignment. | Left/center/right alignment drives canvas/PDF marker placement and round-trips. | P1 | Supported |
| Numbering | `w:pPr` / `w:rPr` | `w:lvl` | property children | Level paragraph/run formatting. | Level indentation and bullet font are applied; the remaining property subsets are not. | P0 | Partial |
| Numbering | `w:pStyle` | `w:lvl` | `w:val` | Paragraph style associated with level. | A style may imply a numbering level. | P1 | Not supported |
| Numbering | `w:isLgl` | `w:lvl` | `w:val` | Legal numbering format. | Referenced levels render as decimal and round-trip. | P1 | Supported |
| Numbering | `w:suff` | `w:lvl` | `w:val` | Suffix after number. | Tab/space/nothing affect marker spacing and round-trip. | P1 | Supported |
| Numbering | `w:lvlRestart` | `w:lvl` | `w:val` | Restart behavior after higher level. | Nested counter behavior. | P2 | Not supported |
| Numbering | `w:legacy` | `w:lvl` | `w:legacy`, `w:legacySpace`, `w:legacyIndent` | Legacy numbering metrics. | Preserve/approximate for old documents. | P3 | Not supported |
| Numbering | `w:lvlPicBulletId` | `w:lvl` | `w:val` | Picture bullet reference. | Resolve `numPicBullet`. | P2 | Not supported |
| Numbering | `w:numPicBullet` | `w:numbering` | `w:numPicBulletId` | Picture bullet definition. | May contain VML/Drawing picture. | P2 | Not supported |
| Numbering | `w:lvlOverride` | `w:num` | `w:ilvl` | Override for one list level. | Effective replacement levels are imported; export materializes the effective level in an instance-specific abstract definition. | P1 | Partial |
| Numbering | `w:startOverride` | `w:lvlOverride` | `w:val` | Concrete restart value. | Imported as the instance-level start and preserved semantically on export. | P1 | Supported |
| Numbering | `w:multiLevelType` | `w:abstractNum` | `w:val` | List type. | singleLevel, multilevel, hybridMultilevel. | P2 | Not supported |
| Numbering | `w:nsid` / `w:tmpl` | `w:abstractNum` | `w:val` | List identity/template metadata. | Preserve; not needed for rendering. | P4 | Not supported |

## Hyperlinks, fields, bookmarks, and legacy forms

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Links/fields | `w:hyperlink` | Paragraph inline context | `r:id`, `w:anchor`, `w:docLocation`, `w:history`, `w:tgtFrame`, `w:tooltip` | Hyperlink wrapper. | External link via relationship or internal bookmark via `anchor`. | P1 | Supported |
| Links/fields | `w:fldSimple` | Paragraph inline context | `w:instr`, `w:fldLock`, `w:dirty` | Simple field. | Can keep current result or implement evaluator. | P1 | Partial |
| Links/fields | `w:fldChar` | Run | `w:fldCharType`, `w:fldLock`, `w:dirty` | Complex field delimiter. | Begin/separate/end preserved as zero-length marker runs (`EditorTextRun.fieldChar`), so REF/PAGEREF/TOC/unknown fields round-trip 1:1 — including TOCs whose begin/end span multiple `w:p`. Complete single-paragraph PAGE/NUMPAGES still collapse to a `field` run. | P1 | Partial |
| Links/fields | `w:instrText` | Run | `xml:space` | Complex field instruction text. | Preserved verbatim per run (`EditorTextRun.fieldInstruction`); not concatenated/evaluated. | P1 | Partial |
| Links/fields | `w:ffData` | `w:fldChar` | children | Legacy form field data. | Important for old protected forms. | P2 | Not supported |
| Links/fields | `w:name` / `w:enabled` / `w:calcOnExit` / `w:entryMacro` / `w:exitMacro` | `w:ffData` | `w:val` | Form field metadata. | Preserve; may map to UI controls. | P3 | Not supported |
| Links/fields | `w:textInput` | `w:ffData` | `w:type`, `w:default`, `w:maxLength`, `w:format` | Legacy text form field. | Map to editable input if forms are supported. | P2 | Not supported |
| Links/fields | `w:checkBox` | `w:ffData` | `w:size`, `w:sizeAuto`, `w:default`, `w:checked` | Legacy checkbox field. | Common in forms/templates. | P2 | Not supported |
| Links/fields | `w:ddList` | `w:ffData` | `w:result`, `w:default`, `w:listEntry` | Legacy dropdown list field. | Map entries and selected index. | P2 | Not supported |
| Links/fields | `w:bookmarkStart` / `w:bookmarkEnd` | Block/inline contexts | `w:id`, `w:name` | Bookmark range. | Target for REF/PAGEREF/hyperlinks. | P1 | Partial |
| Links/fields | Common fields | Field instruction stream | PAGE, NUMPAGES, SECTION, DATE, TIME, REF, PAGEREF, HYPERLINK, TOC, INCLUDEPICTURE, SEQ | Dynamic fields. | Minimal renderer can show stored result; pagination export must compute PAGE/NUMPAGES. | P1 | Partial |
| Links/fields | `w:dirty` | Field elements | `w:val` | Field requires update. | Signal stored result may be stale. | P2 | Not supported |
| Links/fields | `w:fldLock` | Field elements | `w:val` | Locked field. | Do not update in editor mode unless user requests. | P3 | Not supported |
| Links/fields | `w:smartTag` | Inline/block wrapper | `w:uri`, `w:element` | Legacy smart tag wrapper. | Unwrap for display; preserve semantics. | P4 | Not supported |

## Tracked changes, proofing, and permissions

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Revisions | `w:ins` | Block/run contexts | `w:id`, `w:author`, `w:date` | Inserted content. | Display depends on revision mode; final mode includes inserted content. | P2 | Not supported |
| Revisions | `w:del` | Block/run contexts | `w:id`, `w:author`, `w:date` | Deleted content. | Final mode excludes deleted content; original mode includes deleted text. | P2 | Not supported |
| Revisions | `w:moveFrom` / `w:moveTo` | Block/run contexts | `w:id`, `w:author`, `w:date` | Moved content containers. | Revision-aware rendering; preserve relationships among range markers. | P3 | Not supported |
| Revisions | `w:pPrChange` / `w:rPrChange` / `w:sectPrChange` | Property containers | `w:id`, `w:author`, `w:date` | Tracked property change. | Contains previous property state. | P3 | Not supported |
| Revisions | `w:numberingChange` | `w:numPr` | `w:id`, `w:author`, `w:date`, `w:original` | Tracked numbering change. | Needed for review mode. | P3 | Not supported |
| Revisions | `w:trackRevisions` | `w:settings` | `w:val` | Track revisions setting. | Editing behavior; rendering uses actual revision markup. | P3 | N/A |
| Revisions | `w:revisionView` | `w:settings` | `w:markup`, `w:comments`, `w:insDel`, `w:formatting`, `w:inkAnnotations` | Revision display preferences. | Importer can use as default view hint. | P3 | N/A |
| Proofing | `w:proofState` | `w:settings` | `w:spelling`, `w:grammar` | Proofing state. | Not layout-relevant. | P4 | N/A |
| Proofing | `w:proofErr` | Document content | `w:type` | Proofing error range marker. | Preserve or ignore for display. | P4 | Not supported |
| Permissions | `w:permStart` / `w:permEnd` | Document content | `w:id`, `w:edGrp`, `w:ed`, `w:colFirst`, `w:colLast` | Editable range permission. | Important if implementing editor permissions. | P3 | Not supported |

## Comments, footnotes, endnotes, and annotations

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Comments | `w:comments` | `word/comments.xml` root | — | Comments part root. | Resolve ranges/markers from main document. | P2 | Not supported |
| Comments | `w:comment` | `w:comments` | `w:id`, `w:author`, `w:date`, `w:initials` | Single comment story. | Contains paragraphs/tables like a mini story. | P2 | Not supported |
| Comments | `w:commentRangeStart` / `w:commentRangeEnd` | Document content | `w:id` | Comment anchor range. | May be missing one endpoint in malformed docs; handle gracefully. | P2 | Not supported |
| Comments | `w:commentReference` | Run | `w:id` | Comment reference marker. | UI/sidebar link. | P2 | Not supported |
| Comments extended | `w15:commentsEx` / `w15:commentEx` | Extended comments part | `w15:paraId`, `w15:done`, `w15:parentId` | Threaded/resolved comment metadata. | Preserve when not supported. | P3 | Not supported |
| Comments extended | `w16cid:commentsIds` / `w16cid:commentId` | Comment ids part | extension attrs | Modern comment IDs. | Preserve for round-trip. | P3 | Not supported |
| Footnotes | `w:footnotes` | `word/footnotes.xml` root | — | Footnotes part root. | Contains special separator notes and user notes. | P1 | Supported |
| Footnotes | `w:footnote` | `w:footnotes` | `w:id`, `w:type` | Single footnote story. | Contains block content; types include separator/continuationSeparator. | P1 | Supported |
| Footnotes | `w:footnoteReference` | Run | `w:id`, `w:customMarkFollows` | Footnote anchor marker. | Resolve note and counter style. | P1 | Supported |
| Endnotes | `w:endnotes` | `word/endnotes.xml` root | — | Endnotes part root. | Parsed on import and written on export, mirroring the footnotes pipeline; special separator/continuationSeparator entries are recognized. | P1 | Supported |
| Endnotes | `w:endnote` | `w:endnotes` | `w:id`, `w:type` | Single endnote story. | Block content (paragraphs/tables) round-trips; bodies render appended to the end of the document flow. | P1 | Supported |
| Endnotes | `w:endnoteReference` | Run | `w:id`, `w:customMarkFollows` | Endnote anchor marker. | Imported into `run.endnoteReference`, renumbered in reading order, exported back with the resolved `w:id`; `customMarkFollows` preserved. | P1 | Supported |
| Annotations | `w:annotationRef` | Run in comment/note | — | Annotation reference glyph. | Special reference marker. | P3 | Not supported |

## Headers, footers, glossary, and secondary stories

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Stories | `w:hdr` | Header part root | — | Header story root. | Contains block-level content; linked by section `headerReference`. | P1 | Supported |
| Stories | `w:ftr` | Footer part root | — | Footer story root. | Contains page-number fields, text, tables, images. | P1 | Supported |
| Stories | Header/footer content | `w:hdr`, `w:ftr` | normal block/inline attrs | Story content. | Render per section/page type: first/even/default. | P1 | Supported |
| Glossary | `w:glossaryDocument` | Glossary part root | — | Building blocks / AutoText. | Usually not rendered in main document unless referenced; preserve if editing templates. | P3 | Not supported |
| Glossary | `w:docParts` / `w:docPart` | Glossary document | — | Building block collection/item. | Useful for template systems and content controls. | P3 | Not supported |
| Glossary | `w:docPartPr` / `w:docPartBody` | `w:docPart` | children | Building block metadata/content. | Body uses normal block content. | P3 | Not supported |
| Text boxes | `w:txbxContent` | VML/Drawing text box | — | Text box story content. | Contains block-level WordprocessingML; layout requires shape position/size. | P2 | Not supported |

## Drawings, images, shapes, charts, VML, and OLE

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| DrawingML | `w:drawing` | Run | — | Drawing object wrapper. | Contains `wp:inline` or `wp:anchor`. | P1 | Partial |
| DrawingML | `wp:inline` | `w:drawing` | `distT`, `distB`, `distL`, `distR` | Inline drawing. | Occupies inline layout box; easiest image case. | P1 | Supported |
| DrawingML | `wp:anchor` | `w:drawing` | `simplePos`, `relativeHeight`, `behindDoc`, `locked`, `layoutInCell`, `allowOverlap`, distances | Floating drawing. | Requires positioning, wrapping and z-order handling. | P2 | Partial |
| DrawingML | `wp:extent` | `wp:inline`, `wp:anchor` | `cx`, `cy` | Drawing size in EMUs. | Convert EMUs to pixels/points/twips. | P1 | Supported |
| DrawingML | `wp:effectExtent` | `wp:inline`, `wp:anchor` | `l`, `t`, `r`, `b` | Visual effect extents. | Shadows/glows may extend layout bounds. | P3 | Not supported |
| DrawingML | `wp:docPr` | `wp:inline`, `wp:anchor` | `id`, `name`, `descr`, `title` | Non-visual drawing properties. | Alt text/accessibility and stable IDs. | P2 | Supported |
| DrawingML | `wp:cNvGraphicFramePr` | `wp:inline`, `wp:anchor` | children | Non-visual frame properties. | Preserve locks. | P3 | Not supported |
| DrawingML | `wp:positionH` / `wp:positionV` | `wp:anchor` | `relativeFrom` | Horizontal/vertical positioning. | Contains `align` or `posOffset`; relative to page/margin/column/character/etc. | P2 | Partial |
| DrawingML | `wp:wrapNone` / `wp:wrapSquare` / `wp:wrapTight` / `wp:wrapThrough` / `wp:wrapTopAndBottom` | `wp:anchor` | wrap-specific attrs | Text wrapping mode around object. | Major impact on paragraph layout. | P2 | Partial |
| DrawingML | `wp:simplePos` | `wp:anchor` | `x`, `y` | Simple absolute position. | Used when `simplePos='1'`. | P2 | Partial |
| DrawingML | `a:graphic` | `wp:inline`, `wp:anchor` | — | DrawingML graphic root. | Dispatch by child `a:graphicData/@uri`. | P1 | Supported |
| DrawingML | `a:graphicData` | `a:graphic` | `uri` | Graphic payload container. | Common URIs for pictures, charts, diagrams, WPS shapes. | P1 | Supported |
| Pictures | `pic:pic` | `a:graphicData` | — | DrawingML picture object. | Core image representation. | P1 | Supported |
| Pictures | `pic:nvPicPr` / `pic:cNvPr` / `pic:cNvPicPr` | `pic:pic` | `id`, `name`, `descr`, `title` | Picture non-visual properties. | Alt text/name metadata. | P2 | Partial |
| Pictures | `pic:blipFill` | `pic:pic` | — | Picture fill container. | Find `a:blip` relationship. | P1 | Supported |
| Pictures | `a:blip` | `pic:blipFill`, other fills | `r:embed`, `r:link`, `cstate` | Image binary reference. | Resolve embedded or linked images; preserve external link. | P1 | Supported |
| Pictures | `a:srcRect` | `pic:blipFill` | `l`, `t`, `r`, `b` | Image crop rectangle. | Percent thousandths; affects displayed crop. | P2 | Supported |
| Pictures | `a:stretch` / `a:tile` | `pic:blipFill` | children/attrs | Image fill mode. | Commonly stretch to shape bounds. | P2 | Partial |
| Pictures | `pic:spPr` | `pic:pic` | — | Picture shape properties. | Contains transform, geometry, line/effects. | P1 | Partial |
| DrawingML shape | `a:xfrm` | Shape properties | `rot`, `flipH`, `flipV` | Transform container. | Child `a:off` and `a:ext` define object coordinates/size. | P1 | Partial |
| DrawingML shape | `a:off` / `a:ext` | `a:xfrm` | `x`, `y`, `cx`, `cy` | Position/size values in EMUs. | Core for drawing geometry. | P1 | Partial |
| DrawingML shape | `a:prstGeom` / `a:custGeom` | Shape properties | `prst` | Preset/custom geometry. | Approximate common shapes; preserve custom geometry if unsupported. | P2 | Not supported |
| DrawingML shape | `a:solidFill` / `a:gradFill` / `a:pattFill` / `a:noFill` / `a:blipFill` | Shape properties/text props | color/fill children | Fill definitions. | Resolve colors through scheme/theme where needed. | P2 | Not supported |
| DrawingML shape | `a:ln` | Shape properties | `w`, `cap`, `cmpd`, `algn` | Line/stroke definition. | Contains fill, dash, join, head/tail arrow settings. | P2 | Not supported |
| DrawingML color | `a:srgbClr` / `a:schemeClr` / `a:sysClr` / `a:prstClr` | Color contexts | `val`, transformations | Color choices. | Theme resolution is mandatory for accurate colors. | P1 | Not supported |
| Charts | `c:chart` | Drawing relationship target | `r:id` | Chart reference. | Requires chart part; can render placeholder or parse chart data. | P3 | Not supported |
| Diagrams | SmartArt/diagram parts | Drawing relationships | varies | SmartArt diagrams. | Usually preserve or render preview if available. | P4 | Not supported |
| VML | `w:pict` | Run | VML children | Legacy VML container. | Still appears in older Word docs and some templates. | P2 | Partial |
| VML | `v:shape` | `w:pict`, VML group | `id`, `type`, `style`, `fillcolor`, `strokecolor`, `coordsize`, `path` | Legacy shape. | Parse CSS-like style for position/size; preserve unsupported geometry. | P2 | Partial |
| VML | `v:imagedata` | `v:shape` | `r:id`, `o:title`, `croptop`, `cropright`, `cropbottom`, `cropleft` | Legacy image data. | Resolve image relationship. | P2 | Partial |
| VML | `v:textbox` | `v:shape` | `style`, `inset` | Legacy text box. | Contains `w:txbxContent` with normal WordprocessingML. | P2 | Not supported |
| VML | `v:group` | VML contexts | `style`, `coordorigin`, `coordsize` | Grouped legacy shapes. | Transform children coordinates. | P3 | Not supported |
| VML | `v:rect` / `v:oval` / `v:line` / `v:polyline` / `v:roundrect` | VML contexts | style/fill/stroke attrs | Common legacy shapes. | Approximate to SVG/CSS if rendering. | P3 | Not supported |
| VML/OLE | `o:OLEObject` | `w:object` / VML | `Type`, `ProgID`, `ShapeID`, `DrawAspect`, `ObjectID`, `r:id` | Embedded/linked OLE object. | Usually render placeholder; preserve relationship. | P4 | Not supported |

## Content controls, custom XML, and altChunk

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Content controls | `w:sdt` | Block/run/table row/cell contexts | — | Structured document tag wrapper. | Forms/templates often depend on this. | P1 | Not supported |
| Content controls | `w:sdtPr` | `w:sdt` | — | Content control properties. | Parse tag/alias/data binding/lock/control type. | P1 | Not supported |
| Content controls | `w:sdtContent` | `w:sdt` | — | Content control content. | Contains normal block/run/row/cell content depending control type. | P1 | Not supported |
| Content controls | `w:alias` | `w:sdtPr` | `w:val` | Friendly name. | UI/template metadata. | P2 | Not supported |
| Content controls | `w:tag` | `w:sdtPr` | `w:val` | Programmatic tag. | Very important for template automation. | P1 | Not supported |
| Content controls | `w:id` | `w:sdtPr` | `w:val` | Content control id. | Preserve stable IDs. | P2 | Not supported |
| Content controls | `w:lock` | `w:sdtPr` | `w:val` | Content control lock behavior. | Editing behavior. | P3 | Not supported |
| Content controls | `w:placeholder` / `w:docPart` | `w:sdtPr` | `w:val` | Placeholder building block. | Resolve glossary if editing templates. | P3 | Not supported |
| Content controls | `w:dataBinding` | `w:sdtPr` | `w:xpath`, `w:storeItemID`, `w:prefixMappings` | Binding to custom XML data. | Core for data-driven templates. | P1 | Not supported |
| Content controls | `w:text` / `w:richText` / `w:picture` / `w:comboBox` / `w:dropDownList` / `w:date` / `w:checkbox` / `w:repeatingSection` | `w:sdtPr` | control-specific attrs | Specific content control type. | Map to editor widgets where applicable; otherwise display content. | P2 | Not supported |
| Content controls | `w:listItem` | `w:comboBox`, `w:dropDownList` | `w:displayText`, `w:value` | Dropdown/combobox item. | Preserve values for forms. | P2 | Not supported |
| Custom XML | `w:customXml` | Block/run context | `w:element`, `w:uri` | Custom XML semantic wrapper. | Unwrap for layout; retain for semantic round-trip. | P2 | Not supported |
| Custom XML | `w:customXmlPr` | `w:customXml` | — | Custom XML properties. | Contains placeholder/attrs. | P3 | Not supported |
| Custom XML | Custom XML item parts | Package customXml folder | store item ids, schema refs | Data stores for binding. | Needed if evaluating `w:dataBinding`. | P2 | Not supported |
| AltChunk | `w:altChunk` | Block context | `r:id` | Alternative-format import chunk. | Do not silently drop; convert if target part is HTML/MHT/RTF/docx or warn. | P2 | Not supported |

## Office Math / OMML

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Office Math | `m:oMath` | Run/paragraph context | — | Inline Office Math object. | Convert to MathML/SVG or preserve OMML. | P2 | Not supported |
| Office Math | `m:oMathPara` | Paragraph context | — | Display math paragraph. | Affects line/block layout. | P2 | Not supported |
| Office Math | `m:r` / `m:t` | Math contexts | `xml:space` | Math run/text. | Separate from normal `w:r` and `w:t`. | P2 | Not supported |
| Office Math | `m:f` / `m:num` / `m:den` | Math contexts | properties | Fraction. | Core OMML structure. | P2 | Not supported |
| Office Math | `m:sSup` / `m:sSub` / `m:sSubSup` | Math contexts | properties | Superscript/subscript. | Core math layout. | P2 | Not supported |
| Office Math | `m:rad` / `m:deg` / `m:e` | Math contexts | properties | Radical. | Core math layout. | P2 | Not supported |
| Office Math | `m:nary` | Math contexts | properties | N-ary operator. | Integral/sum/product style layout. | P3 | Not supported |
| Office Math | `m:d` | Math contexts | properties | Delimiter expression. | Parentheses/brackets stretching. | P3 | Not supported |
| Office Math | `m:m` / `m:mr` | Math contexts | properties | Matrix. | Important for equations. | P3 | Not supported |
| Office Math | `m:acc` / `m:bar` / `m:box` / `m:borderBox` / `m:groupChr` | Math contexts | properties | Accents/bars/boxes/group characters. | Preserve or convert if math rendering is required. | P3 | Not supported |
| Office Math | `m:mathPr` | Settings part | children | Math settings. | Controls display of OMML math. | P3 | Not supported |

## Settings, compatibility, fonts, web settings, and themes

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Settings | `w:settings` | `word/settings.xml` root | — | Document settings root. | Parse once and pass layout/settings context to renderer. | P1 | Partial |
| Settings | `w:zoom` | `w:settings` | `w:val`, `w:percent` | View zoom. | UI only; preserve. | P4 | N/A |
| Settings | `w:view` | `w:settings` | `w:val` | Preferred view. | UI only. | P4 | N/A |
| Settings | `w:displayBackgroundShape` | `w:settings` | `w:val` | Show background shape. | Affects background rendering. | P3 | N/A |
| Settings | `w:displayProofErr` | `w:settings` | `w:val` | Display proofing errors. | UI only. | P4 | N/A |
| Settings | `w:displayHorizontalDrawingGridEvery` / `w:displayVerticalDrawingGridEvery` | `w:settings` | `w:val` | Drawing grid display. | UI/editor behavior. | P4 | N/A |
| Settings | `w:characterSpacingControl` | `w:settings` | `w:val` | Character spacing control mode. | Can affect East Asian layout. | P3 | Not supported |
| Settings | `w:defaultTabStop` | `w:settings` | `w:val` | Default tab width. | Core for tab layout when no explicit tab stop exists. | P1 | Supported |
| Settings | `w:autoHyphenation` / `w:consecutiveHyphenLimit` / `w:hyphenationZone` / `w:doNotHyphenateCaps` | `w:settings` | `w:val` | Hyphenation settings. | Line breaking/page fidelity. | P2 | Not supported |
| Settings | `w:evenAndOddHeaders` | `w:settings` | `w:val` | Even/odd headers enabled. | Used with section header/footer refs. | P1 | Partial |
| Settings | `w:bookFoldRevPrinting` / `w:bookFoldPrinting` / `w:bookFoldPrintingSheets` | `w:settings` | `w:val` | Booklet printing settings. | Print layout; usually preserve. | P4 | Not supported |
| Settings | `w:mirrorMargins` | `w:settings` | `w:val` | Mirror page margins. | Affects facing-page layout. | P2 | Not supported |
| Settings | `w:bordersDoNotSurroundHeader` / `w:bordersDoNotSurroundFooter` | `w:settings` | `w:val` | Page border/header/footer interaction. | Pagination/rendering fidelity. | P3 | Not supported |
| Settings | `w:proofState` | `w:settings` | `w:spelling`, `w:grammar` | Proofing state. | Not layout relevant. | P4 | N/A |
| Settings | `w:formsDesign` | `w:settings` | `w:val` | Forms design mode. | Template/editor behavior. | P4 | N/A |
| Settings | `w:attachedTemplate` | `w:settings` | `r:id` | Attached template relationship. | Can affect styles/macros in Word; usually preserve and avoid loading external templates automatically. | P3 | Not supported |
| Settings | `w:linkStyles` | `w:settings` | `w:val` | Automatically update styles from template. | Editing/security behavior; do not auto-fetch templates. | P4 | N/A |
| Settings | `w:stylePaneFormatFilter` / `w:stylePaneSortMethod` | `w:settings` | `w:val` | Style pane UI preferences. | Preserve only. | P4 | N/A |
| Settings | `w:documentProtection` | `w:settings` | `w:edit`, `w:formatting`, `w:enforcement`, `w:cryptProviderType`, `w:hash`, `w:salt`, spin/count attrs | Document protection settings. | Do not confuse with encryption; relevant for editor restrictions. | P2 | Not supported |
| Settings | `w:trackRevisions` | `w:settings` | `w:val` | Track revisions enabled. | Editing behavior. | P3 | Not supported |
| Settings | `w:doNotTrackMoves` / `w:doNotTrackFormatting` | `w:settings` | `w:val` | Revision tracking exclusions. | Editing behavior. | P4 | Not supported |
| Settings | `w:revisionView` | `w:settings` | revision display attrs | Revision view preferences. | View hint only. | P3 | N/A |
| Settings | `w:mailMerge` | `w:settings` | children | Mail merge settings. | Important for document automation workflows; preserve if not executing merge. | P3 | Not supported |
| Settings | `w:writeProtection` | `w:settings` | hash/password attrs | Write protection recommendation. | Editor behavior/security metadata. | P3 | Not supported |
| Settings | `w:compat` | `w:settings` | children | Compatibility switches container. | Many Word layout differences live here. | P1 | Partial |
| Settings/compat | `w:compatSetting` | `w:compat` | `w:name`, `w:uri`, `w:val` | Named compatibility setting. | Preserve unknown; known values may change layout. | P2 | Partial |
| Settings/compat | `w:useFELayout` / `w:noExtraLineSpacing` / `w:doNotUseHTMLParagraphAutoSpacing` | `w:compat` | `w:val` | Legacy layout switches. | Can affect line/paragraph spacing. | P3 | Not supported |
| Settings/compat | `w:allowSpaceOfSameStyleInTable` | `w:compat` | `w:val` | Allow same-style paragraph spacing in table. | Can explain surprising spacing inside table cells. | P2 | Not supported |
| Settings/compat | `w:doNotExpandShiftReturn` | `w:compat` | `w:val` | Do not justify lines ending in soft line break. | Visible in justified paragraphs. | P2 | Not supported |
| Settings/compat | `w:splitPgBreakAndParaMark` | `w:compat` | `w:val` | Separate page break and paragraph mark layout. | Can affect pagination around breaks. | P3 | Not supported |
| Settings/compat | `w:doNotAutofitConstrainedTables` / `w:autofitToFirstFixedWidthCell` | `w:compat` | `w:val` | Table autofit compatibility. | Table layout fidelity. | P2 | Not supported |
| Settings/compat | `w:layoutRawTableWidth` / `w:layoutTableRowsApart` | `w:compat` | `w:val` | Table layout compatibility. | Already noted in table matrix; keep in settings parser. | P3 | Not supported |
| Settings | `w:rsids` / `w:rsidRoot` / `w:rsid` | `w:settings` | `w:val` | Editing session IDs. | Preserve; not layout. | P4 | N/A |
| Settings | `w:themeFontLang` | `w:settings` | `w:val`, `w:eastAsia`, `w:bidi` | Theme font language. | Affects default theme font selection. | P1 | Not supported |
| Settings | `w:clrSchemeMapping` | `w:settings` | `w:bg1`, `w:t1`, `w:bg2`, `w:t2`, `w:accent1`... | Map document color roles to theme scheme slots. | Needed to resolve theme colors accurately. | P1 | Not supported |
| Settings | `w:shapeDefaults` | `w:settings` | VML/Drawing defaults | Default shape properties. | Legacy shape rendering. | P3 | Not supported |
| Settings | `w:decimalSymbol` / `w:listSeparator` | `w:settings` | `w:val` | Locale formatting symbols. | Fields and numbering/merge formatting. | P3 | Not supported |
| Settings | `w:docVars` / `w:docVar` | `w:settings` | `w:name`, `w:val` | Document variables. | Often used by templates and fields. | P2 | Not supported |
| Settings | `w:updateFields` | `w:settings` | `w:val` | Update fields on open. | Signal current field results may change. | P3 | N/A |
| Settings | `w:hdrShapeDefaults` | `w:settings` | children | Header/footer shape defaults. | Legacy shape layout. | P4 | Not supported |
| Settings | `w:footnotePr` / `w:endnotePr` | `w:settings` | note setting children | Document-level note settings. | `w:numFmt`, `w:numStart`, and `w:numRestart` import/export through note settings and drive marker numbering; placement/special-note refs remain outside the model. | P2 | Partial |
| Fonts | `w:fonts` | `word/fontTable.xml` root | — | Font table root. | Map fonts before text measurement. | P1 | Not supported |
| Fonts | `w:font` | `w:fonts` | `w:name` | Font entry. | Contains charset, family, pitch, panose and embedded font refs. | P1 | Not supported |
| Fonts | `w:altName` / `w:family` / `w:pitch` / `w:charset` / `w:panose1` / `w:sig` | `w:font` | `w:val`, script attrs | Font metadata. | Useful for font fallback and matching. | P2 | Not supported |
| Fonts | `w:embedRegular` / `w:embedBold` / `w:embedItalic` / `w:embedBoldItalic` | `w:font` | `r:id`, `w:fontKey`, `w:subsetted` | Embedded font references. | Check licensing/obfuscation rules; never leak font files casually. | P2 | Not supported |
| Web settings | `w:webSettings` | `word/webSettings.xml` root | children | Web view/settings. | Usually not important for print layout; preserve. | P4 | Not supported |
| Theme | `a:theme` | Theme part root | `name` | Office theme root. | Provides color/font/effect schemes. | P1 | Partial |
| Theme | `a:clrScheme` / `a:fontScheme` / `a:fmtScheme` | `a:themeElements` | `name` | Theme colors/fonts/effects. | Needed for theme resolution. | P1 | Partial |

## Common value and attribute groups

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Common value groups | On/off values | Many `w:*` elements | `w:val` omitted/true/false/1/0/on/off | Boolean property encoding. | Omitted `w:val` often means true for CT_OnOff elements; preserve original lexical value. | P0 | Supported |
| Common value groups | Twips | Page, paragraph, table widths/margins | integer | 1/20 of a point. | Core unit for page layout; convert carefully to CSS px/pt. | P0 | Supported |
| Common value groups | Half-points | Font sizes | integer | Font size unit for `w:sz`. | 24 means 12pt. | P0 | Supported |
| Common value groups | Eighth-points | Border sizes | integer | Border size unit. | `w:sz=8` means 1pt border for line borders. | P1 | Supported |
| Common value groups | EMU | DrawingML sizes/positions | integer | English Metric Unit. | 914400 EMUs per inch; DrawingML coordinates use EMUs. | P1 | Supported |
| Common value groups | Percent values | `pct` widths, DrawingML transforms/crops | OOXML-specific integer forms | Percent-like values are not always plain CSS percentages. | `tblW type='pct'` uses fiftieths of a percent; DrawingML crops use thousandths/100000-style units depending context. | P0 | Partial |
| Common value groups | Theme colors | `themeColor`, `themeFill`, `a:schemeClr` | theme slot + tint/shade | Color indirection through theme. | Need theme part and color scheme mapping for accurate rendering. | P1 | Not supported |
| Common value groups | Relationships | Any `r:id` | relationship id | Pointer to another part or external target. | Resolve relative to the owning part, not globally. | P0 | Supported |
| Common value groups | Language/script variants | Run fonts/size/bold/italic | ascii/hAnsi/eastAsia/cs and Cs variants | Different formatting per script. | Needed for multilingual docs and complex scripts. | P1 | Partial |
| Common value groups | Bidi-aware start/end | Margins, borders, indents | `start`, `end` | Logical instead of physical left/right edges. | Resolve with paragraph/table direction. | P1 | Partial |
| Common value groups | Strict vs Transitional | Whole package | namespace/content differences | Conformance families. | Transitional docs may contain VML and legacy compatibility markup. | P1 | Supported |
| Common value groups | Unknown extension attrs/elements | `w14`, `w15`, `w16*`, `wp14`, `wps`, etc. | varies | Versioned Microsoft extensions. | Parse known ones; preserve unknown raw XML if round-trip matters. | P1 | Not supported |


## Completion pass: remaining importer gaps added

This pass fills the practical gaps left after the broad matrix above. It still avoids pretending to be a byte-for-byte dump of every ISO/IEC 29500 schema production. The goal is importer coverage: elements, parts, attributes and value groups that commonly affect parsing, layout, rendering, editing, PDF export, or round-trip preservation.

### Summary of gaps fixed in this pass

| Gap area | What was added | Why it matters |
|---|---|---|
| OPC/package edge cases | More part types, media/embedded object parts, external relationships, custom XML item properties, thumbnails, printer settings and macro-bearing package detection | A DOCX importer should not only parse `word/document.xml`; real documents depend on a relationship graph and secondary parts. |
| Section/page details | Section protection, printer settings, endnote suppression, section property revisions and note-column behavior | These change print/PDF fidelity and protected template behavior. |
| Paragraph corrections | `w:contextualSpacing` as its own paragraph property, character-based indents, right-indent compatibility and outline/list interactions | These are common sources of Word-vs-browser spacing mismatch. |
| Inline/run gaps | `w:delInstrText`, `w:fldData`, ruby text, footnote/endnote reference glyphs, annotation helpers and field/bookmark edge cases | Needed for legal templates, TOC/cross references, CJK documents and tracked-change documents. |
| Modern run properties | Office 2010+ text effects, ligatures, number forms, stylistic sets, East Asian layout | Important when the source uses newer Word typography features. |
| SDT/content controls | Placeholder state, appearance, checkbox state, date format, repeating-section item and more control types | Important for forms and generated documents. |
| Modern comments | People/comment metadata, resolved/threaded comments and UTC date extensions | Needed for comments created by current Word versions. |
| DrawingML | Wordprocessing shapes, grouped shapes, relative sizing, hyperlinks on drawings, local-DPI images and color/effect transforms | Images and shapes are where importers often lose visible fidelity. |
| Charts/diagrams | Chart part dependencies, embedded workbooks, external data, SmartArt/diagram parts and fallback policy | Needed for placeholders, extraction or full rendering. |
| Settings/compatibility | More Word compatibility switches and document settings that affect layout | Critical for pagination parity with Word. |
| Testing | Golden fixture categories and acceptance policy | Prevents the matrix from becoming theoretical instead of actionable. |

## Additional OPC, parts, and relationship coverage

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Package / OPC | Relationship base URI | Any `.rels` part | source part path, `Target` | Relationship targets are resolved relative to the owning part. | Do not resolve all targets relative to package root; `../media/image1.png` style targets are normal. | P0 | Supported |
| Package / OPC | External relationship | `pr:Relationship` | `TargetMode="External"`, `Target` | Link to external URL or file. | Never dereference blindly; keep as link metadata and sanitize in UI/export. | P0 | Partial |
| Package / OPC | `word/media/*` | Image relationships | content type by extension or override | Embedded image binaries. | Support at least png/jpeg/gif/bmp/tiff/emf/wmf/svg fallback policy depending renderer. | P1 | Supported |
| Package / OPC | `word/embeddings/*` | OLE/package relationships | binary part name/content type | Embedded OLE package or object. | Usually render placeholder; preserve binary and relationship for round-trip. | P3 | Not supported |
| Package / OPC | `word/activeX/*` | ActiveX relationship | binary/XML controls | ActiveX controls. | Treat as unsafe active content; preserve or strip according to security policy. | P4 | Not supported |
| Package / OPC | `word/printerSettings/*` | Section printer settings relationship | `r:id` from `w:printerSettings` | Binary printer settings. | Preserve for round-trip; usually irrelevant for web display. | P4 | Not supported |
| Package / OPC | `customXml/item*.xml` | Custom XML data store | XML payload | Data store used by content control bindings. | Required if evaluating `w:dataBinding` values. | P2 | Not supported |
| Package / OPC | `customXml/itemProps*.xml` / `ds:datastoreItem` | Custom XML item properties | `ds:itemID` | Metadata for a custom XML store item. | Map `w:dataBinding/@w:storeItemID` to the correct custom XML part. | P2 | Not supported |
| Package / OPC | `customXml/_rels/item*.xml.rels` | Custom XML relationships | schema refs | Relationships for custom XML item schemas. | Preserve; useful for validation/template systems. | P3 | Not supported |
| Package / OPC | `word/commentsExtended.xml` | Comment extension relationship | `w15:*` | Threaded/resolved comment metadata. | Pair with `comments.xml` by ids/paragraph ids where possible. | P3 | Not supported |
| Package / OPC | `word/commentsIds.xml` | Comment id relationship | `w16cid:*` | Durable modern comment identifiers. | Preserve to avoid breaking modern comment threads. | P3 | Not supported |
| Package / OPC | `word/people.xml` | People relationship | person/contact ids | Comment author/contact metadata. | Needed for modern threaded comment UX; preserve if not displayed. | P3 | Not supported |
| Package / OPC | `word/bibliography.xml` | Bibliography relationship | `b:Sources` | Bibliographic source list. | Needed by CITATION/BIBLIOGRAPHY fields and legal/academic documents. | P3 | Not supported |
| Package / OPC | `word/charts/chart*.xml` | Chart relationship | chart namespace | Chart definition part. | Either parse chart or render/extract placeholder; preserve dependencies. | P3 | Not supported |
| Package / OPC | `word/charts/style*.xml` / `colors*.xml` | Chart style/color rels | chart style ids | Chart formatting support parts. | Needed for faithful chart rendering. | P4 | Not supported |
| Package / OPC | `word/diagrams/*` | SmartArt/diagram rels | layout/data/colors/style parts | SmartArt dependency set. | Preserve as a family; partial preservation can corrupt diagrams. | P4 | Not supported |
| Package / OPC | `word/theme/themeOverride*.xml` | Theme override relationship | theme elements | Per-part or document theme override. | Resolve before falling back to `theme1.xml` defaults. | P3 | Not supported |
| Package / OPC | `docProps/thumbnail.*` | Package thumbnail relationship | image content type | Document thumbnail. | Not layout-relevant; preserve if round-tripping. | P4 | Not supported |
| Package / OPC | VBA/macro project parts | Macro-enabled packages, usually `.docm` | `vbaProject.bin` rels | Macro project. | A `.docx` importer should detect and reject/strip/report active macro content according to policy. | P4 | Not supported |
| Package / OPC | Digital signature origin/signature parts | Package relationships | signature XML parts | Package signatures. | Detect signatures; modifying package invalidates them. | P4 | Not supported |
| Package / OPC | Encrypted package | Package-level encryption | encrypted payload | Password/encrypted Office package. | Fail clearly unless decryption is explicitly supported. | P4 | Not supported |

## Additional section and page-layout edge cases

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Section/page | `w:formProt` | `w:sectPr` | `w:val` | Section form protection. | Important for protected form sections; editing behavior only unless forms are implemented. | P3 | Not supported |
| Section/page | `w:noEndnote` | `w:sectPr` | `w:val` | Suppress endnotes for this section. | Affects note placement/numbering when rendering endnotes. | P3 | Not supported |
| Section/page | `w:printerSettings` | `w:sectPr` | `r:id` | Section printer settings relationship. | Preserve binary target; usually not used for screen layout. | P4 | Not supported |
| Section/page | `w:sectPrChange` | `w:sectPr` | `w:id`, `w:author`, `w:date` | Tracked section property change. | Contains previous section properties; preserve for revision mode. | P3 | Not supported |
| Section/page | `w:footnoteColumns` | `w:footnotePr` | `w:val` | Number of columns for footnotes. | Needed for high-fidelity note layout. | P3 | Not supported |
| Section/page | `w:numStart` / `w:numRestart` / `w:numFmt` | `w:footnotePr`, `w:endnotePr` | `w:val` | Note numbering settings. | Document-level values from `w:settings` import/export and drive marker numbering; section-level overrides are not consumed yet. | P2 | Partial |
| Section/page | `w:pos` | `w:footnotePr`, `w:endnotePr` | `w:val` | Note placement. | Examples: beneath text, bottom of page, end of section/document. | P2 | Not supported |
| Section/page | Multiple `w:sectPr` resolution | `w:pPr`, `w:body` | document order | Section break boundaries. | A paragraph-level `sectPr` describes the section ending at that paragraph, while final body `sectPr` describes the last section. | P0 | Supported |

## Additional paragraph and inline content coverage

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Paragraph | `w:contextualSpacing` | `w:pPr` | `w:val` | Suppress spacing between paragraphs of the same style. | This is a standalone paragraph property, not an attribute of `w:spacing`; it can explain vertical spacing differences. | P1 | Supported |
| Paragraph | `w:adjustRightInd` | `w:pPr` | `w:val` | Auto-adjust right indent. | Compatibility-sensitive line layout; preserve/approximate. | P3 | Not supported |
| Paragraph | `w:ind` character attrs | `w:pPr` | `w:leftChars`, `w:rightChars`, `w:firstLineChars`, `w:hangingChars` | Character-count based indents. | Prefer twip values when both exist unless compatibility requires char units. | P3 | Not supported |
| Paragraph | `w:pageBreakBefore` with empty paragraphs | `w:pPr` | `w:val` | Page break before paragraph. | Empty paragraphs with this flag still affect pagination. | P1 | Supported |
| Paragraph | Paragraph mark run props | `w:pPr/w:rPr` | run props | Formatting of paragraph mark. | Can affect final line height and list/field behavior; do not ignore completely in layout engine. | P2 | Supported |
| Inline range | `w:bookmarkStart` / `w:bookmarkEnd` malformed ranges | inline/block | `w:id`, `w:name` | Bookmark markers may be unbalanced or overlap. | Importer should recover and preserve markers even when the XML is awkward. | P2 | Not supported |
| Inline range | `w:moveFromRangeStart` / `w:moveToRangeStart` col attrs | table/range contexts | `w:colFirst`, `w:colLast` | Move ranges across table columns. | Needed for revision-aware table display. | P3 | Not supported |
| Run/content | `w:delInstrText` | `w:r` in deletion/revision context | `xml:space` | Deleted field instruction text. | Needed for original/revision view of fields. | P3 | Not supported |
| Run/content | `w:fldData` | `w:r` / field context | base64 or opaque text | Field private data. | Preserve for round-trip; rarely interpreted by importers. | P4 | Not supported |
| Run/content | `w:footnoteRef` | Footnote content run | — | Auto footnote reference mark inside footnote text. | Distinct from `w:footnoteReference` in the main story. | P2 | Supported |
| Run/content | `w:endnoteRef` | Endnote content run | — | Auto endnote reference mark inside endnote text. | Distinct from `w:endnoteReference` in the main story. Re-injected at export time at the start of each endnote body (not stored in the model); dropped on import. | P2 | Supported |
| Run/content | `w:ruby` | Run-level content | children | East Asian ruby annotation. | Parse `rubyPr`, `rt`, and `rubyBase` for correct CJK annotation layout. | P3 | Not supported |
| Run/content | `w:rubyPr` | `w:ruby` | child settings | Ruby layout properties. | Position, alignment and size can affect line height. | P3 | Not supported |
| Run/content | `w:rt` / `w:rubyBase` | `w:ruby` | run children | Ruby text and base text. | Render as annotation or preserve if not supported. | P3 | Not supported |
| Run/content | `w:contentPart` | Run/block contexts in newer docs | `r:id` | External content part reference. | Preserve or resolve if supporting rich embedded content. | P4 | Not supported |
| Run/content | `w:dir` / `w:bdo` | Inline contexts | `w:val` | Explicit direction override. | Important for mixed RTL/LTR text. | P2 | Not supported |
| Run/content | `w:smartTag` | Inline wrapper | `w:uri`, `w:element` | Legacy semantic wrapper. | Unwrap for display and preserve metadata. | P4 | Not supported |
| Run/content | `w:permStart` / `w:permEnd` in runs | inline contexts | permission attrs | Editable range boundaries inside text. | Required for editing protected documents. | P3 | Not supported |

## Additional run-property and typography coverage

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Run properties | `w:eastAsianLayout` | `w:rPr` | `w:id`, `w:combine`, `w:combineBrackets`, `w:vert`, `w:vertCompress` | East Asian typography layout. | Affects combined characters and vertical text layout. | P3 | Not supported |
| Run properties | `w14:ligatures` | `w:rPr` | `w14:val` | OpenType ligature control. | Fully round-tripped (import → model → export) and emitted as CSS `font-variant-ligatures` for HTML. Canvas/PDF rendering not applied — Canvas 2D has no `font-variant-ligatures` API; PDF deferred pending GSUB shaping engine. See [w14-modern-typography-roadmap.md](w14-modern-typography-roadmap.md). | P3 | Partial |
| Run properties | `w14:numForm` | `w:rPr` | `w14:val` | Number form typography. | Fully round-tripped and emitted as CSS `font-variant-numeric` for HTML. Canvas/PDF rendering not applied — same Canvas 2D API gap. See [w14-modern-typography-roadmap.md](w14-modern-typography-roadmap.md). | P4 | Partial |
| Run properties | `w14:numSpacing` | `w:rPr` | `w14:val` | Number spacing typography. | Fully round-tripped and emitted as CSS `font-variant-numeric` for HTML. Canvas/PDF rendering not applied — same Canvas 2D API gap. See [w14-modern-typography-roadmap.md](w14-modern-typography-roadmap.md). | P4 | Partial |
| Run properties | `w14:stylisticSets` / `w14:stylisticSet` | `w:rPr` | `w14:id`, `w14:val` | OpenType stylistic set selection. | Fully round-tripped and emitted as CSS `font-feature-settings` for HTML. Canvas/PDF rendering not applied — Canvas 2D has no `font-feature-settings` API. See [w14-modern-typography-roadmap.md](w14-modern-typography-roadmap.md). | P4 | Partial |
| Run properties | `w14:cntxtAlts` | `w:rPr` | `w14:val` | Contextual alternates. | Fully round-tripped and emitted as CSS `font-feature-settings:"calt"` for HTML. Canvas/PDF rendering not applied — same Canvas 2D API gap. See [w14-modern-typography-roadmap.md](w14-modern-typography-roadmap.md). | P4 | Partial |
| Run properties | `w14:textFill` | `w:rPr` | DrawingML fill children | Modern text fill. | Overrides simple `w:color` in advanced WordArt-like text. | P3 | Not supported |
| Run properties | `w14:textOutline` | `w:rPr` | line/fill attrs | Modern text outline. | Visible in stylized documents; preserve/approximate. | P3 | Not supported |
| Run properties | `w14:textShadow` | `w:rPr` | effect attrs | Modern text shadow. | Distinct from legacy `w:shadow`. | P4 | Not supported |
| Run properties | `w14:glow` / `w14:reflection` | `w:rPr` | effect attrs | Modern text effects. | Preserve or approximate in high-fidelity renderer. | P4 | Not supported |
| Run properties | `w14:scene3d` / `w14:props3d` | `w:rPr` | 3D attrs | 3D text effects. | Usually preserve only. | P4 | Not supported |
| Run properties | `w15:collapsed` | `w:rPr` / revision contexts | `w15:val` | Collapsed revision/comment display hint. | UI/revision-display metadata. | P4 | Not supported |

## Additional fields, references, and document automation coverage

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Fields | Complex field state machine | runs between `fldChar` begin/separate/end | `fldCharType` | Field instruction/result boundary model. | Build a stack; nested fields are legal and common in TOC/REF/PAGEREF constructs. | P1 | Partial |
| Fields | Field result runs | runs after `separate` before `end` | normal run props | Cached display result. | A display-only importer can show cached result and mark as stale if `dirty`. | P1 | Supported |
| Fields | `TOC` field switches | `w:instrText` stream | `\o`, `\h`, `\z`, `\u`, etc. | Table of contents generation instructions. | Instruction + cached result (entry paragraphs, internal hyperlinks) preserved 1:1; regeneration from headings/pagination not implemented. | P2 | Partial |
| Fields | `REF` / `PAGEREF` / `NOTEREF` | field instruction stream | bookmark name, switches | Cross-reference fields. | Instruction + cached result preserved 1:1 as complex-field marker runs; not resolved/evaluated (no live REF text or PAGEREF page numbers). | P2 | Partial |
| Fields | `SEQ` | field instruction stream | sequence id/switches | Sequence numbering field. | Image captions generate and round-trip `SEQ Figure` fields; arbitrary sequence identifiers and switches are preserved as field markers but are not evaluated. | P2 | Partial |
| Fields | `STYLEREF` | field instruction stream | style name/id | Reference text from nearest style. | Common in headers/footers. | P3 | Not supported |
| Fields | `INCLUDETEXT` / `INCLUDEPICTURE` | field instruction stream | external target | Include external content. | Security-sensitive; do not auto-fetch without explicit policy. | P3 | Not supported |
| Fields | `MERGEFIELD` / `ADDRESSBLOCK` / `GREETINGLINE` | field instruction stream | merge field name/switches | Mail merge fields. | Preserve or bind through a merge-data pipeline. | P2 | Not supported |
| Fields | `FORMTEXT` / `FORMCHECKBOX` / `FORMDROPDOWN` | field instruction stream | legacy form field backing | Legacy form controls. | Combine with `w:ffData`. | P2 | Not supported |
| References | `w:hyperlink` without `r:id` | inline context | `w:anchor` | Internal bookmark hyperlink. | Stored as `#anchor` in the model; exported as `w:anchor` attribute with no relationship. | P1 | Supported |
| References | `w:hyperlink` with both target hints | inline context | `r:id`, `w:anchor`, `w:docLocation` | External document location with optional anchor. | `r:id` target is resolved and stored; `w:anchor` is treated as the fragment. | P2 | Partial |

## Additional content-control / SDT coverage

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Content controls | `w:appearance` | `w:sdtPr` | `w:val` | Visual appearance of content control. | Values such as boundingBox, tags, hidden affect editor UI, not print layout. | P3 | Not supported |
| Content controls | `w:color` | `w:sdtPr` | `w:val`, theme attrs | Content control UI color. | Usually editor metadata; preserve. | P4 | Not supported |
| Content controls | `w:showingPlcHdr` | `w:sdtPr` | `w:val` | Content currently shows placeholder. | Important to distinguish placeholder text from user data. | P2 | Not supported |
| Content controls | `w:temporary` | `w:sdtPr` | `w:val` | Remove control after edit. | Editing behavior; preserve. | P4 | Not supported |
| Content controls | `w:lock` | `w:sdtPr` | `w:val` | Lock behavior. | Values include contentLocked and sdtContentLocked patterns. | P3 | Not supported |
| Content controls | `w:equation` / `w:citation` / `w:bibliography` | `w:sdtPr` | — | Specialized content control types. | Common around equations/citations/bibliography fields. | P3 | Not supported |
| Content controls | `w:group` | `w:sdtPr` | — | Group content control. | May wrap multiple block controls; preserve hierarchy. | P3 | Not supported |
| Content controls | `w:picture` | `w:sdtPr` | — | Picture content control. | Content normally contains drawing; placeholder/image replacement is editor logic. | P2 | Not supported |
| Content controls | `w:date` | `w:sdtPr` | date children | Date picker content control. | Parse formatting and storage behavior for form import. | P2 | Not supported |
| Content controls | `w:dateFormat` / `w:lid` / `w:calendar` / `w:storeMappedDataAs` | `w:date` | `w:val` | Date display/storage settings. | Required for round-trip and data binding. | P2 | Not supported |
| Content controls | `w:comboBox` / `w:dropDownList` | `w:sdtPr` | list item children | List-based content controls. | Preserve display/value pairs and selected content. | P2 | Not supported |
| Content controls | `w14:checkbox` | `w:sdtPr` | checkbox children | Modern checkbox content control. | Common in forms; map checked/unchecked state. | P2 | Not supported |
| Content controls | `w14:checked` / `w14:checkedState` / `w14:uncheckedState` | `w14:checkbox` | `w14:val`, `w14:font`, `w14:char` | Checkbox state/glyphs. | Needed to render checkboxes without losing chosen glyph/font. | P2 | Not supported |
| Content controls | `w:repeatingSectionItem` | `w:sdtPr` | — | Item inside repeating section. | Preserve for repeating template regions. | P3 | Not supported |
| Content controls | `w:dataBinding` prefix mappings | `w:sdtPr` | `w:prefixMappings`, `w:xpath`, `w:storeItemID` | XPath binding. | Requires namespace-aware XPath evaluation against custom XML stores. | P2 | Not supported |

## Additional comments, notes, annotations, and people metadata

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Comments modern | `w15:commentsEx` | Extended comments part | — | Modern comment extension root. | Enables resolved/threaded comment state. | P3 | Not supported |
| Comments modern | `w15:commentEx` | `w15:commentsEx` | `w15:paraId`, `w15:parentId`, `w15:done` | Extended comment metadata. | Link to comment paragraphs and parent thread where available. | P3 | Not supported |
| Comments modern | `w16cid:commentsIds` / `w16cid:commentId` | Comments ids part | durable id attrs | Durable modern comment ids. | Preserve even if UI only displays classic comments. | P3 | Not supported |
| Comments modern | `w16cex:commentsExtensible` | Modern comments extension part | extension attrs | Newer extensible comment metadata. | Preserve unknown children/attrs. | P4 | Not supported |
| Comments modern | `w:people` / `w:person` | People part | author/provider ids | People/contact metadata for comments. | Useful for modern comment display; preserve otherwise. | P4 | Not supported |
| Comments modern | `w16du:dateUtc` | Comment-related attrs | UTC timestamp | UTC date extension. | Prefer UTC date when displaying cross-timezone comment metadata. | P4 | Not supported |
| Notes | Special note ids | `footnotes.xml`, `endnotes.xml` | negative/special ids | Separator/continuation notes. | Do not treat every note as user-authored note body. | P2 | Supported |
| Notes | `w:customMarkFollows` | note reference elements | `w:val` | Custom note mark follows. | If true, visible mark may be supplied manually in following runs. | P2 | Not supported |

## Additional DrawingML, VML, chart, and diagram coverage

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| DrawingML positioning | `wp14:sizeRelH` / `wp14:sizeRelV` | `wp:anchor` | `relativeFrom`, pct width/height | Relative object sizing. | Needed for shapes/images sized relative to page, margin or column. | P3 | Not supported |
| DrawingML positioning | `wp14:anchorId` / `wp14:editId` | `wp:inline`, `wp:anchor` | ids | Stable drawing/edit identifiers. | Preserve for round-trip; useful for diffing. | P4 | Not supported |
| DrawingML positioning | `wp:wrapPolygon` | tight/through wrapping | edited polygon points | Custom text wrap polygon. | Required for high-fidelity floating image wrap. | P3 | Not supported |
| DrawingML object | `a:hlinkClick` / `a:hlinkHover` | non-visual drawing props | `r:id`, tooltip attrs | Hyperlink on drawing/shape. | Resolve drawing relationships just like text hyperlinks. | P2 | Not supported |
| DrawingML object | `a:extLst` | Many DrawingML elements | extension children | DrawingML extension list. | Preserve unknown extensions, including Office-versioned behavior. | P2 | Not supported |
| DrawingML image | `a14:useLocalDpi` | `a:blip/a:extLst` | `val` | Use embedded image DPI. | Can affect physical image size in Word. | P3 | Not supported |
| DrawingML image | `a:alphaModFix` / `a:alphaMod` / `a:alphaOff` | image/effect contexts | value attrs | Alpha/transparency transforms. | Needed for transparent or faded images. | P3 | Not supported |
| DrawingML color | `a:lumMod` / `a:lumOff` / `a:tint` / `a:shade` / `a:satMod` | color transforms | `val` | Color transformations. | Apply in order when resolving DrawingML/theme colors. | P2 | Not supported |
| DrawingML effects | `a:effectLst` / `a:effectDag` | shape props | effect children | Shadow/glow/reflection/soft-edge effects. | Affects visible bounds and appearance. | P4 | Not supported |
| DrawingML 3D | `a:scene3d` / `a:sp3d` | shape props | 3D attrs | 3D scene/shape properties. | Usually preserve only. | P4 | Not supported |
| Wordprocessing shapes | `wps:wsp` | `a:graphicData` | shape children | Wordprocessing shape. | Modern replacement for some VML shapes; parse text body and shape props. | P2 | Not supported |
| Wordprocessing shapes | `wps:txbx` / `wps:txbxContent` | `wps:wsp` | WordprocessingML content | DrawingML text box content. | Contains normal paragraphs/tables; must enter secondary story parser. | P2 | Not supported |
| Grouped shapes | `wpg:wgp` / `wpg:grpSpPr` | `a:graphicData` | transform/group props | Wordprocessing group shape. | Apply group transforms to children or preserve. | P3 | Not supported |
| Locked canvas | `lc:lockedCanvas` | DrawingML graphicData | child drawings | Legacy grouped drawing container. | Preserve/approximate. | P4 | Not supported |
| Picture fill | `a:tile` | `pic:blipFill` | tile attrs | Tiled image fill. | Different from stretch; visible in shape/picture backgrounds. | P3 | Not supported |
| Picture recolor | `a:duotone` / `a:grayscl` / `a:biLevel` | `a:blip` | color attrs | Image recoloring. | Preserve or implement for high-fidelity rendering. | P4 | Not supported |
| Charts | `c:chartSpace` | chart part root | chart children | Chart part root. | Full chart rendering requires chart parser, not only `c:chart` reference. | P3 | Not supported |
| Charts | `c:externalData` | chart part | `r:id` | External or embedded workbook backing chart. | Preserve link or resolve embedded workbook dependency. | P3 | Not supported |
| Charts | `c:ser` / `c:cat` / `c:val` | chart plot types | data refs/cache | Series/category/value data. | Use cached data for display if workbook is unavailable. | P4 | Not supported |
| Diagrams | `dgm:dataModel` / `dgm:layoutDef` / `dgm:styleDef` / `dgm:colorsDef` | diagram parts | diagram attrs | SmartArt data/layout/style/color parts. | Preserve as dependency group; render preview/placeholder if unsupported. | P4 | Not supported |
| VML details | CSS-like `style` parser | `v:shape`, `v:textbox`, etc. | `position`, `width`, `height`, margins, z-index | Legacy shape layout. | Word VML styles are not normal browser CSS; parse supported properties explicitly. | P2 | Not supported |
| VML details | `v:fill` / `v:stroke` / `v:shadow` | VML shapes | color/effect attrs | Legacy fill/stroke/shadow. | Needed for old templates and letterheads. | P3 | Not supported |
| VML details | `o:lock` / `v:formulas` / `v:path` | VML shapes | geometry attrs | Shape locks and custom geometry. | Preserve unsupported geometry. | P4 | Not supported |

## Additional numbering, styles, and theme/font coverage

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Numbering | `w:numStyleLink` | `w:abstractNum` | `w:val` | Link numbering to numbering style. | Needed when numbering definitions delegate through styles. | P2 | Not supported |
| Numbering | `w:styleLink` | `w:abstractNum` | `w:val` | Link to paragraph style. | Resolve to avoid missing list definitions. | P2 | Not supported |
| Numbering | `w:lvlText` literal escaping | `w:lvl` | `%1`, `%2`, literal text | Label format string. | Literal text and level placeholders are resolved without discarding punctuation. | P1 | Supported |
| Numbering | Level `w:rPr/w:rFonts` | `w:lvl` | symbol fonts | Bullet font/glyph. | Bullet glyph and font are imported and re-emitted, and legacy PUA glyphs are normalized; canvas/PDF still use the paragraph font for the normalized glyph. | P1 | Partial |
| Numbering | Counter restart by paragraph style | list state | style/level changes | List continuity/restart heuristics. | `numId`, level starts, and start overrides are handled; style-implied restarts are not. | P2 | Partial |
| Styles | Default style per type | `w:style` | `w:default="1"` | Default paragraph/character/table/numbering style. | Apply by style type, not globally. | P0 | Supported |
| Styles | Style cycle handling | `w:basedOn` chain | style ids | Defensive style inheritance. | Detect cycles and missing base styles; do not crash. | P1 | Supported |
| Theme fonts | `a:majorFont` / `a:minorFont` | `a:fontScheme` | script-specific children | Theme font groups. | `+mj-lt`, `+mn-lt`, etc. map through these. | P1 | Supported |
| Theme fonts | `a:latin` / `a:ea` / `a:cs` / `a:font script` | theme font scheme | `typeface`, `script` | Script-specific theme fonts. | Required for East Asian and complex-script font resolution. | P1 | Supported |
| Theme colors | `a:dk1`, `a:lt1`, `a:accent1`... | `a:clrScheme` | color choice | Theme color slots. | Combine with `w:clrSchemeMapping` before resolving document colors. | P1 | Not supported |
| Font table | Panose/signature fallback | `w:panose1`, `w:sig` | bitfields | Font classification/fallback hints. | Useful when exact font is unavailable. | P3 | Not supported |

## Additional settings and compatibility switches

| Area | Element / tag / part | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Settings | `w:displayHiddenText` | `w:settings` | `w:val` | Show hidden text. | Controls whether `w:vanish` text appears in view mode. | P2 | Not supported |
| Settings | `w:showXMLTags` | `w:settings` | `w:val` | Show XML tag markers. | UI metadata; preserve. | P4 | N/A |
| Settings | `w:savePreviewPicture` | `w:settings` | `w:val` | Save preview thumbnail. | Package metadata behavior. | P4 | N/A |
| Settings | `w:embedTrueTypeFonts` / `w:embedSystemFonts` / `w:saveSubsetFonts` | `w:settings` | `w:val` | Font embedding preferences. | Preserve; do not expose embedded font binaries casually. | P3 | Not supported |
| Settings | `w:doNotEmbedSmartTags` | `w:settings` | `w:val` | Smart tag saving behavior. | Legacy metadata; preserve. | P4 | Not supported |
| Settings | `w:saveFormsData` | `w:settings` | `w:val` | Save only form data. | Relevant for protected/legacy forms workflows. | P4 | Not supported |
| Settings | `w:alwaysMergeEmptyNamespace` | `w:settings` | `w:val` | Custom XML namespace behavior. | Preserve for custom XML workflows. | P4 | Not supported |
| Settings | `w:useXSLTWhenSaving` / `w:saveThroughXslt` | `w:settings` | relationship/attrs | Save through XSLT. | Security-sensitive; preserve metadata but do not execute transforms. | P4 | Not supported |
| Settings | `w:uiCompat97To2003` | `w:settings` | `w:val` | Legacy UI compatibility mode. | Usually not layout-relevant. | P4 | N/A |
| Settings | `w:doNotIncludeSubdocsInStats` | `w:settings` | `w:val` | Subdocument statistics behavior. | Preserve if subdocuments exist. | P4 | N/A |
| Settings | `w:summaryLength` | `w:settings` | `w:val` | Auto-summary length setting. | UI/legacy metadata. | P4 | N/A |
| Settings/compat | `w:compatSetting` with `compatibilityMode` | `w:compat` | `w:name`, `w:uri`, `w:val` | Word compatibility mode. | Use as a coarse switch for layout defaults and legacy behavior. | P2 | Not supported |
| Settings/compat | `w:spaceForUL` / `w:ulTrailSpace` | `w:compat` | `w:val` | Underline spacing compatibility. | Can change text decoration metrics. | P4 | Not supported |
| Settings/compat | `w:doNotUseEastAsianBreakRules` / `w:useWord97LineBreakRules` | `w:compat` | `w:val` | Line-breaking compatibility. | Affects CJK/mixed line breaks. | P3 | Not supported |
| Settings/compat | `w:noColumnBalance` / `w:cachedColBalance` | `w:compat` | `w:val` | Column balancing compatibility. | Affects multi-column pagination. | P3 | Not supported |
| Settings/compat | `w:balanceSingleByteDoubleByteWidth` | `w:compat` | `w:val` | Width balancing for mixed scripts. | CJK/Latin text measurement compatibility. | P4 | Not supported |
| Settings/compat | `w:suppressTopSpacing` / `w:suppressBottomSpacing` / `w:suppressSpacingAtTopOfPage` | `w:compat` | `w:val` | Paragraph spacing suppression compatibility. | Important for page-top spacing parity. | P2 | Not supported |
| Settings/compat | `w:suppressTopSpacingWP` / `w:suppressSpBfAfterPgBrk` | `w:compat` | `w:val` | WordPerfect/legacy page-break spacing behavior. | Can change vertical position after breaks. | P3 | Not supported |
| Settings/compat | `w:doNotSuppressParagraphBorders` | `w:compat` | `w:val` | Paragraph border spacing behavior. | Affects bordered paragraphs at page/column boundaries. | P3 | Not supported |
| Settings/compat | `w:doNotWrapTextWithPunct` | `w:compat` | `w:val` | Punctuation wrapping behavior. | CJK typography compatibility. | P4 | Not supported |
| Settings/compat | `w:useWord2002TableStyleRules` | `w:compat` | `w:val` | Legacy table style application. | Can change table style cascade. | P3 | Not supported |
| Settings/compat | `w:useNormalStyleForList` | `w:compat` | `w:val` | List style compatibility. | Affects list paragraph default style behavior. | P3 | Not supported |
| Settings/compat | `w:useSingleBorderforContiguousCells` | `w:compat` | `w:val` | Adjacent cell border behavior. | Border conflict/layout fidelity. | P3 | Not supported |
| Settings/compat | `w:growAutofit` | `w:compat` | `w:val` | Table autofit expansion. | Affects table width under content pressure. | P2 | Not supported |
| Settings/compat | `w:doNotVertAlignCellWithSp` | `w:compat` | `w:val` | Cell vertical alignment with floating objects. | Table layout edge case. | P4 | Not supported |
| Settings/compat | `w:doNotUseHTMLParagraphAutoSpacing` | `w:compat` | `w:val` | HTML paragraph auto spacing compatibility. | Affects imported/generated HTML DOCX spacing. | P3 | Not supported |
| Settings/compat | `w:useAltKinsokuLineBreakRules` | `w:compat` | `w:val` | Alternative Japanese line-break rules. | CJK line-breaking fidelity. | P4 | Not supported |
| Settings/compat | `w:convMailMergeEsc` | `w:compat` | `w:val` | Mail merge escape conversion. | Mail merge field fidelity. | P4 | Not supported |
| Settings/compat | `w:truncateFontHeightsLikeWP6` | `w:compat` | `w:val` | Legacy font height truncation. | Rare, but can affect old converted documents. | P4 | Not supported |

## Importer validation fixtures to add

| Fixture category | Must include | What it catches |
|---|---|---|
| Package graph | Main document not at `/word/document.xml`, relative rel targets, external hyperlinks, missing optional parts | Hard-coded path and global-relationship bugs. |
| Paragraph spacing | `w:spacing`, standalone `w:contextualSpacing`, page-top spacing compat flags, empty paragraphs with page breaks | Blank-space mismatches against Word. |
| Fonts/theme | Theme fonts, missing local font fallback, embedded-font metadata, script-specific fonts | Width and line-break differences. |
| Lists | Multi-level decimal, bullet font, restarted list, style-implied numbering, overrides | Wrong bullets, indentation and counters. |
| Tables | Autofit vs fixed, pct widths, gridSpan/vMerge, tblPrEx, tblHeader, cantSplit, hideMark | Table layout and pagination bugs. |
| Fields | PAGE/NUMPAGES, REF/PAGEREF, TOC, MERGEFIELD, nested fields, dirty cached result | Field parsing and display policy bugs. |
| Images | Inline image, floating image with wrapSquare, crop, local DPI, linked image, VML fallback | Drawing relationship and layout bugs. |
| Text boxes | VML `w:txbxContent`, DrawingML `wps:txbxContent`, nested tables inside text boxes | Missing secondary story parser. |
| Comments/revisions | Classic comments, threaded comments, insert/delete/move ranges, property changes | Review-mode and preservation bugs. |
| SDT/forms | Text, date, checkbox, dropdown, repeating section, dataBinding to custom XML | Legal-template/form import bugs. |
| CJK/RTL | Ruby, bidi paragraphs/runs, vertical text, kinsoku/wordWrap flags | International layout bugs. |
| Math/charts | OMML equation, chart with cached data and embedded workbook, SmartArt placeholder | Unsupported rich object policy bugs. |

## Final coverage policy

| Policy area | Rule |
|---|---|
| Parser behavior | Parse known P0/P1 elements into normalized model objects; preserve known-but-unsupported P2+ elements as raw XML where possible. |
| Unknown markup | Preserve unknown elements/attributes with namespace, parent position and relationship context. |
| Rendering behavior | For unsupported visual objects, render a visible placeholder with alt text/name/type instead of silently dropping content. |
| Security behavior | Do not dereference external relationships, execute macros, load attached templates, execute XSLT, or activate OLE/ActiveX without explicit policy. |
| Layout parity | Treat Word compatibility flags as feature switches, implemented only when golden fixtures show a measurable layout difference. |
| Round-trip | Never rewrite relationship ids, package part names or unknown XML unless the save pipeline has a deliberate remapping layer. |


## Importer milestones after this expansion

| Milestone | Must support |
|---|---|
| Minimum DOCX package | `[Content_Types].xml`, package `.rels`, main document relationship, `document.xml`, `w:document`, `w:body`, `w:p`, `w:r`, `w:t` |
| Basic visual text | paragraph/run property cascade, `styles.xml`, defaults, `rFonts`, `sz`, `b/i/u`, color, spacing, indentation, alignment, tabs, breaks |
| Page-aware layout | `sectPr`, page size/margins, headers/footers, columns, page/column breaks, keep flags, widow control, line spacing |
| Tables | the table-specific matrix below: grid, widths, margins, borders, merges, style conditions, row/cell layout, pagination flags |
| Lists | `numbering.xml`, `numPr`, `abstractNum`, `num`, `lvl`, labels, indentation, overrides, restarts, picture bullets |
| References and automation | hyperlinks, bookmarks, fields, comments, footnotes, endnotes, content controls, data bindings, custom XML, doc variables |
| Images/shapes | `w:drawing`, `wp:inline`, `wp:anchor`, `pic:pic`, `a:blip`, VML fallback, image relationships, crop, size, positioning, wrap |
| Advanced fidelity | theme colors/fonts, font table, compatibility flags, bidi/CJK flags, OMML math, revisions, protection, glossary, altChunk |
| Round-trip robustness | preserve unknown `mc:*`, `w14+`, `w15+`, `w16*`, VML/OLE, unsupported DrawingML/chart/diagram pieces and original attrs |

## Practical implementation order

1. Build a package reader: content types, relationship graph, part loader, unknown-part preservation.
2. Parse stories: main body, headers, footers, notes, comments, text boxes, glossary blocks.
3. Normalize the style cascade: doc defaults → basedOn chain → paragraph/character/table/numbering style → direct props.
4. Build a paragraph/run inline model that preserves field boundaries, bookmarks, comments, revisions, SDTs, and drawings.
5. Build a page/section context: `sectPr`, page metrics, margins, columns, header/footer selection.
6. Build list and table layout models before mapping to DOM/CSS/PDF.
7. Add DrawingML/VML images and floating object wrapping.
8. Add compatibility switches incrementally with golden DOCX fixtures.
9. Keep an `unknownXml` bucket at every model node where round-trip is required.

## Source references used for this expansion

- ECMA-376 / ISO/IEC 29500 family: Office Open XML vocabularies, packaging, markup compatibility, and transitional migration features.
- Microsoft Learn: structure of a WordprocessingML document; working with runs; working with tables; Open XML SDK class documentation for WordprocessingML objects.
- Open XML SDK API surface was used as a practical cross-check for common WordprocessingML elements.

---

# Original table-specific matrix retained below

The original file is retained because it already covers table-specific markup in more detail than the general matrix above.

# Expanded OOXML / DOCX Table Coverage Matrix

This Markdown file is an importer-oriented checklist for **WordprocessingML table-specific markup** in DOCX files.

Scope:

- Included: table containers, table/row/cell properties, table grids, borders, margins, merging, floating tables, conditional table styles, table revisions, and table-related compatibility switches.
- Not duplicated here: generic block/inline content inside cells such as `w:p`, `w:r`, `w:t`, hyperlinks, fields, bookmarks, comments, drawings, SDTs, math, and tracked-run markup. A table cell can contain normal block-level WordprocessingML content, including nested tables, so those are covered by the general DOCX importer matrix.
- Recommendation: treat unknown table children/attributes as preserved raw XML unless the importer is display-only.

Priority legend:

| Priority | Meaning |
|---|---|
| P0 | Required for basic table import/layout |
| P1 | Important for Word-like layout fidelity |
| P2 | Needed for advanced formatting, styles, or pagination |
| P3 | Preserve or approximate; lower visual impact in most documents |
| P4 | Usually out of scope unless strict round-trip fidelity is required |

## Table-specific elements and attributes

| Area | Element / tag | Parent / context | Key attributes | Meaning | Importer notes | Priority | Status |
|---|---|---|---|---|---|---|---|
| Table container | `w:tbl` | Body, cell, SDT content, headers/footers, comments, etc. | common `w:rsid*`, `mc:*`, extended attrs | Table block container | Parse as a block object; nested tables are legal inside `w:tc`. | P0 | Supported |
| Table container | `w:tblPr` | `w:tbl`, table style, `w:tblPrChange` | — | Table property set | All sub-properties fully imported/exported and applied: style id, width, indent, alignment, cell spacing, margins, borders, shading, layout, bidi, band sizes, `tblLook`. Floating table properties (`tblpPr`, `tblOverlap`) are round-trip preserved (tracked separately). | P0 | Supported |
| Table container | `w:tblPrEx` | `w:tr` | — | Table property exceptions for a row | Parsed into a typed per-row override and applied over the table's own properties (borders, cell margins, cell spacing, indent, width, layout, alignment) for that row's cells; re-serialized before `w:trPr` on export. | P1 | Supported |
| Table container | `w:tblGrid` | `w:tbl`, `w:tblGridChange` | — | Table grid definition | Defines logical columns and base grid widths. | P0 | Supported |
| Table container | `w:gridCol` | `w:tblGrid` | `w:w` | Single grid column | Width in twips; may be absent or overridden by autofit behavior. | P0 | Supported |
| Table container | `w:tblGridChange` | `w:tblGrid` | `w:id`, `w:author`, `w:date` | Revision information for grid changes | The current (accepted) grid is shown; revision metadata (previous grid) is preserved for DOCX round-trip. Editor shows the final accepted state. | P3 | Supported |
| Row container | `w:tr` | `w:tbl` | `w:rsidR`, `w:rsidTr`, `w:rsidRPr`, `w14:paraId`, `w14:textId`, `mc:*` | Table row | Main row layout unit. | P0 | Supported |
| Row container | `w:trPr` | `w:tr`, table style, `w:trPrChange` | — | Row property set | All sub-properties fully imported/exported: gridBefore/After, wBefore/After, tblCellSpacing, jc (left/center/right; start/end normalized), trHeight, tblHeader, cantSplit, hidden, cnfStyle, ins/del revision, trPrChange. `w:divId` (P3) is drop-preserved. | P0 | Supported |
| Cell container | `w:tc` | `w:tr` | `w:id`, `mc:*`, extended attrs | Table cell | Must contain block-level content; empty cells normally contain at least `w:p`. | P0 | Supported |
| Cell container | `w:tcPr` | `w:tc`, table style, `w:tcPrChange` | — | Cell property set | Highest priority in table formatting cascade for cell-level properties. | P0 | Supported |
| Table style | `w:style[@w:type='table']` | `styles.xml` | `w:type`, `w:styleId`, `w:default`, `w:customStyle` | Table style definition | Imported and re-serialized to `word/styles.xml` with `tblPr` (band sizes, borders, margins, width, indent, layout) and all conditional `tblStylePr` buckets (pPr/rPr/tblPr/trPr/full tcPr) in precedence order. | P1 | Supported |
| Table style | `w:tblStyle` | `w:tblPr` | `w:val` | Table style reference | Imported into `EditorTableStyle.styleId`; resolved via `resolveEffectiveTableStyle` to apply the full named-style cascade (tblPr, trPr, tcPr, all conditionals) to the table. | P1 | Supported |
| Table style | `w:tblStylePr` | `w:style` | `w:type` | Conditional table style bucket | Imports and applies the full bucket (shading, run style, paragraph props, row props, table props, and full cell props) for first/last rows/columns, bands, and all four corner cells. | P2 | Supported |
| Table style | `w:tblStyleRowBandSize` | `w:tblPr` | `w:val` | Number of rows per horizontal band | Used when resolving imported table conditional formatting. | P2 | Supported |
| Table style | `w:tblStyleColBandSize` | `w:tblPr` | `w:val` | Number of columns per vertical band | Used when resolving imported table conditional formatting. | P2 | Supported |
| Conditional formatting | `w:cnfStyle` | `w:trPr`, `w:tcPr` | `w:val`, `w:firstRow`, `w:lastRow`, `w:firstColumn`, `w:lastColumn`, `w:oddVBand`, `w:evenVBand`, `w:oddHBand`, `w:evenHBand`, `w:firstRowFirstColumn`, `w:firstRowLastColumn`, `w:lastRowFirstColumn`, `w:lastRowLastColumn` | Conditional-format flags | Explicit row/cell `w:cnfStyle` flags override the position-derived keys across the full matrix (bands, first/last row/col, all four corner cells) during conditional style resolution. | P2 | Supported |
| Conditional formatting | `w:tblLook` | `w:tblPr`, `w:tblPrEx` | `w:val`, `w:firstRow`, `w:lastRow`, `w:firstColumn`, `w:lastColumn`, `w:noHBand`, `w:noVBand` | Table-style mask | Controls imported first/last row/column and banded formatting. | P2 | Supported |
| Conditional formatting | `w:tblStylePr/w:pPr` | `w:tblStylePr` | — | Conditional paragraph props | Imported and merged into the paragraph style for matching cells. | P2 | Supported |
| Conditional formatting | `w:tblStylePr/w:rPr` | `w:tblStylePr` | — | Conditional run props | Imported and applied beneath explicit run formatting for matching cells. | P2 | Supported |
| Conditional formatting | `w:tblStylePr/w:tblPr` | `w:tblStylePr` | — | Conditional table props | Imported as a conditional `tableStyle` and merged over the base table style for matching cells. | P2 | Supported |
| Conditional formatting | `w:tblStylePr/w:trPr` | `w:tblStylePr` | — | Conditional row props | Imported as a conditional row style and merged for rows matching the style condition. | P2 | Supported |
| Conditional formatting | `w:tblStylePr/w:tcPr` | `w:tblStylePr` | — | Conditional cell props | Full cell properties (shading, borders, vertical alignment, margins, wrap, etc.) are imported and applied for matching cells. | P2 | Supported |
| Widths | `w:tblW` | `w:tblPr`, `w:tblPrEx` | `w:w`, `w:type` | Preferred table width | `type` may be `auto`, `dxa`, `pct`, or `nil`; affects layout algorithm. | P0 | Supported |
| Widths | `w:tcW` | `w:tcPr` | `w:w`, `w:type` | Preferred cell width | Interacts with table grid and autofit/fixed layout. | P0 | Supported |
| Widths | `w:tblInd` | `w:tblPr`, `w:tblPrEx` | `w:w`, `w:type` | Table indent | Horizontal offset from leading margin. | P1 | Supported |
| Widths | `w:tblCellSpacing` | `w:tblPr`, `w:tblPrEx`, `w:trPr` | `w:w`, `w:type` | Cell spacing | Imported/exported and rendered: cells are separated from each other and the table edges by the spacing (carved out of the table width; row/col spans cover the gaps they cross) on canvas and PDF. | P1 | Supported |
| Widths | `w:wBefore` | `w:trPr` | `w:w`, `w:type` | Preferred width before row | Round-trips with skipped grid columns before first cell. | P2 | Supported |
| Widths | `w:wAfter` | `w:trPr` | `w:w`, `w:type` | Preferred width after row | Round-trips with skipped grid columns after last cell. | P2 | Supported |
| Width type group | `CT_TblWidth`-based elements | `tblW`, `tcW`, `tblInd`, `tblCellSpacing`, margins, `wBefore`, `wAfter` | `w:w`, `w:type` | Table measurement | All four types handled: `dxa` → points, `pct` → CSS percent string (1/50 of a percent per OOXML spec), `auto` → "auto", `nil` → treated as auto. | P0 | Supported |
| Alignment | `w:jc` | `w:tblPr`, `w:tblPrEx`, `w:trPr` | `w:val` | Table or row alignment | Table-level left/center/right (plus `start`/`end` normalized to left/right) imported, exported, and applied: a narrower table shifts within content width. Row-level `w:jc` likewise imported/exported (`EditorTableRowStyle.align`); `start`/`end` normalized. | P0 | Supported |
| Floating table | `w:tblpPr` | `w:tblPr` | `w:leftFromText`, `w:rightFromText`, `w:topFromText`, `w:bottomFromText`, `w:vertAnchor`, `w:horzAnchor`, `w:tblpX`, `w:tblpY`, `w:tblpXSpec`, `w:tblpYSpec` | Floating table position | Fully parsed into `EditorTableFloatingLayout`; `resolveFloatingTableRect` computes on-page position using `horzAnchor`/`vertAnchor`, explicit offsets, and named alignment specs; the table block is set to `estimatedHeight: 0` in the normal flow and painted at its resolved rect; text-wrap exclusion zones are registered so body text flows around the table. | P2 | Supported |
| Floating table | `w:tblOverlap` | `w:tblPr` | `w:val` | Floating table overlap behavior | Imported/exported; when `val="never"`, floating tables perform collision detection against other floating tables and shift down to avoid overlap (`floatingTableOffsetY` in `tableBlockPagination`). | P3 | Supported |
| Direction | `w:bidiVisual` | `w:tblPr` | `w:val` | Visual RTL table ordering | Imported/exported and applied to visual column order. | P2 | Supported |
| Borders | `w:tblBorders` | `w:tblPr`, `w:tblPrEx` | — | Table-level border set | Imported and applied to cell edges via `resolveEffectiveTableCellFormatting`: outer edges use `top`/`right`/`bottom`/`left`; inner edges use `insideH`/`insideV`. Export materializes resolved borders per-cell rather than re-emitting table-level borders (same visual result). | P1 | Supported |
| Borders | `w:tcBorders` | `w:tcPr` | — | Cell-level border set | All edges (`top`/`bottom`/`left`/`right`, bidi `start`/`end`) and both diagonals (`tl2br`/`tr2bl`) import, export, and render on canvas and PDF, overriding propagated table borders. | P1 | Supported |
| Borders | `w:top` | `w:tblBorders`, `w:tcBorders` | `w:val`, `w:sz`, `w:space`, `w:color`, `w:themeColor`, `w:themeTint`, `w:themeShade`, `w:frame`, `w:shadow` | Top border | Use OOXML border conflict rules for adjacent cells. | P1 | Supported |
| Borders | `w:bottom` | `w:tblBorders`, `w:tcBorders` | same as border attrs | Bottom border | Use OOXML border conflict rules for adjacent cells. | P1 | Supported |
| Borders | `w:left` | `w:tblBorders`, `w:tcBorders` | same as border attrs | Left border | Transitional/legacy; consider `start` for bidi-aware docs. | P1 | Supported |
| Borders | `w:right` | `w:tblBorders`, `w:tcBorders` | same as border attrs | Right border | Transitional/legacy; consider `end` for bidi-aware docs. | P1 | Supported |
| Borders | `w:start` | `w:tblBorders`, `w:tcBorders` | same as border attrs | Leading-edge border | Imported/exported for cells and used as a physical border fallback. | P1 | Supported |
| Borders | `w:end` | `w:tblBorders`, `w:tcBorders` | same as border attrs | Trailing-edge border | Imported/exported for cells and used as a physical border fallback. | P1 | Supported |
| Borders | `w:insideH` | `w:tblBorders`, `w:tcBorders` | same as border attrs | Internal horizontal border | Imported from `w:tblBorders`; applied to inner cell horizontal edges (non-first rows get `borderTop`, non-last rows get `borderBottom`) by `resolveEffectiveTableCellFormatting`. | P1 | Supported |
| Borders | `w:insideV` | `w:tblBorders`, `w:tcBorders` | same as border attrs | Internal vertical border | Imported from `w:tblBorders`; applied to inner cell vertical edges (non-first columns get `borderLeft`, non-last columns get `borderRight`) by `resolveEffectiveTableCellFormatting`. | P1 | Supported |
| Borders | `w:tl2br` | `w:tcBorders` | same as border attrs | Diagonal border top-left to bottom-right | Imported/exported; drawn as a diagonal line in both canvas and PDF renderers. | P2 | Supported |
| Borders | `w:tr2bl` | `w:tcBorders` | same as border attrs | Diagonal border top-right to bottom-left | Imported/exported; drawn as a diagonal line in both canvas and PDF renderers. | P2 | Supported |
| Borders | Border value group | border elements | `w:val` | Border style | Values include `single`, `nil`, `none`, `dashed`, `dotted`, `double`, etc. | P1 | Supported |
| Shading | `w:shd` | `w:tblPr`, `w:tblPrEx`, `w:tcPr`, table style props | `w:val`, `w:color`, `w:fill`, `w:themeColor`, `w:themeFill`, `w:themeTint`, `w:themeShade`, `w:themeFillTint`, `w:themeFillShade` | Table/cell shading | Resolve theme colors when possible; otherwise preserve values. | P1 | Supported |
| Layout | `w:tblLayout` | `w:tblPr`, `w:tblPrEx` | `w:type` | Table layout algorithm | `fixed` vs autofit is essential for width computation. | P0 | Supported |
| Margins | `w:tblCellMar` | `w:tblPr`, `w:tblPrEx` | — | Default cell margins | Imported/exported and applied as defaults beneath cell-specific `tcMar`. | P0 | Supported |
| Margins | `w:tcMar` | `w:tcPr` | — | Cell-specific margins | Overrides table default cell margins. | P0 | Supported |
| Margins | `w:top` | `w:tblCellMar`, `w:tcMar` | `w:w`, `w:type` | Top cell margin | Affects text rectangle inside cells. | P0 | Supported |
| Margins | `w:bottom` | `w:tblCellMar`, `w:tcMar` | `w:w`, `w:type` | Bottom cell margin | Affects text rectangle and vertical fit. | P0 | Supported |
| Margins | `w:left` | `w:tblCellMar`, `w:tcMar` | `w:w`, `w:type` | Left cell margin | Transitional/legacy; consider `start`. | P0 | Supported |
| Margins | `w:right` | `w:tblCellMar`, `w:tcMar` | `w:w`, `w:type` | Right cell margin | Transitional/legacy; consider `end`. | P0 | Supported |
| Margins | `w:start` | `w:tblCellMar`, `w:tcMar` | `w:w`, `w:type` | Leading cell margin | Imported/exported and used as a physical padding fallback. | P1 | Supported |
| Margins | `w:end` | `w:tblCellMar`, `w:tcMar` | `w:w`, `w:type` | Trailing cell margin | Imported/exported and used as a physical padding fallback. | P1 | Supported |
| Row grid | `w:gridBefore` | `w:trPr` | `w:val` | Skipped grid columns before first cell | Imported/exported and used by table cell layout. | P1 | Supported |
| Row grid | `w:gridAfter` | `w:trPr` | `w:val` | Skipped grid columns after last cell | Imported/exported; a short row's cells occupy the leading grid columns and the trailing skipped columns are left empty while the grid keeps its full column widths. Independent `w:wAfter`-only width reservation (without grid columns) is not separately modeled. | P1 | Supported |
| Row layout | `w:trHeight` | `w:trPr` | `w:val`, `w:hRule` | Row height | `hRule` may be `auto`, `atLeast`, or `exact`. | P0 | Supported |
| Row layout | `w:cantSplit` | `w:trPr` | `w:val` | Do not split row across pages | Imported/exported; row groups are kept atomic during pagination. | P1 | Supported |
| Row layout | `w:tblHeader` | `w:trPr` | `w:val` | Repeat row on each page | Needed for paginated rendering/export. | P1 | Supported |
| Row layout | `w:hidden` | `w:trPr` | `w:val` | Hidden table row marker | Imported/exported and hidden rows collapse in layout. | P2 | Supported |
| HTML/import mapping | `w:divId` | `w:trPr` | `w:val` | HTML div mapping id | HTML div mapping is irrelevant in a DOCX-native editor and has no visual effect. | P3 | N/A |
| Cell merge | `w:gridSpan` | `w:tcPr` | `w:val` | Horizontal cell span | Core colspan support. If span exceeds grid, grid may be augmented. | P0 | Supported |
| Cell merge | `w:hMerge` | `w:tcPr` | `w:val` | Horizontal merge legacy marker | Collapsed into the anchor cell's colspan on import (modern `w:gridSpan` equivalent); `continue` cells are absorbed and re-exported as `gridSpan`. | P1 | Supported |
| Cell merge | `w:vMerge` | `w:tcPr` | `w:val` | Vertical merge marker | `restart` begins merge; omitted/continue continues. Core rowspan support. | P0 | Supported |
| Cell layout | `w:vAlign` | `w:tcPr` | `w:val` | Vertical alignment in cell | Values include top/center/bottom/both. | P0 | Supported |
| Cell layout | `w:textDirection` | `w:tcPr` | `w:val` | Rotated/vertical text direction | Imported/exported and rendered in canvas/PDF through vertical text layout. | P2 | Supported |
| Cell layout | `w:noWrap` | `w:tcPr` | `w:val` | Do not wrap cell content | Imported/exported and used by table measurement/layout. | P1 | Supported |
| Cell layout | `w:tcFitText` | `w:tcPr` | `w:val` | Fit text within cell width | Imported/exported; canvas and PDF compress/expand runs via `characterScale` so a single line fills the cell content width. | P3 | Supported |
| Cell layout | `w:hideMark` | `w:tcPr` | `w:val` | Hide cell-end marker | Imported/exported; when all paragraphs in the cell are empty, the cell contributes zero content height so the row can shrink to just borders + padding. | P1 | Supported |
| Cell semantics | `w:headers` | `w:tcPr` | `w:val` | Header cell references | Imported/exported as semantic metadata. | P3 | Supported |
| Revision: table props | `w:tblPrChange` | `w:tblPr` | `w:id`, `w:author`, `w:date` | Revision of table properties | Preserved for DOCX round-trip; editor always renders the accepted (current) table properties, which is correct for the final-document view. | P3 | Supported |
| Revision: row props | `w:trPrChange` | `w:trPr` | `w:id`, `w:author`, `w:date` | Revision of row properties | Preserved for DOCX round-trip; editor renders the accepted row properties. | P3 | Supported |
| Revision: cell props | `w:tcPrChange` | `w:tcPr` | `w:id`, `w:author`, `w:date` | Revision of cell properties | Preserved for DOCX round-trip; editor renders the accepted cell properties. | P3 | Supported |
| Revision: row insertion | `w:ins` | `w:trPr` | `w:id`, `w:author`, `w:date` | Inserted table row | Imported and exported; inserted rows are shown in the final-document view (correct). | P3 | Supported |
| Revision: row deletion | `w:del` | `w:trPr` | `w:id`, `w:author`, `w:date` | Deleted table row | Imported and exported; deleted rows are suppressed in the final-document view (treated as hidden in `CanvasTableLayout`). | P3 | Supported |
| Revision: cell insertion | `w:cellIns` | `w:tcPr` | `w:id`, `w:author`, `w:date` | Inserted table cell | Preserved for DOCX round-trip; inserted cells are shown in the final-document view. | P3 | Supported |
| Revision: cell deletion | `w:cellDel` | `w:tcPr` | `w:id`, `w:author`, `w:date` | Deleted table cell | Imported and exported; deleted cells are suppressed in the final-document view in `CanvasTableLayout` (adjacent cells already carry expanded `gridSpan` in accepted state). | P3 | Supported |
| Revision: cell merge | `w:cellMerge` | `w:tcPr` | `w:id`, `w:author`, `w:date`, `w:vMerge`, `w:vMergeOrig` | Vertically merged/split cell revision | Imported and exported (original merge state stored in `revision.previous`); the accepted merge structure is already reflected in the cell's `vMerge`/`gridSpan`, which is correctly rendered in the final-document view. | P3 | Supported |
| Revision: table property exception | `w:tblPrExChange` | `w:tblPrEx` | `w:id`, `w:author`, `w:date` | Revision of table property exceptions | Preserved for DOCX round-trip as raw XML (`EditorTableRowNode.tblPrExChangeXml`), re-emitted inside `w:tblPrEx` on export. Editor renders the current (accepted) exception properties. | P3 | Supported |
| Compatibility/settings | `w:adjustLineHeightInTable` | `settings.xml/w:compat` | `w:val` | Add document grid pitch to lines in table cells | Affects line heights in tables. | P3 | Supported |
| Compatibility/settings | `w:doNotBreakWrappedTables` | `settings.xml/w:compat` | `w:val` | Do not allow floating tables to break across pages | The editor uses inline table flow (floating tables are not implemented), so this setting has no applicable effect. | P3 | N/A |
| Compatibility/settings | `w:doNotSnapToGridInCell` | `settings.xml/w:compat` | `w:val` | Do not snap objects to document grid in cells | Document grid snapping is not implemented; this setting has no applicable effect. | P3 | N/A |
| Compatibility/settings | `w:layoutRawTableWidth` | `settings.xml/w:compat` | `w:val` | Raw table width compatibility | Word-specific width calculation variant; our layout engine uses its own algorithm and this switch has no applicable effect. | P3 | N/A |
| Compatibility/settings | `w:layoutTableRowsApart` | `settings.xml/w:compat` | `w:val` | Allow table rows to wrap inline objects independently | Floating inline-object wrapping around individual rows is not implemented; this setting has no applicable effect. | P3 | N/A |
| Compatibility/settings | `w:allowSpaceOfSameStyleInTable` | `settings.xml/w:compat` | `w:val` | Allow contextual spacing of same-style paragraphs in tables | Parsed from `settings.xml/w:compat`; stored in `EditorDocument.settings.allowSpaceOfSameStyleInTable`; exported back to `w:compat`. When enabled, contextual spacing (`w:contextualSpacing`) is applied between same-style adjacent paragraphs inside table cells in both canvas and PDF layout. | P2 | Supported |
| Generic preservation | `mc:AlternateContent` | around/inside table content | `mc:*` | Markup compatibility choice/fallback | `mc:AlternateContent` children inside property containers are resolved via `mc:Fallback`: `getChildrenByTagNameNS` transparently descends into the fallback, so versioned `w14:*`/`w15:*` blocks degrade to their standard equivalents. | P1 | Supported |
| Generic preservation | Unknown `w14:*`, `w15:*`, `w16*:*` table attrs/elements | table/row/cell/properties | varies | Versioned Microsoft extensions | Extensions wrapped in `mc:AlternateContent` degrade to `mc:Fallback` transparently (handled by `getChildrenByTagNameNS`). Standalone extension attributes (e.g. `w14:paraId`, `w14:textId`) on `w:tr` and `w:tc` elements are collected into `EditorTableRowNode.extAttributes` / `EditorTableCellNode.extAttributes` and re-emitted on export. | P2 | Supported |

## Common value/attribute groups to normalize

| Group | Used by | Attributes / values | Importer guidance |
|---|---|---|---|
| On/off values | `cantSplit`, `tblHeader`, `noWrap`, `hideMark`, `bidiVisual`, etc. | `w:val` may be omitted or one of `true`, `false`, `1`, `0`, `on`, `off` depending producer/conformance | Normalize to boolean, but preserve original for round-trip. |
| Table widths | `tblW`, `tcW`, `tblCellSpacing`, `tblInd`, `wBefore`, `wAfter`, margins | `w:w`, `w:type` | Support `dxa`, `pct`, `auto`, `nil`. Convert twips carefully. |
| Border attributes | border edges | `w:val`, `w:sz`, `w:space`, `w:color`, `w:themeColor`, `w:themeTint`, `w:themeShade`, `w:frame`, `w:shadow` | Resolve theme color if rendering; preserve exact attrs if unsupported. |
| Revision metadata | table/grid/row/cell revision elements | `w:id`, `w:author`, `w:date` | If display mode is “final”, usually ignore revision containers but import current content. |
| Conditional table style flags | `tblLook`, `cnfStyle`, `tblStylePr` | bitmask/boolean flags and `w:type` | Needed for table style cascade and banded rows/columns. |

## Minimal importer milestones

| Milestone | Must support |
|---|---|
| Basic table extraction | `tbl`, `tr`, `tc`, paragraphs inside cells |
| Basic visual table | `tblGrid`, `gridCol`, `tcW`, `tblW`, `trHeight`, `tcMar`, `tblCellMar`, `vAlign` |
| Merged cells | `gridSpan`, `vMerge`; optionally `hMerge` legacy |
| Borders/backgrounds | `tblBorders`, `tcBorders`, `shd`, border conflict approximation |
| Word-like layout | `tblLayout`, `tblInd`, `tblCellSpacing`, `gridBefore/gridAfter`, `wBefore/wAfter` |
| Styles | `tblStyle`, `tblLook`, `tblStylePr`, `cnfStyle`, band sizes |
| Pagination | `cantSplit`, `tblHeader`, floating table properties, compatibility switches |
| Round-trip/revisions | `tblPrChange`, `trPrChange`, `tcPrChange`, `tblGridChange`, `cellIns`, `cellDel`, `cellMerge`, unknown extensions |

## Notes for DOCX importer implementation

1. The table formatting cascade is roughly: document defaults → table style base props → conditional table style props → direct `tblPr` / `trPr` / `tcPr`, with cell properties overriding row/table properties where they overlap.
2. Do not compute column widths from `gridCol` alone. Word uses table layout rules, `tblLayout`, preferred widths, spans, cell spacing, page width, margins, and content pressure.
3. A table row can be irregular: `gridBefore`, `gridAfter`, `gridSpan`, vertical merges, and omitted cells can make the XML not match a rectangular HTML mental model.
4. `w:hideMark` and paragraph spacing inside cells matter for vertical sizing; this is exactly the kind of property that can create surprising blank space in templates.
5. For a browser-like renderer, implement a faithful internal grid model first, then map to DOM/CSS as a later step.

## Sources checked

- ECMA-376 / ISO/IEC 29500 family: Office Open XML vocabularies and packaging.
- Microsoft Learn: Working with WordprocessingML tables.
- Microsoft Learn Open XML SDK class docs for `TableProperties`, `TableRowProperties`, and `TableCellProperties`.
- OOXML schema/reference mirrors were used only as a cross-check for element names not surfaced clearly in Microsoft Learn search snippets.

## Oasis editor support summary (status key)

This section condenses the per-table Status column into a high-level capability map of the oasis editor's DOCX import/export pipeline. It is intentionally a snapshot of the actual source code in `src/import/docx/*` and `src/export/docx/*`, not a list of aspirational features. Use it as the quick "what is real" reference when reading the matrices above.

### Fully round-tripped (Supported)

| Area | What works |
|---|---|
| Package | `[Content_Types].xml`, `_rels/.rels`, per-part `.rels`; resolves main document, styles, numbering, settings, fontTable, theme, footnotes, headers/footers, and embedded images. |
| Sections | Page size (`w:pgSz`), page margins (`w:pgMar`), header/footer references (default/even/first) and the section `docGrid`. |
| Paragraphs | `w:jc`, `w:spacing`, standalone `w:contextualSpacing`, `w:ind` (left/right/start/end/firstLine/hanging), `w:tabs`/`w:tab` stops with leaders, `w:numPr` (ilvl + numId), `w:keepNext`, `w:keepLines`, `w:pageBreakBefore`, `w:widowControl`, paragraph mark `rPr`, and inline `w:sectPr` in `pPr`. |
| Run content | `w:r`, `w:t`, `w:br` (page break → `pageBreakBefore`), `w:cr`, `w:tab` (kept as `\t` and laid out against paragraph tab stops), `w:lastRenderedPageBreak` (skipped), `w:separator` / `w:continuationSeparator` (correctly skipped in footnotes/headers), `w:instrText`, `w:fldChar` begin/separate/end (parsed into a stack; PAGE/NUMPAGES survive round-trip). |
| Inline images | `wp:inline` + `pic:pic` + `pic:blipFill` + `a:blip` with embedded relationship; image bytes are deduped via `assetRegistry.ts` and exposed through the editor asset layer. |
| Run properties | `w:b`/`w:bCs`, `w:i`/`w:iCs`, `w:sz`, `w:u` (style + color), `w:strike`/`w:dstrike`, `w:vertAlign` (superscript/subscript), `w:highlight`, `w:caps`/`w:smallCaps`, `w:vanish`, `w:kern`, `w:spacing`, `w:w`, `w:position`. |
| Run decorations | Round-trip + rendered (canvas + PDF): `w:shd` (run shading), `w:bdr` (text border box), `w:em` (emphasis marks dot/comma/circle/underDot), `w:outline`/`w:shadow`/`w:emboss`/`w:imprint` (glyph effects). Round-trip only: `w:webHidden`, `w:noProof`, `w:specVanish`, `w:lang`, `w:rtl`, `w:cs`, `w:snapToGrid` (run), `w:fitText`, `w:effect` (Word's deprecated animated text effects). |
| Styles | `w:docDefaults`, paragraph/character/table style types, `basedOn`/`next`/`link`/`default`; table style `w:tblPr` is read and `w:tblInd` is extracted; style cycle detection; the `default` style per type is applied by category. |
| Tables | `w:tbl`, `w:tblPr`, `w:tblGrid`/`w:gridCol`, `w:tr`/`w:trPr` (`w:trHeight`, `w:tblHeader`, `w:cantSplit`, `w:hidden`, `w:gridBefore`/`w:gridAfter`, `w:wBefore`/`w:wAfter`), `w:tc`/`w:tcPr` (`w:gridSpan`, `w:vMerge`, `w:tcW`, `w:tcMar`, `w:vAlign`, `w:textDirection`, `w:noWrap`, `w:shd`, `w:tcBorders`). `w:tblBorders` is propagated to cells on import; `w:tblCellMar`, `w:tblCellSpacing`, `w:tblLayout`, `w:bidiVisual`, floating metadata, and table revision metadata round-trip. |
| Footnotes | Full pipeline: `word/footnotes.xml` is parsed and exported; user notes are renumbered by document order; `w:type` in {`separator`, `continuationSeparator`, `continuationNotice`} are skipped; `w:footnoteRef` inside a footnote story is rendered as the auto glyph. |
| Headers/footers | `w:hdr`/`w:ftr` parts are parsed, re-rendered with the normal paragraph/run/table pipeline, and linked from the right section references. First-page (`w:titlePg`) and even/odd headers are supported on export. |
| Fields | `PAGE` and `NUMPAGES` round-trip as `w:fldSimple`; cached result text is preserved in the editor model. |
| Hyperlinks | External `w:hyperlink` (resolved via `r:id` relationship) and internal anchor hyperlinks (`w:anchor`, stored as `#name`, exported as `w:anchor` with no relationship) both round-trip. |
| Theme | `a:fontScheme` (major/minor, latin/ea/cs) is read and applied to run-level fonts that do not override it. `a:clrScheme` color slots are resolved on import; `themeColor`/`themeTint`/`themeShade` are flattened to concrete hex. |
| Settings | `w:adjustLineHeightInTable` is read from `w:compat` and controls table-cell line height. `w:defaultTabStop` drives default tab layout and round-trips through `settings.xml`. `w:evenAndOddHeaders` is exported and applied to the document. |
| Hyphenation | `w:autoHyphenation`, `w:consecutiveHyphenLimit`, `w:hyphenationZone`, and `w:doNotHyphenateCaps` round-trip through `settings.xml` and drive automatic hyphenation in layout: words break at Knuth–Liang pattern points (Portuguese + English, selected by run language) with a render-only trailing hyphen drawn in both canvas and PDF. The zone, consecutive-line limit, and all-caps exclusion are honored; auto-hyphens are layout-only and never written into the model. |
| Style cascade | Style `basedOn` chain is walked; style cycle detection prevents infinite loops. |

### Partial (one side of the round-trip or a documented subset)

| Area | What's partial | Why |
|---|---|---|
| `w:fldSimple` / `w:fldChar` | PAGE and NUMPAGES are full round-trip; other instructions are stored as static text and re-emitted as plain runs. | The editor has no field type registry beyond these two. |
| Numbering | Numbering instances, multilevel formats/patterns, starts/overrides, suffixes, legal numbering, marker alignment, bullet metadata, and level indentation are imported and regenerated semantically. | Picture bullets, `lvlRestart`, style-linked numbering, `multiLevelType`, `nsid`, and `tmpl` remain unsupported. |
| Images | Inline pictures plus floating anchor metadata; crop, fill mode, rotation/flip, embedded binaries, external `a:blip/@r:link`, and simple VML `w:pict/v:imagedata` fallback are supported. | Floating images render with inline fallback in the editor; VML shapes/text boxes, effects, recolor, charts, SmartArt, and OLE are still outside the image model. |
| `w:rFonts` | `ascii`/`hAnsi`/`cs` and `asciiTheme`/`hAnsiTheme`/`cstheme` with `w:hint` are read; `eastAsia`/`eastAsiaTheme` are not exported. | Run font resolution is partial. |
| `w:color` | Hex `w:val` and theme colors (`themeColor`/`themeTint`/`themeShade` against `a:clrScheme`) are resolved to concrete hex on import; export writes the resolved value. `clrSchemeMapping` overrides in the document settings are not applied. | Full theme → concrete-hex pipeline is in place; per-document scheme remapping is not. |
| `w:rStyle` | Read on import (so style-based run properties cascade) but the editor does not export a `w:rStyle` reference. | Style-cascade identity is lost in export. |
| `w:ind` character units | `w:leftChars`/`w:rightChars`/`w:firstLineChars`/`w:hangingChars` are dropped; twip values are used. | Char-unit indentation is not normalized. |
| `w:drawing` | `wp:inline` + `pic:pic` round-trip; `wp:anchor` metadata round-trips for image anchors, but the editor layout uses inline fallback. Shapes, charts, SmartArt, and OLE are dropped; simple VML images are converted to modern inline DrawingML. | No floating layout engine beyond metadata preservation. |
| Table revisions (tracked-changes UI) | All table revision elements round-trip and the editor renders the accepted (final-document) state: inserted rows/cells shown, deleted rows/cells suppressed (`CanvasTableLayout`), property/grid/exception changes preserved. | The editor shows the accepted state only; there is no tracked-changes table UI that renders revisions as marks for accept/reject. Floating tables are fully laid out (see `w:tblpPr`/`w:tblOverlap` in the matrix), not inline-fallback. |
| `w:tcBorders` | Edge borders including `start`/`end` and diagonal borders (`tl2br`/`tr2bl`) round-trip and are drawn in both canvas and PDF. | Fully supported. |
| `w:tblStyle` | Table style id, band sizes, `tblLook`, row/cell `cnfStyle`, and all conditional buckets (`pPr`/`rPr`/`tblPr`/`trPr`/full `tcPr`) are resolved on import; style definitions re-serialized to `word/styles.xml` on export. | Fully supported. |
| Theme color (`a:clrScheme`) | `a:fontScheme` is read; `a:clrScheme` slots (`a:dk1`, `a:lt1`, `a:accent1`...) are not. | Run color through theme is not resolved. |
| Settings (`w:settings`) | `w:compat` is read for `adjustLineHeightInTable`; `w:defaultTabStop`, `w:evenAndOddHeaders`, and document-level note numbering (`w:footnotePr`/`w:endnotePr` with `numFmt`, `numStart`, `numRestart`) round-trip. | Most settings remain outside the editor model. |
| Relationship types | `officeDocument`, `theme`, `styles`, `numbering`, `settings`, `fontTable`, `footnotes`, `image`, and header/footer relationships are all resolved. Custom/less-common relationship types are not enumerated. | The relationship code uses pattern matching per part, not a full content-type registry. |
| Bookmarks | `w:bookmarkStart`/`w:bookmarkEnd` round-trip into a document-level registry (`EditorDocument.bookmarks`): paragraph+offset anchors, deterministic `w:id` remap (preferring the imported hint), hidden (`_`) bookmarks and table `w:colFirst`/`w:colLast` preserved, `_GoBack` dropped — so internal hyperlinks (`#name`) resolve to real targets. Anchors are kept valid across live edits (typing, deleting, splitting, merging, pasting) by an operation-agnostic offset remap at the paragraph-mutation chokepoint (`transformBookmarksAcrossParagraphEdit`). Bookmarks nested *inside* a `w:r` (between its children) are captured on import via per-run offsets and re-emitted at paragraph level. REF/PAGEREF/TOC and unknown complex fields round-trip 1:1 as preserved `w:fldChar`/`w:instrText` marker runs (no evaluation/regeneration). | Field markers are not yet transformed across live edits (round-trip-only); fields are preserved, not evaluated (no REF text resolution, PAGEREF page numbers, or TOC regeneration). |

### Not supported (silently dropped or not parsed)

| Area | What is missing |
|---|---|
| Tracked changes (non-table) | `w:ins`, `w:del`, `w:moveFrom`, `w:moveTo`, `w:pPrChange`, `w:rPrChange`, `w:sectPrChange`, `w:numberingChange`. (Table revision elements — `w:tblPrChange`, `w:trPrChange`, `w:tcPrChange`, `w:cellIns`, `w:cellDel`, `w:cellMerge`, `w:tblPrExChange`, `w:tblGridChange` — round-trip and render the accepted state; see the table matrix.) |
| Modern comments metadata | Base comments, ranges, references, authors, dates, initials, bodies, and comments-part round-trip are supported; `w15:commentsEx`, `w16cid:commentsIds`, threaded/resolved state, and `w:people.xml` remain unsupported. |
| Endnotes | Endnote bodies and reference markers are supported; section-level endnote suppression/placement and advanced note settings beyond document-level numbering are not. |
| Content controls | `w:sdt` and all subtypes (text, richText, picture, comboBox, dropDownList, date, checkbox, repeatingSection) plus `w:dataBinding` and `w:customXml`. |
| Legacy forms | `w:ffData`, `w:textInput`, `w:checkBox`, `w:ddList`, `FORMTEXT`/`FORMCHECKBOX`/`FORMDROPDOWN`. |
| Office Math | `m:oMath`, `m:oMathPara`, all child equations. |
| Drawings beyond the modeled subset | Inline images, floating-anchor metadata, text boxes, preset text-box geometry, transform/crop, and simple VML images are supported; grouped shapes, arbitrary custom geometry, advanced effects, recolor, and alpha remain unsupported. |
| Charts / diagrams / OLE | `c:chart*`, `dgm:*`, `lc:lockedCanvas`, `o:OLEObject`, `w:object`, non-image `w:pict`. |
| AltChunk | `w:altChunk`. |
| Bidi/RTL/Complex script | `w:bidi` (paragraph/section), `w:rtl`, `w:cs`, `w:bdo`/`w:dir`, `w:lang`, `w:bidiVisual`, `w:noColumnBalance`. |
| East Asian / CJK | `w:eastAsianLayout`, `w:vertAlign` for CJK, `w:ruby`/`w:rt`/`w:rubyBase`, `w:doNotUseEastAsianBreakRules`, `w:useWord97LineBreakRules`, `w:useAltKinsokuLineBreakRules`. |
| Most `w:settings` | All of `w:zoom`, `w:view`, `w:displayBackgroundShape`, `w:displayProofErr`, `w:displayHorizontalDrawingGridEvery`/`w:displayVerticalDrawingGridEvery`, `w:characterSpacingControl`, `w:mirrorMargins`, `w:bordersDoNotSurroundHeader`/`Footer`, `w:formsDesign`, `w:attachedTemplate`, `w:linkStyles`, `w:stylePaneFormatFilter`/`w:stylePaneSortMethod`, `w:documentProtection`, `w:trackRevisions`, `w:doNotTrackMoves`/`w:doNotTrackFormatting`, `w:mailMerge`, `w:writeProtection`, `w:shapeDefaults`, `w:decimalSymbol`/`w:listSeparator`, `w:docVars`/`w:docVar`, `w:hdrShapeDefaults`, note placement (`w:footnotePr`/`w:endnotePr/w:pos`) and special-note refs, `w:displayHiddenText`, `w:showXMLTags`, `w:savePreviewPicture`, `w:embedTrueTypeFonts`/`w:embedSystemFonts`/`w:saveSubsetFonts`, `w:themeFontLang`, `w:clrSchemeMapping`, the full `w:compat` block except `adjustLineHeightInTable`. |
| Font table | `word/fontTable.xml` is not read; `w:font`, `w:altName`, `w:family`, `w:pitch`, `w:charset`, `w:panose1`, `w:sig`, embedded font references are all dropped. |
| Web settings | `word/webSettings.xml` is not consumed. |
| Columns / page borders / text direction | `w:cols`, `w:type`, `w:pgNumType`, `w:pageBorders`, `w:textDirection` (cell/section), `w:vAlign` (`both`), `w:lnNumType`, `w:paperSrc`, `w:formProt`, `w:noEndnote`, `w:printerSettings`. |
| Paragraph decorations | `w:outlineLvl`, `w:suppressLineNumbers`, `w:pBdr`, paragraph-level `w:shd`, `w:framePr`, `w:bidi`, `w:kinsoku`, `w:wordWrap`, `w:overflowPunct`, `w:topLinePunct`, `w:autoSpaceDE`/`DN`, `w:textAlignment`, `w:textboxTightWrap`, `w:divId`, `w:cnfStyle`, `w:adjustRightInd`. |
| Run content (special glyphs) | `w:sym`, `w:ptab`, `w:object`, `w:pict`, `w:delText`, `w:dayShort`/`w:monthLong`, `w:dir`/`w:bdo`, `w:smartTag`, `w:permStart`/`End` (in runs), `w:delInstrText`, `w:fldData`. |
| OPC extensions | `customXml/*`, `word/embeddings/*`, `word/activeX/*`, `word/printerSettings/*`, `word/commentsExtended.xml`, `word/commentsIds.xml`, `word/people.xml`, `word/bibliography.xml`, `word/charts/*`, `word/diagrams/*`, `word/theme/themeOverride*.xml`, `docProps/thumbnail.*`, `vbaProject.bin`, encrypted packages, and digital signatures. |
| Latent styles / SDT/control UX | `w:latentStyles`/`w:lsdException`, `w:appearance`/`w:color`/`w:showingPlcHdr`/`w:temporary`/`w:lock` on SDT, `w:equation`/`w:citation`/`w:bibliography`/`w:group`/`w:repeatingSectionItem`. |
| Modern (w14/w15/w16) typography — effects | `w14:textFill`, `w14:textOutline`, `w14:textShadow`, `w14:glow`/`w14:reflection`, `w14:scene3d`/`w14:props3d`, `w15:collapsed`, `w16du:dateUtc`. The five OpenType font-feature properties (`w14:ligatures`, `w14:numForm`, `w14:numSpacing`, `w14:stylisticSets`, `w14:cntxtAlts`) are **Partial** — see the rows above and [w14-modern-typography-roadmap.md](w14-modern-typography-roadmap.md). |

### Not applicable (UI / editor state, not model state)

| Element / setting | Why N/A |
|---|---|
| `w:zoom`, `w:view`, `w:displayBackgroundShape`, `w:displayProofErr`, `w:displayHorizontalDrawingGridEvery`/`w:displayVerticalDrawingGridEvery` | UI preferences; the editor has its own view state. |
| `w:showXMLTags`, `w:savePreviewPicture`, `w:uiCompat97To2003`, `w:doNotIncludeSubdocsInStats`, `w:summaryLength` | UI / package metadata; not stored in the document model. |
| `w:formsDesign` | Editor-mode flag; oasis has no design-mode toggle. |
| `w:proofState` (settings) | Proofing state; oasis has no proofing pipeline. |
| `w:linkStyles`, `w:stylePaneFormatFilter`/`w:stylePaneSortMethod` | Style-pane UI; oasis does not connect to external templates. |
| `w:revisionView` (settings) | Revision-display preference; no revision pipeline. |
| `w:trackRevisions` (settings) | Editing-time toggle; oasis has its own `state.trackChangesEnabled` runtime flag that the DOCX import does not consult. |
| `w:rsids` / `w:rsidRoot` / `w:rsid` | Editing-session identifiers; not needed for layout. |
| `w:updateFields` | "Update fields on open" hint; the editor recomputes its own fields as needed. |

### High-level takeaways

- The pipeline is centered on a fixed editor model (`EditorTextStyle`, `EditorParagraphStyle`, table grid/cell properties, list kinds, footnote references, image assets, headers/footers). Anything that cannot be expressed in that model is dropped on import and not regenerated on export.
- The export is a semantic regeneration rather than byte-for-byte preservation: footnotes are renumbered; numbering definitions are rebuilt from instance, level, format, pattern, start/override, suffix, legal mode, alignment, and bullet metadata; theme/styles are re-emitted with only the properties oasis tracks.
- Font metadata remains a major fidelity gap: theme fonts and theme colors resolve, but `word/fontTable.xml`, font aliases/charset metadata, and embedded fonts are not consumed.
- Images support inline rendering plus floating-anchor metadata; text boxes, preset text-box shapes, transforms/crop, and simple VML image fallback are modeled. Charts, SmartArt, OLE, grouped shapes, and advanced effects remain outside the renderer.
- Comments, bookmarks, footnotes, and endnotes have document-level models and DOCX round-trip paths. Content controls, custom XML bindings, Office Math, and a revision-aware tracked-changes view remain unsupported.
- Most of `word/settings.xml`, `word/webSettings.xml`, and `word/fontTable.xml` are not consumed; the editor relies on its own runtime state.
