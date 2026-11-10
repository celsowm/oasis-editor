# Oasis Ribbon Parity Matrix — Phase 0 Seed

> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.

**Scope:** 76-feature Oasis crosswalk against the pinned WordCraft source inventory of 521 entries. Unmatched WordCraft rows remain unclassified; this is not a complete parity matrix. Category-level exposure, semantics, and persistence evidence is tracked separately in references.json and docs/ribbon-office-progress.md.<br>
**Pinned WordCraft inventory:** `521 entries / 25 surfaces`; this crosswalk maps `76` Oasis capabilities and does not classify unmatched source rows as missing.<br>
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
| `home.fontFamily` | `format.font` | `setFontFamily` | `home/font` | partial |
| `home.fontSize` | `format.size` | `setFontSize` | `home/font` | partial |
| `home.growFont` | `format.growFont` | `increaseFontSize` | `home/font` | partial |
| `home.shrinkFont` | `format.shrinkFont` | `decreaseFontSize` | `home/font` | partial |
| `home.changeCase` | `format.changeCase` | `changeTextCase` | `home/font` | partial |
| `home.clearFormatting` | `format.clear` | `clearFormatting` | `home/font` | partial |
| `home.strikethrough` | `format.strikethrough` | `strike` | `home/font` | partial |
| `home.fontColor` | `format.color` | `setColor` | `home/font` | partial |
| `home.textHighlight` | `format.highlight` | `setHighlight` | `home/font` | partial |
| `home.characterShading` | `format.shading` | `setTextShading` | `home/font` | partial |
| `home.bullets` | `para.bullets` | `bulletList` | `home/paragraph` | partial |
| `home.numbering` | `para.numbering` | `orderedList` | `home/paragraph` | partial |
| `home.restartNumbering` | `para.restartNumbering` | `setListStartAt` | `home/paragraph` | partial |
| `home.justify` | `para.justify` | `alignJustify` | `home/paragraph` | partial |
| `home.lineSpacing` | `para.lineSpacing` | `setLineHeight` | `home/paragraph` | partial |
| `home.spaceBefore` | `para.addSpaceBefore` | `setSpacingBefore` | `home/paragraph` | partial |
| `home.spaceAfter` | `para.removeSpaceAfter` | `setSpacingAfter` | `home/paragraph` | partial |
| `home.style` | `para.style` | `setStyleId` | `home/styles` | partial |
| `insert.pageBreak` | `insert.pageBreak` | `pageBreak` | `insert/pages` | partial |
| `insert.table` | `insert.table` | `insertTable` | `insert/tables` | partial |
| `insert.picture` | `insert.picture` | `insertImage` | `insert/illustrations` | partial |
| `insert.link` | `insert.link` | `link` | `insert/links` | partial |
| `insert.removeLink` | `insert.removeLink` | `unlink` | `insert/links` | partial |
| `insert.shape` | `insert.shape` | `insertShape` | `insert/illustrations` | partial |
| `insert.symbol` | `insert.symbol` | `insertText` | `insert/symbols` | partial |
| `insert.equation` | `insert.equation` | `insertEquation` | `insert/symbols` | partial |
| `references.toc` | `references.toc` | `insertTableOfContents` | `references/tableOfContents` | partial |
| `references.updateToc` | `references.updateToc` | `updateTableOfContents` | `references/tableOfContents` | partial |
| `references.footnote` | `references.footnote` | `insertFootnote` | `references/footnotes` | partial |
| `references.caption` | `references.caption` | `insertImageCaption` | `insert/accessibility` | partial |
| `review.trackChanges` | `review.trackChanges` | `toggleTrackChanges` | `review/tracking` | partial |
| `review.previousRevision` | `review.previousChange` | `previousRevision` | `review/changes` | partial |
| `review.nextRevision` | `review.nextChange` | `nextRevision` | `review/changes` | partial |
| `review.commentsPanel` | `review.comments` | `toggleCommentsPanel` | `review/comments` | partial |
| `review.newComment` | `review.newComment` | `newComment` | `review/comments` | partial |
| `review.replyComment` | `review.reply` | `replyComment` | `review/comments` | partial |
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
21. **home.fontFamily:** The Home font-family selector applies a font to the current text selection. East Asian font selection, fallback behavior, selection preservation and DOCX interoperability need workflow verification.
22. **home.fontSize:** The Home font-size selector applies a size to selected text. Mixed-size selection, units, keyboard editing and DOCX interoperability need workflow verification.
23. **home.growFont:** Increase Font Size is bound to the Home Font button. Step sizes, selection preservation and DOCX interoperability need workflow verification.
24. **home.shrinkFont:** Decrease Font Size is bound to the Home Font button. Step sizes, selection preservation and DOCX interoperability need workflow verification.
25. **home.changeCase:** The Change Case menu exposes sentence, lower, upper, capitalize and toggle actions. Oasis capitalize and WordCraft title modes may differ; Unicode, locale-specific casing, undo and selection behavior need workflow verification.
26. **home.clearFormatting:** Clear All Formatting is bound to the Home Font button. Character versus paragraph formatting, collapsed-caret behavior, style inheritance and undo need workflow verification.
27. **home.strikethrough:** Strikethrough is bound to the Home Font button. Mixed selections, inherited styles, undo and DOCX interoperability need workflow verification.
28. **home.fontColor:** Font Color is bound to the Home Font color picker. Automatic color, theme colors, recent-color behavior and DOCX interoperability need workflow verification.
29. **home.textHighlight:** Text Highlight Color is bound to the Home Font highlight picker. Palette equivalence, clearing, mixed selections and DOCX interoperability need workflow verification.
30. **home.characterShading:** Character Shading maps to the Home text-shading picker. Color values, clearing, distinction from text highlighting and DOCX interoperability need workflow verification.
31. **home.bullets:** Bullets is bound to the Home Paragraph button. Bullet libraries and per-list marker choices are separate workflows; mixed selections, nesting, numbering preservation and DOCX interoperability need verification.
32. **home.numbering:** Numbering is bound to the Home Paragraph button. Numbering formats, list continuation, mixed selections, nesting and DOCX interoperability need workflow verification.
33. **home.restartNumbering:** The list options control can set a numbering start value, including 1. WordCraft provides a dedicated restart action; shared-list continuation and DOCX behavior need workflow verification.
34. **home.justify:** Justify is bound to the Home Paragraph button. Mixed/multiple paragraph selection, table cells, keyboard behavior, undo and DOCX/PDF output need workflow verification.
35. **home.lineSpacing:** The line-spacing menu exposes multiple line-height presets and a dialog. WordCraft also supports at-least and exact point values; these modes, spacing, mixed selections and DOCX interoperability need workflow verification.
36. **home.spaceBefore:** The line-spacing dialog accepts a spacing-before value. WordCraft exposes a one-click toggle; entering its default value in Oasis is a related workflow, and units, selection and DOCX interoperability need verification.
37. **home.spaceAfter:** The line-spacing dialog accepts a spacing-after value. WordCraft exposes a one-click removal; entering zero in Oasis is a related workflow, and units, selection and DOCX interoperability need verification.
38. **home.style:** The Home style gallery dispatches paragraph styles through setStyleId. Style coverage, built-in IDs, preview fidelity, selection behavior and DOCX interoperability need workflow verification.
39. **insert.pageBreak:** Pagination and multi-section round-trip are not certified by the Ribbon binding alone.
40. **insert.table:** The Insert grid picker dispatches row and column counts to the shared table command. Draw Table, text conversion, Quick Tables and spreadsheet insertion are separate WordCraft tasks; table selection, accessibility and DOCX round-trip remain independently unverified.
41. **insert.picture:** Inserts a local image through the host file picker and the shared image command. Online pictures, screenshots, 3D models, icons and SmartArt are distinct WordCraft tasks; format, size and round-trip workflows remain open.
42. **insert.link:** Opens the URL dialog for the selected range. In-document target selection, keyboard/focus behavior, undo and DOCX hyperlink round-trip remain independently unverified.
43. **insert.removeLink:** Removes the hyperlink from the selected linked text through the shared command. Mixed ranges, selection retention, undo and DOCX round-trip remain independently unverified.
44. **insert.shape:** The Shape Gallery inserts Oasis's supported preset subset through the shared shape command. Broader WordCraft shape kinds, geometry editing, arrangement, accessibility, rendering and DOCX round-trip remain open.
45. **insert.symbol:** Related task: the Oasis Symbols menu inserts its curated symbol/number subset as text and opens a broader symbol dialog. Per-symbol font selection and the full WordCraft symbol command contract are not established.
46. **insert.equation:** Equation templates in the Insert/Symbols menu dispatch the shared equation command. WordCraft also lists this command on its contextual Equation tab; Oasis does not yet expose an equivalent contextual surface. Full editing, navigation, rendering and OMML interoperability remain unverified.
47. **references.toc:** TOC creation, fields and export/round-trip remain independently testable.
48. **references.updateToc:** Eligibility and missing-TOC command states still need refinement.
49. **references.footnote:** The References action inserts a footnote at the current editing position. Focus restoration, multi-section behavior and DOCX interoperability remain independently unverified.
50. **references.caption:** Related task: Oasis exposes image caption insertion only when an image is selected, under Insert/Accessibility. WordCraft's caption command also covers tables and is placed under References; placement and target coverage differ.
51. **review.trackChanges:** Active state is wired to EditorState; tracked content fidelity and UI workflows remain to verify.
52. **review.previousRevision:** Related task to WordCraft Previous Change. Oasis cycles backward through text-run revisions in the active editing story; structural, table and section changes need separate navigation support. Pure selection navigation; parity remains partial.
53. **review.nextRevision:** Related task to WordCraft Next Change. Oasis cycles forward through tracked text-run revisions in the active editing story; structural, table and section changes need separate navigation support. Pure selection navigation; parity remains partial.
54. **review.commentsPanel:** Related task to WordCraft Show Comments: Oasis toggles an editor-scoped discussion drawer, while WordCraft's command returns the comment list. The drawer lists roots and nested replies, supports text search, open/resolved filters, navigation, moderation and confirmation before deletion. The Activity view shows undoable local comment events, which are not exported to DOCX. Host IDs gate mutations; visual parity remains partial.
55. **review.newComment:** Creates an authored comment anchored to selected text or a caret word, through a per-editor modal. Uses native comment registry and is undoable; visual E2E and full DOCX import/export fidelity are pending. WordCraft also places this action on Insert; Oasis currently exposes it on Review only, so placement parity remains open.
56. **review.replyComment:** Creates a threaded reply linked to its parent comment; Oasis stores the reply in an unanchored comment story linked by parentId. DOCX commentsExtended XML parent relationship has unit coverage; cross-application round-trip remains unverified.
57. **review.editComment:** Edits only the selected existing comment's text in a transactional modal; ID, author, creation time, anchors, resolved state and reply links are preserved. Popup actions support editing individual nested replies. DOCX export/reimport and read-only gating have tests; full visual WordCraft parity remains unverified.
58. **review.previousComment:** Navigates to the prior anchored comment in the active story, skipping unanchored replies and wrapping.
59. **review.nextComment:** Navigates to the next anchored comment without changing the document; Mapped to WordCraft `review.nextComment`; semantic and persistence parity remain unverified.
60. **review.resolveComment:** Marks the comment under the selection as resolved, retaining the DOCX comment id, author, anchors and thread metadata. Needs round-trip E2E.
61. **review.reopenComment:** Reopens a resolved comment under the selection. Enabled only when the selected comment is resolved.
62. **review.deleteComment:** Removes an anchored comment and recursively removes replies to prevent orphan thread parent ids. Undo and DOCX source-package E2E remain to verify.
63. **review.accept:** Selection scope and disabled states for documents without revisions need tests.
64. **review.reject:** Selection scope and disabled states for documents without revisions need tests.
65. **view.showMargins:** Oasis-specific display option with active state bound to EditorState.
66. **view.paragraphMarks:** Paragraph-mark display feedback is wired; rendering and accessibility require E2E checks.
67. **view.preciseFonts:** Oasis precise-font mode; platform font availability still requires coverage.
68. **insert.header:** Enters the default header editing zone for the active section. First/even-page variant in-place editing and brand-new header part export remain follow-ups.
69. **insert.footer:** Enters the default footer editing zone for the active section. Variant in-place editing and brand-new footer part export remain follow-ups.
70. **insert.pageNumber:** Inserts a PAGE field at the caret inside a header/footer (or body). Field formatting (\* roman etc.) resolves in layout and round-trips through DOCX. Per-section start/format (w:pgNumType) is set via the setSectionPageNumbering payload command. Layout resolution E2E verification remains.
71. **insert.pageNumberXOfY:** Inserts the Page X of Y combination (PAGE + NUMPAGES with literals) at the caret, mirroring WordCraft insert.page_number format=of, with an optional \* number format.
72. **insert.pageNumberTop:** Places the active section's default header as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=top story rewrite). Alignment gallery is not yet exposed in UI.
73. **insert.pageNumberBottom:** Places the active section's default footer as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=bottom story rewrite). Round-trips through DOCX with alignment.
74. **insert.bookmark:** Bookmarks the current selection (single point when collapsed) into the document-level EditorBookmarks registry, exported as w:bookmarkStart/w:bookmarkEnd and round-tripped on import. Cross-reference insertion (PAGEREF/REF with refresh) remains a follow-up.
75. **insert.date:** Inserts a typed DATE field at the caret with a \@ picture (default M/d/yyyy), caching the formatted result in the run text and round-tripping through DOCX. The DATE_FORMATS picture gallery and TIME fields remain follow-ups.
76. **insert.exitHeaderFooter:** Returns the caret to the section body when editing a header/footer zone. Enabled only while the active zone is a header or footer.

## Audit interpretation

The audit scans the built-in command array, direct default-toolbar objects, style-gallery command declarations, the three active static button-spec arrays, literal commands executed by statically imported custom preset controls, Ribbon placement definitions and the default menubar. Dynamic command expressions and plugin contributions still require runtime coverage. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.

**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.
