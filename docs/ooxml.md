# OOXML / DOCX Compatibility Status

Current source audit: 2026-08-07  
Audited baseline: `main` at `268d300aa6271679016f755687a083d4db85ceda`

This document is the current compatibility summary for Oasis Editor's DOCX / WordprocessingML implementation.

The June 2026 element-by-element inventory remains useful as a schema checklist, but its implementation status is archived and must not be treated as current. The executable roadmap is [Near-Full Microsoft Word OOXML Compatibility Execution Plan](./ooxml-near-full-compatibility-plan.md).

## Compatibility model

Oasis compatibility is tracked across five independent dimensions:

- **Import**: OOXML is parsed into the editor model.
- **Render**: the feature affects canvas/PDF layout or has a faithful preview/placeholder.
- **Edit**: the user can modify the feature semantically.
- **Export**: the modeled feature is emitted back to DOCX.
- **Preserve**: unsupported or unedited source content survives a round-trip.

A feature is not fully compatible merely because its text is visible. Near-full compatibility requires safe preservation first, then display fidelity, then semantic editing where appropriate.

Legend:

- **Strong**: broad implemented coverage for ordinary documents.
- **Partial**: real implementation with known structural, semantic, or layout limits.
- **Preserve only**: source information survives but is not fully rendered/edited.
- **Missing**: no reliable semantic implementation yet.
- **N/A**: dimension does not apply.

## Current status at a glance

