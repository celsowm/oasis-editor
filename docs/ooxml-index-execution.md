# INDEX / XE execution — F4B

## F4B1 — read-only XE inventory

Base release v0.0.411. The mixed TOC PR #100 remains independent.

References: ISO/IEC 29500 WordprocessingML XE and INDEX field semantics (https://c-rex.net/samples/ooxml/e1/Part4/OOXML_P4_DOCX_XE_topic_ID0EO1P1.html and https://c-rex.net/samples/ooxml/e1/Part4/OOXML_P4_DOCX_INDEXINDEX_topic_ID0EZUH1.html); Microsoft Word Indexes.MarkEntry API (https://learn.microsoft.com/en-us/office/vba/api/word.indexes.markentry).

Compile a bounded XE grammar: quoted colon-separated hierarchy, explicit single-letter index type, page formatting flags, cross-reference text, or bookmark range reference. Retain exact raw instruction and UTF-16 marker offset, and resolve only point references to certified physical page index and formatted printed label. Reject malformed or unsupported XE, including lexer failures, rather than losing an entry. No edit or refresh of existing INDEX caches. No locale sorting claim, escaped colons, formatted instruction fragments, nested fields, tables, textboxes, or bookmark range expansion yet. Tests cover parser, offsets, formatting, immutable inventory, round-trip and unsupported geometry. CI pending.

## Next slices

- F4B2: qualify INDEX instruction grammar; define default/explicit type matching and locale/collation scope; produce read-only hierarchical entry plan from qualified point pages, cross-references and bookmark ranges.
- F4B3: bounded flat cache regeneration with deterministic sorting, duplicate handling, page labels, subentry style and convergence; preserve unsupported source and active anchors.
- F4B4: independent Open XML validator corpus, Word-authored INDEX fixtures, Ribbon mark/update integration and browser qualification.

Do not claim complete Word parity until the actual fixtures pass. Do not infer alphabetical ordering from a host's default locale.

## F4B2A — read-only INDEX plan

F4B1 passed all seven PR #101 workflows. PR #100 passed all seven and was merged independently. Follow Microsoft Word's documented deviation for default INDEX selection: omitted \f selects only untyped XE, unlike ISO/IEC 29500 (https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/99860875-33d5-46d6-8d52-76e0cdcd5da3). Parse one-column indented INDEX, explicit type, supported language tags/LCIDs and bounded plain separators. Require an explicit locale from the field or caller, sort via Intl.Collator, preserve exact display paths and emit parent-first hierarchy. Deduplicate point references by physical page, retain printed labels and bold/italic flags. Keep cross references typed. Reject unresolved pages, ambiguous spelling/case or formatting, combined cross references and pages, custom sort overrides, mixed-case identifiers and bookmark range expansion (next slice). No cache mutation, UI or Word collation parity claim. Added dedicated unit and DOCX round-trip tests; CI pending.

## F4B2B — explicit bookmark range plan

F4B2A passed typecheck, unit tests, build, OOXML and six of seven PR workflows. Full PR CI timed out waiting for the visible font-size control during read-only Ribbon testing (run 45834130862); rerun requested without weakening assertions. Introduce a qualified main-story bookmark range resolver using exclusive-end UTF-16 offsets, verified section ownership, and physical page vectors with their printed labels. Preserve repeated page labels across numbering restarts. Add typed ranges to INDEX plans, optional \g range separator, exact duplicate range elimination, bounded reference counts and refusal of overlapping point/range references or ambiguous bookmarks. Range rendering, compact formatting across restarts, and real Word oracle remain unqualified. Tests include repeated printed labels, zero-offset end boundary, cross-section decimal/roman pages, invalid anchors, overlap and DOCX round-trip. CI pending.

## F4B3A — bounded flat INDEX regeneration

F4B2B passed all seven PR #101 workflows; F4B2A's Ribbon retry passed. Add a narrow flat INDEX cache qualifier (complete separate marker paragraphs; plain text and simple emphasis only), render a hierarchical plan using explicit indentation, page/cross-reference/range separators and per-page emphasis, and stage replacement with at most six pagination measurements. Commit only a fixed point, preserve marker/source identities and selection, and refuse cache anchors, spanning bookmarks/comments, unqualified markup, locked fields, empty plans, multicolumn sections and ranges across section boundaries. No Ribbon activation or Word-authored fixture claim. Regression tests cover formatting, no-op, DOCX output, rollback and limits. CI pending.

## F4B3B — preservation and independent SDK qualification

F4B3A passed all seven PR #101 workflows. Tighten the source cache allowlist using namespace-aware XML element and attribute checks, reject unknown retained paragraph attributes and unsafe anchors spanning an initially empty cache. Preserve unrelated source paragraphs. Extend the mandatory SDK/OPC corpus from seven to nine files: synthetic INDEX/XE source and a regenerated production export, with an explicit file inventory, reimported visible entries and raw field instructions. CI pending. These are Oasis-authored fixtures, not Microsoft Word-authored files. Named index styles, combined marker/result paragraphs and Word visual interoperability remain unqualified.

## F4B4A — core authoring commands

F4B3B independent extended SDK/OPC validation passed all nine documents with zero diagnostics (run 45865401389, extended-validation). PR CI and source-preservation typecheck failed on nullable xmldom Element/localName types. Fix with explicit Element type and null guards. Add core mark/insert/update commands: explicit paragraph-end caret, hidden XE with validated path and flags, provisional INDEX insertion only when convergence succeeds. Refuse edits in existing fields, anchored targets, unsupported selection/story and imported marker target markup; insert only one INDEX per document and preserve selection. Tests cover authoring, no-op and rollback. Command registry, dialogs, Ribbon, selection-based marking and full Word styles remain pending. CI pending.

## F4B4B — public command registration

F4B4A passed all seven PR workflows. Expose typed markIndexEntry/insertIndex/updateIndex through the public payload/results interfaces, built-in registry and Essentials fields capability. Preserve actual mutation results, reject malformed runtime payloads, honor read-only/main-story/track-change and structural gates, and use one transaction per action. Cheap capability checks do not paginate. Tests cover real core-backed capability, runtime invalid input and read-only. Ribbon dialogs are not enabled yet. CI pending.

## F4B4C — Ribbon authoring panels

F4B4B CI failed at syntax checking because an extraction left the existing INDEX guard split between functions. Restore the complete guard in canInsertIndex. Add References > Index with mark/insert form popovers and update command, localized EN/PT-BR labels, custom editorial glyphs and responsive group registration. Validate inputs and show refusal without reporting success. Forms use the existing popup lifecycle. Browser interaction, keyboard/focus qualification and Word-style modal parity remain pending. CI pending.

## F4B4D — browser qualification

F4B4C passed six of seven workflows, including typecheck and OOXML. PR CI failed on stale static icon inventory, not icon resolution. Reconcile exact audit output (literal changes, dynamic expressions and custom registry). Add mandatory real Ribbon INDEX workflow in Chromium (wide light PT-BR and narrow dark EN): mark and insert forms, update after a new XE, undo/redo, read-only, DOCX round-trip, evidence screenshots. CI pending; no Word oracle or manual visual approval claimed.

### F4B4D follow-up — native UI guardrail

Commit 267e612 passed the static icon audit, OOXML evidence, and six of seven workflows. PR CI reported 2,435 tests passed, three skipped and one failure: raw native elements in IndexEntryPanel. Replace them with the shared Text, StatusText, SelectField and Checkbox components, preserving test IDs and form behavior. Keep the native UI guardrail unchanged. Browser qualification is still pending.
