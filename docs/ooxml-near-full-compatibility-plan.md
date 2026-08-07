# Near-Full Microsoft Word OOXML Compatibility Execution Plan

Status: active roadmap  
Audit baseline: `main` at `268d300aa6271679016f755687a083d4db85ceda`  
Audit date: 2026-08-07  
Scope: DOCX / OPC / WordprocessingML import, editing, rendering, preservation, and export

## 1. Executive summary

Oasis Editor already has a strong WordprocessingML foundation and, after the August 5–6 compatibility pass, two former architectural blockers are no longer greenfield work:

1. **Source-backed OPC preservation is implemented.** Imported DOCX packages are inventoried and preserved; production export rebuilds modeled content and patches it back into the source package while retaining unrelated parts, content types, relationships, and source-discovered paths.
2. **Nested tables are implemented structurally.** Table cells now contain `EditorBlockNode[]`, and recursive rendering, selection, navigation, resize, merge/split, styling, and mutations work across supported document stories.

The remaining path to near-full Word compatibility is therefore no longer “make DOCX import/export work.” It is:

> Make every localized edit preserve unknown OOXML inside rewritten parts, then close the advanced semantic and visual subsystems, then prove Word-exact behavior through conformance and layout gates.

The implementation strategy remains preservation-first:

1. **Preserve** unsupported source content without silent loss.
2. **Display** unsupported or partially supported content through faithful rendering, previews, or explicit placeholders.
3. **Edit** features semantically where Oasis intentionally supports authoring them.

A feature does not need a complete Word-style editor UI before Oasis can safely interoperate with it. Preservation is the minimum guarantee.

## 2. Definition of near-full compatibility

Oasis may claim near-full Microsoft Word OOXML compatibility only when all of the following are continuously true:

- a valid DOCX opens after Oasis export without a Word repair dialog;
- imported package parts that were not modified remain present after export;
- unknown relationships, content types, XML elements, attributes, namespace declarations, and extension markup survive relevant edits;
- editing ordinary body text does not remove charts, SmartArt, custom XML, document properties, OLE objects, embedded packages, glossary content, theme data, or future Microsoft extensions;
- exported documents pass Open XML SDK validation except for explicitly catalogued producer-specific extensions;
- unsupported visual objects render as a preview or an explicit non-destructive placeholder rather than disappearing;
- unsupported/approximated behavior is reported through diagnostics instead of failing silently;
- Word layout parity tests cover legal, business, academic, RTL, CJK, table-heavy, note-heavy, field-heavy, and drawing-heavy documents;
- repeated `Word -> Oasis -> Word -> Oasis` cycles do not progressively degrade the package;
- supported capabilities have import, export, round-trip, malformed-input, mutation, and interaction tests appropriate to the feature.

Near-full compatibility does **not** mean reproducing every Microsoft Word dialog or obsolete UI behavior. It means safe interoperability, high visual fidelity for common documents, and lossless preservation of valid OOXML that Oasis does not semantically edit.

## 3. Current implementation baseline

### 3.1 Completed foundation: source-backed OPC package preservation

The following architecture is already present and should be treated as a completed milestone entering hardening:

- `[Content_Types].xml` parsing;
- root relationship parsing;
- relationship-based discovery of the `officeDocument` part;
- package inventory of XML and binary entries;
- content type capture;
- relationship resolution relative to owning parts;
- unsafe-target diagnostics;
- source package attachment to `EditorDocument`;
- rebuilt-part baseline hashes;
- source-backed DOCX export;
- merge/preservation of unrelated source parts;
- content-type merge;
- relationship merge;
- preservation of source relationship IDs when required by unknown markup;
- relocation of conventional rebuilt paths to relationship-discovered source paths;
- preservation of custom XML, custom properties, and opaque binary parts across an unrelated body-text edit;
- source-path preservation for modeled singleton parts and headers/footers where topology permits.

Primary implementation areas:

```text
src/import/docx/opc/
src/export/docx/opc/
src/ooxml/opc/
src/export/docx/exportEditorDocumentToDocxPreservingSource.ts
```

