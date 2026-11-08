# Oasis Ribbon Parity Matrix — Phase 0 Seed

> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.

**Scope:** Initial 29-feature executable Ribbon exposure slice; NOT the complete WordCraft feature catalog.  
**Oasis baseline:** `e49c1b33e1fd0b76757b42b91e91d674cd0b229f`  
**WordCraft baseline:** `e53cae3482d4e080a15dc2320eb4929ea7722db2`

`partial` means a command and Ribbon entry are statically bound. It does **not** certify complete semantics, DOCX round-trip, PDF/layout, accessibility or browser behavior.

| Feature | WordCraft command | Oasis command | Ribbon placement | Status |
| --- | --- | --- | --- | --- |
| `home.copy` | `edit.copy` | `copy` | `home/clipboard` | partial |
| `home.cut` | `edit.cut` | `cut` | `home/clipboard` | partial |
| `home.formatPainter` | `edit.formatPainter` | `formatPainter` | `home/clipboard` | partial |
| `home.formatPainterContinuous` | `edit.formatPainter` | `formatPainterContinuous` | `home/clipboard` | partial |
| `home.paste` | `edit.paste` | `paste` | `home/clipboard` | partial |
| `home.pasteMerge` | `edit.pasteMerge` | `pasteMergeFormatting` | `home/clipboard` | partial |
| `home.pasteText` | `edit.pasteText` | `pasteAsPlainText` | `home/clipboard` | partial |
| `home.find` | `edit.find` | `find` | `home/editing` | partial |
| `home.selectAll` | `select.all` | `selectAll` | `home/editing` | partial |
| `insert.pageBreak` | `insert.pageBreak` | `pageBreak` | `insert/pages` | partial |
| `references.toc` | `references.toc` | `insertTableOfContents` | `references/tableOfContents` | partial |
| `references.updateToc` | `references.updateToc` | `updateTableOfContents` | `references/tableOfContents` | partial |
| `review.trackChanges` | `review.trackChanges` | `toggleTrackChanges` | `review/tracking` | partial |
| `review.previousRevision` | — | `previousRevision` | `review/changes` | partial |
| `review.nextRevision` | — | `nextRevision` | `review/changes` | partial |
| `review.commentsPanel` | — | `toggleCommentsPanel` | `review/comments` | partial |
| `review.newComment` | — | `newComment` | `review/comments` | partial |
| `review.replyComment` | — | `replyComment` | `review/comments` | partial |
| `review.editComment` | — | `editComment` | `review/comments` | partial |
| `review.previousComment` | — | `previousComment` | `review/comments` | partial |
| `review.nextComment` | — | `nextComment` | `review/comments` | partial |
| `review.resolveComment` | — | `resolveComment` | `review/comments` | partial |
| `review.reopenComment` | — | `reopenComment` | `review/comments` | partial |
| `review.deleteComment` | — | `deleteComment` | `review/comments` | partial |
| `review.accept` | `review.accept` | `acceptRevisions` | `review/changes` | partial |
| `review.reject` | `review.reject` | `rejectRevisions` | `review/changes` | partial |
| `view.showMargins` | — | `toggleShowMargins` | `view/show` | partial |
| `view.paragraphMarks` | `view.marks` | `toggleShowParagraphMarks` | `view/show` | partial |
| `view.preciseFonts` | — | `togglePreciseFonts` | `view/show` | partial |
| `insert.header` | `insert.header` | `editHeader` | `insert/headerFooter` | partial |
| `insert.footer` | `insert.footer` | `editFooter` | `insert/headerFooter` | partial |
| `insert.pageNumber` | `insert.pageNumber` | `insertPageNumber` | `insert/headerFooter` | partial |
| `insert.pageNumberXOfY` | `insert.pageNumber` | `insertPageNumberXOfY` | `insert/headerFooter` | partial |
| `insert.pageNumberTop` | `insert.pageNumber` | `placePageNumberTop` | `insert/headerFooter` | partial |
| `insert.pageNumberBottom` | `insert.pageNumber` | `placePageNumberBottom` | `insert/headerFooter` | partial |
| `insert.bookmark` | `insert.bookmark` | `insertBookmark` | `insert/links` | partial |
| `insert.date` | `insert.date_time` | `insertDateField` | `insert/links` | partial |
| `insert.exitHeaderFooter` | — | `exitHeaderFooter` | `insert/headerFooter` | partial |

## Open verification questions

