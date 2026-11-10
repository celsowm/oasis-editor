# Oasis Ribbon Parity Matrix — Phase 0 Seed

> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.

**Scope:** 77-feature Oasis crosswalk against the pinned WordCraft source inventory of 521 entries. Unmatched WordCraft rows remain unclassified; this is not a complete parity matrix. Per-capability dimension fields are added as their evidence is reviewed; category-level exposure, semantics, and persistence evidence remains in references.json and docs/ribbon-office-progress.md.<br>
**Pinned WordCraft inventory:** `521 entries / 25 surfaces`; this crosswalk maps `77` Oasis capabilities and does not classify unmatched source rows as missing.<br>
**Oasis baseline:** `1acefe74b4cdf7d008c3cd3f4084bec102d7fbb9`<br>
**WordCraft baseline:** `05f781cfdac1d89034c0f4f5824b597ff845f2ef`

The three dimensions below are independent of overall status. A legacy Ribbon-bound row defaults to `partial` exposure from its audited wiring; missing semantics or persistence evidence stays `unverified`. `core-only` means the command is registered but has no statically observed default Ribbon or menubar path. No status alone certifies complete DOCX round-trip, PDF/layout, accessibility or browser behavior.

| Feature | WordCraft command | Oasis command | Ribbon placement | Status | Exposure | Semantics | Persistence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `home.copy` | `edit.copy` | `copy` | `home/clipboard` | partial | partial | unverified | unverified |
| `home.cut` | `edit.cut` | `cut` | `home/clipboard` | partial | partial | unverified | unverified |
| `home.formatPainter` | `edit.formatPainter` | `formatPainter` | `home/clipboard` | partial | partial | unverified | unverified |
| `home.formatPainterContinuous` | `edit.formatPainter` | `formatPainterContinuous` | `home/clipboard` | partial | partial | unverified | unverified |
| `home.paste` | `edit.paste` | `paste` | `home/clipboard` | partial | partial | unverified | unverified |
| `home.pasteMerge` | `edit.pasteMerge` | `pasteMergeFormatting` | `home/clipboard` | partial | partial | unverified | unverified |
| `home.pasteText` | `edit.pasteText` | `pasteAsPlainText` | `home/clipboard` | partial | partial | unverified | unverified |
| `home.find` | `edit.find` | `find` | `home/editing` | partial | partial | unverified | unverified |
| `home.selectAll` | `select.all` | `selectAll` | `home/editing` | partial | partial | unverified | unverified |
| `home.bold` | `format.bold` | `bold` | `home/font` | partial | partial | unverified | unverified |
| `home.italic` | `format.italic` | `italic` | `home/font` | partial | partial | unverified | unverified |
| `home.underline` | `format.underline` | `applyUnderlineStyle` | `home/font` | partial | partial | unverified | unverified |
| `home.doubleUnderline` | `format.doubleUnderline` | `applyUnderlineStyle` | `home/font` | partial | partial | unverified | unverified |
| `home.subscript` | `format.subscript` | `subscript` | `home/font` | partial | partial | unverified | unverified |
| `home.superscript` | `format.superscript` | `superscript` | `home/font` | partial | partial | unverified | unverified |
| `home.outdent` | `para.outdent` | `outdent` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.indent` | `para.indent` | `indent` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.alignLeft` | `para.alignLeft` | `alignLeft` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.alignCenter` | `para.alignCenter` | `alignCenter` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.alignRight` | `para.alignRight` | `alignRight` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.fontFamily` | `format.font` | `setFontFamily` | `home/font` | partial | partial | unverified | unverified |
| `home.fontSize` | `format.size` | `setFontSize` | `home/font` | partial | partial | unverified | unverified |
| `home.growFont` | `format.growFont` | `increaseFontSize` | `home/font` | partial | partial | unverified | unverified |
| `home.shrinkFont` | `format.shrinkFont` | `decreaseFontSize` | `home/font` | partial | partial | unverified | unverified |
| `home.changeCase` | `format.changeCase` | `changeTextCase` | `home/font` | partial | partial | unverified | unverified |
| `home.clearFormatting` | `format.clear` | `clearFormatting` | `home/font` | partial | partial | unverified | unverified |
| `home.strikethrough` | `format.strikethrough` | `strike` | `home/font` | partial | partial | unverified | unverified |
| `home.fontColor` | `format.color` | `setColor` | `home/font` | partial | partial | unverified | unverified |
| `home.textHighlight` | `format.highlight` | `setHighlight` | `home/font` | partial | partial | unverified | unverified |
| `home.characterShading` | `format.shading` | `setTextShading` | `home/font` | partial | partial | unverified | unverified |
| `home.bullets` | `para.bullets` | `bulletList` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.numbering` | `para.numbering` | `orderedList` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.restartNumbering` | `para.restartNumbering` | `setListStartAt` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.justify` | `para.justify` | `alignJustify` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.lineSpacing` | `para.lineSpacing` | `setLineHeight` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.spaceBefore` | `para.addSpaceBefore` | `setSpacingBefore` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.spaceAfter` | `para.removeSpaceAfter` | `setSpacingAfter` | `home/paragraph` | partial | partial | unverified | unverified |
| `home.style` | `para.style` | `setStyleId` | `home/styles` | partial | partial | unverified | unverified |
| `home.sortParagraphs` | `para.sort` | `sortParagraphs` | — | core-only | core-only | partial | unverified |
| `insert.pageBreak` | `insert.pageBreak` | `pageBreak` | `insert/pages` | partial | partial | unverified | unverified |
| `insert.table` | `insert.table` | `insertTable` | `insert/tables` | partial | partial | unverified | unverified |
| `insert.picture` | `insert.picture` | `insertImage` | `insert/illustrations` | partial | partial | unverified | unverified |
| `insert.link` | `insert.link` | `link` | `insert/links` | partial | partial | unverified | unverified |
| `insert.removeLink` | `insert.removeLink` | `unlink` | `insert/links` | partial | partial | unverified | unverified |
| `insert.shape` | `insert.shape` | `insertShape` | `insert/illustrations` | partial | partial | unverified | unverified |
| `insert.symbol` | `insert.symbol` | `insertText` | `insert/symbols` | partial | partial | unverified | unverified |
| `insert.equation` | `insert.equation` | `insertEquation` | `insert/symbols` | partial | partial | unverified | unverified |
| `references.toc` | `references.toc` | `insertTableOfContents` | `references/tableOfContents` | partial | partial | unverified | unverified |
| `references.updateToc` | `references.updateToc` | `updateTableOfContents` | `references/tableOfContents` | partial | partial | unverified | unverified |
| `references.footnote` | `references.footnote` | `insertFootnote` | `references/footnotes` | partial | partial | unverified | unverified |
| `references.caption` | `references.caption` | `insertImageCaption` | `insert/accessibility` | partial | partial | unverified | unverified |
| `review.trackChanges` | `review.trackChanges` | `toggleTrackChanges` | `review/tracking` | partial | partial | unverified | unverified |
| `review.previousRevision` | `review.previousChange` | `previousRevision` | `review/changes` | partial | partial | unverified | unverified |
| `review.nextRevision` | `review.nextChange` | `nextRevision` | `review/changes` | partial | partial | unverified | unverified |
| `review.commentsPanel` | `review.comments` | `toggleCommentsPanel` | `review/comments` | partial | partial | unverified | unverified |
| `review.newComment` | `review.newComment` | `newComment` | `review/comments` | partial | partial | unverified | unverified |
| `review.replyComment` | `review.reply` | `replyComment` | `review/comments` | partial | partial | unverified | unverified |
| `review.editComment` | — | `editComment` | `review/comments` | partial | partial | unverified | unverified |
| `review.previousComment` | `review.previousComment` | `previousComment` | `review/comments` | partial | partial | unverified | unverified |
| `review.nextComment` | `review.nextComment` | `nextComment` | `review/comments` | partial | partial | unverified | unverified |
| `review.resolveComment` | `review.resolveComment` | `resolveComment` | `review/comments` | partial | partial | unverified | unverified |
| `review.reopenComment` | — | `reopenComment` | `review/comments` | partial | partial | unverified | unverified |
| `review.deleteComment` | `review.deleteComment` | `deleteComment` | `review/comments` | partial | partial | unverified | unverified |
| `review.accept` | `review.accept` | `acceptRevisions` | `review/changes` | partial | partial | unverified | unverified |
| `review.reject` | `review.reject` | `rejectRevisions` | `review/changes` | partial | partial | unverified | unverified |
| `view.showMargins` | — | `toggleShowMargins` | `view/show` | partial | partial | unverified | unverified |
| `view.paragraphMarks` | `view.marks` | `toggleShowParagraphMarks` | `view/show` | partial | partial | unverified | unverified |
| `view.preciseFonts` | — | `togglePreciseFonts` | `view/show` | partial | partial | unverified | unverified |
| `insert.header` | `insert.header` | `editHeader` | `insert/headerFooter` | partial | partial | unverified | unverified |
| `insert.footer` | `insert.footer` | `editFooter` | `insert/headerFooter` | partial | partial | unverified | unverified |
| `insert.pageNumber` | `insert.pageNumber` | `insertPageNumber` | `insert/headerFooter` | partial | partial | unverified | unverified |
| `insert.pageNumberXOfY` | `insert.pageNumber` | `insertPageNumberXOfY` | `insert/headerFooter` | partial | partial | unverified | unverified |
| `insert.pageNumberTop` | `insert.pageNumber` | `placePageNumberTop` | `insert/headerFooter` | partial | partial | unverified | unverified |
| `insert.pageNumberBottom` | `insert.pageNumber` | `placePageNumberBottom` | `insert/headerFooter` | partial | partial | unverified | unverified |
| `insert.bookmark` | `insert.bookmark` | `insertBookmark` | `insert/links` | partial | partial | unverified | unverified |
| `insert.date` | `insert.dateTime` | `insertDateField` | `insert/links` | partial | partial | unverified | unverified |
| `insert.exitHeaderFooter` | — | `exitHeaderFooter` | `insert/headerFooter` | partial | partial | unverified | unverified |

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
39. **home.sortParagraphs:** The registered sortParagraphs command sorts a contiguous run of sibling paragraphs by natural number/text order and refuses ranges containing tables or footnote content. WordCraft para.sort serves the same paragraph-sorting task, but collates using the document language while Oasis currently uses runtime localeCompare. No default Ribbon or menubar entry exposes the command; DOCX/PDF reorder behavior and multilingual equivalence remain unverified.
40. **insert.pageBreak:** Pagination and multi-section round-trip are not certified by the Ribbon binding alone.
41. **insert.table:** The Insert grid picker dispatches row and column counts to the shared table command. Draw Table, text conversion, Quick Tables and spreadsheet insertion are separate WordCraft tasks; table selection, accessibility and DOCX round-trip remain independently unverified.
42. **insert.picture:** Inserts a local image through the host file picker and the shared image command. Online pictures, screenshots, 3D models, icons and SmartArt are distinct WordCraft tasks; format, size and round-trip workflows remain open.
43. **insert.link:** Opens the URL dialog for the selected range. In-document target selection, keyboard/focus behavior, undo and DOCX hyperlink round-trip remain independently unverified.
44. **insert.removeLink:** Removes the hyperlink from the selected linked text through the shared command. Mixed ranges, selection retention, undo and DOCX round-trip remain independently unverified.
45. **insert.shape:** The Shape Gallery inserts Oasis's supported preset subset through the shared shape command. Broader WordCraft shape kinds, geometry editing, arrangement, accessibility, rendering and DOCX round-trip remain open.
46. **insert.symbol:** Related task: the Oasis Symbols menu inserts its curated symbol/number subset as text and opens a broader symbol dialog. Per-symbol font selection and the full WordCraft symbol command contract are not established.
47. **insert.equation:** Equation templates in the Insert/Symbols menu dispatch the shared equation command. WordCraft also lists this command on its contextual Equation tab; Oasis does not yet expose an equivalent contextual surface. Full editing, navigation, rendering and OMML interoperability remain unverified.
48. **references.toc:** TOC creation, fields and export/round-trip remain independently testable.
49. **references.updateToc:** Eligibility and missing-TOC command states still need refinement.
50. **references.footnote:** The References action inserts a footnote at the current editing position. Focus restoration, multi-section behavior and DOCX interoperability remain independently unverified.
51. **references.caption:** Related task: Oasis exposes image caption insertion only when an image is selected, under Insert/Accessibility. WordCraft's caption command also covers tables and is placed under References; placement and target coverage differ.
52. **review.trackChanges:** Active state is wired to EditorState; tracked content fidelity and UI workflows remain to verify.
53. **review.previousRevision:** Related task to WordCraft Previous Change. Oasis cycles backward through text-run revisions in the active editing story; structural, table and section changes need separate navigation support. Pure selection navigation; parity remains partial.
54. **review.nextRevision:** Related task to WordCraft Next Change. Oasis cycles forward through tracked text-run revisions in the active editing story; structural, table and section changes need separate navigation support. Pure selection navigation; parity remains partial.
55. **review.commentsPanel:** Related task to WordCraft Show Comments: Oasis toggles an editor-scoped discussion drawer, while WordCraft's command returns the comment list. The drawer lists roots and nested replies, supports text search, open/resolved filters, navigation, moderation and confirmation before deletion. The Activity view shows undoable local comment events, which are not exported to DOCX. Host IDs gate mutations; visual parity remains partial.
56. **review.newComment:** Creates an authored comment anchored to selected text or a caret word, through a per-editor modal. Uses native comment registry and is undoable; visual E2E and full DOCX import/export fidelity are pending. WordCraft also places this action on Insert; Oasis currently exposes it on Review only, so placement parity remains open.
57. **review.replyComment:** Creates a threaded reply linked to its parent comment; Oasis stores the reply in an unanchored comment story linked by parentId. DOCX commentsExtended XML parent relationship has unit coverage; cross-application round-trip remains unverified.
58. **review.editComment:** Edits only the selected existing comment's text in a transactional modal; ID, author, creation time, anchors, resolved state and reply links are preserved. Popup actions support editing individual nested replies. DOCX export/reimport and read-only gating have tests; full visual WordCraft parity remains unverified.
59. **review.previousComment:** Navigates to the prior anchored comment in the active story, skipping unanchored replies and wrapping.
60. **review.nextComment:** Navigates to the next anchored comment without changing the document; Mapped to WordCraft `review.nextComment`; semantic and persistence parity remain unverified.
61. **review.resolveComment:** Marks the comment under the selection as resolved, retaining the DOCX comment id, author, anchors and thread metadata. Needs round-trip E2E.
62. **review.reopenComment:** Reopens a resolved comment under the selection. Enabled only when the selected comment is resolved.
63. **review.deleteComment:** Removes an anchored comment and recursively removes replies to prevent orphan thread parent ids. Undo and DOCX source-package E2E remain to verify.
64. **review.accept:** Selection scope and disabled states for documents without revisions need tests.
65. **review.reject:** Selection scope and disabled states for documents without revisions need tests.
66. **view.showMargins:** Oasis-specific display option with active state bound to EditorState.
67. **view.paragraphMarks:** Paragraph-mark display feedback is wired; rendering and accessibility require E2E checks.
68. **view.preciseFonts:** Oasis precise-font mode; platform font availability still requires coverage.
69. **insert.header:** Enters the default header editing zone for the active section. First/even-page variant in-place editing and brand-new header part export remain follow-ups.
70. **insert.footer:** Enters the default footer editing zone for the active section. Variant in-place editing and brand-new footer part export remain follow-ups.
71. **insert.pageNumber:** Inserts a PAGE field at the caret inside a header/footer (or body). Field formatting (\* roman etc.) resolves in layout and round-trips through DOCX. Per-section start/format (w:pgNumType) is set via the setSectionPageNumbering payload command. Layout resolution E2E verification remains.
72. **insert.pageNumberXOfY:** Inserts the Page X of Y combination (PAGE + NUMPAGES with literals) at the caret, mirroring WordCraft insert.page_number format=of, with an optional \* number format.
73. **insert.pageNumberTop:** Places the active section's default header as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=top story rewrite). Alignment gallery is not yet exposed in UI.
74. **insert.pageNumberBottom:** Places the active section's default footer as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=bottom story rewrite). Round-trips through DOCX with alignment.
75. **insert.bookmark:** Bookmarks the current selection (single point when collapsed) into the document-level EditorBookmarks registry, exported as w:bookmarkStart/w:bookmarkEnd and round-tripped on import. Cross-reference insertion (PAGEREF/REF with refresh) remains a follow-up.
76. **insert.date:** Inserts a typed DATE field at the caret with a \@ picture (default M/d/yyyy), caching the formatted result in the run text and round-tripping through DOCX. The DATE_FORMATS picture gallery and TIME fields remain follow-ups.
77. **insert.exitHeaderFooter:** Returns the caret to the section body when editing a header/footer zone. Enabled only while the active zone is a header or footer.

## Audit interpretation

The audit scans the built-in command array, direct default-toolbar objects, style-gallery command declarations, the three active static button-spec arrays, literal commands executed by statically imported custom preset controls, Ribbon placement definitions and the default menubar. Dynamic command expressions and plugin contributions still require runtime coverage. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.

**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.