This closes the old M1 blocker. Remaining OPC work is test breadth, conflict handling, performance, diagnostics, and strict-mode behavior.

### 3.2 Completed foundation: source-fragment preservation for core text/table markup

The current source-fragment system records original OOXML and semantic signatures for key nodes. Export can either:

- reuse the original XML subtree when semantics are unchanged; or
- generate canonical OOXML and merge source-only attributes/properties/children when the node changed.

Current coverage includes runs, paragraphs, tables, rows, and cells, with granular table property/grid preservation.

This architecture is the basis for the next milestone. Do **not** replace it with a second parallel unknown-XML system unless a concrete schema-order or relationship requirement cannot be represented by it.

### 3.3 Completed foundation: Markup Compatibility processing

The importer has a real ECMA-376 Markup Compatibility processing layer for semantic import:

- first supported `mc:Choice` selection;
- `mc:Fallback` when no choice is supported;
- `mc:Ignorable` filtering;
- `mc:ProcessContent` unwrapping.

The remaining work is full preservation behavior for `mc:PreserveElements` / `mc:PreserveAttributes` and mutation-safe retention of wrappers/extensions through rewritten containers.

### 3.4 Completed foundation: nested tables

`EditorTableCellNode.blocks` is now `EditorBlockNode[]`. The editor supports nested-table paths and recursive behavior across model, layout, canvas, commands, selection, and document stories.

Implemented August 6 work includes, among other things:

- recursive nested-table layout;
- nested cell geometry;
- hit testing and multi-cell selection;
- horizontal/vertical navigation;
- core table commands through nested paths;
- row/column resize;
- merge/split behavior that preserves nested structures;
- nested style/property reads and updates;
- mutations across supported stories;
- nested table DOCX round-trip tests.

Nested tables are now a **hardening and Word-layout parity** concern, not a structural model blocker.

## 4. Architectural principles

### 4.1 Preserve before interpreting

Unknown content must be retained before semantic parsing decides what Oasis understands. The typed editor model must never be the only copy of source OOXML for imported documents.

### 4.2 Patch instead of regenerate when a source package exists

Imported DOCX export should remain source-backed by default. Rebuilding from scratch is appropriate for new documents, diagnostics, or explicit normalization modes.

### 4.3 Typed overlay over opaque source

The editor model is the editable typed projection. The captured package plus node-level source fragments are the preservation layer for unsupported, producer-specific, and future-version content.

### 4.4 Local edits should cause local loss risk

Editing one paragraph property should not require regenerating unrelated content inside the paragraph, its section, another story, or another package part.

### 4.5 Namespace-aware processing

Dispatch must use namespace URI + local name. Prefixes are serialization details and must never be assumed to be `w`, `a`, `wp`, `r`, `w14`, or any other conventional spelling.

### 4.6 Schema order is correctness

Unknown children need enough placement information to remain schema-valid after a known sibling is edited. Blind append-only `unknownXml` is insufficient for many OOXML complex types.

### 4.7 Relationship-bearing fragments require relationship-aware preservation

Raw XML that contains `r:id`, `r:embed`, `r:link`, or equivalent relationship references cannot be blindly moved between parts or regenerated packages. Source preservation must retain or remap the relationship graph safely.

### 4.8 No silent destructive fallback

When Oasis cannot preserve a feature safely, export must either:

- preserve the original fragment/object;
- use an explicit safe placeholder representation; or
- emit a structured warning/failure in strict mode.

Silent deletion is not an acceptable compatibility strategy.

## 5. Milestone M2 — Universal rewritten-part source preservation

**Status: next highest-priority milestone.**

Package-level preservation is working. M2 closes the remaining data-loss surface inside parts that Oasis rewrites.

### 5.1 Inventory every rewrite boundary

Create an explicit registry/list of OOXML structures whose serializer can replace source markup:

