# Implementation Gaps

This document maps the **DOCX / OOXML Converter Knowledge Base** against the
**current oasis-editor implementation** to identify what is implemented, what is
missing, and what the final user can actually do today.

---

## Executive Summary

| Guide Section | Implementation Status | User Impact |
|---|---|---|
| OPC Package (`01_opc_package.md`) | ⚠️ Indirect (via `mammoth` / `docx` libs) | Users cannot inspect or edit package parts |
| Relationships & Content Types (`02`) | ⚠️ Handled opaquely by libraries | No control over relationships or content types |
| WordprocessingML Model (`03`) | ✅ Core model exists | Paragraphs, runs, tables, images work |
| Text / Paragraphs / Runs (`04`) | ⚠️ Partial | Only basic marks (bold, italic, underline, color) |
| Styles / Themes / Fonts (`05`) | ❌ Not implemented | No style system, no themes, hardcoded fonts |
| Numbering / Lists (`06`) | ⚠️ Simplified | Flat bullet / decimal only; no OOXML numbering model |
| Tables (`07`) | ⚠️ Basic | No merged cells, borders, shading, or nested tables |
| Images / Drawings / Media (`08`) | ⚠️ Limited | Data-URI images only; no DrawingML, charts, OLE, math |
| Links / Bookmarks / Notes / Comments (`09`) | ❌ Not implemented | No hyperlinks, bookmarks, footnotes, endnotes, or comments |
| Fields / Content Controls / Custom XML (`10`) | ❌ Not implemented | No dynamic fields, no content controls, no custom XML |
| Sections / Headers / Footers / Layout (`11`) | ⚠️ Partial | Model supports headers/footers; UI does not expose editing |
| Revisions / Tracked Changes (`12`) | ❌ Not implemented | No track changes, no accept/reject/preserve modes |
| Compatibility / Strict / Transitional (`13`) | ❌ Not implemented | No `mc:AlternateContent` resolution, no strict namespace support |
| Converter Architecture (`14`) | ❌ Not implemented | No `DocumentIR`, no registries, no warning system |
| Validation / Testing / Security (`15`) | ❌ Not implemented | No ZIP-bomb limits, no external-relationship policy |
| Edge Cases (`16`) | ⚠️ Partial | Some handled (text split across runs); most not addressed |
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

**Gap:** The editor has **no intermediate representation** (`DocumentIR`), **no
registries**, and **no structured warning system**.  It stores a flat list of
sections containing typed blocks (`paragraph`, `heading`, `list-item`,
`ordered-list-item`, `table`, `image`).  Everything else is lost on import or
ignored on export.

| Component | Status | Location (if any) |
|---|---|---|
| `DocumentIR` | ❌ Missing | — |
| `StyleRegistry` | ❌ Missing | — |
| `NumberingRegistry` | ❌ Missing | — |
| `AssetRegistry` | ❌ Missing | — |
| `NotesRegistry` | ❌ Missing | — |
| `CommentRegistry` | ❌ Missing | — |
| `ConversionWarning[]` | ❌ Missing | — |
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
- **Import:** `DocxImporter` (`src/engine/import/DocxImporter.ts`) delegates to
  `mammoth.convertToHtml()`.  The ZIP is opened by `mammoth`, not by Oasis code.
- **Export:** `DocxExporter` (`src/engine/export/DocxExporter.ts`) delegates to
  the `docx` library's `Packer.toBlob()`.  No native ZIP writing.

**Consequences for the user**
- Cannot inspect or edit `[Content_Types].xml`, `_rels/.rels`, or any part
  relationships.
- Optional parts (`settings.xml`, `fontTable.xml`, `theme/theme1.xml`,
  `customXml/*`, etc.) are silently ignored on import.
- Round-tripping unknown markup is impossible.

---

## 3. Text, Paragraphs, Runs, and Formatting (`04_text_paragraphs_runs.md`)

### Run properties (`w:rPr`)

| Element | Guide Meaning | Oasis `MarkSet` | UI Control | Status |
|---|---|---|---|---|
| `w:b` | bold | `bold?: boolean` | Toolbar button | ✅ |
| `w:i` | italic | `italic?: boolean` | Toolbar button | ✅ |
| `w:u` | underline | `underline?: boolean` | Toolbar button | ✅ |
| `w:color` | text color | `color?: string` | Color picker | ✅ |
| `w:rFonts` | font selection | `fontFamily?: string` | — | ⚠️ (hardcoded) |
| `w:sz` | size in half-points | `fontSize?: number` | — | ⚠️ (hardcoded) |
| `w:strike` | strike-through | — | — | ❌ |
| `w:highlight` | highlight | — | — | ❌ |
| `w:vertAlign` | superscript / subscript | — | — | ❌ |
| `w:vanish` | hidden text | — | — | ❌ |
| `w:lang` | language | — | — | ❌ |

