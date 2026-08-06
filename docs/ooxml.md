# OOXML / DOCX Compatibility Status

Current source audit: 2026-08-05  
Audited baseline: `main` at `46d18aad58c4ed48f4b2069c3cccb7a2b93b9e1e`

This document is the current compatibility summary for Oasis Editor's DOCX / WordprocessingML implementation.

The previous element-by-element matrix was useful as an OOXML inventory, but its implementation statuses drifted behind the source tree. It has been retained unchanged as [the June 2026 coverage matrix](./ooxml-coverage-matrix-2026-06.md). Do not use the legacy matrix's `Supported / Partial / Not supported` column as the source of truth for the current code.

The executable roadmap for closing the remaining gaps is [Near-Full Microsoft Word OOXML Compatibility Execution Plan](./ooxml-near-full-compatibility-plan.md).

## Compatibility levels

Oasis compatibility has five independent dimensions:

- **Import**: OOXML is parsed into the editor model.
- **Render**: the feature affects canvas/PDF layout or has a preview/placeholder.
- **Edit**: the user can modify the feature semantically.
- **Export**: the modeled feature is emitted back to DOCX.
- **Preserve**: unsupported or unedited source content survives a round-trip.

A feature is not fully supported merely because its text is visible. Near-full compatibility requires safe package preservation even for features Oasis cannot yet render or edit.

Legend:

- **Strong**: broad implemented coverage for ordinary documents.
- **Partial**: real implementation with known structural, semantic, or layout limits.
- **Preserve only**: source information is retained but not fully rendered/edited.
- **Missing**: no reliable implementation yet.

## Current status at a glance

| Domain | Import | Render | Edit | Export | Preserve | Notes |
|---|---|---|---|---|---|---|
| OPC package discovery | Partial | N/A | N/A | Partial | Missing | Main and common parts are still addressed through conventional paths; export rebuilds a new package. |
| Paragraphs and runs | Strong | Strong | Strong | Strong | Partial | Broad direct formatting and advanced run/paragraph properties exist; generic unknown-child preservation is not universal. |
| Named styles and defaults | Strong | Strong | Partial | Strong | Partial | Cascading and common style metadata exist; linked/latent/unknown style data is not complete. |
| Lists and numbering | Partial | Strong for common formats | Strong for common formats | Partial | Partial | Common decimal/letter/Roman/bullet formats and multilevel labels work; the full numbering vocabulary and picture bullets do not. |
| Tables | Strong | Strong | Strong | Strong | Partial | Extensive table, cell, row, style, merge, floating, and revision support; nested tables remain blocked by the paragraph-only cell block type. |
| Sections and columns | Strong | Partial | Partial | Strong | Partial | Page settings, margins, columns, headers/footers, and section metadata round-trip; several section modes remain layout-only gaps. |
| Headers and footers | Strong | Strong | Partial | Strong | Partial | Default/first/even stories and related images/hyperlinks are supported. |
| Footnotes and endnotes | Strong | Partial | Partial | Strong | Partial | Bodies, references, separators, and settings exist; Word-exact page/column placement remains incomplete. |
| Bookmarks and hyperlinks | Strong | Partial | Partial | Strong | Partial | Ranges and internal/external links round-trip; cross-reference evaluation is incomplete. |
| Complex fields | Strong preservation | Partial | Missing for most fields | Strong preservation | Partial | Arbitrary field markers/instructions are retained; only `PAGE` and `NUMPAGES` have an evaluable editor representation. |
| Comments | Partial | Partial | Partial | Partial | Partial | Ranges, metadata, resolved state, and export exist; comment bodies are flattened to plain text rather than full stories. |
| Tracked changes | Partial | Partial | Partial | Partial | Partial | Insert/delete runs and several table/property revisions exist; move ranges and the complete property-change surface do not. |
| Images | Strong | Strong | Strong | Strong | Partial | Inline/floating images, crop, border, transform, wrapping, and polygons have broad coverage. |
| DrawingML text boxes | Strong | Strong | Partial | Strong | Partial | Block content, shape basics, position, rotation, and body properties exist. |
| General DrawingML shapes | Partial | Partial | Missing | Partial | Missing | Images/text boxes are specialized; generic shape geometry, fills, groups, charts, and diagrams lack a lossless fallback. |
| VML | Partial | Partial | Missing | Partial | Missing | Legacy images have support; general shapes, groups, and text boxes are incomplete. |
| Content controls (`w:sdt`) | Partial | Content visible | Missing widget editing | Partial | Partial | Block controls and typed `sdtPr` metadata exist, including unknown-property XML; inline/row/cell controls and bound behavior remain. |
| Custom XML and data binding | Metadata partial | Missing | Missing | Missing | Missing | `w:dataBinding` metadata can be parsed inside SDT properties, but package data stores and XPath synchronization are absent. |
| Office Math / OMML | Missing | Missing | Missing | Missing | Missing | Requires preservation-first math nodes, then OMML-to-MathML rendering and structured editing. |
| Charts and SmartArt | Missing | Missing | Missing | Missing | Missing | Related package parts can be lost during current rebuild export. |
| OLE and embedded packages | Missing | Missing | Missing | Missing | Missing | Must be preserved safely and shown as non-executing previews/placeholders. |
| Themes | Partial | Partial | Missing | Missing | Missing | Theme data is used to resolve imported values, but the original theme part is not generally re-emitted. |
| Font table | Strong metadata | Partial | Missing | Strong metadata | Partial | Substitution metadata round-trips; embedded fonts and complete script-aware substitution remain. |
| Package metadata | Missing | N/A | Missing | Missing | Missing | Core, app, and custom properties are not part of the current semantic export pipeline. |
| RTL/CJK typography | Partial | Partial | Partial | Partial | Partial | Many flags and text directions are modeled; full bidi shaping, section behavior, and Word line-breaking parity remain. |
| Word layout parity | Test harness exists | Partial | N/A | N/A | N/A | Windows Word-to-PDF comparison infrastructure exists and should become a required compatibility gate. |

