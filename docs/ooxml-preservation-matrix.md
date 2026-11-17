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
