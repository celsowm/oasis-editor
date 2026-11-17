# OX-003: source-backed mutation boundary audit (slice A)

Baseline: 6707a839b0aaa154df1e2357616482c74822bd23. This is a static
inventory of existing routes, not a completed mutation audit. Classification
describes implementation strategy, not certified behavior. Each boundary must
be tested with no-op, adjacent edit, own-property edit, repeated mutation,
delete and undo where relevant; compare expanded names and relationship
graphs, never mere ZIP equality.

| Boundary | Existing route | Strategy | Outstanding evidence |
|---|---|---|---|
| Package/parts | sourcePackagePatcher, rebuiltPartHashes | overlay and whole-part reuse | complete graph, shared target deletion, binary closure |
| Document/body | documentRootSourcePatcher | root/anchored child merge | anchor topology change, MC processing |
| Paragraph/run | text/sourceParagraphXml, sourceRunXml, sourceParagraphPropertiesXml, sourceRunPropertiesXml | source fragments plus mutation overlay | alternate prefix/MC, repeated edits, run splitting |
| Table/grid/row/cell | tableSourceXml, tableSourcePropertiesXml | granular source merge | topology changes, unknown children, relationship relocation |
| Section | sectionPropertiesSourcePatcher | modeled properties plus source-only siblings | revisions, extension namespace collision, reordered sections |
| Header/footer | headerFooterSourcePatcher, headerFooterRootSourcePatcher, headerFooterStoryReferences | root/flow merge and relationship relocation | three-cycle namespace fixture added; delete/undo/move/copy still open |
| Settings/font table/styles | wordSingletonSourcePatcher, sourceOnlySingletonFilter, styleParagraphPropertiesSourcePatcher, styleRunPropertiesSourcePatcher, styleTablePropertiesSourcePatcher | singleton overlay plus granular style merge | unknown attributes and semantic removal across style edits |
| Numbering | numberingSourcePatcher | source-aware numbering definition overlay | picture bullets, shared IDs and deletion |
| Comments/notes | commentEntrySourcePatcher, commentsExtendedSourcePatcher, noteEntrySourcePatcher, relatedStoryRootSourcePatcher | entry and story merges | rich/comment/notes object and relationship closure |
| Theme | themeXml and package overlay | source XML reuse | theme mutation versus preserving source |
| SDT | tableStructuralSdtXml, source-backed export binding synchronization | typed wrappers and custom XML synchronization | repeating sections and relationship closure |
| Embedded drawings and opaque objects | drawing/image/textbox export paths and package overlay | typed subset; unsupported visual/anchor semantics at risk | explicit opaque representation, geometry, preview, relocation and safe deletion |
| Markup compatibility | markupCompatibilityEngine, namespaceRegistry, universalContainerPatcher, extensionMarkupMerge | metadata and source preservation helpers | actual ProcessContent/MustUnderstand/AlternateContent semantics and prefix conflicts |

## Changes in this slice

Header/footer story pairing now reads Transitional WML type and relationship
id by expanded name, and filters foreign elements sharing the same local name.
The section import path uses the same namespace identity. The active section
count no longer includes arbitrary foreign sectPr names. Strict WordprocessingML
is not certified by this change. The old DOM-only namespace sentinel is now a
production import/edit/export/reimport test covering noncanonical namespace
prefixes, a misleading ignored extension id/type on a reference, original
header/footer relationship IDs and paths, an ignored header-root extension,
and an unrelated custom XML part through three mutation cycles. The separate
preservation job executes that and existing source-backed regression tests.
New CI pending. The test does not yet exercise undo, deletion, object moves,
full MC semantics or SDK validation of this particular synthetic package.

Next: inspect results; add relationship-closure and opaque-object tests
before changing the model. Do not implement preservation by resurrecting an
explicitly deleted modeled object.

## Slice B — preservation-only opaque inventory and optional export guard

CI 44043529351 passed all five jobs, including the five basic and seven advanced positive DOCX specimens (zero SDK/OPC diagnostics), negative controls, and actual repeated source-backed namespace mutations. A finite clean corpus is not full interoperability.

The source snapshot now inventories opaque objects in Transitional main/header/footer/note/comment/glossary stories. This is an initial preservation representation, not a new editable run discriminant. It classifies unsupported DrawingML payloads (chart, diagram, ink, unknown drawing/group), w:object and non-image VML pict; if an AlternateContent contains an opaque object, the whole wrapper is retained in the inventory. Record standalone fragment XML, expanded-name structural signature, original owning part, ordinal, inline/anchor geometry, raw wrap information, relationship IDs and transitive internal target closure. Legacy office relid and arbitrary relationship prefix spellings are recognized. Cycles/shared targets are bounded by visited edges/parts; external links are recorded but never fetched. Source capture records warnings and unresolved-target diagnostics. No code in embedded payloads is executed.

Opt-in `exportEditorDocumentToDocxPreservingSource(doc, { requireOpaquePreservation: true })` (also Blob API) re-inspects the output and conservatively blocks changed/missing opaque fragments, changed/missing internal dependency data and closure differences, using OpaqueObjectPreservationError.diagnostics. It intentionally does not authorize deletion, copy, reparenting or relocation yet, and may reject equivalent lexical XML or namespace changes. This is a loss detector over the original and exported package, not a repair mechanism. Default behavior is unchanged. Unchanged source data is compared exactly as captured (XML text or base64); no claim of original encoding byte equivalence. Scanner errors block opt-in checks. Detection is limited to these story types and known Transitional containers; Strict, block-level foreign markup and full MC processing remain open.

Tests exercise closure, external links, cycles, missing/changed payloads, duplicate occurrences, MC fallback wrapper and an actual production import/edit/export with the strict outcome checked against the loss audit. The production test does not yet require successful retention of a chart after editing; blocking is explicitly an acceptable temporary result. Next: model real opaque inline objects, make successful mutation retention mandatory, add layout placeholder and safe delete/copy/undo. New CI pending.

## Slice C — source-backed opaque run and placeholder

Prior CI 44045619840 passed all five jobs. This slice projects standalone run-level opaque objects into a dedicated discriminated run with one U+FFFC replacement character, original source XML, relationship IDs and conservative display dimensions. Shared text measurement reserves known extent (EMU / 9525; cap 4096px for extreme values); canvas paints a labeled rectangle and PDF paints an outlined placeholder. Anchored objects currently display inline, retaining original anchor XML. Mixed text/drawing run children, block-level MC, and actual floating placement remain open.

A source-backed rebuild explicitly permits opaque raw fragments; normal source-less DOCX export refuses them. Existing OPC overlay supplies the original dependencies, and the audit is mandatory when the snapshot contains opaque objects. It now rejects introduced duplicate or relocated objects in addition to losses. Cross-document/story copy and deletion are deliberately blocked at export until relationship-safe edit commands and explicit intent tracking exist. Canonical rebuild fingerprints may use raw fragments internally but are not complete exports. No default opt-out for inventoried objects. The chart mutation test now requires successful retention, actual measured geometry, clone, reimport and blocked deletion. New CI pending; full UI/PDF visual parity and undo/redo not certified.