- `w:document` root and `w:body`;
- `w:sectPr` and `w:sectPrChange`;
- paragraph/run property containers;
- table/table-row/table-cell property containers;
- styles and style property containers;
- numbering definitions, levels, overrides, and instances;
- settings;
- font table;
- headers and footers;
- footnotes and endnotes;
- comments and modern comment metadata parts;
- content controls;
- drawing containers;
- text-box stories;
- future glossary/building-block stories.

For every boundary, classify current behavior as:

- whole-source reusable;
- granular source merge;
- package-preserved only;
- canonical regeneration with known loss risk.

### 5.2 Extend the existing source-fragment model

Generalize the semantic-signature + original XML approach used by runs/paragraphs/tables.

A practical shared representation may expose:

```ts
export interface EditorOoxmlSourceFragment {
  xml: string;
  semanticSignature?: string;
  structureSignature?: string;
  relationshipOwnerPart?: string;
  relationshipIds?: string[];
}

export interface EditorOoxmlSourceProperties {
  xml: string;
  semanticSignature: string;
}
```

Do not force every node to use the exact same signature shape. The shared requirement is that serializers can determine whether they may:

1. reuse source XML;
2. patch only changed known values;
3. merge unknown source markup into generated XML; or
4. fall back to canonical generation with an explicit diagnostic.

### 5.3 Ordered unknown child preservation

For containers that cannot safely reuse the whole subtree, retain:

- source attributes by namespace URI/local name;
- unknown child fragments;
- source child order or anchors relative to known siblings;
- namespace declarations needed by preserved fragments;
- `mc:*` attributes and extension namespace declarations.

A possible anchor model:

```ts
export interface EditorOoxmlChildFragment {
  xml: string;
  anchor:
    | { kind: "before"; expandedName: string }
    | { kind: "after"; expandedName: string }
    | { kind: "index"; value: number }
    | { kind: "append" };
}
```

Use it only where whole-source or DOM-based merge is insufficient. Prefer the simplest preservation mechanism that proves schema-valid round-trip behavior.

### 5.4 Namespace registry

Provide deterministic namespace serialization that:

- carries namespace URIs from source fragments;
- allocates stable prefixes when a source prefix cannot be retained;
- never emits undeclared-prefix fragments;
- updates `mc:Ignorable` consistently;
- keeps standard and extension namespaces distinguishable by URI rather than prefix spelling.

### 5.5 Markup Compatibility completion

Extend the current processor/preservation layer to cover:

- `mc:PreserveElements`;
- `mc:PreserveAttributes`;
- original `mc:AlternateContent` wrapper retention where safe;
- malformed compatibility diagnostics;
- explicit capability registration for namespaces Oasis semantically parses/renders/edits.

### 5.6 M2 acceptance tests

Build mutation fixtures containing unknown markup in:

- document/body;
- `pPr` and `rPr`;
- `sectPr`;
- `tblPr`, `trPr`, `tcPr`;
- `styles.xml`;
- `numbering.xml`;
- `settings.xml`;
- headers/footers;
- notes/comments.

For each fixture:

1. import;
2. mutate one known property;
3. export using the production source-backed path;
4. assert unknown attributes remain;
5. assert unknown children remain in schema-valid order;
6. assert required namespace declarations remain;
7. assert referenced relationships still resolve;
8. open/validate the result.

M2 is complete when localized edits no longer depend on “we happened not to rewrite that container” for preservation safety.

## 6. Milestone M3 — Complex Word semantics used by legal/business documents

M3 closes the advanced structures most likely to appear in legal templates, administrative forms, generated documents, and long business documents.

### 6.1 Inline, row, and cell content controls

Current block SDT support and typed `sdtPr` metadata are a strong base. Extend structural support to:

- inline/run `w:sdt`;
- table-row controls;
- table-cell controls;
- nested combinations;
- controls spanning multiple runs;
- stable wrapper IDs through edits;
- lock/temporary behavior where relevant;
- repeating section and repeating item structure.

The first acceptance criterion is lossless structure and normal editing of contained content. Word-equivalent widgets can follow.

### 6.2 Custom XML data stores and data binding

Package preservation already protects unrelated `customXml` parts. Add semantic behavior:

