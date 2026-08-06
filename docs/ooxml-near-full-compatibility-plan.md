# Near-Full Microsoft Word OOXML Compatibility Execution Plan

Status: active roadmap  
Audit baseline: `main` at `46d18aad58c4ed48f4b2069c3cccb7a2b93b9e1e`  
Audit date: 2026-08-05  
Scope: DOCX / OPC / WordprocessingML import, editing, rendering, and export

## 1. Executive summary

Oasis Editor already has a strong WordprocessingML foundation. The current codebase handles a large portion of the features used by ordinary business, legal, and technical documents:

- paragraphs, runs, named styles, direct formatting, tabs, borders, shading, and advanced text effects;
- tables, merged cells, conditional table styles, floating tables, row and cell properties, and table revisions;
- sections, page sizes, margins, columns, headers, footers, and several pagination controls;
- inline and floating images, crop, rotation, flip, borders, wrapping, and wrap polygons;
- DrawingML text boxes, including nested WordprocessingML block content;
- lists and multilevel numbering for the common numbering formats;
- bookmarks, hyperlinks, complex fields, `PAGE`, and `NUMPAGES`;
- footnotes and endnotes;
- comments and resolved-comment state;
- block content controls with typed `sdtPr` metadata and unknown-property preservation;
- insertion/deletion revisions and several table/property revision structures;
- DOCX export, PDF export, and an automated Word-to-PDF layout parity harness.

The largest remaining blocker is not an isolated unsupported tag. The exporter currently builds a new package from the editor model and emits only parts it explicitly understands. As a result, an import-edit-export cycle can silently remove valid package content such as custom properties, custom XML data stores, charts, SmartArt, OLE objects, glossary parts, theme details, embedded fonts, mail-merge data, signatures, and future Microsoft extensions.

The architecture must therefore move from:

> Parse known OOXML into a model, then generate a new DOCX from that model.

To:

> Preserve the original OPC package, project editable OOXML into the editor model, and patch only the parts affected by edits.

Near-full compatibility must be delivered in three separate levels:

1. **Preserve**: unsupported content survives round-trip without silent loss.
2. **Display**: unsupported or partially supported content has a faithful rendering, preview, or explicit placeholder.
3. **Edit**: the feature can be modified through the editor and exported back semantically.

Preservation is the first priority. A feature does not need a complete editor UI before Oasis can guarantee that it will survive a round-trip.

## 2. Definition of near-full compatibility

Oasis may claim near-full Word OOXML compatibility when all of the following are true:

- a valid DOCX opens after export without a Word repair dialog;
- imported package parts that were not modified remain present after export;
- unknown relationships, content types, XML elements, attributes, and extension namespaces are preserved;
- editing ordinary body text does not remove charts, SmartArt, custom XML, document properties, OLE objects, or template metadata;
- all exported documents pass the Open XML SDK validator, except for explicitly catalogued producer-specific extensions;
- unsupported visual objects render as a preview or a clearly identified placeholder rather than disappearing;
- the editor reports unsupported and approximated features instead of failing silently;
- Word layout parity tests cover representative legal, business, academic, RTL, CJK, table-heavy, and drawing-heavy documents;
- repeated `Word -> Oasis -> Word -> Oasis` cycles do not continuously degrade the package;
- every supported feature has import, export, round-trip, malformed-input, and interaction tests.

Near-full compatibility does **not** require Oasis to reproduce every Microsoft Word editing dialog or every obsolete animation. It requires safe interoperability, high visual fidelity for common documents, and lossless preservation for the remaining valid OOXML surface.

## 3. Architectural principles

### 3.1 Preserve before interpreting

Unknown content must be stored before a semantic parser decides whether it understands the content. Semantic parsing must never be the only copy of source OOXML.

### 3.2 Patch instead of regenerate

An imported package should normally be exported by cloning the source package and replacing dirty parts. A document created from scratch may still use the current package builders.

### 3.3 Typed overlay over an opaque package

The editor model is the typed, editable projection. The package snapshot is the authoritative preservation layer for unsupported and producer-specific data.

### 3.4 Explicit compatibility tiers

Every feature in the coverage matrix must declare one of:

- `preserved`;
- `displayed`;
- `editable`;
- `approximated`;
- `unsupported-with-warning`.

The current `Supported / Partial / Not supported` labels are too coarse because they mix rendering, editing, import, export, and round-trip behavior.

### 3.5 No silent data loss

When preservation is impossible, export must produce a structured compatibility warning containing the part, relationship, feature, and reason.

### 3.6 Namespace-aware processing

Dispatch must use namespace URI plus local name. Prefixes are presentation details and cannot be assumed to be `w`, `a`, `wp`, or `r`.

### 3.7 Schema order is part of correctness

Unknown fragments must retain enough placement information to be reinserted in a schema-valid position. A generic unordered `unknownXml` string is insufficient for many complex types.

## 4. Target package model

Add a source-package snapshot to `EditorDocument` without exposing JSZip internals through the public document schema.

```ts
export interface EditorDocxSourcePackage {
  format: "docx";
  mainDocumentPart: string;
  contentTypes: EditorOpcContentTypes;
  rootRelationships: EditorOpcRelationship[];
  parts: Record<string, EditorOpcPart>;
  diagnostics?: EditorDocxDiagnostic[];
}

export interface EditorOpcPart {
  path: string;
  contentType?: string;
  kind: "xml" | "binary";
  data: string;
  encoding: "utf8" | "base64";
  relationships?: EditorOpcRelationship[];
  originalHash: string;
}

export interface EditorOpcRelationship {
  id: string;
  type: string;
  target: string;
  targetMode?: "Internal" | "External";
}

export interface EditorOpcContentTypes {
  defaults: Record<string, string>;
  overrides: Record<string, string>;
}
```

The package data should be stored outside hot per-keystroke equality paths, just as the asset registry is treated separately today.

### 4.1 Dirty-part tracking

Add a deterministic part invalidation model:

```ts
export interface EditorDocxDirtyState {
  document?: boolean;
  styles?: boolean;
  numbering?: boolean;
  settings?: boolean;
  fontTable?: boolean;
  comments?: boolean;
  footnotes?: boolean;
  endnotes?: boolean;
  headers?: string[];
  footers?: string[];
  relationships?: string[];
}
```

Commands should invalidate semantic domains, not raw filenames. The DOCX exporter maps those domains to package parts.

A safe first version may mark all modeled WordprocessingML parts dirty after any document edit while still preserving every unrelated part. Later passes can make invalidation more granular.

### 4.2 Export modes

Expose three explicit modes:

```ts
export type DocxExportMode =
  | "preserve-source-package"
  | "rebuild-package"
  | "strict-normalize";
```

- `preserve-source-package`: default for imported DOCX files; clone source and patch dirty modeled parts.
- `rebuild-package`: current behavior; useful for new documents and debugging.
- `strict-normalize`: rebuild a clean package and fail on features that cannot be represented safely.

## 5. Phase 0 — Correct the coverage baseline

### Goals

- make the coverage documentation match the current `main` branch;
- stop manually maintaining contradictory status claims;
- establish measurable compatibility levels.

### Work

1. Replace the single status column in `docs/ooxml.md` with separate dimensions:
   - import;
   - render;
   - edit;
   - export;
   - round-trip preservation.
2. Re-audit features already implemented after the last matrix audit, including:
   - comments;
   - comment ranges and resolved state;
   - block content controls and typed `sdtPr`;
   - `w:sym`;
   - RTL and complex-script run properties;
   - advanced run effects;
   - richer table revisions;
   - text boxes;
   - bookmarks and complex field preservation.
3. Generate part of the matrix from a typed capability registry used by tests.
4. Link every `editable` or `displayed` claim to at least one fixture/test identifier.
5. Add a `known-losses` section generated from package round-trip tests.

### Deliverable

A coverage matrix that cannot label a feature fully supported unless import, export, and round-trip tests prove it.

## 6. Phase 1 — Lossless OPC package round-trip

This is the highest-priority engineering phase.

### 6.1 Discover the package through relationships

The importer must:

1. read `[Content_Types].xml`;
2. read `_rels/.rels`;
3. locate the `officeDocument` relationship;
4. resolve the actual main-document part path;
5. resolve all related parts relative to their owning part;
6. reject unsafe path traversal and invalid external dereferencing;
7. retain unknown relationship types.

