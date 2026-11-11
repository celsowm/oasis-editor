# Oasis Ribbon Parity Matrix — Phase 0 Seed

> Generated from `scripts/ribbon-parity/features.json`. Run `npm run audit:ribbon:write` to regenerate; `npm run audit:ribbon` validates the wiring and the snapshot.

**Scope:** Oasis capability crosswalk against the pinned WordCraft source inventory of 521 entries. Unmatched WordCraft rows remain unclassified; this is not a complete parity matrix. Per-capability dimension fields are added as their evidence is reviewed; category-level exposure, semantics, and persistence evidence remains in references.json and docs/ribbon-office-progress.md.<br>
**Pinned WordCraft inventory:** `521 entries / 25 surfaces`; this crosswalk maps `551` Oasis capabilities and does not classify unmatched source rows as missing.<br>
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
| `home.stylePaneRelated` | `styles.pane` | `setStyleId` | `home/styles` | partial | partial | partial | unverified |
| `review.wordCountStatusRelated` | `review.wordCount` | — | Status bar > word count | ui-only | ui-only | partial | not-applicable |
| `view.zoomStatusRelated` | `view.zoom` | — | Status bar > zoom slider | ui-only | ui-only | partial | not-applicable |
| `view.zoom100Related` | `view.zoom100` | — | Status bar > zoom slider | ui-only | ui-only | partial | not-applicable |
| `view.zoomInRelated` | `view.zoomIn` | — | Status bar > zoom plus button | ui-only | ui-only | partial | not-applicable |
| `view.zoomOutRelated` | `view.zoomOut` | — | Status bar > zoom minus button | ui-only | ui-only | partial | not-applicable |
| `view.navigationOutlineRelated` | `view.navigationPane` | — | Document stage > Outline panel | ui-only | ui-only | partial | not-applicable |
| `view.horizontalRulerRelated` | `view.ruler` | — | Document canvas > horizontal ruler | ui-only | ui-only | partial | not-applicable |
| `view.printLayoutRelated` | `view.printLayout` | — | Document canvas > paginated paper stack | ui-only | ui-only | partial | not-applicable |
| `home.sortParagraphs` | `para.sort` | `sortParagraphs` | — | core-only | core-only | partial | unverified |
| `home.horizontalLine` | `insert.horizontalLine` | `applyHorizontalLine` | — | core-only | core-only | partial | unverified |
| `insert.pageBreak` | `insert.pageBreak` | `pageBreak` | `insert/pages` | partial | partial | unverified | unverified |
| `insert.blankPageRelated` | `insert.blankPage` | `pageBreak` | `insert/pages` | partial | partial | partial | unverified |
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
| `file.new` | `file.new` | `newDocument` | `file/document` | partial | partial | partial | not-applicable |
| `file.save` | `file.save` | `saveDocument` | `file/document` | partial | partial | partial | partial |
| `file.open` | `file.open` | `importDocument` | `file/document` | partial | partial | partial | partial |
| `file.newFromTemplate` | `file.newFromTemplate` | — | — | missing | missing | missing | unverified |
| `file.saveTemplate` | `file.saveTemplate` | — | — | missing | missing | missing | unverified |
| `file.listTemplates` | `file.listTemplates` | — | — | missing | missing | missing | unverified |
| `file.saveAs` | `file.saveAs` | `exportDocx` | `file/document` | partial | partial | partial | partial |
| `file.printMarkup` | `file.printMarkup` | — | — | missing | missing | missing | unverified |
| `file.close` | `file.close` | — | — | missing | missing | missing | unverified |
| `file.info` | `file.info` | — | — | missing | missing | missing | unverified |
| `file.properties` | `file.properties` | — | — | missing | missing | missing | unverified |
| `file.exportPng` | `file.exportPng` | — | — | missing | missing | missing | unverified |
| `file.options` | `file.options` | — | — | missing | missing | missing | unverified |
| `view.numeral` | `view.numeral` | — | — | missing | missing | missing | unverified |
| `file.share` | `file.share` | — | — | missing | missing | missing | unverified |
| `file.protect` | `file.protect` | — | — | missing | missing | missing | unverified |
| `file.inspect` | `file.inspect` | — | — | missing | missing | missing | unverified |
| `file.accessibility` | `file.accessibility` | — | — | missing | missing | missing | unverified |
| `file.compatibility` | `file.compatibility` | — | — | missing | missing | missing | unverified |
| `file.versions` | `file.versions` | — | — | missing | missing | missing | unverified |
| `file.recover` | `file.recover` | — | — | missing | missing | missing | unverified |
| `quickAccess.undoTo` | `edit.undoTo` | — | — | missing | missing | missing | unverified |
| `quickAccess.repeat` | `edit.repeat` | — | — | missing | missing | missing | unverified |
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
| `layout.suppressLineNumbers` | `layout.lineNumbers` | `setSuppressLineNumbers` | — | core-only | core-only | partial | unverified |
| `layout.objectPosition` | `arrange.position` | `setFloatingPositionPreset` | — | core-only | core-only | partial | unverified |
| `layout.objectWrap` | `arrange.wrap` | `setFloatingWrapPreset` | — | core-only | core-only | partial | unverified |
| `layout.objectBringForward` | `arrange.bringForward` | `reorderFloatingObject` | — | core-only | core-only | partial | unverified |
| `layout.objectSendBackward` | `arrange.sendBackward` | `reorderFloatingObject` | — | core-only | core-only | partial | unverified |
| `layout.objectAlign` | `arrange.align` | `alignFloatingObject` | — | core-only | core-only | partial | unverified |
| `layout.objectRotate` | `arrange.rotate` | `setFloatingRotation` | — | core-only | core-only | partial | unverified |
| `layout.paperSizePreset` | `layout.size` | `setPaperSizePreset` | — | core-only | core-only | partial | unverified |
| `layout.paperSizeCustom` | `layout.size` | `setPaperSize` | — | core-only | core-only | partial | unverified |
| `layout.paragraphIndentLeft` | `para.indents` | `setIndentLeft` | Context menu > Paragraph > Indents > Left | menu-only | menu-only | partial | unverified |
| `layout.paragraphIndentRight` | `para.indents` | `setIndentRight` | Context menu > Paragraph > Indents > Right | menu-only | menu-only | partial | unverified |
| `layout.paragraphIndentFirstLine` | `para.indents` | `setIndentFirstLine` | Context menu > Paragraph > Indents > First line | menu-only | menu-only | partial | unverified |
| `layout.paragraphIndentHanging` | `para.indents` | `setIndentHanging` | Context menu > Paragraph > Indents > Hanging | menu-only | menu-only | partial | unverified |
| `layout.paragraphMirrorIndents` | `para.indents` | `setMirrorIndents` | Context menu > Paragraph > Indents > Mirror indents | menu-only | menu-only | partial | unverified |
| `layout.paragraphSpacingBefore` | `para.spacing` | `setSpacingBefore` | Context menu > Paragraph > Spacing > Before | menu-only | menu-only | partial | unverified |
| `layout.paragraphSpacingAfter` | `para.spacing` | `setSpacingAfter` | Context menu > Paragraph > Spacing > After | menu-only | menu-only | partial | unverified |
| `layout.paragraphLineHeight` | `para.spacing` | `setLineHeight` | Context menu > Paragraph > Spacing > Line spacing at | menu-only | menu-only | partial | unverified |
| `layout.paragraphLineRule` | `para.spacing` | `setLineRule` | Context menu > Paragraph > Spacing > Line spacing mode | menu-only | menu-only | partial | unverified |
| `layout.paragraphContextualSpacing` | `para.spacing` | `setContextualSpacing` | Context menu > Paragraph > Spacing > Contextual spacing | menu-only | menu-only | partial | unverified |
| `home.doubleStrikethroughCommand` | `format.doubleStrikethrough` | `doubleStrike` | — | core-only | core-only | partial | unverified |
| `home.doubleStrikethroughDialog` | `format.doubleStrikethrough` | — | Home > Font dialog > Font > Double strikethrough | ui-only | ui-only | partial | unverified |
| `home.characterBorder` | `format.border` | `characterBorder` | — | core-only | core-only | partial | unverified |
| `home.emphasisMark` | `format.emphasisMark` | `setEmphasisMark` | — | core-only | core-only | partial | unverified |
| `home.textEffects` | `format.textEffects` | `setTextEffect` | — | core-only | core-only | partial | unverified |
| `table.mergeCells` | `table.merge` | `tableMerge` | `tableLayout/merge` | partial | partial | partial | unverified |
| `table.splitCells` | `table.split` | `tableSplit` | `tableLayout/merge` | partial | partial | partial | unverified |
| `table.insertRowAbove` | `table.insertRowAbove` | `tableInsertRowBefore` | `tableLayout/rowsColumns` | partial | partial | partial | unverified |
| `table.insertRowBelow` | `table.insertRowBelow` | `tableInsertRowAfter` | `tableLayout/rowsColumns` | partial | partial | partial | unverified |
| `table.deleteRows` | `table.deleteRow` | `tableDeleteRow` | `tableLayout/rowsColumns` | partial | partial | partial | unverified |
| `table.insertColumnLeft` | `table.insertColumnLeft` | `tableInsertColumnBefore` | `tableLayout/rowsColumns` | partial | partial | partial | unverified |
| `table.insertColumnRight` | `table.insertColumnRight` | `tableInsertColumnAfter` | `tableLayout/rowsColumns` | partial | partial | partial | unverified |
| `table.deleteColumns` | `table.deleteColumn` | `tableDeleteColumn` | `tableLayout/rowsColumns` | partial | partial | partial | unverified |
| `table.splitTable` | `table.splitTable` | `tableSplitAtRow` | `tableLayout/merge` | partial | partial | partial | unverified |
| `table.autoFit` | `table.autofit` | `tableToggleAutoFit` | `tableLayout/cellSize` | partial | partial | partial | unverified |
| `table.distributeRows` | `table.distributeRows` | `tableDistributeRows` | `tableLayout/cellSize` | partial | partial | partial | unverified |
| `table.distributeColumns` | `table.distributeColumns` | `tableDistributeColumns` | `tableLayout/cellSize` | partial | partial | partial | unverified |
| `table.deleteTable` | `table.deleteTable` | `tableDelete` | `tableLayout/rowsColumns` | partial | partial | partial | unverified |
| `table.repeatHeaderRows` | `table.repeatHeader` | `tableRepeatHeaderRows` | `tableLayout/merge` | partial | partial | partial | unverified |
| `table.sortAscending` | `table.sort` | `tableSortAscending` | `tableLayout/sort` | partial | partial | partial | unverified |
| `table.sortDescending` | `table.sort` | `tableSortDescending` | `tableLayout/sort` | partial | partial | partial | unverified |
| `table.convertToText` | `table.toText` | `tableToText` | `tableLayout/merge` | partial | partial | partial | unverified |
| `table.lookHeaderRow` | `table.look` | `tableToggleHeaderRow` | `tableDesign/tableStyleOptions` | partial | partial | partial | unverified |
| `table.lookTotalRow` | `table.look` | `tableToggleTotalRow` | `tableDesign/tableStyleOptions` | partial | partial | partial | unverified |
| `table.lookBandedRows` | `table.look` | `tableToggleBandedRows` | `tableDesign/tableStyleOptions` | partial | partial | partial | unverified |
| `table.lookFirstColumn` | `table.look` | `tableToggleFirstColumn` | `tableDesign/tableStyleOptions` | partial | partial | partial | unverified |
| `table.lookLastColumn` | `table.look` | `tableToggleLastColumn` | `tableDesign/tableStyleOptions` | partial | partial | partial | unverified |
| `table.lookBandedColumns` | `table.look` | `tableToggleBandedColumns` | `tableDesign/tableStyleOptions` | partial | partial | partial | unverified |
| `table.styleGallery` | `table.style` | `setTableStyle` | `tableDesign/tableStyles` | partial | partial | partial | unverified |
| `table.shading` | `table.shading` | `tableCellShading` | `tableDesign/borders` | partial | partial | partial | unverified |
| `table.borders` | `table.borders` | `tableApplyBorderPreset` | `tableDesign/borders` | partial | partial | partial | unverified |
| `table.borderPainter` | `table.borderPainter` | `toggleTableDrawBorders` | `tableDesign/borders` | partial | partial | partial | unverified |
| `table.properties` | `table.properties` | `tableProperties` | Editor context menu > Table Properties | menu-only | menu-only | partial | not-applicable |
| `table.altText` | `table.altText` | — | Editor context menu > Table Properties > Alt Text | ui-only | ui-only | partial | unverified |
| `table.deleteCells` | `table.deleteCells` | `tableDeleteCells` | — | core-only | core-only | partial | unverified |
| `table.rowHeight` | `table.rowHeight` | `tableSetRowHeight` | Editor context menu > Table Properties > Row > Height | menu-only | menu-only | partial | unverified |
| `table.columnWidth` | `table.columnWidth` | `tableSetColumnWidth` | Editor context menu > Table Properties > Column > Width | menu-only | menu-only | partial | unverified |
| `table.cellAlignTop` | `table.cellAlign` | `tableSetCellVerticalAlign` | `tableLayout/alignment` | partial | partial | partial | unverified |
| `table.cellAlignMiddle` | `table.cellAlign` | `tableSetCellVerticalAlign` | `tableLayout/alignment` | partial | partial | partial | unverified |
| `table.cellAlignBottom` | `table.cellAlign` | `tableSetCellVerticalAlign` | `tableLayout/alignment` | partial | partial | partial | unverified |
| `table.cellAlignMatrix` | `table.cellAlign` | `tableSetCellAlignment` | Table Layout > Alignment matrix | partial | partial | partial | unverified |
| `table.textDirection` | `table.textDirection` | `tableSetCellTextDirection` | Editor context menu > Table Properties > Cell > Text Direction | menu-only | menu-only | partial | unverified |
| `table.cellMargins` | `table.cellMargins` | `tableSetCellMargins` | Editor context menu > Table Properties > Cell > Margins | menu-only | menu-only | partial | unverified |
| `table.formula` | `table.formula` | `tableFormula` | — | core-only | core-only | partial | unverified |
| `table.viewGridlines` | `table.viewGridlines` | `toggleTableGridlines` | `tableDesign/borders` | partial | partial | partial | not-applicable |
| `table.selectCell` | `table.selectCell` | `tableSelectCell` | — | core-only | core-only | partial | not-applicable |
| `table.selectRow` | `table.selectRow` | `tableSelectRow` | — | core-only | core-only | partial | not-applicable |
| `table.selectColumn` | `table.selectColumn` | `tableSelectColumn` | — | core-only | core-only | partial | not-applicable |
| `table.selectTable` | `table.selectTable` | `tableSelectTable` | — | core-only | core-only | partial | not-applicable |
| `review.acceptAll` | `review.acceptAll` | `acceptAllRevisions` | — | core-only | core-only | partial | unverified |
| `review.rejectAll` | `review.rejectAll` | `rejectAllRevisions` | — | core-only | core-only | partial | unverified |
| `image.crop` | `picture.crop` | `imageCrop` | `imageFormat/size` | partial | partial | partial | unverified |
| `image.height` | `picture.size` | `imageHeightCm` | `imageFormat/size` | partial | partial | partial | unverified |
| `image.width` | `picture.size` | `imageWidthCm` | `imageFormat/size` | partial | partial | partial | unverified |
| `image.border` | `picture.border` | `imageBorder` | `imageFormat/imageStyles` | partial | partial | partial | unverified |
| `image.altText` | `picture.altText` | `editImageAlt` | `insert/accessibility` | partial | partial | partial | unverified |
| `image.reset` | `picture.reset` | `resetImage` | — | core-only | core-only | partial | unverified |
| `image.transparency` | `picture.transparency` | `imageTransparency` | — | core-only | core-only | partial | unverified |
| `image.rotation` | `arrange.rotation` | `setFloatingRotation` | — | core-only | core-only | partial | unverified |
| `shape.altText` | `object.altText` | `editTextBoxAlt` | — | core-only | core-only | partial | unverified |
| `shape.fill` | `shape.fill` | `setShapeFill` | — | core-only | core-only | partial | unverified |
| `shape.outlineColor` | `shape.outline` | `setShapeOutline` | — | core-only | core-only | partial | unverified |
| `shape.outlineWidth` | `shape.outline` | `setShapeOutlineWidth` | — | core-only | core-only | partial | unverified |
| `shape.textDirection` | `shape.textDirection` | `setTextBoxTextDirection` | — | core-only | core-only | partial | unverified |
| `shape.textAlignment` | `shape.alignText` | `setTextBoxVerticalAlign` | — | core-only | core-only | partial | unverified |
| `file.autoSave` | `file.autosave` | — | — | missing | missing | missing | partial |
| `titleBar.commandSearch` | `tools.search` | — | — | missing | missing | missing | not-applicable |
| `home.clipboardPane` | `edit.clipboardPane` | — | — | missing | missing | missing | unverified |
| `home.phoneticGuide` | `format.phonetic` | — | — | missing | missing | missing | unverified |
| `home.encloseCharacters` | `format.enclose` | — | — | missing | missing | missing | unverified |
| `home.multilevelList` | `para.multilevel` | — | — | missing | missing | missing | unverified |
| `home.defineMultilevelList` | `list.define` | — | — | missing | missing | missing | unverified |
| `home.multilevelListLibrary` | `list.multilevelPreset` | — | — | missing | missing | missing | unverified |
| `home.defineBullet` | `para.defineBullet` | — | — | missing | missing | missing | unverified |
| `home.defineNumberFormat` | `para.defineNumber` | — | — | missing | missing | missing | unverified |
| `home.distributedAlignment` | `para.distribute` | — | — | missing | missing | missing | unverified |
| `home.createStyle` | `styles.create` | — | — | missing | missing | missing | unverified |
| `home.modifyStyle` | `styles.modify` | — | — | missing | missing | missing | unverified |
| `home.updateStyleToMatch` | `styles.updateToMatch` | — | — | missing | missing | missing | unverified |
| `home.deleteStyle` | `styles.delete` | — | — | missing | missing | missing | unverified |
| `home.styleInspector` | `styles.inspector` | — | — | missing | missing | missing | unverified |
| `home.manageStyles` | `styles.manage` | — | — | missing | missing | missing | unverified |
| `home.goTo` | `edit.goto` | — | — | missing | missing | missing | unverified |
| `home.selectObjects` | `select.objects` | — | — | missing | missing | missing | unverified |
| `home.selectSimilarFormatting` | `select.similar` | — | — | missing | missing | missing | unverified |
| `home.dictation` | `tools.dictate` | — | — | missing | missing | missing | unverified |
| `home.editorProofing` | `review.editor` | — | — | missing | missing | missing | unverified |
| `insert.drawTable` | `table.draw` | — | — | missing | missing | missing | unverified |
| `insert.convertTextToTable` | `table.fromText` | — | — | missing | missing | missing | unverified |
| `insert.excelSpreadsheet` | `insert.spreadsheet` | — | — | missing | missing | missing | unverified |
| `insert.quickTables` | `table.quick` | — | — | missing | missing | missing | unverified |
| `insert.onlinePictures` | `insert.onlinePicture` | — | — | missing | missing | missing | unverified |
| `insert.models3d` | `insert.model3d` | — | — | missing | missing | missing | unverified |
| `insert.smartArt` | `insert.smartArt` | — | — | missing | missing | missing | unverified |
| `insert.chart` | `insert.chart` | — | — | missing | missing | missing | unverified |
| `insert.screenshot` | `insert.screenshot` | — | — | missing | missing | missing | unverified |
| `insert.drawingCanvas` | `insert.canvas` | — | — | missing | missing | missing | unverified |
| `insert.getAddIns` | `addins.get` | — | — | missing | missing | missing | unverified |
| `insert.onlineVideo` | `insert.video` | — | — | missing | missing | missing | unverified |
| `insert.crossReference` | `insert.crossReference` | — | — | missing | missing | missing | unverified |
| `insert.textBox` | `insert.textBox` | `insertShape` | `insert/illustrations` | partial | partial | partial | unverified |
| `insert.quickParts` | `insert.quickParts` | — | — | missing | missing | missing | unverified |
| `insert.autoText` | `insert.autoText` | — | — | missing | missing | missing | unverified |
| `insert.documentProperty` | `insert.docProperty` | — | — | missing | missing | missing | unverified |
| `insert.field` | `insert.field` | `insertDateField` | `insert/links` | partial | partial | partial | partial |
| `insert.wordArt` | `insert.wordArt` | — | — | missing | missing | missing | unverified |
| `insert.dropCap` | `insert.dropCap` | `setDropCap` | — | core-only | core-only | partial | unverified |
| `insert.signatureLine` | `insert.signatureLine` | — | — | missing | missing | missing | unverified |
| `insert.object` | `insert.object` | — | — | missing | missing | missing | unverified |
| `insert.textFromFile` | `insert.textFromFile` | — | — | missing | missing | missing | unverified |
| `insert.inkEquation` | `insert.inkEquation` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `insert.optionalHyphen` | `text.optionalHyphen` | `insertOptionalHyphen` | — | core-only | core-only | partial | unverified |
| `insert.coverPage` | `insert.coverPage` | — | — | missing | missing | missing | unverified |
| `insert.icons` | `insert.icon` | — | — | missing | missing | missing | unverified |
| `insert.removeHeader` | `insert.removeHeader` | — | — | missing | missing | missing | unverified |
| `insert.removeFooter` | `insert.removeFooter` | — | — | missing | missing | missing | unverified |
| `insert.linkToPrevious` | `layout.linkToPrevious` | — | — | missing | missing | missing | unverified |
| `draw.select` | `draw.select` | — | — | missing | missing | missing | unverified |
| `draw.lassoSelect` | `draw.lasso` | — | — | missing | missing | missing | unverified |
| `draw.eraser` | `draw.eraser` | — | — | missing | missing | missing | unverified |
| `draw.pen` | `draw.pen` | — | — | missing | missing | missing | unverified |
| `draw.pencil` | `draw.pencil` | — | — | missing | missing | missing | unverified |
| `draw.highlighter` | `draw.highlighter` | — | — | missing | missing | missing | unverified |
| `draw.addPen` | `draw.addPen` | — | — | missing | missing | missing | unverified |
| `draw.inkToShape` | `draw.inkToShape` | — | — | missing | missing | missing | unverified |
| `draw.inkToMath` | `draw.inkToMath` | — | — | missing | missing | missing | unverified |
| `draw.inkReplay` | `draw.replay` | — | — | missing | missing | missing | unverified |
| `design.theme` | `design.theme` | `applyDocumentTheme` | `design/documentFormatting` | partial | partial | partial | partial |
| `design.styleSet` | `design.styleSet` | `applyDocumentTheme` | `design/documentFormatting` | partial | partial | partial | partial |
| `design.colors` | `design.themeColors` | `setDocumentColorScheme` | `design/documentFormatting` | partial | partial | partial | partial |
| `design.fonts` | `design.themeFonts` | `setDocumentFontScheme` | `design/documentFormatting` | partial | partial | partial | partial |
| `design.paragraphSpacing` | `design.paragraphSpacing` | `setDocumentParagraphSpacing` | `design/documentFormatting` | partial | partial | partial | partial |
| `design.effects` | `design.effects` | `setDocumentEffects` | `design/documentFormatting` | partial | partial | partial | partial |
| `design.setDefault` | `design.setDefault` | `setDocumentDesignDefault` | `design/documentFormatting` | partial | partial | partial | partial |
| `design.watermark` | `design.watermark` | `setDocumentWatermark` | `design/pageBackground` | partial | partial | partial | partial |
| `design.pageColor` | `design.pageColor` | `setDocumentPageColor` | `design/pageBackground` | partial | partial | partial | partial |
| `design.pageBorders` | `design.pageBorders` | `setDocumentPageBorder` | `design/pageBackground` | partial | partial | partial | partial |
| `layout.pageSetupDialog` | `layout.pageSetup` | `setPageMargins` | `layout/section` | partial | partial | partial | partial |
| `layout.documentGrid` | `layout.documentGrid` | — | — | missing | missing | missing | unverified |
| `layout.selectionPane` | `arrange.selectionPane` | — | — | missing | missing | missing | unverified |
| `layout.groupObjects` | `arrange.group` | — | — | missing | missing | missing | unverified |
| `references.addTocText` | `references.addText` | — | — | missing | missing | missing | unverified |
| `references.removeToc` | `references.removeToc` | — | — | missing | missing | missing | unverified |
| `references.endnote` | `references.endnote` | — | — | missing | missing | missing | unverified |
| `references.nextFootnote` | `references.nextFootnote` | — | — | missing | missing | missing | unverified |
| `references.showNotes` | `references.notes` | — | — | missing | missing | missing | unverified |
| `references.researcher` | `references.researcher` | — | — | missing | missing | missing | unverified |
| `references.citation` | `references.citation` | — | — | missing | missing | missing | unverified |
| `references.sources` | `references.sources` | — | — | missing | missing | missing | unverified |
| `references.citationStyle` | `references.citationStyle` | — | — | missing | missing | missing | unverified |
| `references.bibliography` | `references.bibliography` | — | — | missing | missing | missing | unverified |
| `references.tableOfFigures` | `references.tableOfFigures` | — | — | missing | missing | missing | unverified |
| `references.updateFigures` | `references.updateFigures` | — | — | missing | missing | missing | unverified |
| `references.markIndexEntry` | `references.markEntry` | — | — | missing | missing | missing | unverified |
| `references.insertIndex` | `references.index` | — | — | missing | missing | missing | unverified |
| `references.updateIndex` | `references.updateIndex` | — | — | missing | missing | missing | unverified |
| `references.markCitation` | `references.markCitation` | — | — | missing | missing | missing | unverified |
| `references.tableOfAuthorities` | `references.tableOfAuthorities` | — | — | missing | missing | missing | unverified |
| `references.updateAuthorities` | `references.updateAuthorities` | — | — | missing | missing | missing | unverified |
| `references.updateFields` | `references.updateFields` | — | — | missing | missing | missing | unverified |
| `references.noteOptions` | `references.noteOptions` | `setNoteOptions` | — | core-only | core-only | partial | unverified |
| `mailings.envelopes` | `mailings.envelopes` | — | — | missing | missing | missing | unverified |
| `mailings.labels` | `mailings.labels` | — | — | missing | missing | missing | unverified |
| `mailings.start` | `mailings.start` | — | — | missing | missing | missing | unverified |
| `mailings.recipients` | `mailings.recipients` | — | — | missing | missing | missing | unverified |
| `mailings.editRecipients` | `mailings.editRecipients` | — | — | missing | missing | missing | unverified |
| `mailings.filterRecipients` | `mailings.filterRecipients` | — | — | missing | missing | missing | unverified |
| `mailings.sortRecipients` | `mailings.sortRecipients` | — | — | missing | missing | missing | unverified |
| `mailings.highlightFields` | `mailings.highlightFields` | — | — | missing | missing | missing | unverified |
| `mailings.addressBlock` | `mailings.addressBlock` | — | — | missing | missing | missing | unverified |
| `mailings.greetingLine` | `mailings.greetingLine` | — | — | missing | missing | missing | unverified |
| `mailings.insertField` | `mailings.insertField` | — | — | missing | missing | missing | unverified |
| `mailings.rules` | `mailings.rules` | — | — | missing | missing | missing | unverified |
| `mailings.matchFields` | `mailings.matchFields` | — | — | missing | missing | missing | unverified |
| `mailings.preview` | `mailings.preview` | — | — | missing | missing | missing | unverified |
| `mailings.next` | `mailings.next` | — | — | missing | missing | missing | unverified |
| `mailings.previous` | `mailings.previous` | — | — | missing | missing | missing | unverified |
| `mailings.first` | `mailings.first` | — | — | missing | missing | missing | unverified |
| `mailings.last` | `mailings.last` | — | — | missing | missing | missing | unverified |
| `mailings.goToRecord` | `mailings.goToRecord` | — | — | missing | missing | missing | unverified |
| `mailings.findRecipient` | `mailings.findRecipient` | — | — | missing | missing | missing | unverified |
| `mailings.checkErrors` | `mailings.checkErrors` | — | — | missing | missing | missing | unverified |
| `mailings.finish` | `mailings.finish` | — | — | missing | missing | missing | unverified |
| `mailings.printDocuments` | `mailings.printDocuments` | — | — | missing | missing | missing | unverified |
| `review.spelling` | `review.spelling` | — | — | missing | missing | missing | unverified |
| `review.thesaurus` | `review.thesaurus` | — | — | missing | missing | missing | unverified |
| `review.readAloud` | `review.readAloud` | — | — | missing | missing | missing | unverified |
| `review.translate` | `review.translate` | — | — | missing | missing | missing | unverified |
| `review.language` | `review.language` | — | — | missing | missing | missing | unverified |
| `review.displayForReview` | `review.markup` | — | — | missing | missing | missing | unverified |
| `review.showMarkup` | `review.showMarkup` | — | — | missing | missing | missing | unverified |
| `review.reviewingPane` | `review.changes` | — | — | missing | missing | missing | unverified |
| `review.trackChangesOptions` | `review.trackingOptions` | — | — | missing | missing | missing | unverified |
| `review.compare` | `review.compare` | — | — | missing | missing | missing | unverified |
| `review.combine` | `review.combine` | — | — | missing | missing | missing | unverified |
| `review.blockAuthors` | `review.blockAuthors` | — | — | missing | missing | missing | unverified |
| `review.restrictEditing` | `review.restrict` | — | — | missing | missing | missing | unverified |
| `review.hideInk` | `review.hideInk` | — | — | missing | missing | missing | unverified |
| `review.altTextPane` | `view.altTextPane` | `editImageAlt` | `insert/accessibility` | partial | partial | partial | partial |
| `view.readMode` | `view.readMode` | — | — | missing | missing | missing | unverified |
| `view.webLayout` | `view.webLayout` | — | — | missing | missing | missing | unverified |
| `view.draft` | `view.draft` | — | — | missing | missing | missing | unverified |
| `view.focus` | `view.focus` | — | — | missing | missing | missing | unverified |
| `view.immersiveReader` | `view.immersive` | — | — | missing | missing | missing | unverified |
| `view.verticalMovement` | `view.vertical` | — | — | missing | missing | missing | unverified |
| `view.sideToSide` | `view.sideToSide` | — | — | missing | missing | missing | unverified |
| `view.gridlines` | `view.gridlines` | — | — | missing | missing | missing | unverified |
| `view.darkMode` | `view.darkMode` | — | — | missing | missing | missing | unverified |
| `view.newWindow` | `view.newWindow` | — | — | missing | missing | missing | unverified |
| `view.arrangeAll` | `view.arrangeAll` | — | — | missing | missing | missing | unverified |
| `view.split` | `view.split` | — | — | missing | missing | missing | unverified |
| `view.sideBySide` | `view.sideBySide` | — | — | missing | missing | missing | unverified |
| `view.synchronousScrolling` | `view.syncScroll` | — | — | missing | missing | missing | unverified |
| `view.switchWindows` | `view.switchWindows` | — | — | missing | missing | missing | unverified |
| `view.macros` | `tools.macros` | — | — | missing | missing | missing | unverified |
| `view.recordMacro` | `tools.recordMacro` | — | — | missing | missing | missing | unverified |
| `view.outlineMode` | `view.outline` | — | Document stage > Outline panel | ui-only | ui-only | partial | not-applicable |
| `view.onePage` | `view.onePage` | — | Status bar > zoom slider | ui-only | ui-only | partial | not-applicable |
| `view.multiplePages` | `view.multiplePages` | — | Status bar > zoom slider | ui-only | ui-only | partial | not-applicable |
| `view.pageWidth` | `view.pageWidth` | — | Status bar > zoom slider | ui-only | ui-only | partial | not-applicable |
| `table.newStyle` | `table.newStyle` | — | — | missing | missing | missing | unverified |
| `table.modifyStyle` | `table.modifyStyle` | — | — | missing | missing | missing | unverified |
| `table.deleteStyle` | `table.deleteStyle` | — | — | missing | missing | missing | unverified |
| `table.direction` | `table.rtl` | — | — | missing | missing | missing | unverified |
| `table.eraser` | `table.eraser` | — | — | missing | missing | missing | unverified |
| `headerFooter.previousSection` | `hf.previous` | — | — | missing | missing | missing | unverified |
| `headerFooter.nextSection` | `hf.next` | — | — | missing | missing | missing | unverified |
| `headerFooter.position` | `hf.position` | — | — | missing | missing | missing | unverified |
| `readMode.columnWidth` | `view.readColumnWidth` | — | — | missing | missing | missing | unverified |
| `readMode.pageColor` | `view.readPageColor` | — | — | missing | missing | missing | unverified |
| `readMode.layout` | `view.readLayout` | — | — | missing | missing | missing | unverified |
| `developer.richTextControl` | `developer.richText` | — | — | missing | missing | missing | unverified |
| `developer.plainTextControl` | `developer.plainText` | — | — | missing | missing | missing | unverified |
| `developer.pictureControl` | `developer.picture` | — | — | missing | missing | missing | unverified |
| `developer.buildingBlockControl` | `developer.buildingBlock` | — | — | missing | missing | missing | unverified |
| `developer.checkboxControl` | `developer.checkBox` | — | — | missing | missing | missing | unverified |
| `developer.comboBoxControl` | `developer.comboBox` | — | — | missing | missing | missing | unverified |
| `developer.dropDownControl` | `developer.dropDown` | — | — | missing | missing | missing | unverified |
| `developer.datePickerControl` | `developer.datePicker` | — | — | missing | missing | missing | unverified |
| `developer.repeatingSectionControl` | `developer.repeatingSection` | — | — | missing | missing | missing | unverified |
| `developer.propertiesPane` | `developer.properties` | — | — | missing | missing | missing | unverified |
| `developer.designMode` | `developer.designMode` | — | — | missing | missing | missing | unverified |
| `smartArt.addShape` | `smartArt.addShape` | — | — | missing | missing | missing | unverified |
| `smartArt.promote` | `smartArt.promote` | — | — | missing | missing | missing | unverified |
| `smartArt.demote` | `smartArt.demote` | — | — | missing | missing | missing | unverified |
| `smartArt.textPane` | `smartArt.textPane` | — | — | missing | missing | missing | unverified |
| `smartArt.layouts` | `smartArt.layout` | — | — | missing | missing | missing | unverified |
| `smartArt.styles` | `smartArt.colors` | — | — | missing | missing | missing | unverified |
| `smartArt.reset` | `smartArt.reset` | — | — | missing | missing | missing | unverified |
| `chart.changeType` | `chart.type` | — | — | missing | missing | missing | unverified |
| `chart.editData` | `chart.editData` | — | — | missing | missing | missing | unverified |
| `chart.title` | `chart.title` | — | — | missing | missing | missing | unverified |
| `chart.legend` | `chart.legend` | — | — | missing | missing | missing | unverified |
| `chart.dataLabels` | `chart.dataLabels` | — | — | missing | missing | missing | unverified |
| `picture.removeBackground` | `picture.removeBackground` | — | — | missing | missing | missing | unverified |
| `picture.corrections` | `picture.corrections` | — | — | missing | missing | missing | unverified |
| `picture.color` | `picture.color` | — | — | missing | missing | missing | unverified |
| `picture.artisticEffects` | `picture.effects` | — | — | missing | missing | missing | unverified |
| `picture.compress` | `picture.compress` | — | — | missing | missing | missing | unverified |
| `picture.change` | `picture.change` | — | — | missing | missing | missing | unverified |
| `picture.styles` | `picture.style` | — | — | missing | missing | missing | unverified |
| `shape.formatPane` | `view.formatShapePane` | — | — | missing | missing | missing | unverified |
| `shape.effects` | `shape.effects` | — | — | missing | missing | missing | unverified |
| `shape.wordArtStyles` | `wordArt.style` | — | — | missing | missing | missing | unverified |
| `shape.textFill` | `wordArt.textFill` | — | — | missing | missing | missing | unverified |
| `shape.textOutline` | `wordArt.textOutline` | — | — | missing | missing | missing | unverified |
| `shape.textTransform` | `wordArt.transform` | — | — | missing | missing | missing | unverified |
| `shape.createLink` | `shape.link` | `link` | `insert/links` | partial | partial | partial | partial |
| `editing.typeText` | `text.insert` | — | Canvas editor > text input | ui-only | ui-only | partial | not-applicable |
| `editing.newParagraph` | `text.newParagraph` | — | Canvas editor > Enter | ui-only | ui-only | partial | not-applicable |
| `editing.tab` | `text.tab` | — | Canvas editor > Tab | ui-only | ui-only | partial | not-applicable |
| `editing.tabCharacter` | `text.insertTab` | — | — | missing | missing | missing | unverified |
| `editing.backspace` | `text.backspace` | — | Canvas editor > Backspace | ui-only | ui-only | partial | not-applicable |
| `editing.delete` | `text.delete` | — | Canvas editor > Delete | ui-only | ui-only | partial | not-applicable |
| `editing.deletePreviousWord` | `text.deleteWordBack` | — | Canvas editor > Ctrl/Command+Backspace | ui-only | ui-only | partial | not-applicable |
| `editing.deleteNextWord` | `text.deleteWordForward` | — | Canvas editor > Ctrl/Command+Delete | ui-only | ui-only | partial | not-applicable |
| `editing.moveParagraphUp` | `para.moveUp` | `moveParagraphsUp` | — | core-only | core-only | partial | unverified |
| `editing.moveParagraphDown` | `para.moveDown` | `moveParagraphsDown` | — | core-only | core-only | partial | unverified |
| `editing.promote` | `para.promote` | `promote` | — | core-only | core-only | partial | unverified |
| `editing.demote` | `para.demote` | `demote` | — | core-only | core-only | partial | unverified |
| `editing.toggleUnicode` | `text.toggleUnicode` | — | — | missing | missing | missing | unverified |
| `editing.spike` | `edit.spike` | — | — | missing | missing | missing | unverified |
| `editing.insertSpike` | `edit.insertSpike` | — | — | missing | missing | missing | unverified |
| `editing.wordLeft` | `caret.wordLeft` | — | Canvas editor > Ctrl/Command+Left | ui-only | ui-only | partial | not-applicable |
| `editing.wordRight` | `caret.wordRight` | — | Canvas editor > Ctrl/Command+Right | ui-only | ui-only | partial | not-applicable |
| `editing.lineStart` | `caret.home` | — | Canvas editor > Home | ui-only | ui-only | partial | not-applicable |
| `editing.lineEnd` | `caret.end` | — | Canvas editor > End | ui-only | ui-only | partial | not-applicable |
| `editing.paragraphUp` | `caret.paraUp` | — | Canvas editor > Up Arrow | ui-only | ui-only | partial | not-applicable |
| `editing.paragraphDown` | `caret.paraDown` | — | Canvas editor > Down Arrow | ui-only | ui-only | partial | not-applicable |
| `editing.documentStart` | `caret.docStart` | — | Canvas editor > Ctrl/Command+Home | ui-only | ui-only | partial | not-applicable |
| `editing.documentEnd` | `caret.docEnd` | — | Canvas editor > Ctrl/Command+End | ui-only | ui-only | partial | not-applicable |
| `editing.pageUp` | `caret.pageUp` | — | — | missing | missing | missing | unverified |
| `editing.pageDown` | `caret.pageDown` | — | — | missing | missing | missing | unverified |
| `editing.goBack` | `edit.goBack` | — | — | missing | missing | missing | unverified |
| `editing.selectWord` | `select.word` | — | Canvas editor > double-click a word | ui-only | ui-only | partial | not-applicable |
| `editing.selectSentence` | `select.sentence` | — | — | missing | missing | missing | unverified |
| `editing.selectParagraph` | `select.paragraph` | — | Canvas editor > triple-click a paragraph | ui-only | ui-only | partial | not-applicable |
| `editing.extendSelectionF8` | `select.extend` | — | — | missing | missing | missing | unverified |
| `editing.columnSelection` | `select.column` | — | — | missing | missing | missing | unverified |
| `editing.showFieldCodes` | `view.fieldCodes` | — | — | missing | missing | missing | unverified |
| `editing.toggleFieldCodes` | `fields.toggleCode` | — | — | missing | missing | missing | unverified |
| `editing.editFieldCode` | `fields.setCode` | — | — | missing | missing | missing | unverified |
| `editing.unlinkFields` | `fields.unlink` | — | — | missing | missing | missing | unverified |
| `editing.lockFields` | `fields.lock` | — | — | missing | missing | missing | unverified |
| `editing.unlockFields` | `fields.unlock` | — | — | missing | missing | missing | unverified |
| `editing.nextField` | `fields.next` | — | — | missing | missing | missing | unverified |
| `editing.previousField` | `fields.previous` | — | — | missing | missing | missing | unverified |
| `equation.unicodeInput` | `equation.inputFormat` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.latexInput` | `equation.inputFormat` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.convert` | `equation.convert` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.normalText` | `equation.normalText` | — | — | missing | missing | missing | unverified |
| `equation.symbols` | `equation.insertSymbol` | `insertText` | `insert/symbols` | partial | partial | partial | partial |
| `equation.fraction` | `equation.insertStructure` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.script` | `equation.insertStructure` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.radical` | `equation.insertStructure` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.integral` | `equation.insertStructure` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.largeOperator` | `equation.insertStructure` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.bracket` | `equation.insertStructure` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.function` | `equation.insertStructure` | — | — | missing | missing | missing | unverified |
| `equation.accent` | `equation.insertStructure` | — | — | missing | missing | missing | unverified |
| `equation.limit` | `equation.insertStructure` | — | — | missing | missing | missing | unverified |
| `equation.operator` | `equation.insertStructure` | — | — | missing | missing | missing | unverified |
| `equation.matrix` | `equation.insertStructure` | `insertEquation` | `insert/symbols` | partial | partial | partial | partial |
| `equation.display` | `equation.display` | — | — | missing | missing | missing | unverified |
| `equation.justification` | `equation.justify` | — | — | missing | missing | missing | unverified |
| `equation.number` | `equation.number` | — | — | missing | missing | missing | unverified |
| `equation.structureCommands` | `equation.structure` | — | — | missing | missing | missing | unverified |
| `outlining.promoteToHeading1` | `outline.promoteToHeading1` | `setStyleId` | `home/styles` | partial | partial | partial | partial |
| `outlining.promote` | `outline.promote` | `promote` | — | core-only | core-only | partial | unverified |
| `outlining.level` | `outline.level` | `setOutlineLevel` | Layout > Paragraph dialog > Indents and Spacing > Outline level | menu-only | menu-only | partial | partial |
| `outlining.demote` | `outline.demote` | `demote` | — | core-only | core-only | partial | unverified |
| `outlining.demoteToBody` | `outline.demoteToBody` | `setStyleId` | `home/styles` | partial | partial | partial | partial |
| `outlining.moveUp` | `outline.moveUp` | `moveParagraphsUp` | — | core-only | core-only | partial | unverified |
| `outlining.moveDown` | `outline.moveDown` | `moveParagraphsDown` | — | core-only | core-only | partial | unverified |
| `outlining.expand` | `outline.expand` | — | — | missing | missing | missing | unverified |
| `outlining.collapse` | `outline.collapse` | — | — | missing | missing | missing | unverified |
| `outlining.showLevel` | `outline.showLevel` | — | — | missing | missing | missing | unverified |
| `outlining.showFormatting` | `outline.showFormatting` | — | — | missing | missing | missing | unverified |
| `outlining.firstLineOnly` | `outline.firstLineOnly` | — | — | missing | missing | missing | unverified |
| `outlining.close` | `outline.close` | — | — | missing | missing | missing | unverified |
| `tools.autoCorrect` | `tools.autocorrect` | — | — | missing | missing | missing | unverified |
| `tools.customizeRibbon` | `tools.customizeRibbon` | — | — | missing | missing | missing | unverified |
| `tools.customizeKeyboard` | `tools.customizeKeyboard` | — | — | missing | missing | missing | unverified |
| `tools.encrypt` | `file.encrypt` | — | — | missing | missing | missing | unverified |
| `tools.templatesAddIns` | `tools.templates` | — | — | missing | missing | missing | unverified |
| `tools.fullScreenView` | `view.fullScreenView` | — | — | missing | missing | missing | unverified |

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
39. **home.stylePaneRelated:** Related task: Oasis exposes a Home style gallery that applies paragraph styles, while WordCraft's Styles Pane is a separate management surface. The gallery does not establish style creation, modification, inspection or management parity; style coverage and DOCX round-trip need workflow verification.
40. **review.wordCountStatusRelated:** Related display only: Oasis shows the total word count in its status bar, while WordCraft's Review command opens a detailed word-count view. Selection-scoped counts and pages/characters/paragraphs statistics are not provided by this status item.
41. **view.zoomStatusRelated:** Related control only: Oasis exposes a status-bar zoom slider rather than WordCraft's Zoom dialog. The View tab has no zoom group; slider presets, layout modes, current value and keyboard/focus behavior need workflow verification.
42. **view.zoom100Related:** Related control only: the Oasis slider accepts 100% as an arbitrary zoom value but offers no dedicated 100% command or preset button. Exact value entry, focus and keyboard behavior need verification.
43. **view.zoomInRelated:** Related control only: Oasis provides a status-bar plus button that increases document zoom by a fixed step. The step sequence differs from any unverified WordCraft preset behavior; keyboard access and center anchoring need workflow verification.
44. **view.zoomOutRelated:** Related control only: Oasis provides a status-bar minus button that reduces document zoom by a fixed step. The step sequence differs from any unverified WordCraft preset behavior; keyboard access and center anchoring need workflow verification.
45. **view.navigationOutlineRelated:** Related navigation only: Oasis exposes document headings in a collapsible Outline panel, while WordCraft's Navigation Pane also includes search and page navigation. Those other tasks, focus behavior and heading-navigation equivalence need workflow verification.
46. **view.horizontalRulerRelated:** Related display only: Oasis shows a horizontal ruler with margin and indent markers when editor chrome is visible. It has no user-facing visibility toggle or vertical ruler, so this does not match WordCraft's Ruler toggle.
47. **view.printLayoutRelated:** Related presentation only: Oasis lays the document out as pages with paper dimensions, margins and page breaks. It is the canvas's default presentation, not a selectable View mode; Web Layout, Read Mode and switching between view modes are not provided. Page-level rendering and print/DOCX fidelity need workflow verification.
48. **home.sortParagraphs:** The registered sortParagraphs command sorts a contiguous run of sibling paragraphs by natural number/text order and refuses ranges containing tables or footnote content. WordCraft para.sort serves the same paragraph-sorting task, but collates using the document language while Oasis currently uses runtime localeCompare. No default Ribbon or menubar entry exposes the command; DOCX/PDF reorder behavior and multilingual equivalence remain unverified.
49. **home.horizontalLine:** Both commands apply a single 1.5 pt bottom border to paragraphs in the selection. The Oasis command has no default Ribbon or menubar entry; selection scope, border-color behavior, undo and DOCX/PDF round-trip still need workflow verification.
50. **insert.pageBreak:** Pagination and multi-section round-trip are not certified by the Ribbon binding alone.
51. **insert.blankPageRelated:** Related task only: Oasis exposes a page break on Insert, while WordCraft Blank Page inserts a blank page. A page break starts following content on a new page but does not by itself guarantee a full blank page; pagination and DOCX behavior need workflow verification.
52. **insert.table:** The Insert grid picker dispatches row and column counts to the shared table command. Draw Table, text conversion, Quick Tables and spreadsheet insertion are separate WordCraft tasks; table selection, accessibility and DOCX round-trip remain independently unverified.
53. **insert.picture:** Inserts a local image through the host file picker and the shared image command. Online pictures, screenshots, 3D models, icons and SmartArt are distinct WordCraft tasks; format, size and round-trip workflows remain open.
54. **insert.link:** Opens the URL dialog for the selected range. In-document target selection, keyboard/focus behavior, undo and DOCX hyperlink round-trip remain independently unverified.
55. **insert.removeLink:** Removes the hyperlink from the selected linked text through the shared command. Mixed ranges, selection retention, undo and DOCX round-trip remain independently unverified.
56. **insert.shape:** The Shape Gallery inserts Oasis's supported preset subset through the shared shape command. Broader WordCraft shape kinds, geometry editing, arrangement, accessibility, rendering and DOCX round-trip remain open.
57. **insert.symbol:** Related task: the Oasis Symbols menu inserts its curated symbol/number subset as text and opens a broader symbol dialog. Per-symbol font selection and the full WordCraft symbol command contract are not established.
58. **insert.equation:** Equation templates in the Insert/Symbols menu dispatch the shared equation command. WordCraft also lists this command on its contextual Equation tab; Oasis does not yet expose an equivalent contextual surface. Full editing, navigation, rendering and OMML interoperability remain unverified.
59. **references.toc:** TOC creation, fields and export/round-trip remain independently testable.
60. **references.updateToc:** Eligibility and missing-TOC command states still need refinement.
61. **references.footnote:** The References action inserts a footnote at the current editing position. Focus restoration, multi-section behavior and DOCX interoperability remain independently unverified.
62. **references.caption:** Related task: Oasis exposes image caption insertion only when an image is selected, under Insert/Accessibility. WordCraft's caption command also covers tables and is placed under References; placement and target coverage differ.
63. **review.trackChanges:** Active state is wired to EditorState; tracked content fidelity and UI workflows remain to verify.
64. **review.previousRevision:** Related task to WordCraft Previous Change. Oasis cycles backward through text-run revisions in the active editing story; structural, table and section changes need separate navigation support. Pure selection navigation; parity remains partial.
65. **review.nextRevision:** Related task to WordCraft Next Change. Oasis cycles forward through tracked text-run revisions in the active editing story; structural, table and section changes need separate navigation support. Pure selection navigation; parity remains partial.
66. **review.commentsPanel:** Related task to WordCraft Show Comments: Oasis toggles an editor-scoped discussion drawer, while WordCraft's command returns the comment list. The drawer lists roots and nested replies, supports text search, open/resolved filters, navigation, moderation and confirmation before deletion. The Activity view shows undoable local comment events, which are not exported to DOCX. Host IDs gate mutations; visual parity remains partial.
67. **review.newComment:** Creates an authored comment anchored to selected text or a caret word, through a per-editor modal. Uses native comment registry and is undoable; visual E2E and full DOCX import/export fidelity are pending. WordCraft also places this action on Insert; Oasis currently exposes it on Review only, so placement parity remains open.
68. **review.replyComment:** Creates a threaded reply linked to its parent comment; Oasis stores the reply in an unanchored comment story linked by parentId. DOCX commentsExtended XML parent relationship has unit coverage; cross-application round-trip remains unverified.
69. **review.editComment:** Edits only the selected existing comment's text in a transactional modal; ID, author, creation time, anchors, resolved state and reply links are preserved. Popup actions support editing individual nested replies. DOCX export/reimport and read-only gating have tests; full visual WordCraft parity remains unverified.
70. **review.previousComment:** Navigates to the prior anchored comment in the active story, skipping unanchored replies and wrapping.
71. **review.nextComment:** Navigates to the next anchored comment without changing the document; Mapped to WordCraft `review.nextComment`; semantic and persistence parity remain unverified.
72. **review.resolveComment:** Marks the comment under the selection as resolved, retaining the DOCX comment id, author, anchors and thread metadata. Needs round-trip E2E.
73. **review.reopenComment:** Reopens a resolved comment under the selection. Enabled only when the selected comment is resolved.
74. **review.deleteComment:** Removes an anchored comment and recursively removes replies to prevent orphan thread parent ids. Undo and DOCX source-package E2E remain to verify.
75. **review.accept:** Selection scope and disabled states for documents without revisions need tests.
76. **review.reject:** Selection scope and disabled states for documents without revisions need tests.
77. **view.showMargins:** Oasis-specific display option with active state bound to EditorState.
78. **view.paragraphMarks:** Paragraph-mark display feedback is wired; rendering and accessibility require E2E checks.
79. **view.preciseFonts:** Oasis precise-font mode; platform font availability still requires coverage.
80. **insert.header:** Enters the default header editing zone for the active section. First/even-page variant in-place editing and brand-new header part export remain follow-ups.
81. **insert.footer:** Enters the default footer editing zone for the active section. Variant in-place editing and brand-new footer part export remain follow-ups.
82. **insert.pageNumber:** Inserts a PAGE field at the caret inside a header/footer (or body). Field formatting (\* roman etc.) resolves in layout and round-trips through DOCX. Per-section start/format (w:pgNumType) is set via the setSectionPageNumbering payload command. Layout resolution E2E verification remains.
83. **insert.pageNumberXOfY:** Inserts the Page X of Y combination (PAGE + NUMPAGES with literals) at the caret, mirroring WordCraft insert.page_number format=of, with an optional \* number format.
84. **insert.pageNumberTop:** Places the active section's default header as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=top story rewrite). Alignment gallery is not yet exposed in UI.
85. **insert.pageNumberBottom:** Places the active section's default footer as a single centered PAGE paragraph (mirrors WordCraft insert.page_number position=bottom story rewrite). Round-trips through DOCX with alignment.
86. **insert.bookmark:** Bookmarks the current selection (single point when collapsed) into the document-level EditorBookmarks registry, exported as w:bookmarkStart/w:bookmarkEnd and round-tripped on import. Cross-reference insertion (PAGEREF/REF with refresh) remains a follow-up.
87. **insert.date:** Inserts a typed DATE field at the caret with a \@ picture (default M/d/yyyy), caching the formatted result in the run text and round-tripping through DOCX. The DATE_FORMATS picture gallery and TIME fields remain follow-ups.
88. **insert.exitHeaderFooter:** Returns the caret to the section body when editing a header/footer zone. Enabled only while the active zone is a header or footer.
89. **insert.nonbreakingSpace:** Both commands insert a nonbreaking space at the current editing position. The Oasis command is registered without a default Ribbon or menubar entry; selection replacement, caret behavior and DOCX/PDF round-trip need direct workflow evidence.
90. **insert.nonbreakingHyphen:** Both commands insert U+2011 at the current editing position. Oasis has no default Ribbon or menubar entry; DOCX serialization/import recognizes w:noBreakHyphen, but selection, caret and end-to-end round-trip behavior still need workflow verification.
91. **layout.hyphenation:** Both implementations model automatic hyphenation, zone, capital-word handling and consecutive-line limit. Oasis applies settings to layout and imports/exports the corresponding DOCX settings; no default Ribbon or menubar entry exposes the command, and rendered pagination plus complete round-trip behavior still need workflow evidence.
92. **home.underlineColor:** The Font dialog exposes an underline color field; WordCraft also accepts automatic color that follows the text color. Mixed values, the automatic-color mapping, dialog focus/selection, undo and DOCX output need direct workflow verification.
93. **home.smallCaps:** Small Caps is available in the Font dialog, not as a direct Home control. The dialog applies a combined font-settings transaction; mixed-state rendering, command-boundary consistency, selection retention, undo and DOCX round-trip need verification.
94. **home.allCaps:** All Caps is available in the Font dialog, not as a direct Home control. The dialog applies a combined font-settings transaction; mixed-state rendering, command-boundary consistency, selection retention, undo and DOCX round-trip need verification.
95. **home.hiddenText:** Hidden text is available in the Font dialog. Visibility rules, mixed-state rendering, command-boundary consistency, selection retention, undo and DOCX round-trip need workflow verification.
96. **home.characterSpacing:** Advanced Font exposes normal, expanded and condensed spacing with an amount. WordCraft's command accepts a signed point value; unit conversion, range, mixed state, selection retention, undo and DOCX rendering need verification.
97. **home.characterScale:** Character scale is available in Advanced Font as percentage presets. The control's range and preset coverage, mixed state, selection retention, undo and DOCX rendering need verification against WordCraft's numeric percentage command.
98. **home.characterPosition:** Advanced Font offers normal, raised and lowered position with an amount. Point units, numeric range, mixed state, selection retention, undo and DOCX rendering need workflow verification.
99. **home.keepWithNext:** The Paragraph dialog exposes Keep with next; Oasis has a registered value command. The dialog commits several paragraph fields together, so per-command dispatch, mixed selections, pagination, undo and DOCX behavior need verification.
100. **home.keepLinesTogether:** The Paragraph dialog exposes Keep lines together; Oasis has a registered toggle command. Dialog transaction behavior, mixed selections, pagination, undo and DOCX behavior need verification.
101. **home.pageBreakBefore:** The Paragraph dialog exposes Page break before; Oasis has a registered value command. Dialog transaction behavior, mixed selections, pagination, undo and DOCX behavior need verification.
102. **home.widowControl:** The Paragraph dialog exposes Widow/Orphan control; Oasis has a registered toggle command. Dialog transaction behavior, mixed selections, pagination, undo and DOCX behavior need verification.
103. **home.outlineLevel:** Outline level is available in the Paragraph dialog. The command and selector accept levels, but built-in style interaction, mixed selections, navigation outline, undo and DOCX interoperability need verification.
104. **home.tabs:** Oasis provides a Tabs dialog, but no registered shared command for WordCraft's set/clear/default tab-stop payload is wired here. Mutation, undo, default stops and DOCX round-trip remain unverified.
105. **home.textEffectsOutline:** Oasis registers an outline character-style command but no default Ribbon, menu or dialog control was found. Rendering, selection behavior, undo and DOCX preservation need verification.
106. **home.textEffectsShadow:** Oasis registers a shadow character-style command but no default Ribbon, menu or dialog control was found. Rendering, selection behavior, undo and DOCX preservation need verification.
107. **home.emboss:** Oasis registers an emboss character-style command but no default Ribbon, menu or dialog control was found. Rendering, selection behavior, undo and DOCX preservation need verification.
108. **home.engrave:** Oasis registers an engrave character-style command but no default Ribbon, menu or dialog control was found. Rendering, selection behavior, undo and DOCX preservation need verification.
109. **home.rtlDirection:** Oasis registers a text-direction value command but no default Ribbon or menu control was found. Direction scope, mixed selections, RTL shaping and DOCX interoperability need workflow verification.
110. **home.ltrDirection:** Oasis registers a text-direction value command but no default Ribbon or menu control was found. Direction scope, mixed selections, RTL shaping and DOCX interoperability need workflow verification.
111. **file.new:** The File tab creates a blank document and confirms before discarding a dirty document. WordCraft's template selection and new-document options are not provided; confirmation, dirty-state and lifecycle workflows remain in P04.
112. **file.save:** Save invokes the public client host persistence contract; the default app uses IndexedDB, and a custom host can persist elsewhere. The command clears dirty state after success and logs failures, while visible completion/error feedback and full save/reload/recovery workflows remain open in P04.
113. **file.open:** The File tab opens the DOCX import picker. Arbitrary document opening and other source formats are not provided by this path; cancellation, import errors, source preservation and full lifecycle workflows remain in P04/P06.
114. **file.newFromTemplate:** No document-template picker or command is exposed in the File tab, menubar, or core command registry. Style galleries select formatting presets; they do not create documents from templates.
115. **file.saveTemplate:** No save-as-template command or user-facing template workflow was found in the File tab, menubar, or core command registry.
116. **file.listTemplates:** No personal-template library or list-templates workflow was found in the File tab, menubar, or core command registry.
117. **file.saveAs:** The File tab offers DOCX export as a related Save As path, downloading a copy instead of selecting an arbitrary host location or updating the active persistence record. Format choice, overwrite behavior and full save lifecycle remain open in P04/P06.
118. **file.printMarkup:** Print Markup: Oasis exposes browser/host Print but has no print-markup toggle or revision-markup print path in the File tab or print handler.
119. **file.close:** Close: No document-close command or File close action exists in the default app; the host owns editor disposal. Header/footer close exits a story and is not document close.
120. **file.info:** Info: No Backstage information page or command exists. Status-bar counts and the outline do not provide the source File Info workflow.
121. **file.properties:** Properties: No document-properties page or command exists in the File tab, menubar, or built-in command registry.
122. **file.exportPng:** Export Image: No document/page-to-PNG export workflow exists in File, menubar, or built-in commands; image export and screenshot utilities are not document export.
123. **file.options:** Options: No application Options/Preferences page is available through the default File or menubar surfaces. Hidden Tools/Preferences metadata has no visible action.
124. **view.numeral:** Numerals: No numeral-display settings command or user-facing control exists in the default app surfaces or built-in command registry.
125. **file.share:** Share: No document-sharing workflow, share link, or collaboration service action is exposed in the default app or built-in commands.
126. **file.protect:** Protect Document: The declared Protection tab has no populated default controls or protection command; no document restriction workflow is exposed.
127. **file.inspect:** Inspect Document: No document inspector workflow is exposed through the File tab, menubar, or built-in commands.
128. **file.accessibility:** Check Accessibility: Alt text and accessible controls exist, but no document accessibility-checker workflow or command is exposed.
129. **file.compatibility:** Check Compatibility: No document compatibility checker or compatibility report workflow exists in the default app or built-in commands.
130. **file.versions:** Version History: No saved-version history or restore-version workflow is exposed. Stepwise undo is not document version history.
131. **file.recover:** Recover Unsaved: No unsaved-document recovery browser or recovery command is exposed; IndexedDB persistence is not an end-user recovery workflow.
132. **quickAccess.undoTo:** Oasis exposes stepwise Undo/Redo only. The Home history group has no undo-history menu, and the public client history API provides undo/redo but no jump-to-entry operation.
133. **quickAccess.repeat:** No repeat-last-command action or public command exists in the default toolbar, menubar, or built-in command registry. Redo is a distinct history operation and is not treated as equivalent.
134. **file.print:** Oasis exposes Print in File > Document through the host/browser print flow. Page breaks, print settings, cancellation/errors, keyboard access and actual Safari output need workflow verification.
135. **file.exportPdf:** Oasis exposes PDF export in File > Document. Long documents, page-level features, output integrity, failure/cancel behavior and visual comparisons still need workflow verification.
136. **home.undo:** Oasis places Undo in Home > History while WordCraft exposes it in Quick Access. Shared history dispatch is wired; transaction scope, disabled state, keyboard parity and multi-step user workflows need verification.
137. **home.redo:** Oasis places Redo in Home > History while WordCraft exposes it in Quick Access. Shared history dispatch is wired; transaction scope, disabled state, keyboard parity and multi-step user workflows need verification.
138. **insert.editHeader:** Oasis exposes Edit Header from the Insert > Header & Footer menu. WordCraft also places it on its contextual Header & Footer tab; variant editing, selection/focus behavior and DOCX story round-trip need verification.
139. **insert.editFooter:** Oasis exposes Edit Footer from the Insert > Header & Footer menu. WordCraft also places it on its contextual Header & Footer tab; variant editing, selection/focus behavior and DOCX story round-trip need verification.
140. **editing.lineBreak:** Oasis registers a hard-line-break command but no default Ribbon/menubar control or shortcut was found. Selection/caret behavior, undo and DOCX break round-trip need verification.
141. **editing.columnBreak:** Oasis registers a hard-column-break command but no default Ribbon/menubar control or shortcut was found. Column layout, selection/caret behavior, undo and DOCX break round-trip need verification.
142. **home.paragraphTextShading:** WordCraft para.shading shades selected text when the selection is within one paragraph; Oasis exposes character shading in Home > Font. This covers that scope of the context-sensitive command, while paragraph scope is tracked separately. Mixed ranges, clear behavior, undo and DOCX interoperability need workflow verification.
143. **layout.paragraphShading:** WordCraft para.shading applies paragraph shading at a caret or when explicitly requested; Oasis exposes a paragraph-color field in the Layout metrics dropdown and also a field in the Paragraph dialog. The control does not provide WordCraft's combined text/paragraph scope or palette workflow; mixed selections, clearing, undo and DOCX interoperability need verification.
144. **layout.paragraphBorders:** The Oasis quick action applies a 1 pt solid black border on all four paragraph sides. WordCraft para.borders offers individual sides, presets, styles, widths and colors, so this is only a related task; per-side formatting is available separately in the Paragraph dialog. Selection scope, undo and DOCX/PDF output need verification.
145. **context.paragraphBordersDialog:** The Paragraph dialog commits configurable sides, one shared style, width and color through a dialog transaction, with no shared Oasis command for the full payload. WordCraft also supports independent per-side styles, between borders and more styles; undo grouping and DOCX/PDF behavior need workflow verification.
146. **home.hangingIndent:** The Home special-indent menu exposes Hanging. WordCraft adds 36 pt to the existing left indent; the Oasis menu sets a 36 pt hanging indent by default, so repeated use and paragraphs with existing indents can differ. Selection scope, undo and DOCX/PDF behavior need verification.
147. **home.listLevel:** Oasis registers a command that sets the selected list paragraphs' explicit level from 0–8, matching WordCraft's task; no default Ribbon or menubar control exposes the numeric level. Mixed list selections, numbering definitions, undo and DOCX interoperability need verification.
148. **home.setNumberingValue:** The List Options start field sets a numbering start value. WordCraft creates a numbering override that continues across following paragraphs sharing that list; Oasis updates the selected paragraphs' start value, so continuation and selection scope differ. Undo and DOCX behavior need workflow verification.
149. **home.asianTypographyKinsoku:** Oasis registers the Kinsoku setting as a separate command, but no default Ribbon, menu or dialog control was found. Its behavior, Japanese line-breaking output, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
150. **home.asianTypographyWordWrap:** Oasis registers the East Asian word-wrap setting as a separate command, but no default Ribbon, menu or dialog control was found. Its behavior, mixed-script line breaking, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
151. **home.asianTypographyOverflowPunct:** Oasis registers punctuation overflow as a separate command, but no default Ribbon, menu or dialog control was found. Rendering, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
152. **home.asianTypographyTopLinePunct:** Oasis registers top-line punctuation compression as a separate command, but no default Ribbon, menu or dialog control was found. Rendering, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
153. **home.asianTypographyAutoSpaceDE:** Oasis registers automatic spacing between East Asian and Latin text as a separate command, but no default Ribbon, menu or dialog control was found. Font/run handling, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
154. **home.asianTypographyAutoSpaceDN:** Oasis registers automatic spacing between East Asian text and numbers as a separate command, but no default Ribbon, menu or dialog control was found. Font/run handling, undo and DOCX interoperability need workflow verification against WordCraft's combined Asian Typography command.
155. **context.paragraphDialog:** Oasis opens its Paragraph dialog from the editor context menu; WordCraft exposes a Paragraph dialog launcher on Home and Layout. The entry point is UI-only and the dialog does not share WordCraft's command contract. Field coverage, selection scope, undo and document round-trips remain independently tracked.
156. **context.fontDialog:** Oasis opens the Font dialog from the editor context menu; WordCraft exposes a Font dialog launcher on Home. The entry point is UI-only and does not share a launcher command. Font and Advanced tab fields are tracked separately; field coverage, selection scope, undo and DOCX behavior remain to be verified.
157. **home.normalStyle:** Normal is selectable from Oasis's Home style gallery through setStyleId. WordCraft also provides a dedicated Normal command and shortcut; style ID/name resolution, inherited formatting, selection scope and DOCX interoperability need verification.
158. **home.heading1Style:** Heading 1 is selectable from Oasis's Home style gallery through setStyleId. WordCraft also provides a dedicated Heading 1 command and shortcut; style ID/name resolution, outline/navigation behavior, selection scope and DOCX interoperability need verification.
159. **home.heading2Style:** Heading 2 is selectable from Oasis's Home style gallery through setStyleId. WordCraft also provides a dedicated Heading 2 command and shortcut; style ID/name resolution, outline/navigation behavior, selection scope and DOCX interoperability need verification.
160. **home.heading3Style:** Heading 3 is selectable from Oasis's Home style gallery through setStyleId. WordCraft also provides a dedicated Heading 3 command and shortcut; style ID/name resolution, outline/navigation behavior, selection scope and DOCX interoperability need verification.
161. **home.characterStyle:** Oasis's Home style gallery applies character styles through setCharacterStyleId and lists quick styles. Style availability filtering, name/ID resolution, mixed selections, reset behavior, undo and DOCX interoperability need workflow verification.
162. **home.applyParagraphStyle:** WordCraft styles.apply with a paragraph-style payload maps to Oasis's paragraph-style gallery path. WordCraft's no-payload branch opens a Styles pane that Oasis does not expose; style application, inherited formatting, selection behavior and DOCX interoperability need workflow verification.
163. **home.applyCharacterStyle:** WordCraft styles.apply with a character-style payload maps to Oasis's character-style gallery path. WordCraft's no-payload branch opens a Styles pane that Oasis does not expose; style availability, selection behavior, clearing, undo and DOCX interoperability need workflow verification.
164. **home.advancedFind:** The Oasis Find button opens a dialog with match-case and whole-word filters. WordCraft Advanced Find also supports prefix/suffix matching, ignored punctuation/spacing, wildcards, regex, special codes, selection scope and match highlighting; those paths are not represented in Oasis.
165. **home.findNext:** The Find dialog advances to the next match through its controller, and Enter invokes the same action. Oasis has no shared find-next command; wraparound, selection retention and parity with WordCraft's additional search options need workflow verification.
166. **home.findPrevious:** The Find dialog moves to the previous match through its controller, and Shift+Enter invokes the same action. Oasis has no shared find-previous command; wraparound, selection retention and parity with WordCraft's additional search options need workflow verification.
167. **home.replaceOne:** Replace one applies the replacement term to the active match through the dialog controller. WordCraft's edit.replace accepts a direct search/replacement payload with advanced options; Oasis has no shared command bound to this UI action. Selection, formatting preservation, undo and DOCX behavior need workflow verification.
168. **home.replaceAll:** Replace all runs through the dialog controller and supports match-case and whole-word filters. The separate Oasis replaceAll command is not dispatched by this UI; WordCraft also supports regex/special codes and a wider option set. A single undo step, formatting, selection and DOCX behavior need workflow verification.
169. **home.pasteSpecialFormatted:** Oasis Paste covers the formatted/HTML paste path from WordCraft Paste Special. WordCraft also offers direct RTF and picture formats; Oasis's browser clipboard path and image-only behavior need separate verification.
170. **home.pasteSpecialText:** Oasis Paste as Plain Text covers WordCraft Paste Special's text-only format. RTF/picture variants and native clipboard permissions are not covered; selection replacement, one-step undo and DOCX output need workflow verification.
171. **home.copyFormat:** Oasis's one-shot Format Painter captures the selected source formatting when armed, covering WordCraft Copy Formatting as part of a combined interaction. Source capture, selection scope, hyperlinks and complex stories need workflow verification.
172. **home.pasteFormat:** After Format Painter is armed, Oasis applies the captured style when the destination selection is finalized; WordCraft exposes Paste Formatting as a separate command. This is a related UI task with different event timing and no shared command for the apply step; pointer/keyboard coverage, undo and DOCX behavior need verification.
173. **layout.margins:** Oasis provides standard margin presets and custom top/bottom/left/right values. WordCraft also supports mirrored margins, gutter and an Office 2003 preset; units, section scope, print layout and DOCX round-trips need workflow verification.
174. **layout.orientation:** The Section dropdown sets Portrait or Landscape with the shared setOrientation command. Active-section scope, page-size interactions, selection handling and DOCX/PDF layout need workflow verification.
175. **layout.columns:** Oasis registers a column-layout command but no default Ribbon, menu or dialog control was found. WordCraft exposes presets, spacing, separators, unequal widths and apply scopes; selection/section behavior and DOCX/PDF pagination need workflow verification.
176. **layout.breakPage:** Oasis's Insert > Page Break button covers the page-break variant of WordCraft Layout > Breaks. Section-break variants, selection in tables and pagination/DOCX behavior remain separate.
177. **layout.breakColumn:** Oasis registers a column-break command but no default Ribbon, menu or shortcut was found. Layout must contain columns for the break to have the same effect; caret/selection, pagination and DOCX round-trip need verification.
178. **layout.breakNextPage:** The Section dropdown inserts a next-page section break. WordCraft Breaks also offers even-page and odd-page starts; section boundary, header/footer inheritance and pagination need workflow verification.
179. **layout.breakContinuous:** The Section dropdown inserts a continuous section break. WordCraft Breaks also offers even-page and odd-page starts; section boundary, header/footer inheritance and pagination need workflow verification.
180. **layout.verticalAlign:** Oasis registers top, center and bottom section alignment but no default UI; WordCraft also supports justified/both distribution across the page. Section scope, pagination and DOCX/PDF output need workflow verification.
181. **layout.sectionDirection:** Oasis registers the section bidirectional-layout flag but no default Ribbon or menu control was found. WordCraft defines RTL section columns; column order, mixed sections, pagination and DOCX interoperability need workflow verification.
182. **layout.textDirection:** Oasis registers paragraph vertical-text flow values but no default UI. WordCraft applies text direction to section(s), table cells or text boxes as well as paragraphs, so target scope and rotated text rendering remain partial; DOCX interoperability needs verification.
183. **insert.closeHeader:** Oasis exposes Exit Header/Footer in the Insert Header & Footer menu. WordCraft's close command returns from the active story; the two products differ in the observed close path. Focus restoration, current-story transitions and keyboard behavior need workflow verification.
184. **insert.pageNumberFormat:** Oasis registers section page-number format/start settings, but no default Ribbon, menu or dialog control was found. Format coverage, continue-from-previous semantics, section scope, pagination and DOCX/PDF output need workflow verification.
185. **insert.differentFirstPage:** Oasis registers the separate-first-page header/footer flag, but no default UI control was found. Story creation/inheritance, active-section scope, pagination and DOCX interoperability need workflow verification.
186. **insert.differentOddEven:** Oasis registers the different-odd/even-pages setting, but no default UI control was found. Story creation/inheritance, document-wide scope, pagination and DOCX interoperability need workflow verification.
187. **layout.suppressLineNumbers:** Oasis registers a per-paragraph suppress-line-numbers flag, not section line-numbering modes; this is a related-task mapping. No default Ribbon or menubar path was found. Paragraph scope, undo and DOCX interoperability need workflow verification.
188. **layout.objectPosition:** Oasis registers nine positions anchored to page margins and promotes an inline image/text box to a square-wrapped floating object. No default UI path was found. Selection, anchor behavior, pagination and DOCX/PDF output need workflow verification.
189. **layout.objectWrap:** Oasis registers inline, square, tight, through, top/bottom, behind and front wrap presets for a selected image/text box, but no default UI path was found. Text-side wrapping is a separate command without a catalog row. Layout, undo and DOCX/PDF output need workflow verification.
190. **layout.objectBringForward:** Oasis registers a front-layer move for a selected image/text box, but no default UI path was found. It moves the object in front of the text layer rather than advancing one object layer, so this is a related-task mapping; z-order and DOCX/PDF rendering need workflow verification.
191. **layout.objectSendBackward:** Oasis registers a behind-text-layer move for a selected image/text box, but no default UI path was found. It sends the object behind text rather than back one object layer, so this is a related-task mapping; z-order and DOCX/PDF rendering need workflow verification.
192. **layout.objectAlign:** Oasis registers left/center/right alignment of one selected image/text box relative to the margin; no default UI path was found. This narrower control is a related-task mapping. Selection, anchor behavior and DOCX/PDF output need workflow verification.
193. **layout.objectRotate:** Oasis registers an exact-angle rotation command for a selected image/text box, but no default UI path was found. Rotation state, rendering, undo and DOCX/PDF output need workflow verification.
194. **layout.paperSizePreset:** Oasis registers page-size presets but no default UI path was found. Preset coverage, active-section scope, pagination and DOCX/PDF output need workflow verification against WordCraft's Size control.
195. **layout.paperSizeCustom:** Oasis registers exact page dimensions but no default UI path was found. Units, validation, active-section scope, pagination and DOCX/PDF output need workflow verification against WordCraft's Size control.
196. **layout.paragraphIndentLeft:** The Paragraph dialog exposes a left-indent field; it is opened from the editor context menu, not the Layout Ribbon. Units, mixed selection, dialog commit/undo and DOCX layout need workflow verification.
197. **layout.paragraphIndentRight:** The Paragraph dialog exposes a right-indent field; it is opened from the editor context menu, not the Layout Ribbon. Units, mixed selection, dialog commit/undo and DOCX layout need workflow verification.
198. **layout.paragraphIndentFirstLine:** The Paragraph dialog exposes first-line indentation through its special-indent mode and amount; it is opened from the editor context menu, not the Layout Ribbon. Mode, units, mixed selection, dialog commit/undo and DOCX layout need workflow verification.
199. **layout.paragraphIndentHanging:** The Paragraph dialog exposes hanging indentation through its special-indent mode and amount; it is opened from the editor context menu, not the Layout Ribbon. Mode, units, mixed selection, dialog commit/undo and DOCX layout need workflow verification.
200. **layout.paragraphMirrorIndents:** Oasis exposes paragraph mirror-indents in the Paragraph dialog, opened from the editor context menu. The catalog row only identifies the broader indents task, so equivalence of mirrored-page behavior, mixed selection, undo and DOCX output remains unverified.
201. **layout.paragraphSpacingBefore:** The Paragraph dialog exposes spacing before, and the Line Spacing dialog also exposes it. Both paths are secondary UI; paragraph-style interaction, mixed selection, pagination, dialog commit/undo and DOCX output need workflow verification.
202. **layout.paragraphSpacingAfter:** The Paragraph dialog exposes spacing after, and the Line Spacing dialog also exposes it. Both paths are secondary UI; paragraph-style interaction, mixed selection, pagination, dialog commit/undo and DOCX output need workflow verification.
203. **layout.paragraphLineHeight:** The Paragraph dialog exposes a numeric line-spacing amount; its mode determines whether the value is multiple, exact or minimum spacing. Unit conversion, mode/value interaction, mixed selection, pagination, undo and DOCX output need workflow verification.
204. **layout.paragraphLineRule:** The Paragraph dialog exposes line-spacing modes and a corresponding line-rule command. Its options include single, 1.5, double, minimum, exact and multiple modes; mapping, selection, pagination, undo and DOCX output need workflow verification.
205. **layout.paragraphContextualSpacing:** The Paragraph dialog exposes contextual spacing. The catalog row only identifies the broader spacing task, so style interaction, mixed selections, pagination, undo and DOCX behavior need workflow verification.
206. **home.doubleStrikethroughCommand:** Oasis registers the shared double-strike command, but no default command-backed Ribbon or menubar path was found. The Font dialog has a separate aggregate apply path recorded as home.doubleStrikethroughDialog. Selection, undo and DOCX interoperability need workflow verification.
207. **home.doubleStrikethroughDialog:** The Font dialog exposes double strikethrough but applies it through the aggregate Font dialog state adapter, not the shared doubleStrike command. This records UI exposure separately from command registration; selection retention, undo and DOCX interoperability need workflow verification.
208. **home.characterBorder:** Oasis registers a toggle that applies or clears a black, solid 0.5 pt character border, but no default UI path was found. WordCraft exposes border configuration, so this is a narrower related task; selection scope, rendering, undo and DOCX output need verification.
209. **home.emphasisMark:** Oasis registers a value command for emphasis marks, but no default UI path was found. Supported mark values, rendering, mixed selection, undo and DOCX interoperability need workflow verification.
210. **home.textEffects:** Oasis registers a generic text-effect value command, but no default UI path was found. Effect coverage, rendering, mixed selection, undo and DOCX interoperability need workflow verification.
211. **table.mergeCells:** The Table Layout Merge button dispatches tableMerge. Adjacent-cell selection, merged content, undo and DOCX round-trip need workflow verification.
212. **table.splitCells:** The Table Layout Split button dispatches tableSplit. Split dimensions, selected-cell behavior, undo and DOCX round-trip need workflow verification.
213. **table.insertRowAbove:** The Table Layout Insert Above button inserts before the active row. Caret/selection scope, inherited cell formatting, undo and DOCX round-trip need workflow verification.
214. **table.insertRowBelow:** The Table Layout Insert Below button inserts after the active row. Caret/selection scope, inherited cell formatting, undo and DOCX round-trip need workflow verification.
215. **table.deleteRows:** The Table Layout Delete Row button dispatches tableDeleteRow. Multi-row selection, last-row behavior, undo and DOCX round-trip need workflow verification.
216. **table.insertColumnLeft:** The Table Layout Insert Left button inserts before the active column. Selection scope, inherited cell formatting, undo and DOCX round-trip need workflow verification.
217. **table.insertColumnRight:** The Table Layout Insert Right button inserts after the active column. Selection scope, inherited cell formatting, undo and DOCX round-trip need workflow verification.
218. **table.deleteColumns:** The Table Layout Delete Column button dispatches tableDeleteColumn. Multi-column selection, last-column behavior, undo and DOCX round-trip need workflow verification.
219. **table.splitTable:** The Table Layout Split Table button splits at the active caret row. Boundary rows, copied table properties, undo and DOCX round-trip need workflow verification.
220. **table.autoFit:** The Table Layout AutoFit toggle switches between fixed and autofit sizing. WordCraft's content/window sizing choices are not established by this toggle; width recalculation, undo and DOCX layout need workflow verification.
221. **table.distributeRows:** The Table Layout Distribute Rows button equalizes selected table row heights. Selection range, minimum/maximum constraints, undo and DOCX layout need workflow verification.
222. **table.distributeColumns:** The Table Layout Distribute Columns button equalizes selected table column widths. Selection range, minimum/maximum constraints, undo and DOCX layout need workflow verification.
223. **table.deleteTable:** The Table Layout Delete Table button removes the active table. Caret resolution, surrounding paragraph preservation, undo and DOCX round-trip need workflow verification.
224. **table.repeatHeaderRows:** The Table Layout Repeat Header Rows toggle applies to the active table's first row. Multi-row selection, pagination, undo and DOCX output need workflow verification.
225. **table.sortAscending:** The Table Layout Sort Ascending button sorts body rows by the caret column. Sort keys, header handling, locale-aware values, undo and DOCX preservation need workflow verification.
226. **table.sortDescending:** The Table Layout Sort Descending button sorts body rows by the caret column. Sort keys, header handling, locale-aware values, undo and DOCX preservation need workflow verification.
227. **table.convertToText:** The Table Layout Convert to Text button flattens the active table to body paragraphs. Delimiter choice, nested content, selection, undo and formatting retention need workflow verification.
228. **table.lookHeaderRow:** The Table Design Style Options control toggles the table header-row look flag. Table styles, conditional formatting, visual output and DOCX round-trip need workflow verification.
229. **table.lookTotalRow:** The Table Design Style Options control toggles the table total-row look flag. Table styles, conditional formatting, visual output and DOCX round-trip need workflow verification.
230. **table.lookBandedRows:** The Table Design Style Options control toggles banded-row formatting. Style interaction, conditional formatting, visual output and DOCX round-trip need workflow verification.
231. **table.lookFirstColumn:** The Table Design Style Options control toggles first-column emphasis. Style interaction, conditional formatting, visual output and DOCX round-trip need workflow verification.
232. **table.lookLastColumn:** The Table Design Style Options control toggles last-column emphasis. Style interaction, conditional formatting, visual output and DOCX round-trip need workflow verification.
233. **table.lookBandedColumns:** The Table Design Style Options control toggles banded-column formatting. Style interaction, conditional formatting, visual output and DOCX round-trip need workflow verification.
234. **table.styleGallery:** The Table Design gallery applies a named table style. Preview accuracy, style availability, conditional formatting, selection and DOCX round-trip need workflow verification.
235. **table.shading:** The Table Design shading color control sets cell fill on the active cell selection. Mixed cells, clearing, theme colors, table-style precedence, undo and DOCX output need workflow verification.
236. **table.borders:** The Table Design Borders menu applies named border presets to the active cell selection. Side selection, styles, colors, mixed cells, undo and DOCX output need workflow verification.
237. **table.borderPainter:** The Table Design Border Painter button toggles Oasis's table-border drawing mode. Pointer targeting, selected border presets, keyboard behavior, undo and DOCX output need workflow verification.
238. **table.properties:** The context menu opens the Table Properties dialog, and the registered tableProperties command opens the same dialog. The menu currently invokes the dialog bridge directly; focus, active tab, selection, apply/undo and keyboard behavior need workflow verification.
239. **table.altText:** The Table Properties dialog exposes table alternative-text title and description fields, with no dedicated Oasis alt-text command. Accessibility naming, apply/undo, screen-reader behavior and DOCX preservation need workflow verification.
240. **table.deleteCells:** Oasis registers a cell-deletion command but no default Ribbon, menu or dialog path was found. Delete mode choices, selected-cell handling, content recovery, undo and DOCX round-trip need workflow verification.
241. **table.rowHeight:** The Row tab exposes height and automatic/at-least/exact rules. The dialog applies through an aggregate state update rather than dispatching tableSetRowHeight; rules, units, row selection, pagination, undo and DOCX behavior need workflow verification.
242. **table.columnWidth:** The Column tab exposes a width field. The dialog applies through an aggregate state update rather than dispatching tableSetColumnWidth; units, selected columns, autofit, undo and DOCX layout need workflow verification.
243. **table.cellAlignTop:** The Table Layout Align Top button sets selected cell content to top alignment; the Cell tab also exposes this value. Selection scope, inherited states, row sizing, undo and DOCX rendering need workflow verification.
244. **table.cellAlignMiddle:** The Table Layout Align Middle button sets selected cell content to middle alignment; the Cell tab also exposes this value. Selection scope, inherited states, row sizing, undo and DOCX rendering need workflow verification.
245. **table.cellAlignBottom:** The Table Layout Align Bottom button sets selected cell content to bottom alignment; the Cell tab also exposes this value. Selection scope, inherited states, row sizing, undo and DOCX rendering need workflow verification.
246. **table.cellAlignMatrix:** The 3×3 positional picker combines horizontal and vertical alignment on selected cells through one command. Keyboard, multi-cell mixed-state, selection retention, undo and DOCX round-trip still need workflow verification.
247. **table.textDirection:** The Cell tab exposes five text-flow values. The dialog applies through an aggregate state update rather than dispatching tableSetCellTextDirection; selection, vertical layout, rendering, undo and DOCX output need workflow verification.
248. **table.cellMargins:** The Cell tab exposes four per-edge margins. The dialog applies through an aggregate state update rather than dispatching tableSetCellMargins; units, selected cells, defaults, undo and DOCX layout need workflow verification.
249. **table.formula:** Oasis registers a formula evaluator for the active cell but no default UI path was found. Supported formulas, cell references, number formatting, recalculation, undo and DOCX field behavior need workflow verification.
250. **table.viewGridlines:** The Table Design Borders menu toggles table gridline visibility. This is an editing aid rather than a printed border; active-table scope, display behavior and keyboard access need workflow verification.
251. **table.selectCell:** Oasis registers a command to expand the active table selection to a cell, but no default Ribbon, menu or dialog control was found. Caret targeting, focus, keyboard behavior and undo integration need workflow verification.
252. **table.selectRow:** Oasis registers a command to expand the active table selection to a row, but no default Ribbon, menu or dialog control was found. Caret targeting, focus, keyboard behavior and undo integration need workflow verification.
253. **table.selectColumn:** Oasis registers a command to expand the active table selection to a column, but no default Ribbon, menu or dialog control was found. Caret targeting, focus, keyboard behavior and undo integration need workflow verification.
254. **table.selectTable:** Oasis registers a command to expand the active table selection to the whole table, but no default Ribbon, menu or dialog control was found. Caret targeting, focus, keyboard behavior and undo integration need workflow verification.
255. **review.acceptAll:** Oasis registers Accept All Changes but no default Ribbon, menu or dialog control was found. Confirmation, protected revisions, comment anchors, undo and DOCX round-trip need workflow verification.
256. **review.rejectAll:** Oasis registers Reject All Changes but no default Ribbon, menu or dialog control was found. Confirmation, protected revisions, comment anchors, undo and DOCX round-trip need workflow verification.
257. **image.crop:** Oasis exposes a Crop menu on its contextual Image Format tab, with crop mode, aspect ratios, shape presets, Fill, Fit and Reset. Contextual activation, drag behavior, crop rendering, undo and DOCX round-trip need workflow verification against WordCraft.
258. **image.height:** Oasis exposes selected-image height in centimetres and locks the aspect ratio. This covers one dimension of WordCraft Size; mixed selection, unit conversion, resizing behavior, undo and DOCX round-trip need workflow verification.
259. **image.width:** Oasis exposes selected-image width in centimetres and locks the aspect ratio. This covers one dimension of WordCraft Size; mixed selection, unit conversion, resizing behavior, undo and DOCX round-trip need workflow verification.
260. **image.border:** Oasis exposes picture border editing on its contextual Image Format tab. WordCraft's Picture Styles gallery is a separate, still-unmatched task; available border presets, selected-image behavior, undo and DOCX round-trip need workflow verification.
261. **image.altText:** Oasis offers selected-image alt-text editing under Insert > Accessibility, while WordCraft places it on Picture Format. The task is related but the Ribbon placement differs; dialog content, screen-reader behavior and DOCX accessibility metadata need workflow verification.
262. **image.reset:** Oasis registers Reset Picture without a default Ribbon, menu or dialog path. Its implementation clears crop, mask, transparency, border, rotation and flip while retaining the image frame size and floating position; confirmation, undo and DOCX round-trip need workflow verification.
263. **image.transparency:** Oasis registers a selected-image transparency value from zero to one, but has no default Ribbon, menu or dialog control. Preset and slider UI, rendering, undo and DOCX/PDF interoperability need verification.
264. **image.rotation:** Oasis registers exact-angle rotation for selected images and text boxes, but has no default contextual Ribbon or menu control. Angle entry, rendering, undo and DOCX/PDF interoperability need workflow verification.
265. **shape.altText:** Oasis registers alt-text editing for selected text boxes but has no default Ribbon, menu or dialog path. WordCraft's object-level task also covers other objects; text-box scope, accessibility metadata and DOCX round-trip need workflow verification.
266. **shape.fill:** Oasis registers solid fill color for selected text boxes but has no default Ribbon, menu or dialog path. WordCraft also lists a gradient-fill task under the same command; gradient behavior is not represented by this Oasis command. Shape scope, rendering and DOCX round-trip need verification.
267. **shape.outlineColor:** Oasis registers selected-text-box outline color changes but has no default Ribbon, menu or dialog path. Width and line-style choices are separate tasks; shape targeting, rendering and DOCX round-trip need verification.
268. **shape.outlineWidth:** Oasis registers selected-text-box outline width changes but has no default Ribbon, menu or dialog path. Line styles, dashes and width preset coverage remain unverified; rendering and DOCX round-trip need verification.
269. **shape.textDirection:** Oasis registers horizontal, vertical, rotated and stacked text-box direction values but has no default Ribbon, menu or dialog path. Glyph layout, mixed scripts, focus, rendering and DOCX round-trip need workflow verification.
270. **shape.textAlignment:** Oasis registers top, middle or bottom vertical anchoring for text-box content but has no default Ribbon, menu or dialog path. Interaction with padding, vertical text, resizing and DOCX round-trip needs verification.
271. **file.autoSave:** Oasis has optional host-configured debounced persistence, but the default app does not enable it and exposes no AutoSave toggle or status control in the Quick Access Toolbar. This does not provide the user-facing Word AutoSave workflow.
272. **titleBar.commandSearch:** No Tell Me/command-search launcher is exposed in the title bar or default app surfaces. The Find command searches document content and is not a command-search equivalent.
273. **home.clipboardPane:** Clipboard Pane: No persistent clipboard task pane is exposed in the default app surfaces. Cut/copy/paste commands are direct editing actions and do not provide Word’s multi-item clipboard history.
274. **home.phoneticGuide:** Phonetic Guide: No phonetic-guide command or editor dialog is exposed in the default app. Font selection and text styling do not add ruby/phonetic annotations.
275. **home.encloseCharacters:** Enclose Characters: No enclosed-character formatting command or control is exposed in the default Ribbon or menus.
276. **home.multilevelList:** Multilevel List: Oasis exposes basic list formatting, but no multilevel-list gallery or hierarchical list workflow is available in the default UI.
277. **home.defineMultilevelList:** Define New Multilevel List: No multilevel-list definition dialog or command is exposed. Basic ordered/unordered list formatting does not define hierarchical numbering levels.
278. **home.multilevelListLibrary:** Multilevel List Library: No library of multilevel numbering presets is exposed in the default app.
279. **home.defineBullet:** Define New Bullet: No custom bullet-definition dialog or command is exposed; the default list action does not configure a new bullet symbol.
280. **home.defineNumberFormat:** Define New Number Format: No custom number-format definition workflow is exposed; basic numbering does not configure a new format.
281. **home.distributedAlignment:** Distributed: No distributed paragraph-alignment command or Ribbon control is exposed. Left, center, right and justified alignment do not provide this distinct behavior.
282. **home.createStyle:** Create a Style: The style gallery applies available styles, but the default app exposes no create-style dialog or command.
283. **home.modifyStyle:** Modify Style: The style gallery applies available styles, but the default app exposes no modify-style workflow for editing a style definition.
284. **home.updateStyleToMatch:** Update Style to Match Selection: No command updates a named style definition from the current selection in the default app.
285. **home.deleteStyle:** Delete Style: No style-management surface or command deletes a named style from the default app.
286. **home.styleInspector:** Style Inspector: No style-inspector panel or command is exposed in the default UI.
287. **home.manageStyles:** Manage Styles: The style gallery applies available styles, but no style-management dialog or command is exposed in the default app.
288. **home.goTo:** Go To: Find searches text and Outline navigates headings, but the default app exposes no Go To workflow for pages, sections, lines or objects.
289. **home.selectObjects:** Select Objects: Canvas pointer selection targets supported objects directly, but no Select Objects mode or command is exposed in the default Ribbon.
290. **home.selectSimilarFormatting:** Select Similar Formatting: No command selects document ranges based on matching formatting in the default app.
291. **home.dictation:** Dictate: No dictation or speech-to-text command is exposed by the default app; browser/platform speech input is not presented as an Oasis workflow.
292. **home.editorProofing:** Editor: No integrated spelling, grammar and writing-suggestion service is exposed in the default app.
293. **insert.drawTable:** Draw Table: The table grid inserts a selected row/column count, but no freehand table-drawing mode is exposed in the default UI.
294. **insert.convertTextToTable:** Convert Text to Table: No command converts delimited document text into a table in the default app. The Insert table grid creates an empty table and is a different task.
295. **insert.excelSpreadsheet:** Excel Spreadsheet: No embedded spreadsheet insertion or Excel integration is exposed in the default app.
296. **insert.quickTables:** Quick Tables: The default Insert tab has no preformatted Quick Tables gallery; the table grid inserts a blank table.
297. **insert.onlinePictures:** Online Pictures: Oasis can insert a local image, but no online image search/source picker is exposed in the default app.
298. **insert.models3d:** 3D Models: No 3D model importer, viewer or insertion workflow is exposed.
299. **insert.smartArt:** SmartArt: No SmartArt diagram model or insertion workflow is exposed in the default app.
300. **insert.chart:** Chart: No chart data model or chart insertion workflow is exposed in the default app.
301. **insert.screenshot:** Screenshot: No screen-capture insertion workflow is exposed. Browser screenshot testing utilities are not a user-facing document action.
302. **insert.drawingCanvas:** Drawing Canvas: The editor uses a canvas renderer, but it does not expose an insertable Drawing Canvas object or drawing-area workflow.
303. **insert.getAddIns:** Get Add-ins: No add-in store, discovery surface or add-in installation workflow is exposed in the default app.
304. **insert.onlineVideo:** Online Video: No online video embed or media insertion workflow is exposed.
305. **insert.crossReference:** Cross-reference: No cross-reference insertion dialog or command is exposed in the default UI. Citation links and heading navigation are separate tasks.
306. **insert.textBox:** The Shapes gallery can insert shape-backed text containers, but Oasis has no dedicated Text Box action or insertion mode. Text-box body editing and DOCX behavior remain partially verified.
307. **insert.quickParts:** Quick Parts: No reusable building-block gallery or insertion workflow is exposed in the default app.
308. **insert.autoText:** AutoText: No named reusable text-snippet library or insertion workflow is exposed.
309. **insert.documentProperty:** Document Property: No document metadata field picker or insertable property control is exposed. Date and page fields are separate supported field types.
310. **insert.field:** Oasis inserts selected date and page-number fields, but exposes no general field-code chooser. Field families, updates, locking and interoperability need separate verification.
311. **insert.wordArt:** WordArt: No decorative text gallery or WordArt insertion workflow is exposed. Shape text styling does not provide WordArt presets and transforms.
312. **insert.dropCap:** Oasis registers the drop-cap setter and model support, but no default Ribbon or dialog control exposes it. Visual, selection and DOCX behavior need workflow verification.
313. **insert.signatureLine:** Signature Line: No signature-request placeholder or signing workflow is exposed in the default app.
314. **insert.object:** Object: No embedded-object or OLE insertion workflow is exposed in the default app.
315. **insert.textFromFile:** Text from File: DOCX import replaces/loads a document; no workflow inserts another file’s text at the current selection.
316. **insert.inkEquation:** Oasis exposes a structured equation editor, but no ink handwriting equation recognition workflow. The typed equation path is related rather than equivalent.
317. **insert.optionalHyphen:** Oasis registers an optional-hyphen insertion command, but no default Ribbon, menu or dialog control exposes it. Rendering, line breaking and DOCX round-trip need verification.
318. **insert.coverPage:** Cover Page: No cover-page template gallery or predesigned cover insertion workflow is exposed. Blank-page and page-break commands do not provide document cover templates.
319. **insert.icons:** Icons: The default Insert tab exposes shapes and symbols, but no searchable Office icon asset gallery or SVG icon insertion workflow.
320. **insert.removeHeader:** Remove Header: Oasis can enter the header editor, but the default UI exposes no remove-header action that clears a section header and its variants.
321. **insert.removeFooter:** Remove Footer: Oasis can enter the footer editor, but the default UI exposes no remove-footer action that clears a section footer and its variants.
322. **insert.linkToPrevious:** Link to Previous: No section header/footer inheritance toggle is exposed in the default app; editing a story does not change its linkage to the prior section.
323. **draw.select:** Select: No ink-selection mode or drawing-tool state exists in the default app. Text and object selection is a separate editor workflow.
324. **draw.lassoSelect:** Lasso Select: No freeform lasso selection for ink strokes is exposed in the default app.
325. **draw.eraser:** Eraser: No ink stroke eraser or stroke-segment editing workflow is exposed. Table cell/border editing is unrelated.
326. **draw.pen:** Pen: No pressure-sensitive ink pen tool or stroke model is exposed.
327. **draw.pencil:** Pencil: No pencil drawing tool or ink stroke workflow is exposed.
328. **draw.highlighter:** Highlighter: Text highlighting is supported, but no freehand ink highlighter or stroke model is exposed.
329. **draw.addPen:** Add Pen: No configurable pen palette or add-pen workflow is exposed.
330. **draw.inkToShape:** Ink to Shape: No ink recognition pipeline converts freehand strokes into shape objects. The shape gallery inserts preset shapes directly.
331. **draw.inkToMath:** Ink to Math: The equation editor accepts structured/typed input, but no handwriting recognition converts ink to math.
332. **draw.inkReplay:** Ink Replay: No ink stroke history or replay workflow is exposed.
333. **design.theme:** Theme: The Design gallery applies one of Oasis’s built-in document themes. Theme coverage, preview/commit behavior, selection preservation and DOCX theme fidelity remain under verification.
334. **design.styleSet:** Style Set: The same gallery applies bundled Oasis themes, but does not expose Word’s independent Style Set library or user-defined sets. This is a related, partial workflow.
335. **design.colors:** Colors: The Design gallery applies a bundled document color scheme. Scheme completeness, live preview, mixed document state and DOCX theme-color interoperability remain open.
336. **design.fonts:** Fonts: The Design gallery applies a bundled heading/body font scheme. Font availability, fallback and DOCX theme-font interoperability need verification.
337. **design.paragraphSpacing:** Paragraph Spacing: The Design gallery applies a preset paragraph-spacing profile. Per-style spacing, full line-spacing controls and DOCX round-trip need workflow verification.
338. **design.effects:** Effects: The Design gallery applies a bundled effects preset. Word’s full document-effects set and rendering interoperability remain unverified.
339. **design.setDefault:** Set as Default: The File-independent Design action marks the current Oasis design as the default. Scope, persistence and host/profile behavior need verification against Word’s application-level default.
340. **design.watermark:** Watermark: The Watermark panel supports Oasis text/image watermark settings, but template breadth, placement variants and DOCX watermark fidelity remain partial.
341. **design.pageColor:** Page Color: The Design page-color picker sets the document page color. Print/export behavior, theme palette coverage and DOCX interoperability need verification.
342. **design.pageBorders:** Page Borders: The page-border panel exposes style, color, width and distance settings; Word’s art borders, application scope and DOCX fidelity remain unverified.
343. **layout.pageSetupDialog:** Oasis exposes separate Margins and Section dropdowns for common page-setup tasks, but has no single Page Setup dialog. Paper-size breadth, combined scope and full print/DOCX behavior remain open.
344. **layout.documentGrid:** Document Grid: No document-grid configuration command or control is exposed in the default app.
345. **layout.selectionPane:** Selection Pane: No object-list pane for selecting, hiding or reordering document objects is exposed. Canvas hit testing and outline navigation are different workflows.
346. **layout.groupObjects:** Group: Oasis has no grouped-object model or command in the default app; selecting individual shapes does not create a persistent group.
347. **references.addTocText:** Add Text: No control changes the outline level of selected paragraphs for inclusion/exclusion in a table of contents. General paragraph outline-level commands are not exposed as this TOC task.
348. **references.removeToc:** Remove Table of Contents: Oasis can insert/update its TOC, but no dedicated remove-TOC workflow is exposed.
349. **references.endnote:** Insert Endnote: Oasis inserts footnotes only; no endnote insertion command or UI is exposed.
350. **references.nextFootnote:** Next Footnote: No navigation command moves between footnote references or note bodies in the default app.
351. **references.showNotes:** Show Notes: No notes-pane command or note navigation panel is exposed.
352. **references.researcher:** Researcher: No external research/search provider integration or Researcher pane is exposed.
353. **references.citation:** Insert Citation: No citation-source database or citation insertion workflow is exposed.
354. **references.sources:** Manage Sources: No bibliography source manager or source database is exposed.
355. **references.citationStyle:** Citation Style: No citation-style selector or bibliography formatting workflow is exposed.
356. **references.bibliography:** Bibliography: No bibliography generation workflow is exposed.
357. **references.tableOfFigures:** Insert Table of Figures: Oasis image captions do not generate a table of figures; no such insertion workflow is exposed.
358. **references.updateFigures:** Update Table of Figures: No table-of-figures field generation or refresh workflow is exposed.
359. **references.markIndexEntry:** Mark Index Entry: No index-marking command or hidden index-entry model is exposed.
360. **references.insertIndex:** Insert Index: No index field or index generation workflow is exposed.
361. **references.updateIndex:** Update Index: No index field update workflow is exposed.
362. **references.markCitation:** Mark Table of Authorities Citation: No legal-authority citation model or marking workflow is exposed.
363. **references.tableOfAuthorities:** Insert Table of Authorities: No table-of-authorities generation workflow is exposed.
364. **references.updateAuthorities:** Update Table of Authorities: No table-of-authorities field or refresh workflow is exposed.
365. **references.updateFields:** Update Fields: Oasis can update its TOC through a dedicated command, but no general document-field refresh action is exposed.
366. **references.noteOptions:** Oasis registers footnote/endnote numbering settings, but no default Ribbon, menu or dialog control exposes them. User workflow, settings scope and DOCX settings.xml round-trip need verification.
367. **mailings.envelopes:** Envelopes: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No envelope layout, address merge or print workflow is exposed.
368. **mailings.labels:** Labels: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No label-sheet setup or recipient-label generation workflow is exposed.
369. **mailings.start:** Start Mail Merge: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No mail-merge document mode or data-source workflow is exposed.
370. **mailings.recipients:** Select Recipients: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No recipient source selection or connection UI is exposed.
371. **mailings.editRecipients:** Edit Recipient List: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No mail-merge recipient dataset or editing surface is exposed.
372. **mailings.filterRecipients:** Filter Recipients: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No recipient-query filtering workflow is exposed.
373. **mailings.sortRecipients:** Sort Recipients: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No recipient dataset sorting workflow is exposed.
374. **mailings.highlightFields:** Highlight Merge Fields: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No merge-field model or highlighting toggle is exposed.
375. **mailings.addressBlock:** Address Block: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No recipient address-block merge field or insertion dialog is exposed.
376. **mailings.greetingLine:** Greeting Line: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No greeting-line merge field or configuration workflow is exposed.
377. **mailings.insertField:** Insert Merge Field: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No recipient schema or merge-field picker is exposed.
378. **mailings.rules:** Rules: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No conditional mail-merge rule authoring workflow is exposed.
379. **mailings.matchFields:** Match Fields: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No recipient-field mapping or schema matching workflow is exposed.
380. **mailings.preview:** Preview Results: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No merge record preview mode is exposed.
381. **mailings.next:** Next Record: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No record cursor or merge-preview navigation is exposed.
382. **mailings.previous:** Previous Record: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No record cursor or merge-preview navigation is exposed.
383. **mailings.first:** First Record: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No record cursor or merge-preview navigation is exposed.
384. **mailings.last:** Last Record: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No record cursor or merge-preview navigation is exposed.
385. **mailings.goToRecord:** Go to Record: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No indexed mail-merge record navigation is exposed.
386. **mailings.findRecipient:** Find Recipient: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No recipient search or selection workflow is exposed.
387. **mailings.checkErrors:** Check for Errors: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No merge validation or recipient-data error check is exposed.
388. **mailings.finish:** Finish & Merge: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No merged-document generation or delivery workflow is exposed.
389. **mailings.printDocuments:** Print Documents: No mail-merge engine, recipient data model or user-facing control is exposed in the default app. No print-per-recipient merge output workflow is exposed.
390. **review.spelling:** Spelling & Grammar: No spellchecking provider, dictionary integration or spelling/grammar review workflow is exposed in the default app.
391. **review.thesaurus:** Thesaurus: No thesaurus provider or synonym lookup workflow is exposed.
392. **review.readAloud:** Read Aloud: No text-to-speech reading mode or playback controls are exposed.
393. **review.translate:** Translate: No translation provider or selection/document translation workflow is exposed.
394. **review.language:** Language: No proofing-language picker is exposed. Setting the app locale changes UI strings and is not document proofing language.
395. **review.displayForReview:** Display for Review: Oasis can track edits and accept/reject revisions, but exposes no display mode to switch between Simple/All/Original markup views.
396. **review.showMarkup:** Show Markup: No revision-category/author markup filters are exposed in the default app.
397. **review.reviewingPane:** Reviewing Pane: The comments panel lists discussion threads, not a tracked-change review list; no Reviewing Pane workflow is exposed.
398. **review.trackChangesOptions:** Track Changes Options: Oasis exposes a Track Changes toggle, but no author/color/balloon/options configuration workflow.
399. **review.compare:** Compare: No document comparison/diff generation workflow is exposed.
400. **review.combine:** Combine: No revision-preserving document combination workflow is exposed.
401. **review.blockAuthors:** Block Authors: Review access identities gate comment mutations, but no author-blocking or revision ownership control is exposed.
402. **review.restrictEditing:** Restrict Editing: The host can configure a read-only editor, but the app exposes no document protection/password or selective editing restriction workflow.
403. **review.hideInk:** Hide Ink: No ink model or hide-ink display command is exposed.
404. **review.altTextPane:** Oasis opens the selected image alt-text editor from Insert/Accessibility; the control is selection-specific and does not provide a general Alt Text pane for every object type. Screen-reader and DOCX metadata behavior remain open.
405. **view.readMode:** Read Mode: No selectable distraction-free reading mode is exposed; the default canvas remains an editable paginated view.
406. **view.webLayout:** Web Layout: No continuous web-layout mode or view switch is exposed.
407. **view.draft:** Draft: No draft/outline text-only document view is exposed.
408. **view.focus:** Focus: No focus mode hides Ribbon/chrome or changes the editor to a distraction-free workspace.
409. **view.immersiveReader:** Immersive Reader: No immersive reading, read-aloud or accessibility reading surface is exposed.
410. **view.verticalMovement:** Vertical Page Movement: No page-movement mode selector is exposed in the default app.
411. **view.sideToSide:** Side to Side: No horizontal side-by-side page movement mode is exposed.
412. **view.gridlines:** Gridlines: No document gridline display toggle is exposed. Table editing guides and canvas page boundaries are separate.
413. **view.darkMode:** Switch Modes: No user-facing document/app dark-mode switch is exposed in the default Ribbon or menus.
414. **view.newWindow:** New Window: No in-app command opens another synchronized editor window for the current document.
415. **view.arrangeAll:** Arrange All: No multi-window arrangement workflow is exposed.
416. **view.split:** Split: No split-window view of one document is exposed.
417. **view.sideBySide:** View Side by Side: No synchronized two-document side-by-side view is exposed.
418. **view.synchronousScrolling:** Synchronous Scrolling: No paired-window synchronized scrolling control is exposed.
419. **view.switchWindows:** Switch Windows: No in-app document-window switcher is exposed; browser tabs are host/browser navigation.
420. **view.macros:** Macros: No macro storage, scripting runtime or macro manager is exposed.
421. **view.recordMacro:** Record Macro: No command recorder or macro authoring workflow is exposed.
422. **view.outlineMode:** Outline: Oasis provides heading navigation in an Outline panel, but not Word’s document-structure editing mode. Promote/demote, selection and view-mode behavior differ.
423. **view.onePage:** One Page: Oasis permits arbitrary zoom percentages but has no fit-one-page command or preset. Page-fit behavior and keyboard access remain unverified.
424. **view.multiplePages:** Multiple Pages: Oasis permits arbitrary zoom percentages but has no fit-multiple-pages command or page-layout preset.
425. **view.pageWidth:** Page Width: Oasis permits arbitrary zoom percentages but has no fit-page-width command or preset; responsive canvas width is not a width-fit action.
426. **table.newStyle:** New Table Style: The Table Design gallery applies bundled styles, but no user-defined table-style creation workflow is exposed.
427. **table.modifyStyle:** Modify Table Style: The Table Design gallery applies bundled styles, but no table-style definition editor is exposed.
428. **table.deleteStyle:** Delete Table Style: No table-style management surface deletes a user-defined style from the default app.
429. **table.direction:** Table Direction: No table-direction command or UI changes cell/document flow direction for a table. Paragraph RTL support is not table direction.
430. **table.eraser:** Table Eraser: No table border/cell eraser mode is exposed. Border presets and direct cell formatting are different workflows.
431. **headerFooter.previousSection:** Previous Section: The header/footer editor exposes no navigation command to move to the previous section story.
432. **headerFooter.nextSection:** Next Section: The header/footer editor exposes no navigation command to move to the next section story.
433. **headerFooter.position:** Header from Top: Header distance is preserved in document data, but no default control changes the header’s distance from the page top.
434. **readMode.columnWidth:** Column Width: No Read Mode exists, so no column-width setting for its reading surface is exposed.
435. **readMode.pageColor:** Page Color: The document Design page-color control is unrelated to a Read Mode-specific page color; no reading-mode view or control exists.
436. **readMode.layout:** Layout: No Read Mode layout selector or alternate reading surface exists.
437. **developer.richTextControl:** Rich Text Content Control: No Developer tab or user-facing content-control insertion/editing workflow is exposed.
438. **developer.plainTextControl:** Plain Text Content Control: No Developer tab or user-facing content-control insertion/editing workflow is exposed.
439. **developer.pictureControl:** Picture Content Control: No Developer tab or user-facing content-control insertion/editing workflow is exposed.
440. **developer.buildingBlockControl:** Building Block Gallery Content Control: No Developer tab, building-block gallery or content-control workflow is exposed.
441. **developer.checkboxControl:** Check Box Content Control: No Developer tab or user-facing checkbox content-control workflow is exposed.
442. **developer.comboBoxControl:** Combo Box Content Control: No Developer tab or user-facing combo-box content-control workflow is exposed.
443. **developer.dropDownControl:** Drop-Down List Content Control: No Developer tab or user-facing dropdown content-control workflow is exposed.
444. **developer.datePickerControl:** Date Picker Content Control: Date fields are supported, but no interactive date-picker content control or Developer workflow is exposed.
445. **developer.repeatingSectionControl:** Repeating Section Content Control: No Developer tab or repeating-section content-control model and workflow are exposed.
446. **developer.propertiesPane:** Properties: No content-control properties dialog or Developer properties workflow is exposed.
447. **developer.designMode:** Design Mode: No content-control design mode or Developer editing state is exposed.
448. **smartArt.addShape:** Add Shape: No SmartArt graphic model or shape-in-graphic editing workflow is exposed.
449. **smartArt.promote:** Promote: No SmartArt hierarchy or promote/demote commands are exposed.
450. **smartArt.demote:** Demote: No SmartArt hierarchy or promote/demote commands are exposed.
451. **smartArt.textPane:** Text Pane: No SmartArt graphic or associated text pane is exposed.
452. **smartArt.layouts:** Layouts: No SmartArt layout gallery is exposed.
453. **smartArt.styles:** Change Colors: No SmartArt graphic style/color system is exposed.
454. **smartArt.reset:** Reset Graphic: No SmartArt graphic model or reset workflow is exposed.
455. **chart.changeType:** Change Chart Type: No chart data model or chart-type conversion workflow is exposed.
456. **chart.editData:** Edit Data: No embedded chart data source or editing workflow is exposed.
457. **chart.title:** Chart Title: No chart object/title element or chart formatting workflow is exposed.
458. **chart.legend:** Legend: No chart legend formatting workflow is exposed.
459. **chart.dataLabels:** Data Labels: No chart data-label formatting workflow is exposed.
460. **picture.removeBackground:** Remove Background: No image segmentation or subject-background removal workflow is exposed.
461. **picture.corrections:** Corrections: No image sharpness/brightness/contrast correction controls are exposed.
462. **picture.color:** Color: No picture color saturation/tone/recolor workflow is exposed; page and shape color controls target different objects.
463. **picture.artisticEffects:** Artistic Effects: No raster artistic effect presets are exposed.
464. **picture.compress:** Compress Pictures: No image-resolution/compression workflow is exposed.
465. **picture.change:** Change Picture: No replace-image workflow preserves an existing picture’s layout/formatting while choosing another source.
466. **picture.styles:** Picture Styles: Oasis has a picture-border picker, but no preset Picture Styles gallery with effects and frames.
467. **shape.formatPane:** Format Shape Pane: No selected-shape formatting pane is exposed; available fill/outline controls do not form Word’s full pane.
468. **shape.effects:** Shape Effects: Oasis exposes basic text-box fill/outline but no shape effects such as shadow, glow, bevel or 3D rotation.
469. **shape.wordArtStyles:** WordArt Quick Styles: No WordArt object model, preset gallery or transform styles are exposed.
470. **shape.textFill:** Text Fill: No WordArt text-fill control exists; shape fill targets the container rather than its text.
471. **shape.textOutline:** Text Outline: No WordArt text-outline control exists; shape outline targets the container rather than its text.
472. **shape.textTransform:** Text Effects Transform: No WordArt transform/effect workflow is exposed.
473. **shape.createLink:** Oasis provides the shared Insert Link dialog/command, which can create a hyperlink from a selected text range; it is located on Insert and is not a Shape Format text action. Link targeting within text-box body selection needs workflow verification.
474. **editing.typeText:** Type Text: Text is entered through the editor input pipeline, including IME composition; direct command and formatting parity remain separate.
475. **editing.newParagraph:** New Paragraph: Enter splits the current block and supports list behavior; paragraph/line break distinctions and undo need workflow verification.
476. **editing.tab:** Tab: Tab indents/outdents lists or moves between table cells; it does not insert a tab stop in ordinary text, so this is only a related keyboard action.
477. **editing.tabCharacter:** Tab Character: No literal tab-character insertion command or default UI action is exposed.
478. **editing.backspace:** Backspace: Backspace deletes backward through the active selection and editor structure; text/field/table edge parity needs verification.
479. **editing.delete:** Delete: Delete removes forward through the active selection and editor structure; text/field/table edge parity needs verification.
480. **editing.deletePreviousWord:** Delete Previous Word: The keyboard controller deletes the preceding word; platform-specific word boundaries and selection behavior need verification.
481. **editing.deleteNextWord:** Delete Next Word: The keyboard controller deletes the following word; platform-specific word boundaries and selection behavior need verification.
482. **editing.moveParagraphUp:** Move Paragraph Up: The registered command moves selected paragraphs, but no default Ribbon, menu or keyboard binding exposes this action.
483. **editing.moveParagraphDown:** Move Paragraph Down: The registered command moves selected paragraphs, but no default Ribbon, menu or keyboard binding exposes this action.
484. **editing.promote:** Promote: The registered outline-step command promotes paragraphs/list levels, but no default Ribbon, menu or keyboard binding exposes it.
485. **editing.demote:** Demote: The registered outline-step command demotes paragraphs/list levels, but no default Ribbon, menu or keyboard binding exposes it.
486. **editing.toggleUnicode:** Toggle Unicode Character: No Unicode character-code conversion or toggle workflow is exposed.
487. **editing.spike:** Spike: No multi-cut Spike buffer or collection workflow is exposed.
488. **editing.insertSpike:** Insert Spike: No Spike buffer exists, so collected content cannot be inserted.
489. **editing.wordLeft:** Word Left: Control/Command+Arrow moves the caret by word; platform-specific boundary semantics need verification.
490. **editing.wordRight:** Word Right: Control/Command+Arrow moves the caret by word; platform-specific boundary semantics need verification.
491. **editing.lineStart:** Line Start: Home moves to the paragraph start; visual-line start behavior may differ from Word.
492. **editing.lineEnd:** Line End: End moves to the paragraph end; visual-line end behavior may differ from Word.
493. **editing.paragraphUp:** Paragraph Up: Up Arrow navigates the visual caret/selection and is related to paragraph navigation; soft-wrap, table and page-boundary behavior differ.
494. **editing.paragraphDown:** Paragraph Down: Down Arrow navigates the visual caret/selection and is related to paragraph navigation; soft-wrap, table and page-boundary behavior differ.
495. **editing.documentStart:** Document Start: Control/Command+Home moves to the document boundary; section/story scope and selection extension need verification.
496. **editing.documentEnd:** Document End: Control/Command+End moves to the document boundary; section/story scope and selection extension need verification.
497. **editing.pageUp:** Page Up: No dedicated in-document page-navigation command is exposed; browser scrolling is not the same caret action.
498. **editing.pageDown:** Page Down: No dedicated in-document page-navigation command is exposed; browser scrolling is not the same caret action.
499. **editing.goBack:** Go Back: No editor caret-navigation history command restores the previous editing location.
500. **editing.selectWord:** Select Word: Double-click selects a word through pointer hit testing; keyboard command exposure and language-specific word boundaries need verification.
501. **editing.selectSentence:** Select Sentence: No sentence-selection gesture, keyboard binding or default command control is exposed.
502. **editing.selectParagraph:** Select Paragraph: Triple-click selects a paragraph range; exact paragraph-mark inclusion and touch behavior need verification.
503. **editing.extendSelectionF8:** Extend Selection (F8): No F8 extend-selection mode or repeatable selection-extension workflow is exposed.
504. **editing.columnSelection:** Column Selection: No rectangular text-column selection mode is exposed. Table-column selection is a separate task.
505. **editing.showFieldCodes:** Show Field Codes: No field-code display toggle is exposed. Supported date/page fields render as values.
506. **editing.toggleFieldCodes:** Toggle Field Codes: No field-code toggle command or control is exposed.
507. **editing.editFieldCode:** Edit Field Code: No field-code editor or arbitrary field-code authoring workflow is exposed.
508. **editing.unlinkFields:** Unlink Fields: No command converts a field result into static text.
509. **editing.lockFields:** Lock Fields: No field-lock state or user-facing lock action is exposed.
510. **editing.unlockFields:** Unlock Fields: No field-lock state or user-facing unlock action is exposed.
511. **editing.nextField:** Next Field: No field-navigation command traverses document fields.
512. **editing.previousField:** Previous Field: No field-navigation command traverses document fields.
513. **equation.unicodeInput:** Unicode input: The linear equation editor accepts Unicode text/math symbols, but has no explicit Unicode input-format selector.
514. **equation.latexInput:** LaTeX input: The linear editor parses a limited LaTeX-like syntax such as fractions and radicals; Oasis has no input-format toggle and does not implement the full LaTeX grammar.
515. **equation.convert:** Convert: Oasis parses the linear editor into a structured expression as the user types and inserts it through the same command; there is no separate Word convert action.
516. **equation.normalText:** Normal Text: No normal-text mode toggle is exposed inside an equation; the linear editor is not an equation-format selector.
517. **equation.symbols:** Equation Symbols: The Insert/Symbols menu includes common characters and example equations, but does not expose Word’s full equation-symbol gallery.
518. **equation.fraction:** Fraction: The Equation dialog has a fraction template; the editor exposes a smaller palette and no contextual Equation tab.
519. **equation.script:** Script: The Equation dialog supports superscript/subscript templates; broader script structures and keyboard behavior remain open.
520. **equation.radical:** Radical: The Equation dialog includes a square-root template, but no full radical gallery or contextual tab.
521. **equation.integral:** Integral: The Equation dialog includes a basic integral template; limits, variants and structural editing remain unverified.
522. **equation.largeOperator:** Large Operator: The Equation dialog includes a summation example, but not Word’s full large-operator gallery and limit placement behavior.
523. **equation.bracket:** Bracket: The Equation dialog includes a delimiter template; delimiter variants and sizing controls remain limited.
524. **equation.function:** Function: No function-structure gallery or function-specific equation control is exposed.
525. **equation.accent:** Accent: No equation accent structure gallery/control is exposed.
526. **equation.limit:** Limit and Log: No limit/log structure gallery or dedicated operator-limit control is exposed.
527. **equation.operator:** Operator: No dedicated operator structure gallery is exposed.
528. **equation.matrix:** Matrix: The Equation dialog supports a basic matrix template; matrix sizing, editing and richer delimiters remain limited.
529. **equation.display:** Change to Inline / Display: The document model carries display math, but no inline/display toggle is exposed in the Equation UI.
530. **equation.justification:** Justification: No equation alignment/justification control is exposed.
531. **equation.number:** Equation Number: No equation-numbering or numbering-format workflow is exposed.
532. **equation.structureCommands:** Structure Commands: No contextual Equation tab or structure-editing command surface is exposed.
533. **outlining.promoteToHeading1:** Oasis can apply Heading 1 from the Home style gallery, but this is not an Outlining-mode promote command. Outline hierarchy, selection behavior and DOCX heading semantics remain open.
534. **outlining.promote:** Oasis registers an outline-step promote command, but exposes no Outlining tab control or keyboard binding. Heading/list behavior and document interoperability need workflow verification.
535. **outlining.level:** The Paragraph dialog sets an outline level, but the control is outside an Outlining view and does not provide outline-mode level display/management.
536. **outlining.demote:** Oasis registers an outline-step demote command, but exposes no Outlining tab control or keyboard binding. Heading/list behavior and document interoperability need workflow verification.
537. **outlining.demoteToBody:** Oasis can apply the Normal style from the Home gallery, but has no Outlining-mode demote-to-body command. Existing outline structure and DOCX behavior remain to verify.
538. **outlining.moveUp:** Oasis registers a paragraph-move-up command, but no Outlining tab control or keyboard binding exposes it.
539. **outlining.moveDown:** Oasis registers a paragraph-move-down command, but no Outlining tab control or keyboard binding exposes it.
540. **outlining.expand:** Expand: No Outlining view or heading expansion state is exposed.
541. **outlining.collapse:** Collapse: The navigation Outline panel can collapse as a whole, but it has no per-heading collapse/expand control.
542. **outlining.showLevel:** Show Level: No outline-level visibility filter is exposed.
543. **outlining.showFormatting:** Show Text Formatting: No Outlining view or formatting-visibility toggle is exposed.
544. **outlining.firstLineOnly:** Show First Line Only: No outline first-line-only display mode is exposed.
545. **outlining.close:** Close Outline View: Oasis has a collapsible Outline panel, not a distinct Outlining view with a close-view command.
546. **tools.autoCorrect:** AutoCorrect Options: No autocorrect rule editor or user-facing proofing preferences workflow is exposed.
547. **tools.customizeRibbon:** Customize Ribbon: Oasis supports host-side toolbar customization APIs, but no in-app Ribbon customization surface is exposed.
548. **tools.customizeKeyboard:** Customize Keyboard: No keyboard-shortcut editor or user-facing key-binding customization surface is exposed.
549. **tools.encrypt:** Encrypt with Password: No document encryption, password protection or key-management workflow is exposed.
550. **tools.templatesAddIns:** Templates and Add-ins: No template/add-in manager or document-template integration surface is exposed.
551. **tools.fullScreenView:** Full Screen View: No in-app full-screen view command or focus-mode toggle is exposed; browser fullscreen is host behavior.

## Audit interpretation

The audit scans the built-in command array, direct default-toolbar objects, style-gallery command declarations, the three active static button-spec arrays, literal commands executed by statically imported custom preset controls, Ribbon placement definitions and the default menubar. Dynamic command expressions and plugin contributions still require runtime coverage. The tool reports direct Ribbon, visible menu or unverified core reachability; it never upgrades a feature to `complete` automatically.

**Next:** expand the mapping from WordCraft `crates/engine/src/catalog.rs`, `crates/ui-egui/src/ribbon/*.rs` and the Oasis runtime; capture UI-only, core-only, menu-only, preservation-only and not-applicable cases. Use the coverage and acceptance ladder in `docs/wordcraft-ribbon-parity-plan.md` before claiming parity.