| Domain | Import | Render | Edit | Export | Preserve | Current assessment |
|---|---|---|---|---|---|---|
| OPC package discovery | Strong | N/A | N/A | Strong | Strong | Source packages are captured through content types/root relationships; source-backed export merges rebuilt modeled parts into the original package. |
| Paragraphs and runs | Strong | Strong | Strong | Strong | Strong/Partial | Whole-source reuse and granular source-fragment merging preserve unknown run/paragraph markup in many mutation paths; preservation is not yet universal for every rewritten container. |
| Named styles and defaults | Strong | Strong | Partial | Strong | Partial | Cascading/common metadata are broad; linked/latent/future extension preservation still needs universal source-fragment treatment. |
| Lists and numbering | Partial | Strong for common formats | Strong for common formats | Partial | Partial | Common decimal/letter/Roman/bullet and multilevel lists work; full `ST_NumberFormat`, picture bullets and obscure restart/override cases remain. |
| Tables | Strong | Strong | Strong | Strong | Strong/Partial | Extensive style/layout/revision support plus source-preserving serializers. |
| Nested tables | Strong | Strong | Strong | Strong | Strong/Partial | Cells use `EditorBlockNode[]`; recursive layout, selection, navigation, resize, merge/split and operations across document stories are implemented. Remaining work is edge-case hardening and Word-exact pagination. |
| Sections and columns | Strong | Partial | Partial | Strong | Partial | Page settings, margins, columns and section metadata round-trip; Word-exact behavior for all break/page-numbering/layout modes remains. |
| Headers and footers | Strong | Strong | Partial | Strong | Strong/Partial | Default/first/even stories work and source paths are preserved while section topology is stable. |
| Footnotes and endnotes | Strong | Partial | Partial | Strong | Partial | Parts, references, settings and separators exist; exact split/placement/pagination semantics remain. |
| Bookmarks and hyperlinks | Strong | Partial | Partial | Strong | Partial | Ranges and internal/external links round-trip; cross-reference evaluation remains incomplete. |
| Complex fields | Strong preservation | Partial | Missing for most field semantics | Strong preservation | Partial | Arbitrary field markers/instructions survive; `PAGE`/`NUMPAGES` are the main evaluable cases. |
| Comments | Partial | Partial | Partial | Partial | Partial | Ranges, metadata and resolved state exist; comment bodies must become rich stories rather than flattened text. |
| Tracked changes | Partial | Partial | Partial | Partial | Partial | Insert/delete and several property/table revisions exist; move ranges, full property-change coverage and complete accept/reject projections remain. |
| Images | Strong | Strong | Strong | Strong | Strong/Partial | Inline/floating images, crop, transform, borders and wrapping have broad support. |
| DrawingML text boxes | Strong | Strong | Partial | Strong | Strong/Partial | Nested blocks, position, rotation and basic shape/body properties are modeled. |
| General DrawingML shapes | Partial | Partial | Missing | Partial | Preserve only at package level for unrelated parts | A generic lossless drawing node/fallback is still required for rewritten parts. |
| VML | Partial | Partial | Missing | Partial | Preserve only at package level for unrelated parts | Legacy image paths exist; generic shapes/groups/text boxes remain incomplete. |
| Content controls (`w:sdt`) | Partial | Content visible | Partial metadata only | Partial | Partial | Block controls and typed `sdtPr` metadata are strong; inline/row/cell SDTs and bound behavior remain. |
| Custom XML and data binding | Metadata partial | Missing | Missing | Missing semantically | Strong package preservation | `customXml` package parts now survive unrelated edits; `storeItemID`/XPath synchronization and editable binding semantics remain. |
| Office Math / OMML | Missing semantically | Missing | Missing | Missing semantically | Preserve only at package/unmodified-fragment level | Needs an opaque-first math node, then OMML parsing/rendering/editing. |
| Charts and SmartArt | Missing semantically | Missing | Missing | Missing semantically | Strong package preservation for unrelated parts | Package preservation prevents incidental deletion, but visual/model support is still absent. |
| OLE and embedded packages | Missing semantically | Missing | Missing | Missing semantically | Strong package preservation for unrelated parts | Must gain safe non-executing object representation and previews. |
| Themes | Partial | Partial | Missing | Partial through source-backed preservation | Strong package preservation | Imported values resolve through theme data; full semantic theme editing/serialization remains. |
| Font table | Strong metadata | Partial | Missing | Strong metadata | Strong/Partial | Metadata round-trips; embedded fonts and Word-exact script-aware substitution remain. |
| Package metadata | Preserve only | N/A | Missing | Preserve only | Strong | Core/app/custom properties survive source-backed export even though semantic editing is not implemented. |
| Markup Compatibility | Strong/Partial | N/A | N/A | Partial | Partial | `mc:AlternateContent`, `mc:Ignorable` and `mc:ProcessContent` are processed; universal `PreserveElements`/`PreserveAttributes` behavior depends on the source-fragment layer. |
| RTL/CJK typography | Partial | Partial | Partial | Partial | Partial | Many flags/directions are modeled; shaping, line breaking and layout parity still need hardening. |
| Word layout parity | Harness exists | Partial | N/A | N/A | N/A | Word-to-PDF comparison infrastructure exists; it must become a required compatibility gate with a broader corpus. |
| Schema/conformance validation | Partial | N/A | N/A | Partial | N/A | Needs permanent Open XML SDK validation and automated Word open/save gates in CI. |

## What changed in the August 5–6 compatibility pass

### Source-backed OPC preservation is implemented

The importer now captures the original DOCX package rather than treating the editor model as the only source of truth. `src/import/docx/opc/sourcePackage.ts` inventories XML and binary entries, reads `[Content_Types].xml`, parses root and part relationships, resolves the real `officeDocument` target and records diagnostics for unsafe or malformed relationship topology.

The production DOCX export path uses `exportEditorDocumentToDocxPreservingSource`. It rebuilds the modeled Oasis parts and then patches them into the source package. The OPC patcher preserves unrelated parts, merges content types and relationships, remaps conventional rebuilt paths back to relationship-discovered source paths and retains unknown relationship IDs where needed.

This closes the original M1 architectural blocker: editing ordinary body text no longer inherently discards custom properties, custom XML stores, opaque binary parts or other unrelated package content.

Remaining OPC work is **hardening**, not greenfield architecture:

- larger real-world fixtures containing charts, SmartArt, OLE, glossary, embedded fonts and modern extension parts;
- conflict diagnostics and strict export modes;
- performance/lazy handling for very large binary package parts;
- permanent package inventory/diff tests in CI.

### Source-fragment preservation exists for core rewritten markup

The OOXML source-fragment layer records semantic signatures and original XML for runs, paragraphs, tables, rows and cells. Export can reuse an unchanged source subtree or merge unknown attributes/properties/children into freshly generated OOXML.

This is the correct architecture for preserving vendor extensions and future Word markup inside parts Oasis must rewrite. The remaining task is to generalize it to every important container rather than replacing it with another preservation mechanism.

### Markup Compatibility processing is real

`src/import/docx/markupCompatibility.ts` evaluates `mc:AlternateContent`, chooses a supported `mc:Choice` or fallback, filters unsupported ignorable namespaces and supports `mc:ProcessContent` unwrapping.

The remaining compatibility gap is lossless preservation of every relevant `mc:PreserveElements` / `mc:PreserveAttributes` case while the containing node is mutated.

### Nested tables are no longer a structural blocker

`EditorTableCellNode.blocks` is now `EditorBlockNode[]`. The August 6 work added recursive rendering and geometry, nested paths, hit testing, selection, navigation, resize, merge/split, multi-cell commands, styling and mutations across the supported document stories.

Nested tables should therefore be treated as a **hardening/layout parity** item, not as an unimplemented model feature.

## Strong areas

### Text and paragraph formatting

The model/import/export path covers common formatting plus a substantial advanced surface:

- bold, italic, underline variants, strike, superscript/subscript;
- font family, size, language, theme/resolved colors, highlight and shading;
- spacing, scale, baseline position, kerning, ligatures and number forms;
- caps/small-caps, hidden/no-proof flags, RTL/complex-script flags;
- text borders and multiple legacy/modern text effects;
- paragraph spacing, indentation, alignment, borders, tabs, pagination flags, bidi/CJK flags, text direction and outline levels.

Several visual effects are intentionally approximated on canvas/PDF, but their OOXML model coverage is substantially broader than the archived June matrix indicates.

### Tables

Tables are one of the strongest domains. Coverage includes table grids, fixed/autofit sizing, indentation/alignment, cell spacing, borders/margins, horizontal/vertical merges, row heights/header rows, keep-together behavior, grid-before/grid-after, widths, padding, vertical alignment, text direction, no-wrap, fit-text, conditional styles, floating table metadata and several revision structures.

The remaining table work is primarily pathological Word layout behavior, obscure revision combinations and nested-table pagination/interaction stress tests.

### Images and text boxes

Images have broad inline/floating support including crop, stretch/tile mode, borders, rotation, flips, absolute/relative positioning, distances, wrapping modes and tight/through polygons.

DrawingML WordprocessingShape text boxes have a typed representation for size, nested blocks, floating layout, rotation, metadata, basic shape fill/border, padding, vertical anchoring, wrapping, autofit and vertical text.

## Highest-priority remaining gaps

### P0 — Universal intra-part source preservation

The package itself is now preserved. The highest priority is ensuring that unknown markup **inside any part Oasis rewrites** also survives a localized edit.

Generalize the existing semantic-signature/source-fragment approach to:

- document root and body;
- `sectPr` and section property changes;
- styles and style property containers;
- numbering definitions/levels/instances;
- settings;
- headers and footers;
- footnotes/endnotes;
- comments;
- content controls and secondary stories;
- drawing containers.

Preservation must retain namespace declarations, unknown attributes, unknown children and schema-valid ordering. Relationship-bearing source fragments require relationship-aware relocation instead of unsafe raw reuse.

### P1 — Word semantic structures used by complex legal documents

Implement or complete:

- inline/run, row and cell content controls;
- custom XML store lookup and controlled XPath binding;
- two-way content-control synchronization;
- rich comment stories, replies and modern comment metadata;
- complete revision projection plus accept/reject operations;
- field AST/evaluation for `REF`, `PAGEREF`, `SEQ`, `STYLEREF`, `TOC`, `DATE`, `TIME`, `IF`, `MERGEFIELD`, `DOCVARIABLE`, `DOCPROPERTY`, `INCLUDEPICTURE`, `INCLUDETEXT` and legacy form fields;
- complete numbering vocabulary and picture bullets.

### P2 — Opaque visual object fallback before native editing

Before implementing every visual feature, introduce lossless opaque nodes that retain source XML, relationship references and optional previews for objects Oasis does not understand semantically.

Apply this to:

- generic DrawingML shapes/groups/connectors;
- VML shapes/groups;
- charts;
- SmartArt/diagram objects;
- OLE/embedded packages;
- ink and future Microsoft drawing extensions.

A localized text edit must never make such an object disappear merely because Oasis cannot edit it.

### P3 — Office Math / OMML

Implement math in preservation-first stages:

1. opaque OMML run/block node;
2. source-preserving import/export;
3. OMML-to-renderable AST/MathML projection;
4. layout and selection;
5. structured editing;
6. serializer back to schema-valid OMML.

Fractions, scripts, radicals, delimiters, n-ary operators, matrices, accents and equation arrays are required for broad Word parity.

### P4 — Word-exact layout

Feature-level OOXML support is insufficient if pagination differs from Word. The remaining parity work includes:

- all section break behaviors (`nextPage`, `continuous`, `evenPage`, `oddPage`, `nextColumn`);
- page-number formatting/restarts and field interaction;
- footnote/endnote placement and splitting;
- widow/orphan/keep interactions;
- floating-object wrapping/exclusion competition;
- table and nested-table row pagination;
- compatibility flags that alter layout;
- RTL/Bidi shaping;
- CJK line breaking and document grids;
- font fallback/substitution and metric parity.

The existing Word-to-PDF harness must become a permanent gate rather than an auxiliary test utility.

### P5 — Conformance and regression gates

Near-full compatibility should not be claimed until CI continuously proves it with:

- Open XML SDK validation on Windows;
- automated Word open/save with no repair dialog;
- re-import of Word-saved output;
- package inventory/content-type/relationship diffing;
- byte identity for untouched binary parts;
- canonical XML equivalence for untouched XML parts;
- repeated `Word -> Oasis -> Word -> Oasis` cycles;
- visual layout comparison against Word PDFs;
- fixtures from multiple Word versions, LibreOffice, Google Docs, Apple Pages and document-generation libraries;
- namespace/relationship/property mutation tests.

## Documentation policy

The compatibility documentation must be derived from code and tests rather than manually maintained prose alone.

The target is a typed capability registry with independent import/render/edit/export/preserve levels. Positive claims should reference fixtures/tests and package round-trip tests should generate a known-loss report.

A feature must not be called **Strong** unless its claimed semantic path is exercised by tests. A feature must not be called **Preserved** unless a source-backed round-trip test proves preservation under at least one relevant mutation.

## Immediate next milestone

The old M1 source-package milestone and the structural nested-table milestone are no longer the next blockers.

The immediate milestone is **M2 — universal rewritten-part preservation**:

1. inventory every OOXML container that can be rewritten;
2. extend the source-fragment/signature architecture beyond runs, paragraphs and tables;
3. make namespace/relationship preservation explicit;
4. add extension fixtures using unknown `w14`/`w15`/`w16*` children and attributes;
5. edit one known property in each fixture;
6. prove that every unrelated/unknown child, attribute and relationship remains valid and ordered;
7. turn these tests into a permanent CI compatibility gate.

After M2, the next semantic milestone is content controls/custom XML + rich comments + revisions/fields, followed by OMML and generic visual-object fallback.