Do not assume the main story is always `word/document.xml`.

### 6.2 Capture every part

At import time, store all ZIP entries except explicitly disposable transport metadata. Capture:

- XML parts as UTF-8 text;
- binary parts as base64;
- content type;
- relationship set;
- original hash;
- normalized package path.

Large binary parts should support lazy materialization later, but correctness comes before memory optimization.

### 6.3 Preserve unrelated parts during export

For source-backed export:

1. clone the original package;
2. replace dirty modeled parts;
3. update relationships only where generated IDs or targets changed;
4. merge content-type additions/removals;
5. retain unrelated parts and their relationship graph;
6. remove a source part only when the editor operation explicitly deleted the corresponding feature;
7. write diagnostics for orphaned or conflicting relationships.

### 6.4 Initial preservation fixtures

Add DOCX fixtures containing:

- `docProps/core.xml`, `app.xml`, and `custom.xml`;
- `customXml/item1.xml` plus item properties;
- a chart and embedded workbook;
- SmartArt/diagram parts;
- an OLE object and preview image;
- a glossary document;
- a theme with non-default fonts and colors;
- an embedded font relationship;
- unknown `w16*` extension parts;
- an external hyperlink and an external image relationship.

The first acceptance test edits one body word and verifies that every unrelated part and relationship remains semantically identical.

### Suggested code organization

```text
src/import/docx/opc/
  contentTypes.ts
  packageReader.ts
  partGraph.ts
  relationships.ts
  security.ts

src/export/docx/opc/
  packagePatcher.ts
  contentTypeMerger.ts
  relationshipMerger.ts
  diagnostics.ts

src/core/model/types/
  docxSourcePackage.ts
```

Keep OPC concerns out of paragraph, run, table, and layout parsers.

## 7. Phase 2 — Generic XML extension preservation

Package preservation protects untouched parts. This phase protects unknown markup inside parts that Oasis must rewrite.

### 7.1 Extension bags

Add ordered extension bags to modeled nodes and property groups:

```ts
export interface EditorOoxmlExtensionBag {
  attributes?: EditorOoxmlAttribute[];
  children?: EditorOoxmlChildFragment[];
}

export interface EditorOoxmlAttribute {
  namespaceUri: string;
  localName: string;
  prefixHint?: string;
  value: string;
}

export interface EditorOoxmlChildFragment {
  xml: string;
  namespaceDeclarations?: Record<string, string>;
  anchor:
    | { kind: "before"; knownChild: string }
    | { kind: "after"; knownChild: string }
    | { kind: "index"; value: number }
    | { kind: "append" };
}
```

Apply the bag to:

- document root and body;
- section properties;
- paragraphs and paragraph properties;
- runs and run properties;
- tables, rows, cells, and their property containers;
- styles and style properties;
- numbering levels and instances;
- headers, footers, notes, comments, and text-box stories.

### 7.2 Stable namespace serialization

Create a namespace registry that:

- preserves source namespace URIs;
- allocates deterministic prefixes on export;
- carries required namespace declarations to rewritten roots;
- updates `mc:Ignorable` consistently;
- prevents undeclared-prefix fragments.

### 7.3 Mutation-aware fallback

When a node is unchanged, preserving its original XML subtree is preferable to reconstructing it. When edited, use the typed serializer plus ordered extension fragments.

A future optimization may compare a semantic fingerprint and reuse original XML for unchanged paragraphs, tables, styles, and drawings.

## 8. Phase 3 — Markup Compatibility processor

Implement ECMA-376 markup compatibility as a preprocessing layer.

### Required behavior

- evaluate `mc:AlternateContent`;
- choose the first `mc:Choice` whose `Requires` namespaces are supported;
- use `mc:Fallback` only when no supported choice exists;
- process `mc:Ignorable`;
- honor `mc:ProcessContent`;
- preserve elements and attributes requested by `mc:PreserveElements` and `mc:PreserveAttributes`;
- retain the original `AlternateContent` wrapper for round-trip when possible;
- expose the selected branch to semantic parsers;
- report malformed compatibility markup without crashing the whole import.

