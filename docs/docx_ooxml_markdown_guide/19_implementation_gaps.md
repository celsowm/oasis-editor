# Implementation Gaps

This document maps the **DOCX / OOXML Converter Knowledge Base** against the
**current oasis-editor implementation** to identify what is implemented, what is
missing, and what the final user can actually do today.

---

## Executive Summary

| Guide Section | Implementation Status | User Impact |
|---|---|---|
| OPC Package (`01_opc_package.md`) | ✅ Native (ZIP read + write) | Full ZIP + OPC graph access |
| Relationships & Content Types (`02`) | ✅ Native | Resolved and navigable via `OPCPackage` |
| WordprocessingML Model (`03`) | ✅ Core model exists | Paragraphs, runs, tables, images work |
| Text / Paragraphs / Runs (`04`) | ✅ Complete | Bold, italic, underline, strike, color, highlight, font, size, superscript, subscript, links, tabs, breaks, hyphens |
| Styles / Themes / Fonts (`05`) | ⚠️ Partial | `StyleRegistry` + `StyleResolver` + runtime application + `styleId` round-trip; themes/fonts not yet |
| Numbering / Lists (`06`) | ✅ Nested levels | `NumberingRegistry` with `ilvl`-aware decimal, bullet, letter, roman |
| Tables (`07`) | ✅ Advanced | Merged cells (colspan/rowspan), borders; nested tables not supported |
| Images / Drawings / Media (`08`) | ✅ Inline images | DrawingML inline images + VML fallback; alt text + equations supported |
| Links / Bookmarks / Notes / Comments (`09`) | ✅ Implemented | Hyperlinks ✅, Bookmarks ✅, Footnotes ✅, Endnotes ✅, Comments ✅ |
| Fields / Content Controls / Custom XML (`10`) | ⚠️ Partial | Page numbers, date, time fields ✅; content controls, custom XML ❌ |
| Sections / Headers / Footers / Layout (`11`) | ⚠️ Partial | Headers/footers round-trip ✅; model supports editing mode; no UI controls |
| Revisions / Tracked Changes (`12`) | ✅ Implemented | Insert/delete revisions, accept/reject, toolbar toggle, visual indicators |
| Compatibility / Strict / Transitional (`13`) | ⚠️ Partial | `mc:AlternateContent` resolution ✅; strict namespace support ❌ |
| Converter Architecture (`14`) | ✅ Implemented | `DocumentIR`, `StyleRegistry`, `NumberingRegistry`, `AssetRegistry`, warning system |
| Validation / Testing / Security (`15`) | ✅ ZIP security | Safe ZIP limits, path traversal prevention; XML DTD policy pending |
| Edge Cases (`16`) | ⚠️ Partial | Text split across runs ✅; most other edge cases not addressed |
| XML Cheat Sheet (`17`) | ✅ Reference only | Accurate for the subset that is implemented |
| Minimal Examples (`18`) | ✅ Reference only | Accurate for the subset that is implemented |

**Legend**
- ✅ Implemented / Available to the user
- ⚠️ Partially implemented or implemented only in the data model
- ❌ Not implemented; invisible or unavailable to the user

---

## 1. Architecture: Recommended vs. Actual

### Recommended intermediate representation (from `00_README.md`)

```ts
interface DocumentIR {
  metadata: Metadata;
  blocks: Block[];
  styles: StyleRegistry;
  numbering: NumberingRegistry;
  assets: AssetRegistry;
  notes: NotesRegistry;
  comments: CommentRegistry;
  warnings: ConversionWarning[];
}
```

### Actual document model (`src/core/document/DocumentTypes.ts`)

```ts
export interface DocumentModel {
  id: string;
  revision: number;
  sections: SectionNode[];
  metadata: DocumentMetadata;
}
```

**Status:** `DocumentIR` and all registries are now implemented. The native
importer (`NativeDocxImporter`) uses them as the intermediate representation
before converting to `DocumentModel`. The mammoth-based importer is still
available as a fallback.