## What the current implementation already proves

### Core document structure

The importer handles the main body as paragraphs, tables, block content controls, and section boundaries. Paragraph-scoped section properties and final body section properties are both recognized. Multiple sections can carry their own page settings and default/first/even header and footer stories.

### Text and paragraph formatting

The model and serializers cover common formatting plus a significant advanced surface, including:

- bold, italic, underline variants, strike, superscript, and subscript;
- font family, size, language, color, highlighting, and shading;
- spacing, scale, baseline position, kerning, ligatures, and number forms;
- small caps, all caps, hidden/no-proof flags, RTL and complex-script flags;
- text borders and several legacy/modern text effects;
- paragraph spacing, indentation, alignment, borders, tabs, pagination flags, bidi/CJK flags, text direction, and outline levels.

Several effects are deliberately preserve-only or approximated on canvas/PDF. The typed model is ahead of the old matrix in this area.

### Tables

Tables are one of the strongest domains. The source tree contains support for:

- table grids, widths, fixed/autofit layout, indentation, alignment, and cell spacing;
- table/row/cell borders and margins;
- horizontal and vertical merges;
- row heights, header rows, keep-together behavior, grid-before/grid-after, and row alignment;
- cell width, padding, vertical alignment, text direction, no-wrap, fit-text, and conditional flags;
- table styles and conditional formats;
- floating table metadata;
- several table, row, cell, grid, and merge revision structures.

The largest structural table gap is nested tables because table cells currently expose paragraph blocks rather than the general `EditorBlockNode[]` union.

### Notes, bookmarks, comments, and fields

Footnotes and endnotes have dedicated document registries, references, import/export paths, numbering, settings, separators, and traversal.

Bookmarks are extracted into a document registry and exported through deterministic range events. Complex field control characters and instruction text are represented as zero-length runs, allowing unknown fields and fields spanning multiple paragraphs to survive semantically better than the legacy matrix describes.

Comments are no longer entirely absent: comment ranges, body metadata, dates, initials, resolved state, import, and export exist. The important remaining limitation is that comment bodies are currently flattened to plain text.

### Content controls

Block-level structured document tags are unwrapped into normal editable block flow while retaining wrapper metadata for export. The typed properties include alias, tag, ID, lock, appearance, placeholder, data binding metadata, text/rich-text/picture/group/equation/citation/bibliography types, combo boxes, dropdown lists, dates, modern checkboxes, and repeating-section metadata.

