# Oasis Ribbon Parity Matrix — Phase 0 Seed

> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.

**Scope:** 49-feature Oasis crosswalk against the pinned WordCraft source inventory of 521 entries. Unmatched WordCraft rows remain unclassified; this is not a complete parity matrix. Category-level exposure, semantics, and persistence evidence is tracked separately in references.json and docs/ribbon-office-progress.md.<br>
**Pinned WordCraft inventory:** `521 entries / 25 surfaces`; this crosswalk maps `49` Oasis capabilities and does not classify unmatched source rows as missing.<br>
**Oasis baseline:** `1acefe74b4cdf7d008c3cd3f4084bec102d7fbb9`<br>
**WordCraft baseline:** `05f781cfdac1d89034c0f4f5824b597ff845f2ef`

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
| `home.bold` | `format.bold` | `bold` | `home/font` | partial |
| `home.italic` | `format.italic` | `italic` | `home/font` | partial |
| `home.underline` | `format.underline` | `applyUnderlineStyle` | `home/font` | partial |
| `home.doubleUnderline` | `format.doubleUnderline` | `applyUnderlineStyle` | `home/font` | partial |
| `home.subscript` | `format.subscript` | `subscript` | `home/font` | partial |
| `home.superscript` | `format.superscript` | `superscript` | `home/font` | partial |
| `home.outdent` | `para.outdent` | `outdent` | `home/paragraph` | partial |
| `home.indent` | `para.indent` | `indent` | `home/paragraph` | partial |
| `home.alignLeft` | `para.alignLeft` | `alignLeft` | `home/paragraph` | partial |
| `home.alignCenter` | `para.alignCenter` | `alignCenter` | `home/paragraph` | partial |
| `home.alignRight` | `para.alignRight` | `alignRight` | `home/paragraph` | partial |
| `insert.pageBreak` | `insert.pageBreak` | `pageBreak` | `insert/pages` | partial |
| `references.toc` | `references.toc` | `insertTableOfContents` | `references/tableOfContents` | partial |
| `references.updateToc` | `references.updateToc` | `updateTableOfContents` | `references/tableOfContents` | partial |
| `review.trackChanges` | `review.trackChanges` | `toggleTrackChanges` | `review/tracking` | partial |
| `review.previousRevision` | — | `previousRevision` | `review/changes` | partial |
| `review.nextRevision` | — | `nextRevision` | `review/changes` | partial |
| `review.commentsPanel` | — | `toggleCommentsPanel` | `review/comments` | partial |
| `review.newComment` | `review.newComment` | `newComment` | `review/comments` | partial |
| `review.replyComment` | — | `replyComment` | `review/comments` | partial |
| `review.editComment` | — | `editComment` | `review/comments` | partial |
| `review.previousComment` | `review.previousComment` | `previousComment` | `review/comments` | partial |
| `review.nextComment` | `review.nextComment` | `nextComment` | `review/comments` | partial |
| `review.resolveComment` | `review.resolveComment` | `resolveComment` | `review/comments` | partial |
| `review.reopenComment` | — | `reopenComment` | `review/comments` | partial |
| `review.deleteComment` | `review.deleteComment` | `deleteComment` | `review/comments` | partial |
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
| `insert.date` | `insert.dateTime` | `insertDateField` | `insert/links` | partial |
| `insert.exitHeaderFooter` | — | `exitHeaderFooter` | `insert/headerFooter` | partial |

## Open verification questions