| Component | Status | Location |
|---|---|---|
| `DocumentIR` | ✅ Implemented | `src/engine/ir/DocumentIR.ts` |
| `StyleRegistry` | ✅ Implemented | `src/engine/ir/DocumentIR.ts` |
| `NumberingRegistry` | ✅ Implemented | `src/engine/ir/DocumentIR.ts` |
| `AssetRegistry` | ✅ Implemented | `src/engine/ir/DocumentIR.ts` |
| `NotesRegistry` | ✅ Implemented | `src/engine/ir/DocumentIR.ts` |
| `CommentRegistry` | ✅ Implemented | `src/engine/ir/DocumentIR.ts` |
| `ConversionWarning[]` | ✅ Implemented | `src/engine/ir/DocumentIR.ts` |
| `ConversionOptions` | ❌ Missing | — |

---

## 2. OPC Package (`01_opc_package.md`)

The guide describes a native OPC workflow:

```pseudo
open zip
parse [Content_Types].xml
parse /_rels/.rels
locate officeDocument relationship
load /word/document.xml
load relationships for each source part
```

**Current implementation**
- **Import:** `NativeDocxImporter` (`src/engine/import/NativeDocxImporter.ts`)
  uses `SafeZipReader` + `OPCGraphBuilder` + `WMLParser` for native DOCX parsing.
  The old `DocxImporter` (`mammoth`-based) is still available.
- **Export:** `NativeDocxExporter` (`src/engine/export/NativeDocxExporter.ts`)
  writes WordprocessingML + OPC package directly via `WMLWriter` + `OPCPackageWriter`
  + JSZip. The old `DocxExporter` (`docx` library) is still available.

**Consequences for the user**
- Native importer can inspect `[Content_Types].xml`, `_rels/.rels`, and part
  relationships. Optional parts are parsed when supported.
- Images are resolved via relationships and converted to data URIs.
- Round-tripping is partially possible for supported features.

---

## 3. Text, Paragraphs, Runs, and Formatting (`04_text_paragraphs_runs.md`)

### Run properties (`w:rPr`)

| Element | Guide Meaning | Oasis `MarkSet` | UI Control | Status |
|---|---|---|---|---|
| `w:b` | bold | `bold?: boolean` | Toolbar button | ✅ |
| `w:i` | italic | `italic?: boolean` | Toolbar button | ✅ |
| `w:u` | underline | `underline?: boolean` | Toolbar button | ✅ |
| `w:color` | text color | `color?: string` | Color picker | ✅ |
| `w:rFonts` | font selection | `fontFamily?: string` | — | ✅ (rendered, no UI) |
| `w:sz` | size in half-points | `fontSize?: number` | — | ✅ (rendered, no UI) |
| `w:strike` | strike-through | `strike?: boolean` | Toolbar button | ✅ |
| `w:highlight` | highlight | `highlight?: string` | — | ✅ (rendered, no UI) |
| `w:vertAlign` | superscript / subscript | `vertAlign?: "superscript" | "subscript"` | Toolbar buttons | ✅ |
| `w:vanish` | hidden text | — | — | ❌ |
| `w:lang` | language | — | — | ❌ |

### Special inline tokens

| XML | Guide Token | Status |
|---|---|---|
| `w:tab` | `\t` | ✅ |
| `w:br` | line break | ✅ |
| `w:br w:type="page"` | page break | ✅ (parsed as page-break block) |
| `w:noBreakHyphen` | U+2011 | ✅ |
| `w:softHyphen` | U+00AD | ✅ |
| `w:sym` | symbol mapping | ✅ (basic `w:char` hex parsing) |

**User impact:** The toolbar exposes bold, italic, underline, strike, color, superscript, and subscript. Font family/size/highlight render when imported but have no dedicated UI controls.

---

## 4. Styles, Themes, and Fonts (`05_styles_themes_fonts.md`)

**What the guide describes:**
- `styles.xml` with paragraph / character / table / numbering styles
- Style inheritance (`w:basedOn`, `w:next`, `w:link`)
- Document defaults (`w:docDefaults`)
- Themes (`theme/theme1.xml`) and font tables (`fontTable.xml`)

**What is implemented:**
- `styles.xml` parsing into `StyleRegistry` with `styleId`, `basedOn`, `name`,
  `paragraphProps`, and `runProps`.
- `StyleResolver` resolves style chains (following `basedOn`) and produces
  `ResolvedStyle` with paragraph and run properties.
