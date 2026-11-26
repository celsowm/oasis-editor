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