### Capability registry

```ts
export interface OoxmlNamespaceCapability {
  namespaceUri: string;
  level: "preserve" | "parse" | "render" | "edit";
}
```

The registry should cover at least `w14`, `w15`, `w16*`, `wp14`, `wps`, `a14`, and the standard WordprocessingML/DrawingML namespaces already parsed.

## 9. Phase 4 — Structural model gaps

### 9.1 Nested tables

Change table cells from paragraph-only content to general block content:

```ts
export interface EditorTableCellNode {
  blocks: EditorBlockNode[];
}
```

Update:

- traversal and document indexing;
- selection addressing;
- table commands;
- clipboard serialization;
- history operations;
- pagination and height estimation;
- canvas rendering and hit testing;
- DOCX import/export;
- footnote/comment/bookmark traversal;
- revision traversal.

Acceptance requires at least three nesting levels, merged cells containing nested tables, and nested tables in headers, notes, comments, and text boxes.

### 9.2 General story abstraction

Introduce a shared story representation for:

- main body;
- headers and footers;
- footnotes and endnotes;
- comments;
- text boxes;
- glossary/building blocks;
- future subdocuments.

All stories should support paragraphs, tables, content controls, drawings, bookmarks, comments, fields, and revisions using the same parser and serializer components.

### 9.3 Inline, row, and cell content controls

Expand `w:sdt` support to:

- inline/run content controls;
- table-row controls;
- table-cell controls;
- nested combinations;
- controls spanning multiple runs while retaining stable IDs and properties.

The first goal is structural preservation; UI widgets can follow.

## 10. Phase 5 — Advanced Word semantics

### 10.1 Custom XML and data binding

Implement:

- `customXml/itemN.xml` and item property parts;
- `storeItemID` lookup;
- namespace prefix mapping;
- XPath evaluation in a controlled subset;
- content-control refresh from bound data;
- updates from edited controls back to the data store;
- repeating-section bindings;
- preservation of unsupported schema references.

This is especially important for legal and administrative templates.

### 10.2 Fields

Keep the existing lossless field marker representation and add a field AST/evaluator for:

- `REF`;
- `PAGEREF`;
- `SEQ`;
- `STYLEREF`;
- `TOC`;
- `DATE` and `TIME`;
- `IF`;
- `MERGEFIELD`;
- `DOCVARIABLE`;
- `DOCPROPERTY`;
- `INCLUDEPICTURE`;
- `INCLUDETEXT`;
- legacy form fields.

Separate:

- field instruction preservation;
- result rendering;
- result updating;
- locked/dirty semantics.

An unknown field must continue to preserve its instruction and stored result exactly.

### 10.3 Numbering

Expand numbering support to:

- the complete `ST_NumberFormat` vocabulary through a formatter registry;
- picture bullets;
- `lvlRestart`;
- `pStyle`-implied numbering;
- `numStyleLink` and `styleLink`;
- `multiLevelType`;
- legacy indentation and spacing;
- abstract-number identity metadata;
- legal and chapter numbering interactions.

Unsupported numbering formats should preserve their token and display the stored label or a deterministic approximation.

### 10.4 Revisions

Complete revision support for:

- move-from and move-to containers and ranges;
- paragraph, run, section, numbering, and style property changes;
- revisions in every story;
- accept/reject one, selection, author, or all;
- original, final, and show-markup projections;
- stable author/date/id metadata;
- nested and overlapping revision validation.

### 10.5 Rich comments

Represent comment bodies as stories instead of flattened text. Add:

- formatted paragraphs;
- tables and images;
- replies/threading;
- people and comment-ID parts;
- modern comments metadata;
- resolve/reopen behavior;
- comments in all supported stories.

## 11. Phase 6 — Office Math

Add a math run/block type that preserves original OMML from the first implementation:

```ts
export interface EditorMathData {
  display: boolean;
  ommlXml: string;
  mathMl?: string;
}
```

### Incremental delivery

1. Preserve `m:oMath` and `m:oMathPara` without loss.
2. Convert common OMML structures to MathML for display.
3. Render through native MathML with a fallback renderer.
4. Support cursor navigation and selection around math objects.
5. Add structured editing for fractions, scripts, radicals, delimiters, n-ary operators, matrices, accents, and equation arrays.
6. Export edited math back to schema-valid OMML.