- parse `customXml/itemN.xml` and item-property parts;
- resolve `storeItemID`;
- parse namespace prefix mappings;
- implement a controlled XPath subset appropriate to Word content controls;
- refresh bound controls from the data store;
- write edited bound control values back to the data store;
- support repeating-section bindings;
- preserve unsupported schema references and transforms;
- detect broken bindings without deleting source metadata.

Security rule: data binding must operate on package-contained XML only unless an explicit future feature safely permits external resources.

### 6.3 Rich comments

Replace flattened comment body text with the common story/block model.

Support:

- formatted paragraphs;
- tables;
- images;
- hyperlinks;
- fields/bookmarks where Word permits them;
- nested table traversal;
- modern comment ID/people metadata;
- replies/threading where represented by modern Word parts;
- resolve/reopen state;
- comments anchored across supported stories.

### 6.4 Complete revision model

Extend tracked changes to:

- move-from / move-to containers and ranges;
- paragraph/run property changes;
- section property changes;
- style property changes;
- numbering property changes;
- complete table/row/cell property changes;
- stable author/date/id metadata;
- nested/overlapping revision validation.

Add projection operations:

- Original;
- Final;
- Show Markup.

Add commands:

- accept/reject one revision;
- accept/reject selection;
- accept/reject by author;
- accept/reject all.

### 6.5 Field AST and evaluation

Keep the current lossless marker/instruction representation. Build evaluation on top of it instead of replacing it.

Add parsing/evaluation/update behavior for at least:

- `REF`;
- `PAGEREF`;
- `SEQ`;
- `STYLEREF`;
- `TOC`;
- `DATE`;
- `TIME`;
- `IF`;
- `MERGEFIELD`;
- `DOCVARIABLE`;
- `DOCPROPERTY`;
- `INCLUDEPICTURE`;
- `INCLUDETEXT`;
- legacy form fields.

Separate four concerns:

1. instruction preservation;
2. result rendering;
3. result updating;
4. locked/dirty semantics.

Unknown fields must continue to round-trip their instruction and stored result even when Oasis cannot evaluate them.

### 6.6 Numbering completion

Extend numbering through a formatter/strategy registry rather than growing switch statements indefinitely.

Cover:

- complete practical `ST_NumberFormat` vocabulary;
- picture bullets;
- start/restart edge cases;
- level overrides;
- legal numbering behavior;
- chapter numbering interactions;
- abstract numbering identity metadata;
- style-linked numbering edge cases.

Unsupported producer-specific numbering should preserve its OOXML token and render a deterministic fallback rather than disappear.

## 7. Milestone M4 — Office Math / OMML

Math is a separate document subsystem and should be implemented preservation-first.

### 7.1 Opaque math node

Introduce a run/block representation that can retain the original OMML subtree before Oasis understands every construct.

Example direction:

```ts
export interface EditorMathData {
  sourceOmml?: string;
  ast?: EditorMathNode;
  display: "inline" | "block";
}
```

### 7.2 Semantic projection

Implement OMML parsing for common constructs:

- fractions;
- superscript/subscript;
- radicals;
- delimiters;
- n-ary operators;
- matrices;
- accents;
- equation arrays;
- function names;
- limits;
- text runs inside math.

### 7.3 Rendering and editing

Add:

- OMML AST -> canvas/PDF or MathML projection;
- baseline/line-height integration;
- selection/caret navigation;
- structured insertion/edit commands;
- clipboard behavior;
- serializer back to valid OMML.

Unknown OMML children must remain preserved inside the source-backed representation.

## 8. Milestone M5 — Generic visual object preservation and rendering

Images and DrawingML text boxes are specialized successes. M5 establishes a general fallback for the rest of Word's drawing surface.

### 8.1 Opaque drawing node

Introduce a generic visual-object representation containing:

- source OOXML;
- owning part;
- relationship IDs/targets;
- dimensions/anchor geometry when extractable;
- object kind hint;
- optional preview asset;
- compatibility diagnostics.

