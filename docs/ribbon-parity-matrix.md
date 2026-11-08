# Oasis Ribbon Parity Matrix — Phase 0 Seed

> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.

**Scope:** Initial 12-feature executable Ribbon exposure slice, **not** the full WordCraft catalog.  
**Oasis baseline:** `e49c1b33e1fd0b76757b42b91e91d674cd0b229f`  
**WordCraft baseline:** `e53cae3482d4e080a15dc2320eb4929ea7722db2`

`partial` means a command and Ribbon entry are statically bound. It does **not** certify complete semantics, DOCX round-trip, PDF/layout, accessibility or browser behavior.

| Feature | WordCraft command | Oasis command | Ribbon placement | Status |
| --- | --- | --- | --- | --- |
| `home.copy` | `edit.copy` | `copy` | `home/clipboard` | partial |
| `home.find` | `edit.find` | `find` | `home/editing` | partial |
| `home.selectAll` | `select.all` | `selectAll` | `home/editing` | partial |
| `insert.pageBreak` | `insert.pageBreak` | `pageBreak` | `insert/pages` | partial |
| `references.toc` | `references.toc` | `insertTableOfContents` | `references/tableOfContents` | partial |
| `references.updateToc` | `references.updateToc` | `updateTableOfContents` | `references/tableOfContents` | partial |
| `review.trackChanges` | `review.trackChanges` | `toggleTrackChanges` | `review/tracking` | partial |
| `review.accept` | `review.accept` | `acceptRevisions` | `review/changes` | partial |
| `review.reject` | `review.reject` | `rejectRevisions` | `review/changes` | partial |
| `view.showMargins` | — | `toggleShowMargins` | `view/show` | partial |
| `view.paragraphMarks` | `view.marks` | `toggleShowParagraphMarks` | `view/show` | partial |
| `view.preciseFonts` | — | `togglePreciseFonts` | `view/show` | partial |

## Open verification questions

1. **home.copy:** Clipboard adapter and browser permission behavior require runtime verification.
2. **home.find:** Find pane command is wired; search/replacement interaction still needs E2E verification.
3. **home.selectAll:** Selections spanning tables and document stories require E2E verification.
4. **insert.pageBreak:** Pagination and multi-section round-trip are not certified by the Ribbon binding alone.
5. **references.toc:** TOC creation, fields and export/round-trip remain independently testable.
6. **references.updateToc:** Eligibility and missing-TOC command states still need refinement.
7. **review.trackChanges:** Active state is wired to EditorState; tracked content fidelity and UI workflows remain to verify.
8. **review.accept:** Selection scope and disabled states for documents without revisions need tests.
9. **review.reject:** Selection scope and disabled states for documents without revisions need tests.
10. **view.showMargins:** Oasis-specific display option with active state bound to EditorState.
11. **view.paragraphMarks:** Paragraph-mark display feedback is wired; rendering and accessibility require E2E checks.
12. **view.preciseFonts:** Oasis precise-font mode; platform font availability still requires coverage.

## Audit interpretation

The audit scans the built-in command array, direct default-toolbar objects, the three active static button-spec arrays, Ribbon placement definitions and the default menubar. Dynamic custom controls and plugin contributions cannot be proved complete through static mapping and must be verified in runtime tests. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.

**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.