- `applyStylesToBlocks` applies resolved styles at import time.
- `DocumentModel.styles` preserves imported styles for runtime use.
- `SET_STYLE` operation resolves and applies style properties dynamically
  (alignment, indentation, bold, italic, color, font, size) using the
  stored `DocumentModel.styles` registry. Explicit inline formatting on runs
  is preserved (takes precedence over style defaults).
- No theme resolution or font table handling.

| Feature | Status |
|---|---|---|
| `styles.xml` parsing | ✅ |
| Style registry | ✅ |
| Style inheritance | ✅ |
| Style application at import | ✅ |
| Style application at runtime | ✅ |
| Theme resolution | ❌ |
| Font table handling | ❌ |
| User-editable styles | ⚠️ (styleId can be changed, no style editor) |

---

## 5. Numbering and Lists (`06_numbering_lists.md`)

**Guide model:**
- `abstractNum` = reusable list template
- `num` = concrete list instance pointing to `abstractNum`
- `lvl` = per-level formatting and counter rules (`w:numFmt`, `w:lvlText`, etc.)

**Actual model (`BlockTypes.ts`):**

```ts
export interface ListItemNode {
  kind: "list-item";          // flat bullet
  align: ...;
  children: TextRun[];
}

export interface OrderedListItemNode {
  kind: "ordered-list-item";  // flat decimal
  index: number;
  align: ...;
  children: TextRun[];
}
```

**Gaps:**
- No `abstractNum` / `num` / `lvl` hierarchy.
- No multi-level nesting (indentation fakes nesting visually, but it is not a
  real OOXML list level).
- No support for `lowerLetter`, `upperLetter`, `lowerRoman`, `upperRoman`,
  `none`.
- No list restart logic.

| `w:numFmt` | Guide Markdown Support | Oasis Support |
|---|---|---|
| `bullet` | yes | ✅ |
| `decimal` | yes | ✅ |
| `lowerLetter` | partial | ❌ |
| `upperLetter` | partial | ❌ |
| `lowerRoman` | partial | ❌ |
| `upperRoman` | partial | ❌ |
| `none` | no direct marker | ❌ |

---

## 6. Tables (`07_tables.md`)

**Implemented:**
- Basic `w:tbl` → `TableNode` with rows (`TableRowNode`) and cells
  (`TableCellNode`).
- Cells can contain nested block content (paragraphs, images, etc.).
- Column widths are tracked (`columnWidths: number[]`).

**Not implemented:**

| Feature | XML Element | Status |
|---|---|---|
| Horizontal merge (colspan) | `w:gridSpan` | ❌ |
| Vertical merge (rowspan) | `w:vMerge` | ❌ |
| Cell borders | `w:tcBorders` | ❌ |
| Cell shading | `w:shd` | ❌ |
| Vertical alignment | `w:vAlign` | ❌ |
| Text direction / rotation | `w:textDirection` | ❌ |
| Nested tables | `w:tbl` inside `w:tc` | ❌ |
| Table styles | `w:tblStyle` | ❌ |

**User impact:** Tables are always simple rectangular grids.  Merged cells are
lost on import and cannot be created in the UI.

---

## 7. Images, Drawings, and Media (`08_images_drawings_media.md`)

**Implemented:**
- `ImageNode` stores a base64 data URI (`src: string`) and display dimensions.
- Supported image types on **export:** PNG, JPG, GIF, BMP (via `docx` library).

**Not implemented:**

| Feature / Object | Guide Strategy | Status |
|---|---|---|
| DrawingML (`w:drawing`, `wp:inline`) | resolve `a:blip/@r:embed` | ❌ (data URI only) |
| Inline vs anchored | `wp:inline` / `wp:anchor` | ❌ |
| Alt text editing | `wp:docPr/@descr` | ❌ (field exists on `ImageNode` but not editable in UI) |
| Legacy VML (`w:pict`) | image extraction fallback | ❌ |
| Charts | placeholder rendering | ✅ (placeholder detected from DOCX, gray box render, text fallback export) |
| SmartArt | placeholder or image fallback | ✅ (treated as chart placeholder) |
| OLE object | untrusted binary placeholder | ❌ |
| Equations (OMML) | MathML / LaTeX or placeholder | ✅ |
| Text boxes | parse nested text if needed | ❌ |

