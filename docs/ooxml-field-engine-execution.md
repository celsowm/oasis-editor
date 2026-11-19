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
