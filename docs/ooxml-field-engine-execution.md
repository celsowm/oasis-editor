# OX-010 — field engine first implementation slices

Baseline inspected: b02ff858eeef56acbcd3a08f2338ee7fb0f2a2c4.
Related roadmap: [OX-010](./ooxml-2026-11-execution-plan.md#ox-010-field-engine).

## Current implementation and demonstrated risk

- src/import/docx/runs/fields.ts joins direct instrText children but has no field instruction parser.
- src/import/docx/runs.ts has separate regex-based classification in collapseFieldIfSimple and fldSimple. Both search for NUMPAGES, PAGE, DATE, REF and PAGEREF anywhere in the instruction, not only at the command head. For example IF with a quoted NUMPAGES literal may be mistaken for NUMPAGES; a REF target containing a recognized field name can also be misclassified. This is a static diagnosis, not a newly executed regression.
- extractBookmarkName uses regex extraction; switches and quoted arguments are not represented losslessly.
- src/export/docx/text/fieldRunXml.ts serializes supported typed fields as fldSimple, and preserves complex control/instruction runs. Full instruction preservation must be checked under actual paragraph mutation, not merely source XML replay.
- src/core/commands/fieldDate.ts already supports cached result and deterministic date input; retain the existing command and formatter.
- Existing tests: docxImport.fields.test.ts, docxDateFieldRoundTrip.test.ts, fieldDate.test.ts. Extend rather than replace them.

## Implementation sequence

| Slice | Deliverable | Required evidence |
|---|---|---|
| A | Lossless bounded lexer and exact command-head parser shared by simple/complex routes | known names, unknown names, quoted text, escapes, malformed input, split instrText, hostile length; no arbitrary evaluation |
| B | Conservative typed projection and lossless preservation for unsupported instructions | no flattening of complex/nested/locked/dirty/styled result; mutation/export/reimport tests; exact REF targets and switches |
| C | Story-aware span graph and nested field operands | begin/separate/end across paragraphs, nesting, malformed spans, controls mixed with native and opaque runs |
| D | Evaluator registry and context | PAGE, NUMPAGES, SECTION, SECTIONPAGES, REF/PAGEREF with stable dependencies; locked fields unchanged |
| E | Date/time and sequence/reference families | deterministic clock/locale, date pictures, SEQ reset, STYLEREF, captions |
| F | TOC and conditional/variable fields | dependency invalidation, bounded pagination convergence, switches, no external execution |
| G | UI and interoperability | update selected/all, code display, lock/unlock, undo/redo, SDK validation and representative Word-authored corpus |

First narrow gate: stop substring promotion without regressing supported basic fields. Lexer must retain raw instruction offsets and distinguish command, positional arguments, quoted arguments and switch tokens. No evaluator or automatic rewriting until preservation is demonstrably lossless. Unknown, malformed, nested or semantically unsupported inputs must remain preserved, not be coerced into PAGE/NUMPAGES. Do not execute DDE, INCLUDETEXT or other external fields.

The OX-003 chart milestone is qualified within its bounded scope; remaining preservation work remains tracked as open tickets, not as a claim of complete OOXML support.

## Slice A implementation

Shared bounded lossless lexical parser with raw instruction, token offsets, quoted operands, escaped quote/backslash, switch tokens and exact command head. Both fldSimple and complex single-paragraph routes use one scalar projection. Unknown commands, malformed syntax and unsupported extra switches remain instruction/result runs rather than being mislabeled as PAGE/NUMPAGES/REF/DATE. Existing case-sensitive numeric formats retained; quoted bookmark spaces serialized on regeneration. Tests include IF/unknown commands with recognized literal operands, unsupported switches, split instructions, quote and resource bounds. This is not a full field AST or evaluator; lock/dirty, nested and styled result preservation and all story boundaries are next slices. CI pending.

## Slice B1 — preserve flagged and structured results during adjacent insertion

Slice A passed OOXML (all five), chart browser qualification, npm and Pages. Reject scalar projection for locked/dirty fields, heterogeneous result styles, nested or misordered complex spans, structured markers and objects. Preserve recognized true lock/dirty flags from fldSimple in complex begin marker fallback. Preserve ordinary text mixed with field controls in a single source run. Stop normalization from deleting field control/instruction runs; use an ordered field-aware split for single-paragraph run insertion instead of range slicing that drops zero-width markers. Regression exercises actual adjacent text insertion followed by export/reimport, flags, styled caches, nested and mixed controls. This is B1, not full mutation support: range deletion/copy, multiline splits, boundary affinity, deleted instruction identity, opaque/native mixed controls, arbitrary field attributes/children and story-wide nesting still require separate work. At exact zero-width boundaries insertion follows encountered markers. CI pending.

## Slice B2A — bounded adjacent range mutations

B1 passed all seven workflows. Separate visible slicing from field-aware mutation: retain zero-width markers once in deletion/formatting; preserve typed runs when splitting paragraphs, page/list/section breaks or plain multiline paste. Protect all complex spans in the touched paragraph (including locked/unknown fields); ambiguous caret boundaries and selections intersecting them are refused. A locally unbalanced stream conservatively blocks covered text/deletion/split operations in the active zone pending the story span graph. Adjacent single-paragraph edits remain available. Test real DOCX mutation/export/reimport, forward/backward/range deletion, formatting, paragraph split and paste. This is a temporary preservation gate, not full field edit semantics; general style operations across multi-paragraph fields, cut/copy feedback, alternate insertion commands, arbitrary structural replacements, explicit whole-field deletion, and cross-story topology still need qualification. CI pending.

## Slice C1 — ordered complex-field story graph

B2A passed all seven workflows (commit f1e138388da21c6cc0dbdf366b575bd943d070c4). Introduce an iterative, read-only graph over an explicitly supplied single-story paragraph stream. Track begin/separator/end by paragraph, run index, run ID and visible UTF-16 offset; preserve nested operands in code or cached result order, direct instruction fragments and begin flags. Detect orphan controls/instructions, duplicate separators, post-separator instructions and unclosed fields. Reuse the graph in the existing paragraph-local mutation guard, tightening malformed topology without relaxing cross-paragraph edit restrictions. Tests cover multi-paragraph spans, nested operands/results, coincident markers, independent story inputs, malformed streams and deep nesting. CI pending. C2 must enumerate actual story boundaries (including sections, related parts and text boxes), qualify cross-paragraph mutation and introduce safe selection affinity before lifting the zone guard. No evaluator, coverage promotion or automatic field repair in C1.

## Slice C2A — bounded inline edits around cross-paragraph spans

C1 passed all seven workflows. Resolve one editable story from the active zone; for the main body include every section, not just the selection's active section. Related header/footer variants and individual footnotes remain separate; text box internals are not flattened. Use the graph for collapsed text insertion and ordinary single-paragraph deletion outside balanced fields, while keeping ambiguous caret edges and cached result paragraphs protected. Cross-paragraph spans in stories containing tables remain conservatively blocked until cell topology is qualified. Tracked deletion, replacement, multiline paste, paragraph/section splits and joins retain the previous conservative gate. Character formatting now checks the structural gate before mutation so markerless interior paragraphs cannot be accidentally formatted. Round-trip tests cover before/after, first/last paragraph prefixes/suffixes, markerless cached result and blocked structural edits. CI pending; C2B should qualify formatting, exact boundary affinity, table/related story cases and structural commands before the evaluator work.

## Slice C2B1 — adjacent character formatting

C2A passed OOXML, chart clipboard, npm, Pages, geometry and style-gallery workflows; review-browser was still running at the time of this slice. The six character-formatting commands now authorize single-paragraph ranges through the story graph, then map visible runs without deleting invisible field controls. Local markerless cached paragraphs remain protected, as do ranges crossing a field boundary. Keep the existing conservative multi-paragraph selection gate. Exact nonempty selection edges are supported, but caret affinity at coincident controls is unchanged. Also retain the structural gate for tracked insertion, matching the previous tracked-deletion restriction. DOCX regressions exercise all six formatting commands, exact prefix/suffix edges, protected caches, flags and tracked insertion. CI pending. Structural splitting/joining and cell topology are separate slices; no capability promotion.

## Slice C2B2A — explicit insertion affinity and C2B1 regression repair

C2B1 passed five workflows but npm and Pages failed on one assertion: the reimport materializes Calibri/11pt defaults. Verify exact model styles before export and compare effective reimport styles with font-size rounding tolerance, rather than comparing raw optional properties. Add optional explicit before/after-markers affinity to a collapsed EditorPosition for ordinary text insertion; verify raw selection identity and resolve against actual outer boundaries (not paragraph-clipped edges). The zero-width splitter honors the explicit side, and successive typing retains it. No affinity is inferred from ordinary offset-based selections; the canvas/caret navigation has not yet been wired to supply it. Tracked, replacement and structural commands keep the prior gates. Tests exercise coincident controls, repeated typing, round-trip and clipped span rejection. CI pending.
