# Oasis Ribbon Parity Matrix — Phase 0 Seed

> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.

**Scope:** Oasis capability crosswalk against the pinned WordCraft source inventory of 521 entries. Unmatched WordCraft rows remain unclassified; this is not a complete parity matrix. Per-capability dimension fields are added as their evidence is reviewed; category-level exposure, semantics, and persistence evidence remains in references.json and docs/ribbon-office-progress.md.<br>
**Pinned WordCraft inventory:** `521 entries / 25 surfaces`; this crosswalk maps `153` Oasis capabilities and does not classify unmatched source rows as missing.<br>
**Oasis baseline:** `1acefe74b4cdf7d008c3cd3f4084bec102d7fbb9`<br>
**WordCraft baseline:** `05f781cfdac1d89034c0f4f5824b597ff845f2ef`

The three dimensions below are independent of overall status. A legacy Ribbon-bound row defaults to `partial` exposure from its audited wiring; missing semantics or persistence evidence stays `unverified`. `core-only` means the command is registered but has no statically observed default Ribbon or menubar path. `menu-only` records a secondary path such as a dialog; each row supplies a UI path and source token that the audit checks. No status alone certifies complete DOCX round-trip, PDF/layout, accessibility or browser behavior.

| Feature | WordCraft command | Oasis command | Oasis surface | Status | Exposure | Semantics | Persistence |
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
| `home.horizontalLine` | `insert.horizontalLine` | `applyHorizontalLine` | — | core-only | core-only | partial | unverified |
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
| `insert.nonbreakingSpace` | `text.nbsp` | `insertNonBreakingSpace` | — | core-only | core-only | partial | unverified |
| `insert.nonbreakingHyphen` | `text.nbHyphen` | `insertNonBreakingHyphen` | — | core-only | core-only | partial | partial |
| `layout.hyphenation` | `layout.hyphenation` | `setHyphenation` | — | core-only | core-only | partial | partial |
| `home.underlineColor` | `format.underlineColor` | `setUnderlineColor` | Home > Font dialog > Font > Underline color | menu-only | menu-only | partial | partial |
| `home.smallCaps` | `format.smallCaps` | `smallCaps` | Home > Font dialog > Font > Small Caps | menu-only | menu-only | partial | partial |
| `home.allCaps` | `format.allCaps` | `allCaps` | Home > Font dialog > Font > All Caps | menu-only | menu-only | partial | partial |
| `home.hiddenText` | `format.hidden` | `hidden` | Home > Font dialog > Font > Hidden | menu-only | menu-only | partial | partial |
| `home.characterSpacing` | `format.spacing` | `setCharacterSpacing` | Home > Font dialog > Advanced > Character spacing | menu-only | menu-only | partial | partial |
| `home.characterScale` | `format.scale` | `setCharacterScale` | Home > Font dialog > Advanced > Scale | menu-only | menu-only | partial | partial |
| `home.characterPosition` | `format.position` | `setBaselineShift` | Home > Font dialog > Advanced > Position | menu-only | menu-only | partial | partial |
| `home.keepWithNext` | `para.keepNext` | `setKeepWithNext` | Layout > Paragraph dialog > Line and Page Breaks > Keep with next | menu-only | menu-only | partial | partial |
| `home.keepLinesTogether` | `para.keepLines` | `toggleKeepLinesTogether` | Layout > Paragraph dialog > Line and Page Breaks > Keep lines together | menu-only | menu-only | partial | partial |
| `home.pageBreakBefore` | `para.pageBreakBefore` | `setPageBreakBefore` | Layout > Paragraph dialog > Line and Page Breaks > Page break before | menu-only | menu-only | partial | partial |
| `home.widowControl` | `para.widowControl` | `toggleWidowControl` | Layout > Paragraph dialog > Line and Page Breaks > Widow/Orphan control | menu-only | menu-only | partial | partial |
| `home.outlineLevel` | `para.outlineLevel` | `setOutlineLevel` | Layout > Paragraph dialog > Indents and Spacing > Outline level | menu-only | menu-only | partial | partial |
| `home.tabs` | `para.tabs` | — | Layout > Paragraph dialog > Tabs | ui-only | ui-only | partial | unverified |
| `home.textEffectsOutline` | `format.outline` | `outline` | — | core-only | core-only | partial | unverified |
| `home.textEffectsShadow` | `format.shadow` | `shadow` | — | core-only | core-only | partial | unverified |
| `home.emboss` | `format.emboss` | `emboss` | — | core-only | core-only | partial | unverified |
| `home.engrave` | `format.engrave` | `engrave` | — | core-only | core-only | partial | unverified |
| `home.rtlDirection` | `para.rtl` | `setTextDirection` | — | core-only | core-only | partial | partial |
| `home.ltrDirection` | `para.ltr` | `setTextDirection` | — | core-only | core-only | partial | partial |
| `file.print` | `file.print` | `print` | `file/document` | partial | partial | partial | not-applicable |
| `file.exportPdf` | `file.exportPdf` | `exportPdf` | `file/document` | partial | partial | partial | partial |
| `home.undo` | `edit.undo` | `undo` | `home/history` | partial | partial | partial | not-applicable |
| `home.redo` | `edit.redo` | `redo` | `home/history` | partial | partial | partial | not-applicable |
| `insert.editHeader` | `insert.editHeader` | `editHeader` | `insert/headerFooter` | partial | partial | partial | partial |
| `insert.editFooter` | `insert.editFooter` | `editFooter` | `insert/headerFooter` | partial | partial | partial | partial |
| `editing.lineBreak` | `text.lineBreak` | `lineBreak` | — | core-only | core-only | partial | partial |
| `editing.columnBreak` | `text.columnBreak` | `columnBreak` | — | core-only | core-only | partial | partial |
| `home.paragraphTextShading` | `para.shading` | `setTextShading` | `home/font` | partial | partial | partial | unverified |
| `layout.paragraphShading` | `para.shading` | `setParagraphShading` | Layout > Paragraph metrics dropdown > Paragraph shading | menu-only | menu-only | partial | unverified |
| `layout.paragraphBorders` | `para.borders` | `applyParagraphBorders` | Layout > Paragraph metrics dropdown > Apply borders to paragraph | menu-only | menu-only | partial | unverified |
| `context.paragraphBordersDialog` | `para.borders` | — | Context menu > Paragraph dialog > Borders and shading | ui-only | ui-only | partial | unverified |
| `home.hangingIndent` | `para.hangingIndent` | `setSpecialIndent` | `home/paragraph` | partial | partial | partial | unverified |
| `home.listLevel` | `para.listLevel` | `setListLevel` | — | core-only | core-only | partial | unverified |
| `home.setNumberingValue` | `para.setNumberingValue` | `setListStartAt` | `home/paragraph` | partial | partial | partial | unverified |
| `home.asianTypographyKinsoku` | `para.asianTypography` | `setKinsoku` | — | core-only | core-only | partial | unverified |
| `home.asianTypographyWordWrap` | `para.asianTypography` | `setWordWrap` | — | core-only | core-only | partial | unverified |
| `home.asianTypographyOverflowPunct` | `para.asianTypography` | `setOverflowPunct` | — | core-only | core-only | partial | unverified |
| `home.asianTypographyTopLinePunct` | `para.asianTypography` | `setTopLinePunct` | — | core-only | core-only | partial | unverified |
| `home.asianTypographyAutoSpaceDE` | `para.asianTypography` | `setAutoSpaceDE` | — | core-only | core-only | partial | unverified |
| `home.asianTypographyAutoSpaceDN` | `para.asianTypography` | `setAutoSpaceDN` | — | core-only | core-only | partial | unverified |
| `context.paragraphDialog` | `para.dialog` | — | Context menu > Paragraph | ui-only | ui-only | partial | unverified |
| `context.fontDialog` | `format.fontDialog` | — | Context menu > Font | ui-only | ui-only | partial | unverified |
| `home.normalStyle` | `para.normal` | `setStyleId` | `home/styles` | partial | partial | partial | unverified |
| `home.heading1Style` | `para.heading1` | `setStyleId` | `home/styles` | partial | partial | partial | unverified |
| `home.heading2Style` | `para.heading2` | `setStyleId` | `home/styles` | partial | partial | partial | unverified |
| `home.heading3Style` | `para.heading3` | `setStyleId` | `home/styles` | partial | partial | partial | unverified |
| `home.characterStyle` | `format.charStyle` | `setCharacterStyleId` | `home/styles` | partial | partial | partial | unverified |
| `home.applyParagraphStyle` | `styles.apply` | `setStyleId` | `home/styles` | partial | partial | partial | unverified |
| `home.applyCharacterStyle` | `styles.apply` | `setCharacterStyleId` | `home/styles` | partial | partial | partial | unverified |
| `home.advancedFind` | `edit.advancedFind` | `find` | `home/editing` | partial | partial | partial | not-applicable |
| `home.findNext` | `edit.findNext` | — | Home > Find dialog > Next match | ui-only | ui-only | partial | not-applicable |
| `home.findPrevious` | `edit.findPrevious` | — | Home > Find dialog > Previous match | ui-only | ui-only | partial | not-applicable |
| `home.replaceOne` | `edit.replace` | — | Home > Find dialog > Replace | ui-only | ui-only | partial | unverified |
| `home.replaceAll` | `edit.replaceAll` | — | Home > Find dialog > Replace all | ui-only | ui-only | partial | unverified |
| `home.pasteSpecialFormatted` | `edit.pasteSpecial` | `paste` | `home/clipboard` | partial | partial | partial | unverified |
| `home.pasteSpecialText` | `edit.pasteSpecial` | `pasteAsPlainText` | `home/clipboard` | partial | partial | partial | unverified |
| `home.copyFormat` | `edit.copyFormat` | `formatPainter` | `home/clipboard` | partial | partial | partial | unverified |
| `home.pasteFormat` | `edit.pasteFormat` | — | Home > Format Painter > select destination text | ui-only | ui-only | partial | unverified |
| `layout.margins` | `layout.margins` | `setPageMargins` | Layout > Margins dropdown | menu-only | menu-only | partial | unverified |
| `layout.orientation` | `layout.orientation` | `setOrientation` | Layout > Section dropdown > Orientation | menu-only | menu-only | partial | unverified |
| `layout.columns` | `layout.columns` | `setColumns` | — | core-only | core-only | partial | unverified |
| `layout.breakPage` | `layout.break` | `pageBreak` | `insert/pages` | partial | partial | partial | unverified |
| `layout.breakColumn` | `layout.break` | `columnBreak` | — | core-only | core-only | partial | unverified |
| `layout.breakNextPage` | `layout.break` | `sectionBreakNextPage` | Layout > Section dropdown > Next-page section break | menu-only | menu-only | partial | unverified |
| `layout.breakContinuous` | `layout.break` | `sectionBreakContinuous` | Layout > Section dropdown > Continuous section break | menu-only | menu-only | partial | unverified |
| `layout.verticalAlign` | `layout.verticalAlign` | `setSectionVerticalAlign` | — | core-only | core-only | partial | unverified |
| `layout.sectionDirection` | `layout.sectionRtl` | `setSectionBidi` | — | core-only | core-only | partial | unverified |
| `layout.textDirection` | `layout.textDirection` | `setTextDirection` | — | core-only | core-only | partial | unverified |
| `insert.closeHeader` | `insert.closeHeader` | `exitHeaderFooter` | Insert > Header & Footer > Close Header and Footer | menu-only | menu-only | partial | not-applicable |
| `insert.pageNumberFormat` | `layout.pageNumberFormat` | `setSectionPageNumbering` | — | core-only | core-only | partial | unverified |
| `insert.differentFirstPage` | `layout.differentFirstPage` | `setDifferentFirstPage` | — | core-only | core-only | partial | unverified |
| `insert.differentOddEven` | `layout.differentOddEven` | `setDifferentOddEven` | — | core-only | core-only | partial | unverified |

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
40. **home.horizontalLine:** Both commands apply a single 1.5 pt bottom border to paragraphs in the selection. The Oasis command has no default Ribbon or menubar entry; selection scope, border-color behavior, undo and DOCX/PDF round-trip still need workflow verification.
41. **insert.pageBreak:** Pagination and multi-section round-trip are not certified by the Ribbon binding alone.
42. **insert.table:** The Insert grid picker dispatches row and column counts to the shared table command. Draw Table, text conversion, Quick Tables and spreadsheet insertion are separate WordCraft tasks; table selection, accessibility and DOCX round-trip remain independently unverified.
43. **insert.picture:** Inserts a local image through the host file picker and the shared image command. Online pictures, screenshots, 3D models, icons and SmartArt are distinct WordCraft tasks; format, size and round-trip workflows remain open.
44. **insert.link:** Opens the URL dialog for the selected range. In-document target selection, keyboard/focus behavior, undo and DOCX hyperlink round-trip remain independently unverified.
45. **insert.removeLink:** Removes the hyperlink from the selected linked text through the shared command. Mixed ranges, selection retention, undo and DOCX round-trip remain independently unverified.
46. **insert.shape:** The Shape Gallery inserts Oasis's supported preset subset through the shared shape command. Broader WordCraft shape kinds, geometry editing, arrangement, accessibility, rendering and DOCX round-trip remain open.
47. **insert.symbol:** Related task: the Oasis Symbols menu inserts its curated symbol/number subset as text and opens a broader symbol dialog. Per-symbol font selection and the full WordCraft symbol command contract are not established.
48. **insert.equation:** Equation templates in the Insert/Symbols menu dispatch the shared equation command. WordCraft also lists this command on its contextual Equation tab; Oasis does not yet expose an equivalent contextual surface. Full editing, navigation, rendering and OMML interoperability remain unverified.
49. **references.toc:** TOC creation, fields and export/round-trip remain independently testable.
50. **references.updateToc:** Eligibility and missing-TOC command states still need refinement.
51. **references.footnote:** The References action inserts a footnote at the current editing position. Focus restoration, multi-section behavior and DOCX interoperability remain independently unverified.
52. **references.caption:** Related task: Oasis exposes image caption insertion only when an image is selected, under Insert/Accessibility. WordCraft's caption command also covers tables and is placed under References; placement and target coverage differ.
53. **review.trackChanges:** Active state is wired to EditorState; tracked content fidelity and UI workflows remain to verify.
54. **review.previousRevision:** Related task to WordCraft Previous Change. Oasis cycles backward through text-run revisions in the active editing story; structural, table and section changes need separate navigation support. Pure selection navigation; parity remains partial.
55. **review.nextRevision:** Related task to WordCraft Next Change. Oasis cycles forward through tracked text-run revisions in the active editing story; structural, table and section changes need separate navigation support. Pure selection navigation; parity remains partial.
56. **review.commentsPanel:** Related task to WordCraft Show Comments: Oasis toggles an editor-scoped discussion drawer, while WordCraft's command returns the comment list. The drawer lists roots and nested replies, supports text search, open/resolved filters, navigation, moderation and confirmation before deletion. The Activity view shows undoable local comment events, which are not exported to DOCX. Host IDs gate mutations; visual parity remains partial.
57. **review.newComment:** Creates an authored comment anchored to selected text or a caret word, through a per-editor modal. Uses native comment registry and is undoable; visual E2E and full DOCX import/export fidelity are pending. WordCraft also places this action on Insert; Oasis currently exposes it on Review only, so placement parity remains open.
58. **review.replyComment:** Creates a threaded reply linked to its parent comment; Oasis stores the reply in an unanchored comment story linked by parentId. DOCX commentsExtended XML parent relationship has unit coverage; cross-application round-trip remains unverified.
59. **review.editComment:** Edits only the selected existing comment's text in a transactional modal; ID, author, creation time, anchors, resolved state and reply links are preserved. Popup actions support editing individual nested replies. DOCX export/reimport and read-only gating have tests; full visual WordCraft parity remains unverified.
60. **review.previousComment:** Navigates to the prior anchored comment in the active story, skipping unanchored replies and wrapping.
61. **review.nextComment:** Navigates to the next anchored comment without changing the document; Mapped to WordCraft `review.nextComment`; semantic and persistence parity remain unverified.
62. **review.resolveComment:** Marks the comment under the selection as resolved, retaining the DOCX comment id, author, anchors and thread metadata. Needs round-trip E2E.
63. **review.reopenComment:** Reopens a resolved comment under the selection. Enabled only when the selected comment is resolved.
64. **review.deleteComment:** Removes an anchored comment and recursively removes replies to prevent orphan thread parent ids. Undo and DOCX source-package E2E remain to verify.
65. **review.accept:** Selection scope and disabled states for documents without revisions need tests.
66. **review.reject:** Selection scope and disabled states for documents without revisions need tests.
67. **view.showMargins:** Oasis-specific display option with active state bound to EditorState.
68. **view.paragraphMarks:** Paragraph-mark display feedback is wired; rendering and accessibility require E2E checks.
69. **view.preciseFonts:** Oasis precise-font mode; platform font availability still requires coverage.
70. **insert.header:** Enters the default header editing zone for the active section. First/even-page variant in-place editing and brand-new header part export remain follow-ups.
71. **insert.footer:** Enters the default footer editing zone for the active section. Variant in-place editing and brand-new footer part export remain follow-ups.
72. **insert.pageNumber:** Inserts a PAGE field at the caret inside a header/footer (or body). Field formatting (\* roman etc.) resolves in layout and round-trips through DOCX. Per-section start/format (w:pgNumType) is set via the setSectionPageNumbering payload command. Layout resolution E2E verification remains.
73. **insert.pageNumberXOfY:** Inserts the Page X of Y combination (PAGE + NUMPAGES with literals) at the caret, mirroring WordCraft insert.page_number format=of, with an optional \* number format.
74. **insert.pageNumberTop:** Places the active section's default header as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=top story rewrite). Alignment gallery is not yet exposed in UI.
75. **insert.pageNumberBottom:** Places the active section's default footer as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=bottom story rewrite). Round-trips through DOCX with alignment.
76. **insert.bookmark:** Bookmarks the current selection (single point when collapsed) into the document-level EditorBookmarks registry, exported as w:bookmarkStart/w:bookmarkEnd and round-tripped on import. Cross-reference insertion (PAGEREF/REF with refresh) remains a follow-up.
77. **insert.date:** Inserts a typed DATE field at the caret with a \@ picture (default M/d/yyyy), caching the formatted result in the run text and round-tripping through DOCX. The DATE_FORMATS picture gallery and TIME fields remain follow-ups.
78. **insert.exitHeaderFooter:** Returns the caret to the section body when editing a header/footer zone. Enabled only while the active zone is a header or footer.
79. **insert.nonbreakingSpace:** Both commands insert a nonbreaking space at the current editing position. The Oasis command is registered without a default Ribbon or menubar entry; selection replacement, caret behavior and DOCX/PDF round-trip need direct workflow evidence.
80. **insert.nonbreakingHyphen:** Both commands insert U+2011 at the current editing position. Oasis has no default Ribbon or menubar entry; DOCX serialization/import recognizes w:noBreakHyphen, but selection, caret and end-to-end round-trip behavior still need workflow verification.
81. **layout.hyphenation:** Both implementations model automatic hyphenation, zone, capital-word handling and consecutive-line limit. Oasis applies settings to layout and imports/exports the corresponding DOCX settings; no default Ribbon or menubar entry exposes the command, and rendered pagination plus complete round-trip behavior still need workflow evidence.
82. **home.underlineColor:** The Font dialog exposes an underline color field; WordCraft also accepts automatic color that follows the text color. Mixed values, the automatic-color mapping, dialog focus/selection, undo and DOCX output need direct workflow verification.
83. **home.smallCaps:** Small Caps is available in the Font dialog, not as a direct Home control. The dialog applies a combined font-settings transaction; mixed-state rendering, command-boundary consistency, selection retention, undo and DOCX round-trip need verification.
84. **home.allCaps:** All Caps is available in the Font dialog, not as a direct Home control. The dialog applies a combined font-settings transaction; mixed-state rendering, command-boundary consistency, selection retention, undo and DOCX round-trip need verification.
85. **home.hiddenText:** Hidden text is available in the Font dialog. Visibility rules, mixed-state rendering, command-boundary consistency, selection retention, undo and DOCX round-trip need workflow verification.
86. **home.characterSpacing:** Advanced Font exposes normal, expanded and condensed spacing with an amount. WordCraft's command accepts a signed point value; unit conversion, range, mixed state, selection retention, undo and DOCX rendering need verification.
87. **home.characterScale:** Character scale is available in Advanced Font as percentage presets. The control's range and preset coverage, mixed state, selection retention, undo and DOCX rendering need verification against WordCraft's numeric percentage command.
88. **home.characterPosition:** Advanced Font offers normal, raised and lowered position with an amount. Point units, numeric range, mixed state, selection retention, undo and DOCX rendering need workflow verification.
89. **home.keepWithNext:** The Paragraph dialog exposes Keep with next; Oasis has a registered value command. The dialog commits several paragraph fields together, so per-command dispatch, mixed selections, pagination, undo and DOCX behavior need verification.
90. **home.keepLinesTogether:** The Paragraph dialog exposes Keep lines together; Oasis has a registered toggle command. Dialog transaction behavior, mixed selections, pagination, undo and DOCX behavior need verification.
91. **home.pageBreakBefore:** The Paragraph dialog exposes Page break before; Oasis has a registered value command. Dialog transaction behavior, mixed selections, pagination, undo and DOCX behavior need verification.
92. **home.widowControl:** The Paragraph dialog exposes Widow/Orphan control; Oasis has a registered toggle command. Dialog transaction behavior, mixed selections, pagination, undo and DOCX behavior need verification.
93. **home.outlineLevel:** Outline level is available in the Paragraph dialog. The command and selector accept levels, but built-in style interaction, mixed selections, navigation outline, undo and DOCX interoperability need verification.
94. **home.tabs:** Oasis provides a Tabs dialog, but no registered shared command for WordCraft's set/clear/default tab-stop payload is wired here. Mutation, undo, default stops and DOCX round-trip remain unverified.
95. **home.textEffectsOutline:** Oasis registers an outline character-style command but no default Ribbon, menu or dialog control was found. Rendering, selection behavior, undo and DOCX preservation need verification.
96. **home.textEffectsShadow:** Oasis registers a shadow character-style command but no default Ribbon, menu or dialog control was found. Rendering, selection behavior, undo and DOCX preservation need verification.
97. **home.emboss:** Oasis registers an emboss character-style command but no default Ribbon, menu or dialog control was found. Rendering, selection behavior, undo and DOCX preservation need verification.
98. **home.engrave:** Oasis registers an engrave character-style command but no default Ribbon, menu or dialog control was found. Rendering, selection behavior, undo and DOCX preservation need verification.
99. **home.rtlDirection:** Oasis registers a text-direction value command but no default Ribbon or menu control was found. Direction scope, mixed selections, RTL shaping and DOCX interoperability need workflow verification.
100. **home.ltrDirection:** Oasis registers a text-direction value command but no default Ribbon or menu control was found. Direction scope, mixed selections, RTL shaping and DOCX interoperability need workflow verification.
101. **file.print:** Oasis exposes Print in File > Document through the host/browser print flow. Page breaks, print settings, cancellation/errors, keyboard access and actual Safari output need workflow verification.
102. **file.exportPdf:** Oasis exposes PDF export in File > Document. Long documents, page-level features, output integrity, failure/cancel behavior and visual comparisons still need workflow verification.
103. **home.undo:** Oasis places Undo in Home > History while WordCraft exposes it in Quick Access. Shared history dispatch is wired; transaction scope, disabled state, keyboard parity and multi-step user workflows need verification.
104. **home.redo:** Oasis places Redo in Home > History while WordCraft exposes it in Quick Access. Shared history dispatch is wired; transaction scope, disabled state, keyboard parity and multi-step user workflows need verification.
105. **insert.editHeader:** Oasis exposes Edit Header from the Insert > Header & Footer menu. WordCraft also places it on its contextual Header & Footer tab; variant editing, selection/focus behavior and DOCX story round-trip need verification.
106. **insert.editFooter:** Oasis exposes Edit Footer from the Insert > Header & Footer menu. WordCraft also places it on its contextual Header & Footer tab; variant editing, selection/focus behavior and DOCX story round-trip need verification.
107. **editing.lineBreak:** Oasis registers a hard-line-break command but no default Ribbon/menubar control or shortcut was found. Selection/caret behavior, undo and DOCX break round-trip need verification.
108. **editing.columnBreak:** Oasis registers a hard-column-break command but no default Ribbon/menubar control or shortcut was found. Column layout, selection/caret behavior, undo and DOCX break round-trip need verification.
109. **home.paragraphTextShading:** WordCraft para.shading shades selected text when the selection is within one paragraph; Oasis exposes character shading in Home > Font. This covers that scope of the context-sensitive command, while paragraph scope is tracked separately. Mixed ranges, clear behavior, undo and DOCX interoperability need workflow verification.
110. **layout.paragraphShading:** WordCraft para.shading applies paragraph shading at a caret or when explicitly requested; Oasis exposes a paragraph-color field in the Layout metrics dropdown and also a field in the Paragraph dialog. The control does not provide WordCraft's combined text/paragraph scope or palette workflow; mixed selections, clearing, undo and DOCX interoperability need verification.
111. **layout.paragraphBorders:** The Oasis quick action applies a 1 pt solid black border on all four paragraph sides. WordCraft para.borders offers individual sides, presets, styles, widths and colors, so this is only a related task; per-side formatting is available separately in the Paragraph dialog. Selection scope, undo and DOCX/PDF output need verification.
112. **context.paragraphBordersDialog:** The Paragraph dialog commits configurable sides, one shared style, width and color through a dialog transaction, with no shared Oasis command for the full payload. WordCraft also supports independent per-side styles, between borders and more styles; undo grouping and DOCX/PDF behavior need workflow verification.
113. **home.hangingIndent:** The Home special-indent menu exposes Hanging. WordCraft adds 36 pt to the existing left indent; the Oasis menu sets a 36 pt hanging indent by default, so repeated use and paragraphs with existing indents can differ. Selection scope, undo and DOCX/PDF behavior need verification.
114. **home.listLevel:** Oasis registers a command that sets the selected list paragraphs' explicit level from 0–8, matching WordCraft's task; no default Ribbon or menubar control exposes the numeric level. Mixed list selections, numbering definitions, undo and DOCX interoperability need verification.
115. **home.setNumberingValue:** The List Options start field sets a numbering start value. WordCraft creates a numbering override that continues across following paragraphs sharing that list; Oasis updates the selected paragraphs' start value, so continuation and selection scope differ. Undo and DOCX behavior need workflow verification.
116. **home.asianTypographyKinsoku:** Oasis registers the Kinsoku setting as a separate command, but no default Ribbon, menu or dialog control was found. Its behavior, Japanese line-breaking output, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
117. **home.asianTypographyWordWrap:** Oasis registers the East Asian word-wrap setting as a separate command, but no default Ribbon, menu or dialog control was found. Its behavior, mixed-script line breaking, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
118. **home.asianTypographyOverflowPunct:** Oasis registers punctuation overflow as a separate command, but no default Ribbon, menu or dialog control was found. Rendering, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
119. **home.asianTypographyTopLinePunct:** Oasis registers top-line punctuation compression as a separate command, but no default Ribbon, menu or dialog control was found. Rendering, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
120. **home.asianTypographyAutoSpaceDE:** Oasis registers automatic spacing between East Asian and Latin text as a separate command, but no default Ribbon, menu or dialog control was found. Font/run handling, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
121. **home.asianTypographyAutoSpaceDN:** Oasis registers automatic spacing between East Asian text and numbers as a separate command, but no default Ribbon, menu or dialog control was found. Font/run handling, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
122. **context.paragraphDialog:** Oasis opens its Paragraph dialog from the editor context menu; WordCraft exposes a Paragraph dialog launcher on Home and Layout. The entry point is UI-only and the dialog does not share WordCraft's command contract. Field coverage, selection scope, undo and document round-trips remain independently tracked.
123. **context.fontDialog:** Oasis opens the Font dialog from the editor context menu; WordCraft exposes a Font dialog launcher on Home. The entry point is UI-only and does not share a launcher command. Font and Advanced tab fields are tracked separately; field coverage, selection scope, undo and DOCX behavior remain to be verified.
124. **home.normalStyle:** Normal is selectable from Oasis's Home style gallery through setStyleId. WordCraft also provides a dedicated Normal command and shortcut; style ID/name resolution, inherited formatting, selection scope and DOCX interoperability need verification.
125. **home.heading1Style:** Heading 1 is selectable from Oasis's Home style gallery through setStyleId. WordCraft also provides a dedicated Heading 1 command and shortcut; style ID/name resolution, outline/navigation behavior, selection scope and DOCX interoperability need verification.
126. **home.heading2Style:** Heading 2 is selectable from Oasis's Home style gallery through setStyleId. WordCraft also provides a dedicated Heading 2 command and shortcut; style ID/name resolution, outline/navigation behavior, selection scope and DOCX interoperability need verification.
127. **home.heading3Style:** Heading 3 is selectable from Oasis's Home style gallery through setStyleId. WordCraft also provides a dedicated Heading 3 command and shortcut; style ID/name resolution, outline/navigation behavior, selection scope and DOCX interoperability need verification.
128. **home.characterStyle:** Oasis's Home style gallery applies character styles through setCharacterStyleId and lists quick styles. Style availability filtering, name/ID resolution, mixed selections, reset behavior, undo and DOCX interoperability need workflow verification.
129. **home.applyParagraphStyle:** WordCraft styles.apply with a paragraph-style payload maps to Oasis's paragraph-style gallery path. WordCraft's no-payload branch opens a Styles pane that Oasis does not expose; style application, inherited formatting, selection behavior and DOCX interoperability need workflow verification.
130. **home.applyCharacterStyle:** WordCraft styles.apply with a character-style payload maps to Oasis's character-style gallery path. WordCraft's no-payload branch opens a Styles pane that Oasis does not expose; style availability, selection behavior, clearing, undo and DOCX interoperability need workflow verification.
131. **home.advancedFind:** The Oasis Find button opens a dialog with match-case and whole-word filters. WordCraft Advanced Find also supports prefix/suffix matching, ignored punctuation/spacing, wildcards, regex, special codes, selection scope and match highlighting; those paths are not represented in Oasis.
132. **home.findNext:** The Find dialog advances to the next match through its controller, and Enter invokes the same action. Oasis has no shared find-next command; wraparound, selection retention and parity with WordCraft's additional search options need workflow verification.
133. **home.findPrevious:** The Find dialog moves to the previous match through its controller, and Shift+Enter invokes the same action. Oasis has no shared find-previous command; wraparound, selection retention and parity with WordCraft's additional search options need workflow verification.
134. **home.replaceOne:** Replace one applies the replacement term to the active match through the dialog controller. WordCraft's edit.replace accepts a direct search/replacement payload with advanced options; Oasis has no shared command bound to this UI action. Selection, formatting preservation, undo and DOCX behavior need workflow verification.
135. **home.replaceAll:** Replace all runs through the dialog controller and supports match-case and whole-word filters. The separate Oasis replaceAll command is not dispatched by this UI; WordCraft also supports regex/special codes and a wider option set. A single undo step, formatting, selection and DOCX behavior need workflow verification.
136. **home.pasteSpecialFormatted:** Oasis Paste covers the formatted/HTML paste path from WordCraft Paste Special. WordCraft also offers direct RTF and picture formats; Oasis's browser clipboard path and image-only behavior need separate verification.
137. **home.pasteSpecialText:** Oasis Paste as Plain Text covers WordCraft Paste Special's text-only format. RTF/picture variants and native clipboard permissions are not covered; selection replacement, one-step undo and DOCX output need workflow verification.
138. **home.copyFormat:** Oasis's one-shot Format Painter captures the selected source formatting when armed, covering WordCraft Copy Formatting as part of a combined interaction. Source capture, selection scope, hyperlinks and complex stories need workflow verification.
139. **home.pasteFormat:** After Format Painter is armed, Oasis applies the captured style when the destination selection is finalized; WordCraft exposes Paste Formatting as a separate command. This is a related UI task with different event timing and no shared command for the apply step; pointer/keyboard coverage, undo and DOCX behavior need verification.
140. **layout.margins:** Oasis provides standard margin presets and custom top/bottom/left/right values. WordCraft also supports mirrored margins, gutter and an Office 2003 preset; units, section scope, print layout and DOCX round-trips need workflow verification.
141. **layout.orientation:** The Section dropdown sets Portrait or Landscape with the shared setOrientation command. Active-section scope, page-size interactions, selection handling and DOCX/PDF layout need workflow verification.
142. **layout.columns:** Oasis registers a column-layout command but no default Ribbon, menu or dialog control was found. WordCraft exposes presets, spacing, separators, unequal widths and apply scopes; selection/section behavior and DOCX/PDF pagination need workflow verification.
143. **layout.breakPage:** Oasis's Insert > Page Break button covers the page-break variant of WordCraft Layout > Breaks. Section-break variants, selection in tables and pagination/DOCX behavior remain separate.
144. **layout.breakColumn:** Oasis registers a column-break command but no default Ribbon, menu or shortcut was found. Layout must contain columns for the break to have the same effect; caret/selection, pagination and DOCX round-trip need verification.
145. **layout.breakNextPage:** The Section dropdown inserts a next-page section break. WordCraft Breaks also offers even-page and odd-page starts; section boundary, header/footer inheritance and pagination need workflow verification.
146. **layout.breakContinuous:** The Section dropdown inserts a continuous section break. WordCraft Breaks also offers even-page and odd-page starts; section boundary, header/footer inheritance and pagination need workflow verification.
147. **layout.verticalAlign:** Oasis registers top, center and bottom section alignment but no default UI; WordCraft also supports justified/both distribution across the page. Section scope, pagination and DOCX/PDF output need workflow verification.
148. **layout.sectionDirection:** Oasis registers the section bidirectional-layout flag but no default Ribbon or menu control was found. WordCraft defines RTL section columns; column order, mixed sections, pagination and DOCX interoperability need workflow verification.
149. **layout.textDirection:** Oasis registers paragraph vertical-text flow values but no default UI. WordCraft applies text direction to section(s), table cells or text boxes as well as paragraphs, so target scope and rotated text rendering remain partial; DOCX interoperability needs verification.
150. **insert.closeHeader:** Oasis exposes Exit Header/Footer in the Insert Header & Footer menu. WordCraft's close command returns from the active story; the two products differ in the observed close path. Focus restoration, current-story transitions and keyboard behavior need workflow verification.
151. **insert.pageNumberFormat:** Oasis registers section page-number format/start settings, but no default Ribbon, menu or dialog control was found. Format coverage, continue-from-previous semantics, section scope, pagination and DOCX/PDF output need workflow verification.
152. **insert.differentFirstPage:** Oasis registers the separate-first-page header/footer flag, but no default UI control was found. Story creation/inheritance, active-section scope, pagination and DOCX interoperability need workflow verification.
153. **insert.differentOddEven:** Oasis registers the different-odd/even-pages setting, but no default UI control was found. Story creation/inheritance, document-wide scope, pagination and DOCX interoperability need workflow verification.

## Audit interpretation

The audit scans the built-in command array, direct default-toolbar objects, style-gallery command declarations, the three active static button-spec arrays, literal commands executed by statically imported custom preset controls, Ribbon placement definitions and the default menubar. Dynamic command expressions and plugin contributions still require runtime coverage. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.

**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.