Unsupported OMML children must remain embedded in the preserved source fragment.

## 12. Phase 7 — DrawingML, VML, charts, SmartArt, and OLE

### 12.1 Generic drawing node

Add an opaque drawing fallback:

```ts
export interface EditorOpaqueDrawingData {
  sourceXml: string;
  relatedPartPaths: string[];
  previewImageAssetId?: string;
  name?: string;
  description?: string;
  floating?: EditorImageFloatingLayout;
  kind:
    | "shape"
    | "chart"
    | "diagram"
    | "ole"
    | "vml"
    | "ink"
    | "unknown";
}
```

This allows immediate preservation and placeholder/preview rendering before native editing exists.

### 12.2 Shapes

Implement progressively:

- preset geometry;
- custom geometry preservation;
- solid, gradient, pattern, and image fills;
- line width, dash, joins, caps, and arrows;
- transforms, rotation, and flips;
- grouped shapes;
- connectors;
- WordArt/text effects;
- shape text and text-box insets;
- shadows, glow, reflection, bevel, and 3D preservation.

### 12.3 Charts and SmartArt

First deliver preservation plus preview. Then add:

- chart relationship parsing;
- embedded workbook preservation;
- cached chart-data rendering;
- common chart types;
- SmartArt preview from fallback or rendered shape tree;
- explicit warning when no preview is available.

### 12.4 VML

Support old documents and templates through:

- VML groups and coordinate transforms;
- common rect/roundrect/oval/line/polyline shapes;
- VML text boxes;
- form controls;
- legacy image crop and positioning;
- preservation of unsupported path geometry.

### 12.5 OLE and embedded packages

Preserve embedded objects and their previews. Display a non-executing placeholder containing object type, filename, size, and preview. Never execute macros or embedded content in the browser.

## 13. Phase 8 — Themes, fonts, and metadata

### Themes

Preserve and model:

- theme colors;
- major/minor fonts by script;
- tint/shade transformations;
- format schemes and effects;
- theme overrides;
- theme-aware style values.

Do not flatten every theme value to RGB/font names on import. Retain both the resolved display value and the source theme reference.

### Fonts

Add:

- embedded font relationships;
- obfuscation-key handling where legally and technically permitted;
- alt-name substitution;
- charset and script-aware fallback;
- separate ASCII, high ANSI, East Asian, and complex-script font slots;
- diagnostics when the exact font is unavailable.

### Metadata

Round-trip:

- core properties;
- extended properties;
- custom properties;
- document variables;
- custom XML metadata;
- template relationship;
- compatibility and producer metadata when safe.

Digital signatures must be detected. Any content edit invalidates a signature, so export must either remove it with an explicit warning or refuse strict preservation mode.

Encrypted DOCX packages should fail with a clear unsupported-encryption diagnostic rather than a generic missing-document error.

## 14. Phase 9 — Word layout parity

The existing Word automation and PDF comparison harness should become a required compatibility gate.

### Complete section behavior

Implement layout for:

- `evenPage` and `oddPage` section starts;
- `nextColumn`;
- section page-number restart and formats;
- chapter numbering;
- vertical page alignment;
- section bidi and gutter behavior;
- page borders;
- line numbering;
- per-section note placement and restart rules.

### Floating layout

Complete:

- relative positioning against page, margin, column, paragraph, line, and character;
- multiple overlapping floats;
- z-order;
- behind-text/in-front-of-text behavior;
- `allowOverlap` and `layoutInCell`;
- effect extents;
- floating tables and drawings sharing exclusion regions;
- tight/through wrapping against transformed polygons.

### Typography

Complete:

- bidi shaping and visual ordering;
- script-specific font selection;
- CJK line-breaking and punctuation rules;
- document grid behavior;
- kerning, ligatures, OpenType features, and variation fonts;
- exact tab and leader behavior;
- printer-metric compatibility flags where observable.

### Footnotes and endnotes

Implement:

- page- and column-aware footnote placement;
- split footnotes and continuation separators;
- keep-with-text behavior;
- per-section numbering and placement;
- separator story layout parity.

