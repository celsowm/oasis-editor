# OOXML interoperability and Word fidelity — execution roadmap

Status: proposed active engineering roadmap
Audit baseline: main @ ff6d7f681b275c3a1609fde8e3458f02c42f667a
Date: 2026-11-16
Scope: Oasis Editor, DOCX/WordprocessingML, OPC, related DrawingML, OMML, Transitional and Strict profiles. This supersedes the August implementation sequencing, not its preservation-first principles. It does not target authoring standalone XLSX or PPTX.

## 1. Objective and non-goals

Make Oasis a general-purpose interoperable word processor, not an application-specific rich text editor. Preserve valid imported documents without silent loss; render the broad practical feature set; enable semantic authoring, and demonstrate compatibility by reproducible evidence. Implement standard behavior before producer quirks, except where Word interoperability requires explicit compatibility profiles.

No blanket "100% OOXML" claim, no claim of Word-exact layout based only on parsing, no execution of imported macros, ActiveX, OLE applications or external field code. Preserve inactive embedded content where safe. Existing public APIs and JSON migration requirements must be evaluated deliberately; do not maintain redundant internal architectures merely for compatibility. No dependency on a proprietary service for normal local editing/export. A licensed Word test environment is optional for developers but required evidence for Word-exact claims.

References:
- [ECMA-376](https://ecma-international.org/publications-and-standards/standards/ecma-376/) — Parts 1–4; pin exact editions/schema hashes in the inventory.
- [Open XML SDK](https://github.com/dotnet/Open-XML-SDK) — independently validate generated packages.
- [August roadmap](./ooxml-near-full-compatibility-plan.md) and [August summary](./ooxml.md) — historical rationale, not current capability certification.
- [June element inventory](./ooxml-coverage-matrix-2026-06.md) — seed checklist, not authoritative support status.

## 2. Baseline: do not reimplement completed foundations

Static audit (tests were located, not executed). Each status must be confirmed by running the relevant tests and adding missing mutation cases.

| Domain | Evidence in main | Remaining |
|---|---|---|
| OPC and source-backed export | src/import/docx/opc/, src/export/docx/opc/, exportEditorDocumentToDocxPreservingSource.ts | package graph adversarial tests, strict profile, loss reporting |
| Intra-part preservation | src/ooxml/preservationBag.ts, schemaOrder.ts, namespaceRegistry.ts, universalContainerPatcher.ts and specialized patchers | prove coverage of every rewrite boundary, ordering and alternative prefixes |
| Nested tables | recursive model and DOCX round-trip tests | complex pagination and story/selection parity |
| SDTs | contentControls.ts, structuralContentControls.ts, inlineSdtXml.ts, tableStructuralSdtXml.ts | widget semantics, nesting/locking, repeating items |
| Custom XML | src/ooxml/word/customXmlBinding.ts, synchronizeBoundContentControls.ts | richer XPath/binding semantics, conflict policy, refresh and repetition |
| Comments | documentComments.ts, commentsXml.ts, extended/rich-source tests | semantic comment bodies still text: string; full modern parts and story behavior |
| Revisions | trackedRevisions.ts, revisionDescriptors.ts, cellRevisions.ts and property revision tests | comprehensive projections and nested/move/property combinations |
| Fields | runs.ts recognizes PAGE, NUMPAGES, DATE, REF, PAGEREF; fields and TOC commands exist | shared parser/evaluator, dirty/lock, dependency and pagination cycles |
| Lists | listNumbering.ts, docxNumbering.ts, numberingMetadata.ts | full practical ST_NumberFormat, picture bullets, restart/override parity |
| Math | src/import/docx/math.ts, src/core/math/linear.ts, src/ui/math/mathPainter.ts, export mathXml.ts | dedicated rendering beyond basic fractions, radicals, scripts; eqArr and structural editing |
| Shapes | shape commands, geometry gallery, textBox parser, PDF shape painter | generic object fallback; groups/custom paths/effects |
| Graphics | runs.ts dispatches drawing to image/text box and pict to VML image | charts, diagrams, OLE and other unknown objects need stable model anchors |
| Themes | themeXml.ts, themeColors.ts, themeFonts.ts | imported sourceXml versus edited values reconciliation; full effects and font mappings |
| Layout | tests/vitest/__tests__/word-parity/, existing canvas/PDF and typography paths | Word oracle corpus, shared layout invariants and performance |
| CI | .github/workflows/pr-ci.yml | schema validation and true Word round-trip gates absent from inspected PR workflow |

## 3. Architecture contracts

- Maintain one typed editable projection plus source package/fragment preservation, not two unrelated document models. Source provenance includes owning part URI, expanded QName, semantic/structure signatures, relationship references, stable IDs and source order.
- XML identity is namespace URI + local name; no canonical-prefix assumptions. Keep independent Strict/Transitional namespace/relationship mappings. Unknown content is not automatically equivalent to supported content.
- Use the original source subtree when unmodified, patch localized semantic changes when possible, and regenerate only where required. Explicit deletions must not resurrect preserved nodes. A changed object may invalidate a cached fallback: record that fact.
- Centralize schema ordering, relationship ID allocation/remapping, part allocation and compatibility handling. Preserve unknown MC choices/fallbacks when safe; never silently pretend an inactive branch was edited.
- Shared story traversal covers body, headers/footers, notes, text boxes, nested tables and eventually rich comments/glossary. Every command, undo/redo and collaboration operation must be tested against stable anchors. Inspect existing commands before adding API.
- Canvas and PDF consume shared layout/geometry, not independent approximations. Reuse existing preset geometry and text/font infrastructure. Feature modules should expose model, import, layout, interaction and export contracts.
- Import is untrusted: no network calls, no automatic external links or executable payloads; enforce package byte/entry/decompression/depth limits; reject traversal, external entities and unsafe relationship targets. Browser runtime must never execute embedded programs.

## 4. P0 — Capability registry, conformance and preservation

### OX-001: schema inventory and capability registry

Proposed implementation under src/ooxml/capabilities/ and scripts/ooxml/. Generate normalized inventory from pinned official schemas (including extensions as separate versioned profiles). Resolve includes/imports, complex-type derivation, wildcards, attribute groups, substitution groups, choices and cardinality. Preserve provenance. Use a context-aware key (profile, namespace URI, local name, parent/type path), not just element spelling. Attribute-level and enum-level support may differ. Report constraints not expressible by XSD separately.

Each capability has independent import, render, edit, export and preserve levels: unknown, missing, partial, supported, notApplicable. Preserve-only is represented as preserve supported with semantic dimensions missing. Evidence includes test path + case ID, fixture hash, source ref, mutation class, expected limitations and owner/module. Mark untested claims unknown, not supported. Distinguish schema coverage denominator from product feature and real-world corpus coverage; do not collapse them into one percentage.

Proposed scripts: ooxml:inventory, ooxml:audit, ooxml:report. Generate machine-readable JSON, human Markdown and a searchable static GitHub Pages compatibility explorer (separate from editor startup; lazy load data, filter by profile, domain, dimension and status). Publish exact commit and evidence date, including missing/unknown entries. CI verifies deterministic generation, unique keys, valid evidence references and no unexplained regression in previously proven capabilities.

Acceptance: regenerate identical inventory on two runs; show at least five distinct contexts of repeated QName where applicable; no supported claim without passing evidence; report explicitly lists unsupported attributes and unknown coverage. Baseline existing tests first.

### OX-002: package and schema validation harness

Add independent validator CLI under tools/ooxml-validator/ using pinned .NET SDK and Open XML SDK versions. Validate a corpus of source-backed and fresh exports against explicit Office version/profile. Check OPC inventory, content types, relationship ownership/targets, unique IDs, XML parseability, schema order and relevant co-constraints. Validate Strict with appropriate schema/profile support rather than assuming SDK version alone proves Strict. Use stable error codes, part path and location, narrowly scoped baseline allowlist (fixture, code, reason, issue, expiry). Fail on new errors; reduce baseline to zero for supported output.

Add a dedicated workflow/PR job (no Word installation for this gate); keep fast targeted tests per PR and larger corpus nightly/manual. Export fixtures using production API, not mocked serializer. Publish JSON/JUnit/artifacts and diagnostic diff. Licensed Windows Word runner: separately open without repair, save, reopen, export oracle PDF, report actual Word version, fonts and locale. Skip explicitly when runner unavailable; do not convert skip to pass. Retain no personal or confidential fixtures in public CI.

Acceptance: known malformed relationship/schema fixture is rejected, valid baseline accepted, new structural errors fail the PR; Word open/save evidence is separate and reproducible. Test no-op and changed outputs.

### OX-003: universal preservation and mutation safety

Audit existing patchers before new code. Matrix every rewritten boundary: document/body, p/r/properties, table/grid/row/cell properties, styles/defaults/latent styles, numbering, settings, sections, header/footer, notes/comments modern parts, theme and font table, SDT wrappers, drawings, alternate content. Classify whole reuse, granular merge, package-only, regeneration/loss risk. Reuse universalContainerPatcher and schemaOrder; close differences including noncanonical prefixes and the header/footer namespace regression sentinel (actual import/edit/export, not merely DOM querying).

Add a relationship-aware opaque object run/block representation for unsupported chart, diagram, OLE, ink and future DrawingML payloads. Store source fragment/part/relationship closure, geometry, object kind, preview if available, z-order, wrap and safe diagnostic. Render a selectable placeholder with real dimensions if no preview. Provide move/resize only when safe; preserve original geometry otherwise. Explicit delete removes the object; collect orphan parts only after reference graph proof (shared targets must survive). Handle copying across stories/packages with relationship relocation; refuse unsafe operation with structured diagnostic. Retain untouched binaries byte-identically, untouched XML canonically equivalent (or byte-identical if copied); compare relationship graphs, not ZIP byte identity. MC tests include PreserveElements, PreserveAttributes, ProcessContent, MustUnderstand, AlternateContent and unknown namespaces under mutation. Do not conflate extracting mc attributes with correct semantics.

Acceptance: edit neighboring text and mutate known properties around each unknown object; all unknown parts, references, valid ordering and visual placeholder survive; delete/undo/move/copy/reimport and three repeated cycles pass; no silent loss. Add strict export mode that blocks known unsafe destructive export, default safe source-backed mode and explicit normalize mode. Structured diagnostic contains severity, code, part, QName/anchor, action and user-facing message.

## 5. P1 — Advanced document semantics

### OX-010: field engine

Extend existing runs/fields, fieldRunXml, fieldDate, plugin field commands and TOC rather than replacing field preservation. Tokenizer + instruction AST with quoted strings, escapes, switches, nested field operands, original instruction fragments, result runs, dirty/locked attributes. Parse fldSimple and begin/separate/end spans across runs; preserve unsupported raw instructions/cached styled result, including nested and malformed cases. Avoid regex substring classification (NUMPAGES inside an IF must not become a standalone NUMPAGES field). Registry of evaluators, context (document variables, properties, locale/timezone, numbering/sections, bookmarks and page map), dependency graph and bounded invalidation/fixed-point pagination.

Order: PAGE/NUMPAGES/SECTION/SECTIONPAGES; REF/PAGEREF; DATE/TIME/CREATEDATE/SAVEDATE/PRINTDATE; SEQ/STYLEREF and captions; TOC/TOF/INDEX/TOA with switches and entry fields; IF/COMPARE/SET/MERGEFIELD/NEXT and formatting switches; DOCVARIABLE/DOCPROPERTY, legacy form fields; other standard fields inventory. INCLUDETEXT/INCLUDEPICTURE/LINK/DDE must be preserved without auto execution or fetch. External sources only via explicit safe user-authorized resolver, otherwise cached result. Add update selected/all fields, lock/unlock, show codes, field insertion and cross-reference dialogs via existing ribbon commands.

Acceptance: nested IF with PAGE, quoted bookmark, custom date/number formatting, locked field unchanged, SEQ reset and caption/TOC updates after edits, pagination convergence, undo/redo, known and unknown fields surviving DOCX round trip. Tests for malformed spans and circular dependencies, no network.

### OX-011: lists, numbering, styles

Extend src/core/model/listNumbering.ts with formatter registry covering every standard ST_NumberFormat token for the chosen profile; classify locale-dependent formats and deterministic fallbacks explicitly. Add picture bullets (numPicBullet) with owning relationships, dimensions and shared assets. Preserve level text placeholders, suffix, startOverride, lvlOverride, lvlRestart, isLgl, abstractNum/num identity, style links, numStyleLink, custom format and compatibility behavior. Align numbering with fields and headings; include list restart/continue commands, style cascade and direct formatting reset; preserve linked/latent styles, basedOn/next cycles, defaults, conditional table styles and unknown attributes.

Acceptance: each formatter has oracle/test vectors or explicit unknown/partial; multilevel legal numbering across tables, sections and restarts; image bullets rendered and exported; style edit applies inherited changes without materializing unrelated source formatting; Word comparison.

### OX-012: content controls, custom XML and forms

Reuse existing SDT wrapper identities for block, inline, row, cell and nested contexts. Complete typed widget registry: rich/plain text, checkbox, dropdown/combo, date, picture, group, repeating section/item, building block and legacy form controls. Implement placeholder, showingPlcHdr, temporary, lock/contentLock, multiline and document protection interactions; enforce consistently in commands rather than UI only. Keep copy/undo/collaboration semantics. Implement controlled XPath evaluation of package-contained stores, prefix mapping, element/attribute targets, positional/predicate subset, explicit unsupported diagnostics; no external XML resolution. Two-way refresh on import/store edit, on editor edit and export; shared-binding transaction conflict/validation policy; repeating section add/remove/reorder with stable identities and data rows. Keep imported unknown subtype metadata.

Acceptance: build/edit form in each story; same store-bound field updated in two controls, repeating row mutation round-trips, unsupported XPath retains original data, lock blocks keyboard/paste/API changes, malformed bindings are reported rather than removed.

### OX-013: rich comments and revisions

Migrate EditorComment from flattened text to common blocks/story model via explicit migration and compatibility accessor as needed. Preserve paragraph/run formatting, links, images, tables and relationships in comments.xml, thread parent/reply, resolved state, modern people/comment IDs and extensible metadata. Ensure anchors remain stable across split/merge/move, replies and copy; maintain privacy of app-specific identity vs DOCX author string. Reuse existing comment permission model and revision ribbon.

Finish tracked moves and range pairs, nested/overlapping changes, run/paragraph/section/table/row/cell/style/numbering property changes, metadata and table merge revisions. Separate Original, Final and Markup projections from destructive accept/reject. Commands for one revision, selection, author, all and next/previous; shared transaction semantics; preserve unresolved unknown revisions. Define canonical ordering, conflict handling and stable IDs.

Acceptance: editable rich thread survives Word save/reimport; nested move plus property revision tested for all projections; accept/reject inverses and mixed revisions yield correct text, geometry, comments/bookmarks and XML. Round-trip no-op preserves modern metadata; unauthorized commands rejected.

### OX-014: mathematical layout and editing

Keep current OMML AST and raw fallback. Expand parser/exporter for eqArr, pre-scripts, delimiter/box/border/phantom properties, equation arrays, n-ary options, accents and group characters, control/run/math properties. Inventory OMML attributes and defaults. Implement shared MathLayout tree producing glyph runs, fraction rules, stretched delimiters, radical bounds, limits, matrix rows/columns, accents, baselines and alignment. Use OpenType MATH constants/variants/assemblies where available and deterministic fallback otherwise; ensure common Canvas/PDF measurement and drawing. Replace mathPainter textual fallback for supported constructs; unknown nodes retain original OMML. Extend linear input grammar and structured cursor/selection, insertion templates, clipboard rich/math/plain, undo and accessible representation.

Acceptance: Word-authored equations covering every construct, nested matrices/fractions/integrals, inline line height and display layout, no text fallback for supported nodes, visual/pagination comparisons, keyboard insertion/editing and source mutation preserving unknown properties.

## 6. P2 — Drawing and package features

### OX-020: unified DrawingML scene graph

Build on OX-003 opaque fallback and existing presetGeometry, shape, shapeFillCommands, drawingAnchorLayout, textBox and PDF drawing code. Introduce discriminated typed drawing projection (image, shape, textBox, group, connector, chart, diagram, WordArt, embedded, opaque). Avoid duplicate independent image/text box paths; migrate incrementally behind adapters. Keep owning story and relationships.

Implement preset adjustments and custom path grammar (move/line/arc/cubic/quadratic/close, guide equations), fills (solid/gradient/pattern/image), outlines/dashes/joins/arrows, transparency and effects, theme references, crop, transforms, flips and nested groups. Implement group local/world coordinate conversion, connector endpoints and editing, z-order, anchor/wrap/exclusion polygons, shape text flow, vertical text, text warp/preset WordArt and effects. Map supported legacy VML shapes/groups/text boxes to scene graph while preserving source and MC alternatives; do not normalize without request. Geometry is shared between editor, hit testing and PDF.

Acceptance: import/edit/export of grouped rotated shapes with connectors, custom freeform, gradient, WordArt and VML fallback; transforms invertible, clipping and z-order correct; unknown effects survive; selection/resize/undo and visual tests.

### OX-021: charts

Resolve c:chart reference and chart relationship graph, chart data/cache, embedded workbook (data access only), chart style/color, external data reference and preview. Typed model for title, legend, axes, series/category/value, format and style. Start with column/bar/line/pie/area/scatter, stacked and combination charts, then bubble/radar and modern extension types with explicit coverage. Render through shared chart scene primitives; no external data fetch. Edit values and chart style, synchronize caches and embedded workbook while preserving unrelated workbook parts; do not fake editable data from pixels. Create chart parts/relationships/valid XML for new charts; retain unsupported or unhandled chart types as opaque.

Acceptance: Word charts display, change series and labels, Word opens without repair with updated cache/workbook, shared workbook/assets preserved, preview-only charts retain all data; new chart from Oasis editable in Word.

### OX-022: SmartArt and diagrams

Resolve dgm data/layout/colors/style/drawing relationships. Preserve entire graph and preview. Use authored drawing cache when present; implement data tree and constraints/layout registry for hierarchy, process, cycle, list, relationship and matrix families; fallback to preview/placeholder for unknown algorithms. Model graph nodes/edges, text, theme and transforms. Start with text edits where source layout can be safely updated, then structure and layout editing; synchronize data and rendered drawing part, never discard unknown constraints.

Acceptance: chart and diagram coexist across stories, data graph remains valid after unrelated edits; supported hierarchy/process data edits update visualization and Word; unsupported layout retained without false editability claim.

### OX-023: themes, fonts, properties and building blocks

Make theme colors/fonts/effects and overrides editable typed data with source patching; sourceXml must not mask changed semantic values. Resolve clrSchemeMapping, tint/shade and locale/script font mappings, theme/numbering/table links. Implement fontTable embedded font relationship discovery, obfuscation/deobfuscation where specified, font licensing/embedding rights, font substitution and fallback, shared Canvas/PDF font selection and content-hash cache. No unauthorized redistribution.

Model core/app/custom property types, timestamps, language, document variables and field dependencies; preserve unknown properties and protect sensitive metadata. Implement glossary document/building-block parts and their relationships as reusable stories, with insertion/copy/relationship remapping and Quick Parts UI. Preserve OLE/package objects and safe previews; only explicit download/extraction, never in-process execution. Add safe metadata panel.

Acceptance: changing imported theme updates dependent content, preserves unedited effects; embedded font legal fixture renders consistently; custom property updates field; insert building block with nested media; embedded package byte identity after edit.

### OX-024: profile, protection, signing and encrypted-document handling

Inventory settings and Transitional compatibility features. Distinguish protection/editing permissions from cryptographic confidentiality. Honor read-only/comments/forms/trackedChanges protection and permission ranges in command layer, including paste, undo, API/collab; explain unsupported enforcement. Preserve/validate protection metadata and supported password verification, no claim of DRM. Detect Strict vs Transitional, use proper namespaces and relationship types, validate native exports for target profile. Explicit conversion must identify unrepresentable content; do not silently downconvert.

Import digital signature parts as integrity metadata, verify via reviewed crypto approach and explicit trust policy if supported; edited document invalidates existing signature, report/remove or preserve as invalid per safe policy, never claim signature persists valid. Signing requires explicit user-controlled key and action. Encrypted Office containers may be compound files rather than ZIP; detect and report before ZIP parsing; evaluate audited dependencies for supported password encryption, no custom cryptography, no password logging. Unsupported encrypted input yields clear error. Treat macro-enabled package preservation separately; never execute. Security review required before enabling any crypto/embedded feature.

Acceptance: Strict corpus validates; protection enforced in model commands; signed original verifies only under configured trust, edit clearly invalidates signature; encrypted fixtures supported or explicitly rejected; malicious package tests pass.

## 7. P2 parallel track — Layout and typography fidelity

### OX-030: deterministic layout and Word oracle

Use existing word-parity harness; establish a versioned corpus with legal/business/academic, tables, sections, notes, drawings, fields, RTL/CJK and generated docs. Record Word build, OS, locale, fonts/hashes, paper settings, compatibility mode and fixture license. Baseline page count, paragraph/line positions, text span bounding boxes, tables, object geometry, notes and PDF image comparison; normalize DPI and anti-aliasing and report geometry separately from raster residuals. Pin tolerances per class before implementing fixes; exact page count and no missing text/object for supported fixture; propose 0.5 pt median line baseline and 1 pt p95 on controlled-font simple fixtures, then ratify against oracle reproducibility. No arbitrary screenshot tolerances hiding layout defects.

### OX-031: sections, pagination, tabs, notes and tables

Complete nextPage/continuous/even/odd/nextColumn interplay, column balancing, section page numbering/restart, header/footer inheritance and first/even handling, page borders/grids, widow/orphan/keep-next/keep-lines, pageBreakBefore, tab alignment (left/right/center/decimal/bar, leaders, default intervals, clear), paragraph indentation and keyboard parity. Distinguish actual tab run from list indentation; reuse docs/word-tab-behavior-parity.md as acceptance source. Complete floating object exclusion and anchor relocation, table autofit/fixed sizing, row splitting, repeat headers, nested pagination, merged cells and notes interaction. Footnote/endnote numbering, separators, continuation, splits, placement and cross-references must participate in bounded pagination convergence. Do not recompute all pages for every local mutation if existing invalidation can be extended.

Acceptance: explicit oracle fixture per interaction, stable pagination across render/export/reimport, editing tabs/backspace and nested story selection, no deadlocks on oversized objects or impossible keep constraints.

### OX-032: typography

Audit OpenType GSUB/GPOS and font metrics paths. Implement or strengthen Unicode bidi, line breaking and grapheme segmentation, script shaping, complex script sizing/font selection, CJK kinsoku and document grids, Arabic/Hebrew justification and contextual forms, script-aware font fallback, locale hyphenation and soft/nonbreaking hyphens, vertical text and ruby/emphasis as scoped by schema. Reuse shared font and layout services; benchmark a maintained shaping engine against existing implementation before choosing dependency. Do not use browser canvas text measurements as sole source of PDF metrics.

Acceptance: corpus for Arabic/Hebrew mixed Latin, Japanese/Chinese/Korean punctuation, Indic shaping and diacritics, grapheme-safe selection and cursor, accurate PDF extraction/geometry; supported behavior is locale-deterministic.

## 8. Test strategy and measurable gates

| Gate | PR | Extended/nightly or release |
|---|---|---|
| Unit, model/command/undo, integration, typecheck and existing ribbon tests | Required | Required |
| Source-backed no-op + localized mutation, fresh creation + reimport | Required for changed domain | Entire corpus, 3–5 cycles |
| OPC graph, schema validator and MC prefix variants | Required | All profiles; differential report |
| Security adversarial corpus (ZIP bombs, path traversal, XML depth, unsafe relationships, macros) | Targeted | Fuzz/mutation campaigns |
| Word-authored goldens, Word open/save no repair | Fixture assertions | Licensed runner; record skipped explicitly |
| Canvas/PDF geometry & visual parity | Targeted | Full corpus, controlled fonts |
| Performance and memory | Targeted | p50/p95 import/export, first page, local edit, scroll, large docs |

Use generated minimal XML fixtures for precise assertions and redistributable real documents for integration. Preserve fixture inputs, license, expected mutation and measured artifacts. Test import, render, edit, export and preserve separately; require explicit diagnostic tests for missing features. Include unknown extension siblings before/between/after known schema children, multiple prefix spellings, strict/transitional variants, copied relationships, explicitly removed nodes and repeated identical XML nodes. Do not test only existence of strings; parse XML and compare semantic graph, schema ordering and visual behavior. Add differential tests with LibreOffice as another producer, not a substitute for Word behavior. Use deterministic property-based generation and bounded fuzzing; redact sensitive metadata from logs.

Performance guard: record baseline first on pinned CI environment; agree domain budget and regression envelope (initial proposal <=10% p95 regression beyond measurement noise on existing representative corpus). Measure memory and avoid loading huge binaries or regenerating unaffected pages. Fail reproducible regressions, not single noisy sample.

## 9. Delivery slices and dependencies

No estimates are promises; size after baseline tests and dependency spikes. S = isolated, M = multi-module, L = subsystem, XL = research-heavy. Split L/XL into vertical slices that always import/preserve/render/export a small feature before expanding.

| Sequence | Ticket | Priority | Size | Dependency / deliverable |
|---|---|---|---|---|
| 1 | OX-001 | P0 | M | baseline evidence + registry schema + initial report |
| 2 | OX-002 | P0 | M | validator and package/CI gate |
| 3 | OX-003 | P0 | L | mutation matrix, opaque fallback, diagnostic mode |
| 4 | OX-030 | P0/P2 | M | oracle baseline; parallel once fixture gate ready |
| 5 | OX-010 | P1 | L | field engine, incrementally |
| 6 | OX-011 | P1 | M/L | numbering registry, styles; coordinate OX-010 |
| 7 | OX-012 | P1 | L | forms and data binding |
| 8 | OX-013 | P1 | L | story traversal, comments, revision projections |
| 9 | OX-014 | P1 | L | OMML layout/editor |
| 10 | OX-020 | P2 | XL | scene graph, OX-003 |
| 11 | OX-021 | P2 | L | OX-020 primitives and OPC preservation |
| 12 | OX-022 | P2 | XL | OX-020 scene graph and preservation |
| 13 | OX-023 | P2 | L | theme/font/property/glossary; coordinate prior tracks |
| 14 | OX-031 | P2 | XL | OX-030 oracle, field and drawing layout contracts |
| 15 | OX-032 | P2 | XL | OX-030 oracle, OX-023 font handling |
| 16 | OX-024 | P3 | L/XL | validator/preservation, dedicated security review |

First implementation PR: OX-001 only — add registry types, deterministic schema inventory prototype, evidence entries for current paragraphs/tables/fields/OMML/charts, generated JSON/Markdown and validation tests. Pin schemas with license/provenance; if unavailable, mark inventory incomplete rather than inventing a denominator. Do not change editor semantics in this PR. Next PR OX-002. Run OX-003 in slices: matrix, namespace/MC sentinel, opaque drawing anchor, relationship relocation, strict diagnostics. Keep existing tests and public/demo behavior green. Avoid feature-flag forks that permanently duplicate serializers.

## 10. Definition of done for each ticket

- Audit actual implementation and update existing abstractions rather than assuming missing coverage.
- Specify supported XML context/attributes, observable editing rules, unsupported and security behavior.
- Provide a minimal fixture and real/oracle fixture as appropriate; verify production path before/after mutation, newly authored exports, reimport and explicit deletion.
- Validate generated package, all relationship targets, schema and unknown-node preservation; test undo/redo and interactions when applicable.
- Update capability registry with actual passing evidence; generate docs and visible diagnostics; do not label a skipped gate passed.
- Run existing typecheck, tests, build, relevant browser/PDF/Word gates and record results; identify unavailable external gates.
- One focused commit (or logically related commits) per slice; PR summary includes affected modules, results, benchmark, known gaps, risk and rollback path. No unrelated ribbon/UI rewrites.

Near-full interoperability release gate: zero new validator or repair errors on supported corpus, no unexplained loss on source-backed mutation corpus, no missing content without explicit safe placeholder/diagnostic, all supported registry claims evidenced, Word parity metrics within preapproved fixture-specific budgets, security checks passed. Publish residual gaps and separate semantic, preservation and visual metrics. Do not assert universal conformance from finite tests.

## 11. Progress log

- 2026-11-16: static repository audit at ff6d7f681b275c3a1609fde8e3458f02c42f667a; roadmap rewritten around verified source paths and existing tests. No implementation or test execution performed in this documentation change. All ticket acceptance gates are pending until independently demonstrated. Start with OX-001.

- OX-001 slice A: initial context-aware registry, exact runner evidence, deterministic JSON/Markdown, lexical XSD manifest prototype, static Pages explorer and CI checks. Official schema graph/denominator and historical regression gate remain open. See [tooling documentation](./ooxml-capability-tooling.md). CI results pending.

- OX-001 slice B: pinned official archive acquisition, direct schema QName links and declaration counts, explicit prior-report regression comparison, independent OOXML CI. Actual archive download/evidence checks pending CI; full type expansion and historical CI baseline remain open.

- OX-001 slice C: CI verified 51 XSDs and all seed evidence; BOM parser fix with regression test, effective type/attribute/particle projection and CI baseline pinned to witnessed dimensions. New CI pending; reachability, full constraints and comprehensive attribute evidence remain open.

- OX-001 slice D: prior CI green on 51 official XSDs and all evidence; DOCX root-based contextual scope with attribute and enum rows, separate related observations, paginated scope explorer and combined CI report. New CI pending. Exact schema-context evidence and remaining scope semantics are not certified.

- OX-001 scope correction: previous green CI had only root contexts and zero attributes; corrected default namespace QName and added real schema smoke gate. OX-002 slice A: independent .NET/Open XML SDK validator, fixture generation and negative controls in CI. Positive diagnostics are characterized, not yet baseline-gated. New CI pending.

- OX-002 slice B: inspected real validator artifact (269 positive diagnostics, both negative controls detected); corrected generated property order, style booleans and font face export, added regression tests and required zero diagnostics for positive corpus. New CI pending.

- OX-002 slice C: CI reduced 269 to 88 diagnostics, all gallery metadata. Canonical presence/off emission, explicit false fixture, updated semantic regressions; seven separate feature packages added to independent characterization job. Strict base gate remains mandatory. New CI pending.

- OX-002 slice D: seven advanced feature exports passed zero SDK/OPC diagnostics in CI 44041958876; promoted to mandatory clean gate. Fixed stale style-gallery false-token assertion; base SDK run still pending. OX-003 slice A: boundary audit, expanded-name header/footer relationship handling and three-cycle production namespace sentinel, independent source-preservation CI. New CI pending.

- OX-002 base and extended mandatory corpus + OX-003 namespace preservation green in CI 44043529351. OX-003 slice B: preservation-only opaque object inventory, transitive relationship closure, opt-in structural loss detector and production fail-closed test. No placeholder or safe editing/relocation yet; actual preservation after mutation not certified. New CI pending.

- OX-003 slice C: prior opaque audit CI green. Dedicated opaque run projection for standalone source run children, shared placeholder measurements, Canvas/PDF paint, source-backed raw fragment serialization and mandatory loss audit for inventoried sources. Successful chart neighbor mutation required by test; deletion/cross-story copying remain guarded. New CI pending.

- OX-003 slice D: v0.0.358 released with all CI green. Main-story single-object explicit deletion intents integrated into Delete/Backspace and audited on export; original package untouched, dependencies retained, history tested. Ambiguous, bulk, tracked and cross-story operations remain restricted. CI pending.

- OX-003 slice E: v0.0.359 published, deletion/history CI green. Added default conservative deletion-local OPC graph pruning with pre/post audits and explicit opt-out; actual removal/undo and shared/cyclic closure tests. Ambiguous graphs retain data. CI pending.

- OX-003 slice F: v0.0.360 release green. Same-story single-object movement target correction; production round-trip tests; cross-story relationship relocation planner with collision/closure tests. Cross-story edit/export integration remains pending. CI pending.

- OX-003 slice G: v0.0.361 green. Explicit single-section default-story inline relocation command and export integration with recomputed relationship mapping, post-overlay append and expected-object audit; real DOCX header round-trip/history test. UI wiring and broader topology remain pending. CI pending.

- OX-003 slice H: repair incorrect source-zone setup in the failed cross-story integration fixture, wire guarded controller dispatch by hit zone, block unsafe opaque clipboard writes/cuts. npm/Pages release gates retained. CI pending.

- OX-003 slice I: fresh source inspection replaces cached-inventory trust, exact authorized raw fragment serialization, internal source-bound rebuild and explicit baseline source. Added regressions for stale snapshots and injected markup. Clipboard closure transfer remains pending. CI pending.

- OX-003 slice J: mixed run projection for understood text and opaque objects, shared relationship fixture and repeated source-backed mutation; prevent unsafe positional run XML attachment. Complex mixed fields/unknown children remain open. CI pending.