**User impact:** Users can insert images from a file picker (converted to
base64), edit alt text inline, insert equations via LaTeX (with OMML round-trip),
and charts/SmartArt are rendered as placeholder blocks when imported from DOCX.

---

## 8. Hyperlinks, Bookmarks, Notes, and Comments (`09_links_bookmarks_notes_comments.md`)

| Feature | Guide Markdown | Oasis Model | UI | Import | Export |
|---|---|---|---|---|---|---|
| Hyperlinks | `[text](url)` | ✅ `link` mark | ✅ prompt + `<a>` render | ✅ | ✅ |
| Bookmarks | HTML anchor | ✅ `bookmarkStart`/`bookmarkEnd` on `TextRun` | ✅ Insert > Bookmark prompt | ✅ | ✅ |
| Footnotes | `[^id]` note | ✅ `footnoteId` on `TextRun` + `DocumentModel.footnotes` | ✅ Insert > Footnote prompt | ✅ | ✅ |
| Endnotes | final notes section | ✅ `endnoteId` on `TextRun` + `DocumentModel.endnotes` | ✅ Insert > Endnote prompt | ✅ | ✅ |
| Comments | sidecar / footnote | ✅ `commentId` on `TextRun` + `DocumentModel.comments` | ✅ Insert > Comment prompt | ✅ | ✅ |

**User impact:** Users can insert hyperlinks, bookmarks, footnotes, endnotes, and comments.
All are preserved on native DOCX import/export round-trip.

---

## 9. Fields, Content Controls, and Custom XML (`10_fields_content_controls_custom_xml.md`)

**Partially implemented.**

| Feature | Guide Behavior | Status |
|---|---|---|
| `HYPERLINK` field | convert to link | ✅ (handled as `link` mark) |
| `PAGE` / `NUMPAGES` | omit or placeholder | ✅ `INSERT_FIELD` operation, Insert menu |
| `DATE` / `TIME` | cached result | ✅ `INSERT_FIELD` operation, Insert menu |
| `TOC` | cached result or regenerate | ❌ |
| `REF` / `PAGEREF` | internal link or cached result | ❌ |
| `MERGEFIELD` | `{{FieldName}}` placeholder | ❌ |
| Formulas | cached result or expression | ❌ |
| Content controls (`w:sdt`) | unwrap or preserve metadata | ❌ |
| Custom XML binding (`w:dataBinding`) | resolve XPath | ❌ |
| `w:altChunk` | resolve relationship & parse | ❌ |

**User impact:** Page numbers, date, and time fields can be inserted via the
Insert menu. Other field types, content controls, and custom XML are not
supported.

---

## 10. Sections, Headers, Footers, and Layout (`11_sections_headers_footers_layout.md`)

**What exists in the model:**
- `SectionNode` has `margins`, `orientation`, `pageTemplateId`, `header[]`, and
  `footer[]`.
- Native importer parses `headerReference`/`footerReference` from `sectPr`, loads
  `word/header*.xml` and `word/footer*.xml`, and applies styles.
- Native exporter writes header/footer XML, adds relationships, and references
  them in `sectPr`.

**What the user cannot do:**

| Feature | Model | Import/Export | UI | Status |
|---|---|---|---|---|
| Edit header content | ✅ exists | ✅ round-trip | ❌ no controls | ⚠️ |
| Edit footer content | ✅ exists | ✅ round-trip | ❌ no controls | ⚠️ |
| Insert section break | ❌ | ❌ | ❌ | ❌ |
| Insert page break | ✅ `INSERT_PAGE_BREAK` | ✅ | ✅ Insert menu | ✅ |
| Column layout (`w:cols`) | ❌ | ❌ | ❌ | ❌ |
| Page borders (`w:pgBorders`) | ❌ | ❌ | ❌ | ❌ |
| Line numbering (`w:lnNumType`) | ❌ | ❌ | ❌ | ❌ |
| Different first-page header/footer | ❌ | ❌ | ❌ | ❌ |

**User impact:** Headers and footers round-trip through native DOCX import/export.
Users have no UI controls to edit them directly.

---

## 11. Revisions and Tracked Changes (`12_revisions_tracked_changes.md`)