## 15. Validation and test strategy

### 15.1 Package preservation tests

For each fixture:

1. import;
2. make a minimal edit;
3. export in source-preserving mode;
4. unzip both packages;
5. compare part inventory, content types, and relationships;
6. require byte identity for untouched binary parts;
7. require canonical XML equivalence for untouched XML parts;
8. assert that only expected modeled parts changed.

### 15.2 Schema validation

Run the Open XML SDK validator in CI on Windows. Maintain an allowlist only for known Microsoft extension/version mismatches, with issue links and expiry dates.

Also run basic cross-platform checks:

- ZIP integrity;
- XML well-formedness;
- relationship target existence;
- duplicate relationship IDs;
- duplicate `docPr` IDs;
- invalid package paths;
- undeclared namespaces;
- content-type coverage.

### 15.3 Word open/save round-trip

On Windows CI:

1. open exported DOCX in Word automation;
2. save as a new DOCX;
3. fail on repair prompts or automation errors;
4. import the Word-saved file again;
5. compare semantic document content and package inventory.

### 15.4 Visual parity

Expand the existing Word-to-PDF harness to compare:

- page count;
- text order;
- line positions;
- paragraph and table bounding boxes;
- image and drawing boxes;
- header/footer selection;
- footnote placement;
- page-number values;
- pixel-level page snapshots for selected golden fixtures.

Use tolerance tiers rather than one global threshold.

### 15.5 Fixture corpus

Maintain curated fixture groups:

```text
tests/fixtures/docx/
  basic/
  styles/
  numbering/
  sections/
  tables/
  nested-tables/
  headers-footers/
  notes/
  comments/
  revisions/
  content-controls/
  custom-xml/
  fields/
  math/
  drawings/
  charts/
  smartart/
  vml/
  ole/
  rtl/
  cjk/
  malformed/
  producer-variants/
```

Include files produced by multiple Word versions, LibreOffice, Google Docs export, Apple Pages export, and document-generation libraries.

### 15.6 Mutation tests

Generate controlled mutations for:

- namespace prefixes;
- relationship IDs and relative paths;
- element ordering;
- explicit false on/off values;
- unknown extension attributes;
- missing optional parts;
- malformed but recoverable relationships;
- large IDs and duplicate producer metadata.

## 16. Diagnostics and user-visible compatibility report

Add a structured report returned by import and export:

```ts
export interface EditorDocxDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  partPath?: string;
  relationshipId?: string;
  feature?: string;
  action?: "preserved" | "approximated" | "dropped" | "blocked";
}
```

Examples:

- chart preserved with preview but not editable;
- unsupported field preserved using stored result;
- embedded font preserved but unavailable for browser rendering;
- digital signature removed because the document changed;
- external relationship retained but not dereferenced;
- encrypted package cannot be imported.

The UI should expose the report after import/export without interrupting ordinary documents that have no meaningful warnings.

## 17. Security requirements

- never fetch external relationships automatically during import;
- sanitize hyperlink schemes before interaction;
- block ZIP path traversal and decompression bombs;
- cap total uncompressed package size and per-part size;
- parse XML with external entities disabled;
- never execute macros, ActiveX, OLE, scripts, or embedded packages;
- detect macro-enabled content and preserve only under an explicit safe policy;
- treat `altChunk` HTML/MHT as untrusted input;
- preserve signatures only for unmodified byte-identical packages;
- record every dropped active-content part in diagnostics.

## 18. Performance requirements

Lossless preservation must not make editing depend on repeatedly cloning the entire package.

- keep source parts in an immutable shared store;
- keep binary data base64/lazy outside editor equality signatures;
- compute hashes once during import;
- rewrite only dirty parts during export;
- parse secondary parts lazily when they are not required for initial rendering;
- use the existing import worker for package scanning and hashing;
- expose progress stages for package discovery, semantic parsing, asset preparation, and validation;
- add large-document benchmarks for package load, first render, edit latency, and export.

## 19. Backward compatibility and serialization

Increment `EditorDocument.schemaVersion` when source-package or extension-bag data becomes serializable.

The migration policy must support:

