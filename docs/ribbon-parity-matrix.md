# Oasis Ribbon Parity Matrix — Phase 0 Seed

> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.

**Scope:** Initial 16-feature executable Ribbon exposure slice; NOT the complete WordCraft feature catalog.  
**Oasis baseline:** `e49c1b33e1fd0b76757b42b91e91d674cd0b229f`  
**WordCraft baseline:** `e53cae3482d4e080a15dc2320eb4929ea7722db2`

`partial` means a command and Ribbon entry are statically bound. It does **not** certify complete semantics, DOCX round-trip, PDF/layout, accessibility or browser behavior.

| Feature | WordCraft command | Oasis command | Ribbon placement | Status |
| --- | --- | --- | --- | --- |
| `home.copy` | `edit.copy` | `copy` | `home/clipboard` | partial |
| `home.cut` | `edit.cut` | `cut` | `home/clipboard` | partial |
| `home.paste` | `edit.paste` | `paste` | `home/clipboard` | partial |
| `home.pasteMerge` | `edit.pasteMerge` | `pasteMergeFormatting` | `home/clipboard` | partial |
| `home.pasteText` | `edit.pasteText` | `pasteAsPlainText` | `home/clipboard` | partial |
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
2. **home.cut:** Clipboard write must succeed before deletion. Selection snapshots, read-only state and async document replacement have focused tests; browser compatibility, tracked-changes DOCX fidelity and end-to-end undo are still unverified.
3. **home.paste:** Rich/HTML and text paste implemented through the shared Clipboard API; browser permissions, image-only clipboard, long-document E2E and DOCX fidelity remain to verify.
4. **home.pasteMerge:** Destination character/paragraph styles are retained while explicit source emphasis and hyperlinks are preserved. Needs browser, mixed-list, nested-table and DOCX round-trip verification.
5. **home.pasteText:** Paste as plain text is an immediate command independent of the keyboard-only pastePlainText shortcut; unsupported Clipboard API results in a disabled action.
6. **home.find:** Find pane command is wired; search/replacement interaction still needs E2E verification.
7. **home.selectAll:** Selections spanning tables and document stories require E2E verification.
8. **insert.pageBreak:** Pagination and multi-section round-trip are not certified by the Ribbon binding alone.
9. **references.toc:** TOC creation, fields and export/round-trip remain independently testable.
10. **references.updateToc:** Eligibility and missing-TOC command states still need refinement.
11. **review.trackChanges:** Active state is wired to EditorState; tracked content fidelity and UI workflows remain to verify.
12. **review.accept:** Selection scope and disabled states for documents without revisions need tests.
13. **review.reject:** Selection scope and disabled states for documents without revisions need tests.
14. **view.showMargins:** Oasis-specific display option with active state bound to EditorState.
15. **view.paragraphMarks:** Paragraph-mark display feedback is wired; rendering and accessibility require E2E checks.
16. **view.preciseFonts:** Oasis precise-font mode; platform font availability still requires coverage.

## Audit interpretation

The audit scans the built-in command array, direct default-toolbar objects, the three active static button-spec arrays, Ribbon placement definitions and the default menubar. Dynamic custom controls and plugin contributions cannot be proved complete through static mapping and must be verified in runtime tests. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.

**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.