1. **home.copy:** Clipboard adapter and browser permission behavior require runtime verification.
2. **home.cut:** Clipboard write must succeed before deletion. Selection snapshots, read-only state and async document replacement have focused tests; browser compatibility, tracked-changes DOCX fidelity and end-to-end undo are still unverified.
3. **home.formatPainter:** Copies the current selection/caret formatting for the next pointer or keyboard target; tests cover ranges, paragraph source, links and one-shot disarm. Full visual/WordCraft behavior and DOCX round-trip remain unverified.
4. **home.formatPainterContinuous:** Continuous mode applies to multiple finalized targets and stays armed after the editor's own transactional changes. Escape and explicit cancellation disarm; E2E mouse/touch/keyboard testing remains necessary.
5. **home.paste:** Rich/HTML and text paste implemented through the shared Clipboard API; browser permissions, image-only clipboard, long-document E2E and DOCX fidelity remain to verify.
6. **home.pasteMerge:** Destination character/paragraph styles are retained while explicit source emphasis and hyperlinks are preserved. Needs browser, mixed-list, nested-table and DOCX round-trip verification.
7. **home.pasteText:** Paste as plain text is an immediate command independent of the keyboard-only pastePlainText shortcut; unsupported Clipboard API results in a disabled action.
8. **home.find:** Find pane command is wired; search/replacement interaction still needs E2E verification.
9. **home.selectAll:** Selections spanning tables and document stories require E2E verification.
10. **insert.pageBreak:** Pagination and multi-section round-trip are not certified by the Ribbon binding alone.
11. **references.toc:** TOC creation, fields and export/round-trip remain independently testable.
12. **references.updateToc:** Eligibility and missing-TOC command states still need refinement.
13. **review.trackChanges:** Active state is wired to EditorState; tracked content fidelity and UI workflows remain to verify.
14. **review.previousRevision:** Cycles backward through text-run revisions in the active editing story. Pure selection navigation; structural/property revisions need separate navigation support.
15. **review.nextRevision:** Cycles forward through tracked text-run changes without editing the document; selection is limited to the active section/zone.
16. **review.commentsPanel:** An editor-scoped discussion drawer lists roots and nested replies, supports text search, open/resolved filters, navigation, moderation and confirmation before deletion. The Activity view shows undoable local comment events for creation, replies, edits, resolve/reopen and deletion; events are not exported to DOCX. Host IDs gate mutations. Visual parity remains partial.
17. **review.newComment:** Creates an authored comment anchored to selected text or a caret word, through a per-editor modal. Uses native comment registry and is undoable; visual E2E and full DOCX import/export fidelity are pending.
18. **review.replyComment:** Creates an unanchored threaded reply linked by parentId to the selected comment. DOCX commentsExtended XML parent relationship has unit coverage; cross-application round-trip remains unverified.
19. **review.editComment:** Edits only the selected existing comment's text in a transactional modal; ID, author, creation time, anchors, resolved state and reply links are preserved. Popup actions support editing individual nested replies. DOCX export/reimport and read-only gating have tests; full visual WordCraft parity remains unverified.
20. **review.previousComment:** Navigates to the prior anchored comment in the active story, skipping unanchored replies and wrapping.
21. **review.nextComment:** Navigates to the next anchored comment without changing the document; WordCraft command id not audited.
22. **review.resolveComment:** Marks the comment under the selection as resolved, retaining the DOCX comment id, author, anchors and thread metadata. Needs round-trip E2E.
23. **review.reopenComment:** Reopens a resolved comment under the selection. Enabled only when the selected comment is resolved.
24. **review.deleteComment:** Removes an anchored comment and recursively removes replies to prevent orphan thread parent ids. Undo and DOCX source-package E2E remain to verify.
25. **review.accept:** Selection scope and disabled states for documents without revisions need tests.
26. **review.reject:** Selection scope and disabled states for documents without revisions need tests.
27. **view.showMargins:** Oasis-specific display option with active state bound to EditorState.
28. **view.paragraphMarks:** Paragraph-mark display feedback is wired; rendering and accessibility require E2E checks.
29. **view.preciseFonts:** Oasis precise-font mode; platform font availability still requires coverage.
30. **insert.header:** Enters the default header editing zone for the active section. First/even-page variant in-place editing and brand-new header part export remain follow-ups.
31. **insert.footer:** Enters the default footer editing zone for the active section. Variant in-place editing and brand-new footer part export remain follow-ups.
32. **insert.pageNumber:** Inserts a PAGE field at the caret inside a header/footer (or body). Field formatting (\* roman etc.) resolves in layout and round-trips through DOCX. Per-section start/format (w:pgNumType) is set via the setSectionPageNumbering payload command. Layout resolution E2E verification remains.
33. **insert.pageNumberXOfY:** Inserts the Page X of Y combination (PAGE + NUMPAGES with literals) at the caret, mirroring WordCraft insert.page_number format=of, with an optional \* number format.
34. **insert.pageNumberTop:** Places the active section's default header as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=top story rewrite). Alignment gallery is not yet exposed in UI.
35. **insert.pageNumberBottom:** Places the active section's default footer as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=bottom story rewrite). Round-trips through DOCX with alignment.
36. **insert.bookmark:** Bookmarks the current selection (single point when collapsed) into the document-level EditorBookmarks registry, exported as w:bookmarkStart/w:bookmarkEnd and round-tripped on import. Cross-reference insertion (PAGEREF/REF with refresh) remains a follow-up.
37. **insert.date:** Inserts a typed DATE field at the caret with a \@ picture (default M/d/yyyy), caching the formatted result in the run text and round-tripping through DOCX. The DATE_FORMATS picture gallery and TIME fields remain follow-ups.
38. **insert.exitHeaderFooter:** Returns the caret to the section body when editing a header/footer zone. Enabled only while the active zone is a header or footer.

## Audit interpretation

The audit scans the built-in command array, direct default-toolbar objects, the three active static button-spec arrays, Ribbon placement definitions and the default menubar. Dynamic custom controls and plugin contributions cannot be proved complete through static mapping and must be verified in runtime tests. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.

**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.