- documents created before package snapshots;
- documents persisted without binary source data;
- headless JSON documents that were never imported from DOCX;
- opt-out from source-package persistence for storage-sensitive applications;
- detached package blobs referenced by content hash instead of embedded in every persisted editor JSON.

Recommended persistence split:

```ts
interface PersistedEditorDocument {
  document: EditorDocument;
  sourcePackageRef?: string;
}
```

The host application may store the package blob separately while Oasis stores only a stable reference and semantic metadata.

## 20. Proposed milestone sequence

### M1 — Source package survives a text edit

- parse content types and root relationships;
- capture all package parts;
- discover the main document dynamically;
- clone source package on export;
- replace main document and known related parts;
- preserve all unrelated parts;
- add package inventory diff tests.

### M2 — Rewritten parts preserve unknown markup

- extension bags on body, paragraph, run, section, table, row, and cell;
- namespace registry;
- markup compatibility processor;
- unknown-extension fixtures.

### M3 — Common complex legal documents

- nested tables;
- inline/row/cell SDTs;
- custom XML data stores;
- rich comments;
- complete revision projection;
- expanded fields and numbering.

### M4 — Scientific and visual documents

- OMML preservation and rendering;
- generic drawing fallback;
- shapes;
- charts/SmartArt previews;
- VML and OLE preservation.

### M5 — Layout and conformance hardening

- complete section layout;
- page numbering;
- advanced notes;
- RTL/CJK parity;
- schema validation gate;
- broad Word visual parity corpus.

## 21. First implementation slice

The first code change after this plan should be deliberately narrow and testable:

1. Add `EditorDocxSourcePackage` and OPC relationship/content-type types.
2. Add `readDocxPackageSnapshot(zip)` under `src/import/docx/opc/`.
3. Locate the main document through `_rels/.rels` rather than a fixed path.
4. Attach the snapshot to imported `EditorDocument` outside hot signatures.
5. Add source-preserving export that clones all entries before current serializers overwrite modeled parts.
6. Merge, rather than replace, `[Content_Types].xml` and relationship parts.
7. Add one fixture containing custom properties, custom XML, a chart, and an unknown relationship.
8. Edit one text run and assert that all unrelated parts survive.
9. Keep the current rebuild exporter as an explicit fallback.
10. Add a compatibility diagnostic when source-preserving export cannot safely merge a modeled part.

This slice does not need to render charts, custom XML, or OLE. Its success criterion is that Oasis stops deleting them.

## 22. Pull-request and commit discipline

Each implementation commit should address one compatibility invariant and include its fixtures/tests. Avoid commits that add many tag handlers without a preservation strategy.

Recommended commit progression:

1. `feat(docx): model preserved OPC source packages`
2. `feat(docx): discover main part from package relationships`
3. `feat(docx): preserve untouched package parts on export`
4. `test(docx): verify lossless unrelated-part round trips`
5. `feat(ooxml): preserve ordered unknown markup in rewritten parts`
6. `feat(ooxml): process markup compatibility branches`

## 23. Completion checklist

The roadmap is complete when:

- [ ] source-backed export patches instead of rebuilding by default;
- [ ] all package parts and relationships are inventoried and preserved;
- [ ] content types are discovered and merged dynamically;
- [ ] unknown XML survives in every rewritten major node/property container;
- [ ] markup compatibility is processed according to declared namespace capabilities;
- [ ] nested tables and all primary story types share the block model;
- [ ] inline/row/cell content controls and custom XML bindings round-trip;
- [ ] comments retain rich content and modern metadata;
- [ ] revisions support move and property changes with accept/reject workflows;
- [ ] Office Math is at least preserved and displayed;
- [ ] charts, SmartArt, VML, OLE, and unknown drawings have preservation plus preview/placeholder behavior;
- [ ] themes, metadata, and embedded fonts round-trip;
- [ ] numbering and common fields match Word behavior;
- [ ] section, float, note, RTL, and CJK layout passes parity fixtures;
- [ ] exported packages pass validation and Word open/save automation;
- [ ] compatibility diagnostics disclose every approximation, blocked feature, or unavoidable loss;
- [ ] `docs/ooxml.md` is generated or test-linked closely enough that it cannot drift from implementation again.