### Special inline tokens

| XML | Guide Token | Status |
|---|---|---|
| `w:tab` | `\t` | ❌ |
| `w:br` | line break | ❌ (Shift+Enter inserts `\n` in text, not a formal break) |
| `w:br w:type="page"` | page break | ❌ |
| `w:noBreakHyphen` | U+2011 | ❌ |
| `w:softHyphen` | U+00AD | ❌ |
| `w:sym` | symbol mapping | ❌ |

**User impact:** The toolbar only exposes bold, italic, underline, and color.
Everything else is unavailable.

---

## 4. Styles, Themes, and Fonts (`05_styles_themes_fonts.md`)

**What the guide describes:**
- `styles.xml` with paragraph / character / table / numbering styles
- Style inheritance (`w:basedOn`, `w:next`, `w:link`)
- Document defaults (`w:docDefaults`)
- Themes (`theme/theme1.xml`) and font tables (`fontTable.xml`)

**What is implemented:**
- **None of the above.**
- Typography is hardcoded in `src/core/composition/TypographyConfig.ts`.
- Headings are detected by `kind === "heading"`, not by style ID or outline
  level.
- No user-facing style picker.

| Feature | Status |
|---|---|
| `styles.xml` parsing | ❌ |
| Style registry | ❌ |
| Style inheritance | ❌ |
| Theme resolution | ❌ |
| Font table handling | ❌ |
| User-editable styles | ❌ |

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
| Charts | render / placeholder | ❌ |
| SmartArt | placeholder or image fallback | ❌ |
| OLE object | untrusted binary placeholder | ❌ |
| Equations (OMML) | MathML / LaTeX or placeholder | ❌ |
| Text boxes | parse nested text if needed | ❌ |

**User impact:** Users can insert images from a file picker (converted to
base64), but there is no alt-text editor, no chart/SmartArt support, and no
equation editor.

---

## 8. Hyperlinks, Bookmarks, Notes, and Comments (`09_links_bookmarks_notes_comments.md`)

**Completely absent from the data model and UI.**

| Feature | Guide Markdown | Oasis Model | UI | Import | Export |
|---|---|---|---|---|---|
| Hyperlinks | `[text](url)` | ❌ | ❌ | ❌ (lost) | ❌ |
| Bookmarks | HTML anchor | ❌ | ❌ | ❌ (lost) | ❌ |
| Footnotes | `[^id]` note | ❌ | ❌ | ❌ (lost) | ❌ |
| Endnotes | final notes section | ❌ | ❌ | ❌ (lost) | ❌ |
| Comments | sidecar / footnote | ❌ | ❌ | ❌ (lost) | ❌ |

**User impact:** Users cannot insert links, create bookmarks, or add
footnotes/endnotes/comments.  These are silently discarded when importing a
DOCX file.

---

## 9. Fields, Content Controls, and Custom XML (`10_fields_content_controls_custom_xml.md`)

**Completely absent.**

| Feature | Guide Behavior | Status |
|---|---|---|
| `HYPERLINK` field | convert to link | ❌ |
| `PAGE` / `NUMPAGES` | omit or placeholder | ❌ |
| `TOC` | cached result or regenerate | ❌ |
| `DATE` / `TIME` | cached result | ❌ |
| `REF` / `PAGEREF` | internal link or cached result | ❌ |
| `MERGEFIELD` | `{{FieldName}}` placeholder | ❌ |
| Formulas | cached result or expression | ❌ |
| Content controls (`w:sdt`) | unwrap or preserve metadata | ❌ |
| Custom XML binding (`w:dataBinding`) | resolve XPath | ❌ |
| `w:altChunk` | resolve relationship & parse | ❌ |

**User impact:** No mail-merge, no dynamic page numbers, no auto-updating TOC,
no fillable forms.

---

## 10. Sections, Headers, Footers, and Layout (`11_sections_headers_footers_layout.md`)

**What exists in the model:**
- `SectionNode` has `margins`, `orientation`, `pageTemplateId`, `header[]`, and
  `footer[]`.
- `DocxExporter` and `PdfExporter` write headers/footers when present.

**What the user cannot do:**

| Feature | Model | UI | Status |
|---|---|---|---|
| Edit header content | ✅ exists | ❌ no controls | ⚠️ |
| Edit footer content | ✅ exists | ❌ no controls | ⚠️ |
| Insert section break | ❌ | ❌ | ❌ |
| Insert page break | ❌ | ❌ | ❌ |
| Column layout (`w:cols`) | ❌ | ❌ | ❌ |
| Page borders (`w:pgBorders`) | ❌ | ❌ | ❌ |
| Line numbering (`w:lnNumType`) | ❌ | ❌ | ❌ |
| Different first-page header/footer | ❌ | ❌ | ❌ |