**Implemented.**

| Revision Element | Meaning | Status |
|---|---|---|
| `w:ins` | inserted content | ✅ `RevisionInfo` with `type: "insert"` |
| `w:del` | deleted content | ✅ `RevisionInfo` with `type: "delete"` |
| `w:moveFrom` | moved-from content | ❌ |
| `w:moveTo` | moved-to content | ❌ |
| `w:rPrChange` | run property change | ❌ |
| `w:pPrChange` | paragraph property change | ❌ |

**User impact:** Track-changes mode can be toggled from the toolbar. Inserted
and deleted revisions are visually indicated (green for insert, red+
strikethrough for delete). Users can accept or reject individual revisions.

---

## 12. Compatibility, Extensions, Strict, and Transitional (`13_compatibility_strict_transitional.md`)

**Partially implemented.**

| Capability | Status |
|---|---|---|
| `mc:Ignorable` support | ❌ |
| `mc:AlternateContent` resolution | ✅ (fallback preferred; choice used if no fallback) |
| Strict namespace URIs | ❌ |
| Transitional legacy constructs (VML, etc.) | ⚠️ (VML fallback images supported) |
| `w14`, `w15`, `w16` extension namespaces | ❌ |

**User impact:** Modern Word documents using `mc:AlternateContent` (e.g. SmartArt, modern shapes) now import their fallback content instead of silently disappearing. VML fallback images are already supported via `w:pict` parsing.
on import because fallback markup is not resolved by Oasis code.

---

## 13. Validation, Testing, and Security (`15_validation_testing_security.md`)

**Partially implemented.**

| Layer / Concern | Guide Recommendation | Oasis Status |
|---|---|---|
| ZIP bomb protection | limit uncompressed size, file count, ratio | ✅ `SafeZipReader` |
| Path traversal prevention | sanitize ZIP entry names | ✅ `SafeZipReader` |
| External relationship policy | block or allowlist external targets | ❌ |
| XML parser security | disable DTDs / external entities | ⚠️ `@xmldom/xmldom` used; DTD policy not explicit |
| Embedded object sandbox | treat OLE as untrusted | ❌ |
| Golden tests | fixture + expected.md + assets + warnings | ❌ |

**User impact:** `NativeDocxImporter` enforces ZIP size limits and path
sanitization. External relationships and OLE objects are not yet restricted.

---

## 14. Edge Cases (`16_edge_cases.md`)

| Edge Case | Guide Advice | Oasis Handling |
|---|---|---|
| Text split across runs | merge adjacent compatible runs | ✅ (merge logic exists in text/mark handlers) |
| Empty paragraphs | inspect for page breaks / bookmarks before dropping | ⚠️ (preserved, but no special inspection) |
| Localized style names | use style IDs and outline levels | ❌ (no style system) |
| Fake lists | heuristic detection | ❌ |
| Complex tables | HTML fallback or structured sidecar | ❌ |
| Source-scoped relationships | resolve via header `.rels` | ✅ (`OPCGraphBuilder`) |
| External images | blocked unless explicitly allowed | ❌ |
| Stale field results | use cached result for Markdown | ⚠️ (fields rendered as cached text) |
| Comment ranges | range support | ✅ |
| Rich footnotes | block arrays, not plain strings | ✅ |
| Text boxes | parse nested text | ❌ |
| OMML equations | convert or placeholder | ✅ |
| Strict namespaces | support both URI sets | ❌ |
| Word repair behavior | emulate repair or warn | ❌ |

---

## 15. Proposed Roadmap (Prioritized)

### ✅ Completed
1. **Strikethrough** — `strike` mark, toolbar toggle, import/export.
2. **Hyperlinks** — `link` mark, prompt UI, `<a>` render, export/import.
3. **Page break insertion** — `INSERT_PAGE_BREAK` operation, visual render, menu.
4. **Header / Footer editing UI** — banner with mode switch, Escape to exit.
5. **Colspan / Rowspan** — `colSpan` / `rowSpan` on `TableCellNode`, merge/split ops.
6. **Nested list levels** — `level` + `listFormat`, Tab/Shift-Tab, roman/letter markers.
7. **Alt text** — `UPDATE_IMAGE` operation, floating input on image select.
8. **Native OPC importer** — `SafeZipReader` + `OPCGraphBuilder` + `WMLParser`.
9. **DocumentIR + registries** — `DocumentIR`, `StyleRegistry`, `NumberingRegistry`,
   `AssetRegistry`, `NotesRegistry`, `CommentRegistry`, `ConversionWarning[]`.