1. **home.copy:** Model selection is copied without document mutation. Browser checks use deterministic write adapters; native OS permissions/clipboard and full Safari workflows remain unverified. Access failures provide localized keyboard guidance.
2. **home.cut:** Clipboard write must succeed before deletion, including the native event path. Tests cover denied writes, superseded async requests, read-only state and document replacement; browser adapters verify selection and one-step undo. Native OS/Safari permissions, tracked changes and DOCX fidelity remain unverified.
3. **home.formatPainter:** Captures effective paragraph/character appearance with direct overrides while preserving destination hyperlinks. Three browser engines exercise actual keyboard selection, one-shot disarm and undo/redo. Pointer/touch, real Safari/VoiceOver, complex stories and DOCX/PDF remain unverified.
4. **home.formatPainterContinuous:** Continuous mode survives two finalized keyboard targets and its own batched transactions. Browser checks exercise Escape, read-only and document-replacement cancellation; client selection-only changes retain source identity. Pointer/touch, complex stories and DOCX/PDF remain unverified.
5. **home.paste:** Shared rich/HTML paste preserves the captured API target, with localized failure feedback and a one-use native keyboard fallback. Chromium/Firefox/WebKit use deterministic clipboard adapters and synthetic native events; real OS prompts, image-only behavior, long-document workflows and DOCX fidelity remain unverified.
6. **home.pasteMerge:** Destination character/paragraph styles and source emphasis/links are retained. Deterministic browser adapters and synthetic native events exercise merge and one-step undo. Real OS/Safari behavior, mixed lists/nested tables and DOCX round-trips remain unverified.
7. **home.pasteText:** Immediate text-only action; unavailable or rejected Clipboard API offers localized keyboard guidance instead of a silent disabled action. A single native paste consumes the text-only choice; document replacement/dismissal expires it. Real OS/Safari behavior remains unverified.
8. **home.find:** Find pane command is wired; search/replacement interaction still needs E2E verification.
9. **home.selectAll:** Selections spanning tables and document stories require E2E verification.
10. **home.bold:** Bold command is bound to the Home Font button. Delivery 7 covers inherited-style toggles, selection preservation and one-step undo/redo across the Font workflows; mixed-state presentation, Word-open interoperability and Safari/VoiceOver remain unverified.
11. **home.italic:** Italic command is bound to the Home Font button. Delivery 7 covers inherited-style toggles, selection preservation and one-step undo/redo across the Font workflows; mixed-state presentation, Word-open interoperability and Safari/VoiceOver remain unverified.
12. **home.underline:** The custom Underline split control dispatches the atomic applyUnderlineStyle command. Its main click toggles the last selected variant; WordCraft format.underline activates Single by default, so reusing a prior Double style is a known behavior difference and this is a related-task mapping. Delivery 4 covers apply/remove and one-step undo; mixed states and Word-open interoperability remain unverified.
13. **home.doubleUnderline:** The Double Underline option in the custom split menu dispatches applyUnderlineStyle with the double variant. Delivery 4 covers atomic variant replacement, selection preservation and one-step undo/redo; mixed states, Word-open interoperability and VoiceOver remain unverified.
14. **home.subscript:** Subscript command is bound to the Home Font button. Delivery 7 covers inherited-style resets, script mutual exclusion and keyboard editing across the Font workflows; mixed-state presentation, Word-open interoperability and Safari/VoiceOver remain unverified.
15. **home.superscript:** Superscript command is bound to the Home Font button. Delivery 7 covers inherited-style resets, script mutual exclusion and keyboard editing across the Font workflows; mixed-state presentation, Word-open interoperability and Safari/VoiceOver remain unverified.
16. **home.outdent:** Decrease Indent is bound to the Home Paragraph button. This is a related task, not a complete command equivalent: Oasis changes list nesting only, while WordCraft also adjusts non-list paragraph indentation. Table/list combinations, mixed selections, undo and DOCX/PDF output need workflow verification.
17. **home.indent:** Increase Indent is bound to the Home Paragraph button. This is a related task, not a complete command equivalent: Oasis changes list nesting only, while WordCraft also adjusts non-list paragraph indentation. Table/list combinations, mixed selections, undo and DOCX/PDF output need workflow verification.
18. **home.alignLeft:** Align Left is bound to the Home Paragraph button. Mixed/multiple paragraph selection, table cells, keyboard behavior, undo and DOCX/PDF output need workflow verification.
19. **home.alignCenter:** Center is bound to the Home Paragraph button. Mixed/multiple paragraph selection, table cells, keyboard behavior, undo and DOCX/PDF output need workflow verification.
20. **home.alignRight:** Align Right is bound to the Home Paragraph button. Mixed/multiple paragraph selection, table cells, keyboard behavior, undo and DOCX/PDF output need workflow verification.
21. **insert.pageBreak:** Pagination and multi-section round-trip are not certified by the Ribbon binding alone.
22. **references.toc:** TOC creation, fields and export/round-trip remain independently testable.
23. **references.updateToc:** Eligibility and missing-TOC command states still need refinement.
24. **review.trackChanges:** Active state is wired to EditorState; tracked content fidelity and UI workflows remain to verify.
25. **review.previousRevision:** Cycles backward through text-run revisions in the active editing story. Pure selection navigation; structural/property revisions need separate navigation support.
26. **review.nextRevision:** Cycles forward through tracked text-run changes without editing the document; selection is limited to the active section/zone.
27. **review.commentsPanel:** An editor-scoped discussion drawer lists roots and nested replies, supports text search, open/resolved filters, navigation, moderation and confirmation before deletion. The Activity view shows undoable local comment events for creation, replies, edits, resolve/reopen and deletion; events are not exported to DOCX. Host IDs gate mutations. Visual parity remains partial.
28. **review.newComment:** Creates an authored comment anchored to selected text or a caret word, through a per-editor modal. Uses native comment registry and is undoable; visual E2E and full DOCX import/export fidelity are pending. WordCraft also places this action on Insert; Oasis currently exposes it on Review only, so placement parity remains open.
29. **review.replyComment:** Creates an unanchored threaded reply linked by parentId to the selected comment. DOCX commentsExtended XML parent relationship has unit coverage; cross-application round-trip remains unverified.
30. **review.editComment:** Edits only the selected existing comment's text in a transactional modal; ID, author, creation time, anchors, resolved state and reply links are preserved. Popup actions support editing individual nested replies. DOCX export/reimport and read-only gating have tests; full visual WordCraft parity remains unverified.
31. **review.previousComment:** Navigates to the prior anchored comment in the active story, skipping unanchored replies and wrapping.
32. **review.nextComment:** Navigates to the next anchored comment without changing the document; Mapped to WordCraft `review.nextComment`; semantic and persistence parity remain unverified.
33. **review.resolveComment:** Marks the comment under the selection as resolved, retaining the DOCX comment id, author, anchors and thread metadata. Needs round-trip E2E.
34. **review.reopenComment:** Reopens a resolved comment under the selection. Enabled only when the selected comment is resolved.
35. **review.deleteComment:** Removes an anchored comment and recursively removes replies to prevent orphan thread parent ids. Undo and DOCX source-package E2E remain to verify.
36. **review.accept:** Selection scope and disabled states for documents without revisions need tests.
37. **review.reject:** Selection scope and disabled states for documents without revisions need tests.
38. **view.showMargins:** Oasis-specific display option with active state bound to EditorState.
39. **view.paragraphMarks:** Paragraph-mark display feedback is wired; rendering and accessibility require E2E checks.
40. **view.preciseFonts:** Oasis precise-font mode; platform font availability still requires coverage.
41. **insert.header:** Enters the default header editing zone for the active section. First/even-page variant in-place editing and brand-new header part export remain follow-ups.
42. **insert.footer:** Enters the default footer editing zone for the active section. Variant in-place editing and brand-new footer part export remain follow-ups.
43. **insert.pageNumber:** Inserts a PAGE field at the caret inside a header/footer (or body). Field formatting (\* roman etc.) resolves in layout and round-trips through DOCX. Per-section start/format (w:pgNumType) is set via the setSectionPageNumbering payload command. Layout resolution E2E verification remains.
44. **insert.pageNumberXOfY:** Inserts the Page X of Y combination (PAGE + NUMPAGES with literals) at the caret, mirroring WordCraft insert.page_number format=of, with an optional \* number format.
45. **insert.pageNumberTop:** Places the active section's default header as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=top story rewrite). Alignment gallery is not yet exposed in UI.
46. **insert.pageNumberBottom:** Places the active section's default footer as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=bottom story rewrite). Round-trips through DOCX with alignment.
47. **insert.bookmark:** Bookmarks the current selection (single point when collapsed) into the document-level EditorBookmarks registry, exported as w:bookmarkStart/w:bookmarkEnd and round-tripped on import. Cross-reference insertion (PAGEREF/REF with refresh) remains a follow-up.
48. **insert.date:** Inserts a typed DATE field at the caret with a \@ picture (default M/d/yyyy), caching the formatted result in the run text and round-tripping through DOCX. The DATE_FORMATS picture gallery and TIME fields remain follow-ups.
49. **insert.exitHeaderFooter:** Returns the caret to the section body when editing a header/footer zone. Enabled only while the active zone is a header or footer.

## Audit interpretation

The audit scans the built-in command array, direct default-toolbar objects, the three active static button-spec arrays, literal commands executed by statically imported custom preset controls, Ribbon placement definitions and the default menubar. Dynamic command expressions and plugin contributions still require runtime coverage. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.

**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.