**User impact:** Headers and footers are exported if pre-populated by code, but
users have no way to edit them.  Page and section breaks are unavailable.

---

## 11. Revisions and Tracked Changes (`12_revisions_tracked_changes.md`)

**Completely absent.**

| Revision Element | Meaning | Status |
|---|---|---|
| `w:ins` | inserted content | ❌ |
| `w:del` | deleted content | ❌ |
| `w:moveFrom` | moved-from content | ❌ |
| `w:moveTo` | moved-to content | ❌ |
| `w:rPrChange` | run property change | ❌ |
| `w:pPrChange` | paragraph property change | ❌ |

**User impact:** No track-changes mode, no accept/reject UI, no visual diff
indicators.  Imported documents with tracked changes lose all revision markup.

---

## 12. Compatibility, Extensions, Strict, and Transitional (`13_compatibility_strict_transitional.md`)

**Absent.**

| Capability | Status |
|---|---|
| `mc:Ignorable` support | ❌ |
| `mc:AlternateContent` resolution | ❌ |
| Strict namespace URIs | ❌ |
| Transitional legacy constructs (VML, etc.) | ❌ |
| `w14`, `w15`, `w16` extension namespaces | ❌ |

**User impact:** Documents saved with modern Word features may lose formatting
on import because fallback markup is not resolved by Oasis code.

---

## 13. Validation, Testing, and Security (`15_validation_testing_security.md`)

**Not implemented.**

| Layer / Concern | Guide Recommendation | Oasis Status |
|---|---|---|
| ZIP bomb protection | limit uncompressed size, file count, ratio | ❌ |
| Path traversal prevention | sanitize ZIP entry names | ❌ |
| External relationship policy | block or allowlist external targets | ❌ |
| XML parser security | disable DTDs / external entities | ❌ |
| Embedded object sandbox | treat OLE as untrusted | ❌ |
| Golden tests | fixture + expected.md + assets + warnings | ❌ |

**User impact:** The editor relies on `mammoth` and the browser's `docx`
libraries for safety; there are no explicit Oasis-level guards.

---

## 14. Edge Cases (`16_edge_cases.md`)

| Edge Case | Guide Advice | Oasis Handling |
|---|---|---|
| Text split across runs | merge adjacent compatible runs | ✅ (merge logic exists in text/mark handlers) |
| Empty paragraphs | inspect for page breaks / bookmarks before dropping | ⚠️ (preserved, but no special inspection) |
| Localized style names | use style IDs and outline levels | ❌ (no style system) |
| Fake lists | heuristic detection | ❌ |
| Complex tables | HTML fallback or structured sidecar | ❌ |
| Source-scoped relationships | resolve via header `.rels` | ❌ (no native rels handling) |
| External images | blocked unless explicitly allowed | ❌ |
| Stale field results | use cached result for Markdown | ❌ (no fields) |
| Comment ranges | range support | ❌ |
| Rich footnotes | block arrays, not plain strings | ❌ |
| Text boxes | parse nested text | ❌ |
| OMML equations | convert or placeholder | ❌ |
| Strict namespaces | support both URI sets | ❌ |
| Word repair behavior | emulate repair or warn | ❌ |

---

## 15. Proposed Roadmap (Prioritized)

### High Impact / Low Effort
1. **Strikethrough** — add `strike` to `MarkSet` and a toolbar toggle.
2. **Hyperlinks** — add `HyperlinkNode` (or link mark) and an insert-link
   dialog.
3. **Page break insertion** — add an operation and a menu item.

### Medium Impact / Medium Effort
4. **Header / Footer editing UI** — wire `editingMode: "header" | "footer"` to
   the view so users can type in those zones.
5. **Colspan / Rowspan** — extend `TableCellNode` with `colSpan` / `rowSpan`
   and teach the exporters to emit them.
6. **Nested list levels** — replace flat `index` with a real `ilvl`-aware
   model.

### High Impact / High Effort
7. **Native OPC importer** — replace `mammoth` with a custom ZIP + OOXML
   parser to preserve relationships, styles, numbering, and comments.
8. **DocumentIR + registries** — introduce the intermediate representation,
   `StyleRegistry`, `NumberingRegistry`, `AssetRegistry`, and a warning system.
9. **Fields & Content Controls** — implement `w:fldChar` / `w:fldSimple`
   parsing and a field-result cache.

### Lower Priority
10. **Track changes** — model revisions, accept/reject/preserve modes.
11. **OMML → MathJax / LaTeX** — equation support.
12. **Charts & SmartArt** — placeholder rendering or image fallback.

---

*Last updated: 2026-04-25*