10. **Native DOCX exporter** — `WMLWriter` + `OPCPackageWriter` + JSZip.
11. **Fields & Content Controls** — `w:fldChar` / `w:fldSimple` parsing, `FieldInfo` on
    `TextRun`, `INSERT_FIELD` operation, menu Insert > Page number / Date / Time.
12. **Style application** — `styleId` on text blocks, `StyleResolver`, `SET_STYLE` operation,
    toolbar dropdown for paragraph styles, import/export round-trip.
13. **Track changes** — `RevisionInfo` on `TextRun`, `TOGGLE_TRACK_CHANGES`,
    `ACCEPT_REVISION`, `REJECT_REVISION` operations, toolbar toggle button,
    visual indicators (green for insert, red+strikethrough for delete).
14. **OMML / LaTeX equations** — `EquationNode` with `latex` + `omml`, `INSERT_EQUATION`
    operation, Insert menu prompt, `WMLParser`/`WMLWriter` OMML round-trip,
    `FragmentRenderer` with MathJax fallback, PDF/DOCX fallback export.
15. **Charts & SmartArt placeholder** — `ChartNode` with `chartType`/`title`, detected from
    `<c:chart>` in `WMLParser`, gray dashed placeholder in `FragmentRenderer`,
    placeholder text in PDF/DOCX export, `WMLWriter` emits placeholder paragraph.
16. **Bookmarks & cross-references** — `bookmarkStart`/`bookmarkEnd` on `TextRun`, detected from
    `<w:bookmarkStart>` / `<w:bookmarkEnd>` in `WMLParser`, emitted back in `WMLWriter`,
    `INSERT_BOOKMARK` operation + handler, Insert menu prompt, blue dashed visual indicator
    in `FragmentRenderer`, runtime + native exporter round-trip tests.
17. **Footnotes & Endnotes** — `footnoteId`/`endnoteId` on `TextRun`, `DocumentModel` extended with
    `footnotes`/`endnotes` arrays, detected from `<w:footnoteReference>` / `<w:endnoteReference>`
    in `WMLParser`, `footnotes.xml` / `endnotes.xml` parsed via `NotesRegistry` and emitted by
    `WMLWriter`, `INSERT_FOOTNOTE` / `INSERT_ENDNOTE` operations + handlers, Insert menu prompts,
    superscript reference rendering in `FragmentRenderer`, runtime + native exporter round-trip tests.
18. **Comments / annotations** — `commentId` on `TextRun`, `DocumentModel` extended with `comments`
    array, detected from `<w:commentRangeStart>` / `<w:commentRangeEnd>` in `WMLParser`,
    `comments.xml` parsed via `CommentRegistry` and emitted by `WMLWriter` + `OPCPackageWriter`,
    `INSERT_COMMENT` operation + handler, Insert menu prompt, yellow highlight rendering in
    `FragmentRenderer`, runtime + native exporter round-trip tests.

19. **Remove legacy dependencies** — Removed `docx` and `mammoth` npm dependencies.
    `DocxExporter` and `DocxImporter` are now thin wrappers that delegate to `NativeDocxExporter`
    and `NativeDocxImporter`. Legacy test files deleted. Native OPC is the sole DOCX pipeline.
20. **Apply imported styles at load time** — `StyleResolver` now resolves style chains from
    `StyleRegistry` during native import. `applyStylesToBlocks` applies resolved paragraph props
    (align, indentation) and run props (bold, italic, color, font, size) to blocks and runs.
    Explicit inline formatting is preserved (run marks take precedence). Styles are also applied
    recursively to table cell contents, footnotes, endnotes, and comments.

### Next Up
21. **Renderer-level style resolution** — Currently styles are "baked in" at import time. For
    dynamic style changes, the renderer should resolve styles on the fly using a document-level
    style registry.

---

*Last updated: 2026-04-25 (Phase 20 style application completed)*