This node must survive unrelated edits without requiring Oasis to understand the complete drawing grammar.

### 8.2 DrawingML shapes

Add semantic support incrementally for:

- preset geometry;
- custom/freeform geometry;
- fills;
- outlines;
- gradients;
- effects;
- connectors;
- groups;
- transforms;
- text inside shapes;
- WordArt/text effects where practical.

### 8.3 VML

Support preservation and rendering for legacy:

- shapes;
- groups;
- text boxes;
- image data;
- positioned objects;
- form-like visual controls where safe.

Prefer converting to the generic visual model for display while retaining original VML for round-trip.

### 8.4 Charts

Preserve and associate:

- chart part;
- chart relationships;
- style/color parts;
- embedded workbook/data package;
- cached series values;
- preview/fallback image if present.

Initial support may be preview-only. Native chart editing is not required before safe round-trip compatibility can be claimed.

### 8.5 SmartArt / diagrams

Preserve and associate the complete diagram graph:

- data;
- layout;
- style;
- colors;
- drawing/preview parts;
- relationships.

Render a preview/placeholder before attempting native SmartArt editing.

### 8.6 OLE and embedded packages

Preserve embedded objects and their preview images. Display a non-executing placeholder containing safe metadata such as object type, filename, and preview.

Never execute macros, ActiveX, scripts, or arbitrary embedded content in the browser/editor runtime.

## 9. Milestone M6 — Themes, fonts, metadata, and package semantics

Source-backed export already prevents incidental deletion of these parts. M6 adds semantic completeness where useful.

### 9.1 Theme model

Preserve and model:

- color scheme;
- major/minor font scheme;
- format scheme;
- fills/lines/effects used by theme references;
- tint/shade transformations;
- script-specific theme fonts.

Ensure edited theme-dependent properties serialize semantically rather than only as resolved RGB/font values.

### 9.2 Fonts

Complete:

- embedded font relationships;
- embedded font preservation under rewritten font tables;
- `altName` substitution;
- charset/family/pitch/PANOSE/signature behavior;
- script-aware font selection;
- deterministic fallback when the exact Word font is unavailable;
- metric parity tests for substituted fonts.

### 9.3 Document properties

Add typed optional editing for:

- core properties;
- extended application properties;
- custom properties;
- document variables where applicable.

Preservation remains mandatory even when semantic editing is not exposed.

### 9.4 Signatures and encryption

- Detect digital signatures.
- An edit invalidates a signature; strict mode should refuse or explicitly require signature removal.
- Detect encrypted DOCX packages and fail with a clear unsupported-encryption diagnostic instead of a generic missing-part failure.

## 10. Milestone M7 — Word-exact layout parity

This is the final large compatibility wall. OOXML feature coverage is insufficient if the same document paginates differently from Word.

### 10.1 Section behavior

Complete Word-exact handling of:

- `continuous`;
- `nextPage`;
- `evenPage`;
- `oddPage`;
- `nextColumn`;
- different first/even/default header/footer interactions;
- per-section columns and balancing;
- section-level page numbering and restarts.

### 10.2 Paragraph pagination

Harden interactions among:

- widow/orphan control;
- keep-with-next;
- keep-lines-together;
- page-break-before;
- explicit breaks;
- contextual spacing;
- line-number suppression;
- hyphenation controls;
- document grid rules.

### 10.3 Table pagination

Cover:

- repeated headers;
- row split rules;
- exact row height vs minimum height;
- nested-table row pagination;
- floating tables;
- vertical merge continuation across pages;
- border behavior at page boundaries;
- keep-together interactions inside cells.

### 10.4 Footnotes/endnotes

Complete:

- split footnotes;
- continuation separators;
- separator stories;
- note placement per section;
- note numbering/restarts;
- interaction with columns;
- keep rules inside note stories.

### 10.5 Floating objects

Harden Word-equivalent exclusion/wrap behavior for multiple competing objects, text boxes, images, tables, shapes, and future opaque visual objects.

### 10.6 RTL/CJK and typography

Complete:

- bidi paragraph/run ordering;
- mixed-script shaping;
- complex-script metrics;
- CJK line-breaking rules;
- punctuation compression where applicable;
- document-grid interactions;
- font fallback/substitution;
- OpenType shaping/kerning parity where Word behavior is measurable.

## 11. Validation and compatibility gates

### 11.1 Package preservation tests

For each source-backed fixture:

1. import;
2. make a controlled minimal edit;
3. export;
4. compare part inventory;
5. compare content types;
6. compare relationships;
7. require byte identity for untouched binary parts;
8. require canonical XML equivalence or intentionally stronger byte identity for untouched XML parts;
9. assert that only expected modeled parts changed.

### 11.2 Open XML SDK validation

Run the Open XML SDK validator on Windows CI.

Maintain an allowlist only for known producer/version extension mismatches. Every allowlist item must include:

- reason;
- fixture;
- issue/reference;
- expected removal date or explicit permanent rationale.

Also run cross-platform structural checks for:

- duplicate IDs where uniqueness is required;
- dangling relationships;
- unsafe paths;
- undeclared namespaces;
- content-type coverage;
- malformed XML;
- invalid relationship targets.

### 11.3 Word open/save round-trip

On Windows CI:

1. open Oasis-exported DOCX in Word automation;
2. detect repair/error dialogs;
3. save as a new DOCX;
4. re-import the Word-saved file;
5. compare semantic content;
6. compare package inventory and critical relationships.

### 11.4 Visual parity

Promote the existing Word-to-PDF harness to a required compatibility suite.

Compare:

- page count;
- text order;
- line rectangles/baselines;
- table geometry;
- image/drawing bounding boxes;
- header/footer positions;
- note positions;
- page-number values;
- selected pixel-level golden snapshots.

Use per-domain tolerance tiers rather than one global threshold.

### 11.5 Fixture corpus

Maintain fixtures grouped by capability and producer:

```text
tests/fixtures/docx/
  package-preservation/
  extensions/
  styles/
  numbering/
  tables/
  nested-tables/
  sections/
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
  ole/
  rtl/
  cjk/
  producer-variants/
```

Include documents produced by multiple Word versions plus LibreOffice, Google Docs export, Apple Pages export, and common document-generation libraries.

### 11.6 Mutation/fuzz testing

Generate controlled mutations for:

- namespace prefixes;
- namespace declaration placement;
- relationship IDs;
- relative relationship paths;
- unknown extension attributes/children;
- `mc:AlternateContent` branch variants;
- optional-part removal;
- large numeric IDs;
- duplicate producer metadata;
- malformed but recoverable relationships;
- alternate valid package paths.

## 12. Diagnostics and export modes

Expose structured diagnostics from import/export:

```ts
export interface EditorDocxDiagnostic {
  level: "info" | "warning" | "error";
  code: string;
  message: string;
  partPath?: string;
  relationshipId?: string;
  feature?: string;
}
```

Target explicit export modes:

```ts
export type DocxExportMode =
  | "preserve-source-package"
  | "rebuild-package"
  | "strict-normalize";
```

Semantics:

- `preserve-source-package`: default for imported DOCX; preservation is authoritative.
- `rebuild-package`: useful for new documents and debugging.
- `strict-normalize`: produce a canonical modeled package and fail when unsupported content cannot be represented safely.

The current production behavior already approximates the first mode; formalize the API only when doing so does not create duplicate export paths.

## 13. Documentation and capability registry

Replace prose-only capability claims with a typed registry shared by tests/documentation.

Each capability should report independent levels for:

- import;
- render;
- edit;
- export;
- preserve.

Suggested levels:

```ts
type CapabilityLevel =
  | "missing"
  | "preserve-only"
  | "partial"
  | "strong";
```

Each positive capability should link to one or more fixture/test IDs. Package preservation tests should emit a machine-readable known-loss report.

A capability must not be marked `strong` solely because a parser contains a branch for the relevant element.

## 14. Updated milestone sequence

### M0 — Capability baseline

**Status: partially complete.**