Unknown `sdtPr` children are retained as raw XML. This is a useful local pattern that should be generalized to every rewritten OOXML property container.

### Images and text boxes

Images have broad inline/floating support, including crop, stretch/tile mode, borders, rotation, flips, position, distances, wrapping modes, and tight/through polygons.

DrawingML WordprocessingShape text boxes have a typed representation for size, nested blocks, floating layout, rotation, metadata, basic shape fill/border, padding, vertical anchoring, wrapping, autofit, and vertical text.

### Compatibility and testing foundations

The XML helpers already use namespace URIs rather than relying exclusively on prefixes, and there is partial handling of `mc:AlternateContent`, including specialized access to modern `w14` content.

The project also contains Word layout parity infrastructure that exports a DOCX, automates Word PDF conversion on Windows, extracts PDF line geometry, and compares it with Oasis layout projection. This is the correct foundation for measurable page-layout compatibility.

## Corrections to the June 2026 matrix

The archived matrix remains valuable as a schema inventory, but these broad claims are outdated relative to the audited source:

- comments are implemented partially rather than wholly unsupported;
- bookmarks have a document registry and deterministic export planning;
- arbitrary complex fields have structural preservation through field-character and instruction runs;
- `w:sym` has a dedicated run kind;
- footnotes and endnotes have complete import/export part pipelines for their current model;
- block content controls have typed properties and unknown-property preservation;
- DrawingML text boxes are represented, rendered, imported, and exported;
- RTL, complex-script, emphasis, fit-text, text-border, modern text effects, and multiple advanced run properties exist in the current model;
- richer table and property revision structures exist;
- comments, bookmarks, font-table, text-box, shape, field, note, and table-style tests are present in the repository.

These corrections do not imply complete Word parity. They show why a single manually maintained status column is unreliable.

## Highest-priority gaps

### 1. Lossless OPC source-package preservation

The current importer reads common parts from conventional paths and the exporter reconstructs a new package from modeled features. This is the largest data-loss risk.

The next implementation milestone must:

1. read `[Content_Types].xml` and root relationships;
2. locate the main document relationship dynamically;
3. inventory every XML and binary part;
4. preserve unknown relationships and content types;
5. clone the source package during export;
6. replace only modeled dirty parts;
7. merge rather than regenerate content types and relationships;
8. emit diagnostics for any unavoidable loss.

Until this exists, Oasis cannot promise a safe round-trip for documents containing valid but unmodeled Word features.

### 2. Ordered unknown XML preservation

Untouched parts are only half the problem. Unknown attributes and child elements inside rewritten document, paragraph, run, style, table, section, numbering, and settings parts also need ordered extension bags and stable namespace serialization.

### 3. General block stories and nested tables

Cells, comments, glossary entries, and other secondary stories should use the same general block model as the main document. This unlocks nested tables, rich comments, and consistent feature support across every Word story.

### 4. Advanced semantic parts

The next semantic priorities are:

- inline/row/cell content controls;
- custom XML stores and data binding;
- complete revisions and accept/reject projections;
- richer field evaluation and numbering;
- Office Math;
- theme and embedded-font preservation.

### 5. Opaque visual object fallback

Generic shapes, charts, SmartArt, VML, OLE, ink, and future drawing extensions need a preserved source-XML node with related-part references and an optional preview asset. Native editing can be implemented incrementally without deleting the original object.

## Documentation policy going forward

The compatibility matrix must be tied to code and tests instead of updated by prose alone.

The intended replacement is a typed capability registry with separate import/render/edit/export/preserve levels. Generated documentation should link each positive capability to fixture or test IDs. Package round-trip tests should generate a known-loss report.

A status must not be called **Strong** unless its claimed import/export path is exercised by tests. A feature must not be called **Preserved** unless a source-backed round-trip test proves that unrelated source content survives.

## Immediate next milestone

Follow Milestone M1 in [the execution plan](./ooxml-near-full-compatibility-plan.md#20-proposed-milestone-sequence): preserve an imported source package through a minimal body-text edit.

The first acceptance fixture should contain custom document properties, a custom XML data store, a chart with an embedded workbook, theme data, and an unknown relationship. After editing one text run, every unrelated part and relationship must remain present and semantically unchanged.
