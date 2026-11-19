# OX-003 L6 — chart clipboard qualification record

Qualified commit: ec71c998fde190a4552c326a5ec35b17893a3018
Run: [44529633406](https://github.com/celsowm/oasis-editor/actions/runs/44529633406)
Date: 2026-11-19
Release baseline after qualification: 0.0.377 (b02ff858eeef56acbcd3a08f2338ee7fb0f2a2c4).

## Evidence

All three browser jobs completed successfully. The three evidence archives were downloaded and inspected. Each of the 12 exported DOCX containers contained the existing XLSX and the copied XLSX with identical SHA-256 digests within that fixture. Different jobs generated their own workbook ZIPs, so cross-engine digest equality is not expected.

| Scenario | Chromium | Firefox | WebKit |
|---|---:|---:|---:|
| Worker ownership transfer | pass | pass | pass |
| Synthetic clipboard events | 692 ms | 904 ms | 1039 ms |
| Ribbon, deterministic adapter | 857 ms | 1035 ms | 1062 ms |
| Context menu, deterministic adapter | 751 ms | 1144 ms | 810 ms |
| Blocked Cut and forged token | pass | pass | pass |
| Trusted keyboard | 882 ms | unqualified | 1009 ms |
| System Clipboard API, Ribbon | 825 ms | unqualified | unqualified |

Counts: 18 passed, 3 unqualified, 0 failed. Each timing is a single elapsed action-to-model-update observation on a CI runner, not a benchmark distribution or a performance guarantee. The timed successes check placement, embedded XLSX bytes, content types and undo/redo.

| Engine | Artifact ID | Exported DOCX count | Workbook SHA-256 (original and copy in each DOCX) |
|---|---:|---:|---|
| Chromium | [14531394985](https://github.com/celsowm/oasis-editor/actions/runs/44529633406/artifacts/14531394985) | 5 | 876ff15a57cfd9f4b855eecafc7384cea30d390de75539d6bd1fbd3866fe8fb8 |
| Firefox | [14533098497](https://github.com/celsowm/oasis-editor/actions/runs/44529633406/artifacts/14533098497) | 3 | cd8430c8c746fe63c1aeb2e897a8241d8813bbdd3b5c1d4384090493535d70cc |
| WebKit | [14532689246](https://github.com/celsowm/oasis-editor/actions/runs/44529633406/artifacts/14532689246) | 4 | 2abd180eba1a3b52544fd7ca4ccfffc5751bf8a139976da3887cc1b054f98e19 |

Artifacts have finite retention. This record captures observed results, not a substitute for rerunning the workflow. OOXML compatibility [44529633371](https://github.com/celsowm/oasis-editor/actions/runs/44529633371), npm [44529633647](https://github.com/celsowm/oasis-editor/actions/runs/44529633647) and Ribbon Geometry [44529633408](https://github.com/celsowm/oasis-editor/actions/runs/44529633408) also passed. Pages, Review Ribbon and Style Gallery were still running at the status check.

## Milestone disposition

Accept the bounded L1–L6 chart clipboard milestone with the explicit capability distinctions above. Do not mark all OX-003 acceptance criteria satisfied. The remaining Firefox trusted clipboard gap is observable: trusted copy contained the chart MIME, but trusted paste returned no types. Firefox and WebKit system Ribbon real permission scenarios remain unqualified. The deterministic adapters prove application behavior, not OS interoperability. Chromium and WebKit refer to Playwright engines, not all shipped Chrome/Safari versions or operating systems.

Remaining work:
- Investigate a safe, explicit browser-compatible transport for Firefox. Do not silently paste stale in-memory content when the OS clipboard contains no token. Retain Cut refusal and token validation.
- Real system Clipboard API permission and gesture qualification on Firefox and WebKit; real context-menu system clipboard qualification on every engine; cross-runtime/cross-tab transport trust and lifetime design.
- Charts are opaque preservation objects, not editable native chart rendering. Current transfer is single inline chart, existing source-backed Transitional single-section main story, collapsed caret. Extend other supported stories, ranges and opaque object kinds only with independent closure and mutation tests.
- Full OX-003 still includes boundary-specific MC semantics, unsupported objects, resize and broader mutation cases, structured diagnostics, strict/normalize policy, and Word open/save/visual evidence. No Word-exact or complete schema claim.
- Revisit measured performance with representative large documents and repeated samples.

The next active semantic workstream is OX-010. Retain these residual items as open OX-003 work, not as silently completed requirements.