- split compatibility into import/render/edit/export/preserve;
- keep archived June matrix as inventory only;
- create typed capability registry;
- tie claims to tests;
- generate known-loss reporting.

### M1 — Source package survives edits

**Status: implemented; hardening remains.**

Completed core work:

- relationship-based package discovery;
- source package capture;
- source-backed export;
- preservation of unrelated parts/content types/relationships;
- preservation of source-discovered modeled-part paths;
- initial package preservation tests.

Remaining hardening:

- richer real-world fixture corpus;
- strict conflict diagnostics;
- large-package performance;
- permanent CI inventory diff gate.

### M2 — Rewritten parts preserve unknown markup

**Status: active next milestone.**

- universal source-fragment coverage;
- ordered extension preservation;
- relationship-aware fragment handling;
- stable namespace serialization;
- complete Markup Compatibility preservation;
- mutation fixtures for every major rewritten OOXML container.

### M3 — Complex legal/business semantics

**Status: pending after M2.**

- inline/row/cell SDTs;
- custom XML data stores and two-way binding;
- rich comments;
- complete revisions and accept/reject projections;
- expanded fields;
- numbering completion.

Nested tables were previously part of this milestone but are now implemented and move to hardening/layout tests.

### M4 — Scientific documents

**Status: pending.**

- OMML preservation node;
- math AST;
- rendering;
- selection/editing;
- valid OMML export.

### M5 — Visual/embedded objects

**Status: pending.**

- generic opaque drawing fallback;
- DrawingML shapes/groups/connectors;
- VML fallback;
- chart preservation/preview;
- SmartArt preservation/preview;
- OLE/embedded package preservation and safe placeholders.

### M6 — Package semantics

**Status: pending/partial.**

- semantic theme model/export;
- embedded fonts and substitution;
- editable document properties;
- signature/encryption diagnostics.

### M7 — Layout and conformance hardening

**Status: ongoing, final gate.**

- complete section/page behavior;
- advanced note placement;
- nested/table pagination parity;
- floating object parity;
- RTL/CJK typography parity;
- Open XML SDK validation;
- Word open/save automation;
- visual Word-to-PDF regression gates;
- multi-producer fixture corpus.

## 15. Immediate execution order

The next engineering sequence should be:

1. **M2.1** — inventory rewrite boundaries and classify source-preservation safety;
2. **M2.2** — `sectPr`, document/body, styles, numbering and settings source preservation;
3. **M2.3** — headers/footers/notes/comments/source stories;
4. **M2.4** — namespace registry + relationship-aware preserved fragments;
5. **M2.5** — `mc:PreserveElements` / `mc:PreserveAttributes` and mutation fixtures;
6. **M2 gate** — Open XML validation + Word open/save on extension-heavy fixtures;
7. **M3.1** — inline/row/cell SDTs;
8. **M3.2** — custom XML store and binding engine;
9. **M3.3** — rich comments;
10. **M3.4** — complete revisions/accept-reject;
11. **M3.5** — fields and numbering long tail;
12. **M4** — OMML;
13. **M5** — generic drawing fallback, then charts/SmartArt/OLE;
14. **M6/M7** — semantic package extras and Word-exact layout/conformance.

This order deliberately prioritizes preventing silent data loss before adding native editing for rare Word features.

## 16. Definition of done for the 1:1 goal

The project is not “1:1 with Word DOCX” merely when every common document appears visually close.

The goal is reached when:

- ordinary documents are semantically editable with high layout fidelity;
- unsupported valid OOXML survives localized edits without silent loss;
- advanced objects that Oasis cannot edit remain preserved and visible as previews/placeholders;
- supported advanced objects round-trip semantically;
- Word opens every regression export without repair;
- schema validation is continuously green or explicitly allowlisted;
- layout parity is measured rather than judged manually;
- multi-cycle round trips are stable;
- compatibility claims are generated from tests rather than historical documentation.

Until those gates are continuously green, the correct claim is **near-full compatibility in progress**, with explicit capability levels rather than a blanket 1:1 promise.
