# Word-compatible Tab behavior — implementation plan v2

Status: revised plan; implementation beyond the initial keyboard patch is not claimed. This document supersedes the initial roadmap. Target: functional parity with desktop Microsoft Word, using WordCraft as a readable behavioral reference, not a new dependency. All three Oasis shells (document, inline, balloon) must share editing semantics.

## 1. References and decision authority

- Microsoft: [keyboard shortcuts](https://support.microsoft.com/en-us/accessibility/word/keyboard-shortcuts-in-word), [using the ruler](https://support.microsoft.com/en-us/word/using-the-ruler-in-word), [set tabs in tables](https://support.microsoft.com/en-us/word/set-tabs-in-a-table), [Tabs dialog](https://support.microsoft.com/en-us/word/insert-or-add-tab-stops).
- WordCraft source baseline: [enter_tab.rs](https://github.com/storytold/wordcraft/blob/cc90520b9d8fb0d1e6be2c2688e6f915319e850a/crates/engine/src/cmd/text/enter_tab.rs), [ruler_tabs.rs](https://github.com/storytold/wordcraft/blob/cc90520b9d8fb0d1e6be2c2688e6f915319e850a/crates/ui-egui/src/ruler_tabs.rs), [layout tabs](https://github.com/storytold/wordcraft/blob/cc90520b9d8fb0d1e6be2c2688e6f915319e850a/crates/layout/src/para/tabs.rs).
- Oasis initial keyboard patch: 1c61df30595acce3976de4e7945c22214180bc1f. Five initial tests were added; their presence does not certify CI or end-to-end parity.
- Authority order: observed desktop Word fixtures and documented behavior; OOXML semantics for interchange; WordCraft behavior as a secondary oracle; explicitly recorded Oasis web-specific decisions. No claim of running Word desktop in this review. Record Word version, platform, locale, AutoFormat preferences, font and fixture for every captured expectation. Do not copy WordCraft implementation code or import its runtime.
- Evidence tags for acceptance matrix: M = Microsoft documentation; W = WordCraft source; O = observed Word desktop fixture (to collect); D = proposed Oasis design decision. Where W and M differ, prefer M, then verify O.

## 2. Source audit and failure inventory

| ID | Current location | Finding | Priority |
|---|---|---|---|
| T01 | app/controllers/useEditorKeyboard.ts | Initial literal-tab path exists; full selections, Shift+Tab on non-list and table boundaries remain unhandled; browser focus can escape. | P0 |
| T02 | app/controllers/EditorCommandsController.ts; ui/app/essentials/paragraph.ts | handleListTab is also reused by Ribbon indent/outdent; normal paragraph indentation is not implemented by those wrappers. Existing level-zero list outdent clears numbering; verify this against Word before changing other callers. | P0 |
| T03 | app/controllers/tableOpsSelectionNavigation.ts | Adjacent cell returns only first paragraph position or null; null conflates boundary with absence; merged and nested traversal need explicit tests. | P0 |
| T04 | app/controllers/tableOpsRowColumnCommands.ts | Existing new-row operation targets previous visual column, not first cell; does not by itself implement final Tab. | P0 |
| T05 | ui/textMeasurement/tabStops.ts | Includes bar stops among advancement candidates; tests both comma and period as decimal delimiters; clamps crowded advances to 1 px; geometry does not expose resolved stop/leader to painters. | P1 |
| T06 | ui/canvas/paragraph/canvasTabLeaders.ts | Independently resolves leader using tabLeft minus first line slot, unlike layout's column-margin origin; can choose different stop with indents. | P1 |
| T07 | ui/textMeasurement/indentation.ts | Numbering suffix scans tab stops separately and admits bar stops; do not conflate numbering suffix with a literal typed tab. | P1 |
| T08 | ui/components/Ruler/HorizontalRuler.tsx; rulerGeometry.ts | Margin and indent controls exist; no tab selector, tab markers or tab gestures. Ruler geometry currently uses CSS pixels. | P1 |
| T09 | core/commands/paragraphTabs.ts | Existing edit command supports set/clear/default, but audit finite/range validation, dedupe, no-op identity, inherited clear and conflicts before relying on it. MAX_TAB_STOPS=64; MAX_TAB_POSITION=1584 pt. | P1 |
| T10 | ui/components/Dialogs/TabStopsDialog.tsx | Current row-list editor lacks Word-style Set workflow/default interval; check bridge payload and mixed selection handling. | P1 |
| T11 | ui/app/createEditorKeyboardBinding.ts; app/controllers/useEditorTextInput.ts | Initial literal tab bypasses pending caret style accessor used by typed text; preserve normal typing semantics and composition safeguards. | P0 |
| T12 | PDF, DOCX, clipboard, Show/Hide marks | Existing behavior not yet comprehensively traced; audit real call graph before changing these paths. No blanket claim of missing support. | P1 |

Paths above are relative to src/ unless otherwise indicated.

## 3. Architecture and invariants

Create a small testable context resolver (proposed app/controllers/tabInput/resolveTabAction.ts) and thin executor (handleTabInput.ts). Names are proposals; follow existing module boundaries. Avoid a second keymap or a second independent editor state. The resolver is pure, receives a compact snapshot, and returns a discriminated union with a reason code, not a closure that mutates the model.

Suggested actions: passThrough, consumeNoop, insertLiteralTab, changeFirstLineIndent, changeParagraphIndent, changeListLevel, selectAdjacentCell, appendTableRowAndSelect, moveContentControlFocus (only if the existing feature exists and its behavior is verified). Read-only and protected capabilities gate mutations; focus and modifier ownership gate routing. Layout queries supply visual-line information as an input, not an engine dependency from core to UI.

Make text insertion, paragraph indentation and table mutations reusable command operations. Keyboard, Ribbon, command search and adapters must not diverge semantically. Preserve plugin keymap ownership and command enablement; do not bypass document protection or track changes. Audit the current API before naming any new built-in command. Prefer existing commands and extend only when necessary; if adding commands, update public types, Essentials, adapters, command inventory and tests. No backward-compatibility shim that preserves incorrect Tab semantics.

Keep these concepts separate:
- Typed U+0009 character in a text run.
- Paragraph indentation properties (left/right/first line/hanging).
- Tab-stop definitions and document default interval.
- List level and numbering suffix.
- Cell or application navigation.
- Bar decoration (not an advancement stop).
- Positional OOXML tab elements (preserve unsupported semantics explicitly; never silently convert to ordinary tabs).

Unit contract: existing paragraph indents and page/margin geometry use CSS px at 96 dpi; tab positions and document defaultTabStop use typographic pt; DOCX uses twips. Use src/core/units.ts constants/conversions at boundaries: 36 pt = 48 CSS px = 720 twips = 1.27 cm. Zoom is a presentation transform only. Do not mix measured screen x, page x, column-relative x, cell x or paragraph start. Use explicit variable suffixes Pt/Px/Twips, document anchor reference, and signed logical direction for RTL. No migration of persisted units in this change.

Transaction invariants: one user mutation = one undo unit. Selection-only navigation and canceled gestures create no history, no document dirty state and no spurious collaboration updates. Redo restores expected selection. No-op at bounds returns unchanged state. Preserve active zone, section, style, links, revisions, run identity where supported, and unrelated source XML. Do not silently flatten a table or recreate the document. Every mutating operation uses existing transaction/history/structure-aware ports.

## 4. Normative keyboard decision table

Evaluate in priority order. All nontrivial Word preferences/edge cases must have fixtures; proposed web policies are not claims about desktop Word.

| ID | Context | Tab | Shift+Tab | Evidence / caveat |
|---|---|---|---|---|
| K01 | Browser chrome, toolbar, menu, dialog, ordinary host field | Native focus traversal | Native reverse traversal | D: never intercept globally |
| K02 | IME composition / OS-owned chord | Defer to IME/OS | Same | D |
| K03 | Read-only/protected editing | No mutation; allow accessible exit | Same | D; distinguish editable selection from protection |
| K04 | Editable ordinary empty paragraph | Insert U+0009 | Outdent/no-op | W; O for back-tab |
| K05 | Ordinary caret mid-line/end, AutoFormat either state | Insert U+0009 | Paragraph outdent/no-op | W |
| K06 | Partial selection in one ordinary paragraph | Replace selected text with U+0009 | Outdent without deleting text | W |
| K07 | Entire paragraph / multiple paragraphs selected | Increase each selected paragraph indent | Decrease each indent | W; verify terminal boundary inclusion O |
| K08 | Start of nonempty unindented paragraph, AutoFormat on | First-line indentation by default interval | Reverse according to verified behavior | W; O required |
| K09 | First line already has special indent, or wrapped visual line begins, AutoFormat on | Whole-paragraph indent or verified context-specific list behavior | Outdent | W; test line boundary affinity O |
| K10 | Same start contexts, AutoFormat off | Literal tab unless list/table rule wins | Verify outdent | W/O |
| K11 | Directly numbered list item, collapsed caret at start | Demote one level, clamp 0–8 | Promote one level | W; verify level-zero and Word options O |
| K12 | Caret mid-item | Literal tab | Promote list level per W; verify O | W/O |
| K13 | Inherited numbering, mixed-list multi-selection | Use effective numbering; preserve scheme | Corresponding promote/outdent | W differs for direct/inherited cases; O required |
| K14 | Table, ordinary or list paragraph inside cell | Select next cell's content | Select previous cell's content | M; table wins over list |
| K15 | Last navigable cell | Append one row at table end; move to first new cell | Previous cell | M |
| K16 | First navigable cell | Next cell | Consume and stay unless Word fixture establishes another behavior | W/O |
| K17 | Ctrl+Tab inside table (Windows delivered event) | Literal tab, no cell navigation | Do not bind unspecified chord | M; browser may reserve chord |
| K18 | Ctrl+Tab outside table, OS/browser chord | Pass through | Pass through | D |
| K19 | Empty table cell / nested or merged cell | Same logical navigation rules | Same | M/W/O |
| K20 | Cell selection or multi-cell selection | Resolve explicit cell-selection policy without replacing unrelated cells | Same | O required |
| K21 | Header/footer/footnote and other supported text stories | Same contextual editing semantics | Same | D/O |
| K22 | Protected controls, object/image selection, non-editable island | Respect existing command gate; no blind text insertion | Same | D/O |
| K23 | macOS keyboard | Support delivered platform-appropriate literal-tab chord (Option+Tab is documented in Word shortcuts); retain reachable fallback command | No OS chord collision | M/D |
| K24 | Accessibility escape active | Pass next Tab to host focus order | Pass reverse traversal | D; test |

WordCraft selects the destination on forward navigation but collapses to the previous cell start on backward navigation; Microsoft explicitly documents content selection in both directions. Implement the latter. WordCraft level-zero back-tab saturates; current Oasis list outdent can remove numbering. Capture Word behavior and separate keyboard-specific policy from Ribbon list commands. Do not infer all first-line or Backspace cases from a single example.

## 5. Work packages in dependency order

### P0-A — Stabilize initial patch and establish evidence

- Confirm latest CI and production status; run targeted keyboardTab tests and full baseline. If failing, repair before widening scope. Keep existing watermark fixes and native-UI guard intact.
- Add test fixtures for each K row with exact initial document, preferences, selection (including affinity), command/action, expected document/selection, focus, history depth and expected prevented-event flag.
- Capture native Word results separately as JSON and small DOCX fixtures; WordCraft outputs pinned to its commit as separate reference. Script deterministic replay on Oasis, not fabricated screenshots. Evidence statuses: verified, pending native capture, mismatch, platform exception.
- Verify source for PDF layout/painters, paragraph style resolution, import/export, collaborative ops, formatting marks and actual browser keyboard bindings. Create an implementation checklist mapping each to tests.
- Exit: initial patch green, fixture schema and reference table reviewed. If Word is unavailable, mark O-dependent rows explicitly provisional; implement verified cases first.

### P0-B — Input routing, focus and typing

- Extract resolver and executor. Dispatch only from document editing input/explicit API. Keep existing registry precedence and check event.defaultPrevented, IME, read-only and modifier policy. Avoid duplicate keydown/beforeinput/input insertions.
- Route literal tab through same typing transaction behavior and pending caret style as normal text; ensure tracked insertion, correct run boundaries, normalized selection, no text loss, one-step undo and caret movement. Tab is not four/eight spaces and not a hardcoded 48px visual insertion.
- Make full-paragraph and Shift+Tab routes non-destructive; explicitly consume intended document actions even at bounds. Keep browser shortcuts that are not owned. Preserve all three shells and React/Vue/imperative hosts.
- Provide command-search action "Insert tab character" (localized) or equivalent existing command and documented remappable shortcut for browsers that swallow Ctrl+Tab. Escape-based focus release is a proposed web adaptation: resolve collision with selection/popup Escape first; make escape discoverable and verify actual next focus, not merely a synthetic event. Do not trap users in editable or read-only canvas.
- Tests: K01–K06, K18, K22–K24; real key presses; partial/reversed selections, Unicode surrogate pairs/combining marks, pending style, revision markup, no document mutation when navigating.
- Exit: stable real tab insertion, no global key interception, accessible exit verified.

### P0-C — Paragraph and list semantic commands

- Add relative paragraph indent operation using each selected paragraph's effective current style, not one absolute value from focus paragraph. Convert default interval pt to px exactly once. Distinguish first-line, hanging and whole paragraph; keep signed first-line semantics and clear mutually exclusive properties atomically. Respect width limits, RTL, columns and selected story.
- Separate keyboard tab-list behavior from Ribbon increase/decrease indent so non-list Ribbon operations also work; list-level commands honor existing numbering definitions, start/restart, suffix, format and bounded level. Do not change a list ID or numbering scheme just to indent.
- AutoFormat preference is user/editor configuration (proposed default on, confirmed by fixture), not destructive document serialization. Expose option through established configuration API and UI if appropriate; disabling it must still allow literal tabs while retaining table navigation. Protection gate and explicit tab stops vs AutoFormat precedence need fixtures. Use actual visual layout for wrapped-line start; invalidate stale layout safely and avoid guessing from prior line.
- Verify Backspace in auto-indented paragraph, list boundary, direct/inherited numbering, mixed lists, first-line/hanging reversal, multi-paragraph selection endpoint and repeated bounds. No blanket rule that Shift+Tab removes all bullets.
- Tests K07–K13 and associated Backspace, Ribbon actions, selection preservation, track changes, import style inheritance and undo/redo.
- Exit: Word-captured semantics satisfied or documented explicit limitation.

### P0-D — Tables

- Replace nullable adjacency with explicit result: outside, adjacent with cell identity and complete text selection, beforeFirst, afterLast, blocked. Segment innermost table by story/table path; resolve visual traversal order with span/merge placeholders, RTL order as verified, nested tables and multi-paragraph cells. Never jump to another table by scanning all paragraph IDs.
- Reuse table row operation, but allow explicit append at end of target table and first navigable cell of new row. Avoid reusing prior column target. Preserve cell structure/format/column grid and revision semantics according to verified Word fixture; no copies of existing text. Handle vertical merges without extending them accidentally. Reuse table selection structural representation for full cell content when needed. Typing into selected cell must not merge/delete surrounding cells.
- Next/previous selection is navigation-only. Final Tab combines append and new selection in one transaction. At first cell boundary consume no-op; repeated Tab can append further valid rows, never double-append for one key. Read-only/protected row creation blocked.
- K14–K21 tests: 1x1, 2x2, ragged/spanned rows, vMerge continuation, nested table, cross-story, multi-paragraph cells, selection of empty/nonempty cell, selected cell replacement, final row Undo/Redo, backward select, track changes. Test with actual document and real input, not only mocked resolver return.
- Exit: no browser focus leak at table boundaries, fully selected cells, atomic row creation.

### P1-E — One canonical layout result

- Keep existing paragraph measurement engine; evolve its tab resolution to return typed geometry (advancePx, resolvedStop identity/type/position, leader, logical origin/direction, alignment anchor, overflow status). Bar decorations are separate per-line geometry independent of a typed tab. No new parallel text layout engine.
- Normalize effective stops once per paragraph/style/layout revision; filter invalid and clear stops according to inheritance, separate bar stops, sort/dedupe stable positions, validate positive finite default interval. Resolve decimal character using current document/locale/settings where available; verify punctuation/group separators and mixed scripts, don't treat arbitrary comma and period identically. For missing decimal, compare alignment behavior to oracle.
- Resolve measured following segment before next tab, hard break or line boundary; explicitly handle right/center/decimal collisions, wrapping, trailing tab, consecutive tabs and stops beyond content width. No blind 1px clamp as a substitute for measured behavior. Maintain monotonic caret slots and avoid infinite pagination loops.
- Respect actual column/cell content start, indents, paragraph borders/insets, zoom and RTL. Use existing text shaping and line metrics, preserve grapheme boundaries. Audit number-label suffix separately (tab/space/nothing, numbering-specific tab stops).
- Feed resolved advance and leader to canvas, hit test, caret, selection, formatting marks and PDF; remove independent leader stop lookup. PDF must use equivalent geometry (reuse shared metadata or same pure layout contract with correct fonts). Draw bar lines even without U+0009, including print/export, correct visible line extent; test paragraph wrap and pagination. Ensure hidden marks are not exported as content.
- Complexity budget: prepare sorted stops and measured segment metadata once; avoid per-tab full paragraph scan, repeated sort and style resolution, or global document relayout. Cache keys include text/style/default/locale/width/fonts/direction. Compare warm/cold layout and long TOC fixtures against baseline; investigate >10% median or p95 regression on same runner rather than introduce flaky absolute timings.
- Exit: numeric geometry tests, cross-renderer parity and unchanged non-tab document fixtures.

### P1-F — Word-style ruler

- Extend HorizontalRuler/rulerGeometry using resolved active column/cell and effective paragraph state, not merely page left. Add a compact selector cycling left, center, right, decimal, bar; evaluate first-line/hanging selector options separately from paragraph tab types. Localized accessible label, tooltip and keyboard selection; use shared primitives and SVG glyphs, not arbitrary native UI.
- Click blank ruler track to add; drag existing marker to move, drag off to clear; double click opens Tabs dialog for selected tab. Avoid duplicate add on double click. Place in separate lane from ticks and indent handles; predictable hit precedence, selection highlight and default interval indication. Match WordCraft clean interaction without requiring exact pixel mimicry.
- Convert screen coordinate to logical unzoomed document coordinate, then pt; clamp or preserve valid negative positions as supported by evidence. Snap according to ruler units; Alt/free positioning when delivered. Include RTL, mirror margins, gutter, multicolumn and cell paddings. Pointer capture, cleanup, pointercancel must cancel without mutation. Escape, selection/story change, read-only or unmount cancel gesture; no history during preview. Commit set/clear together exactly once on release.
- Mixed selection: show common markers distinctly from mixed markers; define add/move/clear operation across selection without replacing unrelated stops. Clearing inherited stop creates appropriate clear override. Preserve named style unless user explicitly edits it.
- Tests: geometry mapping at zoom 50/100/200%, inch/cm, RTL and columns; click, move, remove, cancel, double-click, collision with indent markers; mouse/touch/keyboard alternatives; narrow viewport and all shells where ruler is enabled.
- Exit: all ruler operations persist in document and undo atomically. No native UI allowlist expansion to hide regressions.

### P1-G — Tabs dialog and command validation

- Replace row-editor interaction with Word workflow: position entry and sorted stop list, Default tab stops, alignment radios/options, leader controls, Set, Clear, Clear All, OK/Cancel; use existing public UI primitives/localization. Set updates draft at chosen position, Clear removes chosen draft stop, Clear All removes effective stops with appropriate inherited markers; OK commits all changes together. Cancel never mutates.
- Display local measurement units and decimal parsing; pt model values remain precise, conversions round only for display. Reject NaN/infinity/invalid default, canonicalize duplicates using documented epsilon, cap at model limits without silently truncating user's data, preserve imported unknown fields or report unsupported behavior.
- Validate at command boundary (not just dialog), including programmatic callers. Test no-op identity, invalid input, direct/inherited/clear, mixed selection, default interval persistence and undo. Do not flatten inherited style into direct formatting by opening or accepting an unchanged dialog.
- Verify focus trap within dialog, accessible labels, initial focus, cancellation, tab order, localization pt-BR/en, responsive layout, high contrast and read-only disabled controls.
- Exit: Word-style workflow and command semantics independently tested.

### P1-H — Interchange, marks and visual fidelity

- DOCX: audit w:tab characters, w:tabs/w:tab val/pos/leader (including clear, bar, inherited styles), w:defaultTabStop, numbered suffix, tabs in headers/footnotes/tables, and w:ptab positional semantics. Preserve source OOXML where unsupported and avoid accidental conversion into normal tab stops. Audit preservation under tracked changes and unrelated edits.
- HTML/clipboard: preserve literal tabs through plain text and internal serialization; document how external HTML/CSS whitespace handling loses layout, use semantic representation where supported, avoid promising portable HTML tab alignment. Verify copy/cut/paste and selection around tabs. Internal clipboard must preserve paragraph formatting.
- PDF/canvas: coordinate comparison using same fonts and controlled page settings; leader patterns (none/dot/hyphen/underscore and imported heavy/middleDot where supported), bar geometry, numeric table, TOC, signature alignment. Formatting marks: one visible arrow per literal tab when enabled, no extra width, correct hit position, not printed/exported as text.
- Fixtures include ordinary PT-BR legal paragraph first-line indent vs literal tab, dot-leader TOC, currency columns with decimal separators, form signature lines, nested tables and a right-aligned page number. Compare semantic roundtrip + geometry; not raw DOCX ZIP bytes or whole screenshot alone.
- Exit: roundtrip verified and documented unsupported cases, visual comparisons with explicit tolerances.

### P2-I — Public demo and documentation

- Add an opt-in demo sample (not the default user's saved document) with actual editable text, paragraph tab stops, numeric alignment, lists, a table and marks toggle. Test Document/Inline/Balloon modes with real editor DOM and existing runtime; no remount/data loss. Do not add fake screenshot or hard-coded behavior.
- Documentation: explain Tab vs indentation, ruler/Set/Clear, table literal-tab workaround for browser-reserved shortcut, keyboard escape and preferences. API examples and migration notes where public behavior changes. Include known platform limits.

## 6. Test strategy and concrete acceptance

Use existing Vitest/Playwright and source guard tooling. New focused test modules may live beside keyboardTab, paragraphTabs, rulerGeometry, measured-line and table tests; use repository config discovery before choosing browser suite path. Do not invent a test runner or bypass existing gates.

Fixture fields: id, reference/version, evidence, platform/locale, document and settings, initial selection incl. direction and affinity, keyboard/chord or command, expected route, resulting semantic document, selection, history delta, focus and expected layout. Use small immutable fixtures. For browser tests assert actual keyboard input, model state and rendered positions; dispatch fallback shortcut explicitly only for testing delivered-event logic, distinguish it from genuine OS/browser interception.

Minimum release checklist:
- [ ] All K01–K24 routes have unit coverage; all provisional O-dependent outcomes are captured or declared limitations.
- [ ] Integration fixtures use actual list/paragraph/table mutations, not mock-only routing.
- [ ] Default 36pt: 48 CSS px at 100%, 96 screen px at 200%; document stays 36pt. Add custom 72pt and imported non-integer values. Test exact-stop and near-boundary advances, malformed defaults, bar stops and clear inheritance.
- [ ] Right/center/decimal fields align to resolved x; leaders terminate at resolved geometry. Controlled layout numeric tolerance <=0.5 CSS px in pure tests and <=1 CSS px in browser same-font/same-layout comparisons (proposed starting tolerances; revise only with evidence). PDF geometry tolerance <=0.75pt with identical metrics. Cross-Word screenshots are supplementary and may vary in font shaping/DPI; do not force misleading pixel equality.
- [ ] Table navigation selects both directions; final Tab grows exactly one row; undo removes it and restores old selection. No new history for movement/no-op.
- [ ] Show/Hide marks, numbering suffix, inherited stops, custom intervals, DOCX import/export, PDF and clipboard all pass dedicated fixtures.
- [ ] Chrome/Chromium, Firefox, WebKit desktop plus relevant mobile touch; test at least one real macOS/Windows environment where possible; explicitly mark unavailable platforms. All shells, host focus, dialogs, read-only, IME and browser shortcuts tested.
- [ ] Existing no-tab document snapshots/tests unchanged. No weakened audit, allowlist, or tolerance solely to get green CI.
- [ ] Performance measurements on representative long TOC/table and non-tab documents retain baseline under same runner; attach reproducible workload, median/p95 and memory notes.
- [ ] Run npm run typecheck, npm run check:native-ui, npm run audit:ribbon, npm run audit:ribbon:icons, npm test, npm run build:app, npm run test:smoke and relevant ribbon/browser/DOCX tests; inspect scripts for current required commands. Confirm GitHub Pages build+deploy and npm workflow when applicable. Regenerate tracked inventories intentionally when new UI changes line references.
- [ ] Publish evidence table linking commit, workflow, fixture outcomes/screenshots and limitations; do not mark complete merely after push.

## 7. Delivery sequence and risk controls

Land independently reviewable commits: evidence/stabilization; common input resolver & typing; paragraph/list semantics; table navigation & row creation; normalized layout and shared geometry; ruler; dialog; interchange; demo and documentation. Start each with targeted tests and finish with existing/full CI. Avoid touching unrelated Ribbon appearance or shell architecture. Keep dependency order: P0-A -> P0-B -> P0-C/P0-D -> P1-E -> P1-F/P1-G -> P1-H -> P2-I; interchange validation begins early and runs throughout. Geometry fixes can be developed in parallel with P0 if they do not change keyboard behavior.

Highest risks: data loss on full or cross-cell selection, pt/px conversion bugs, wrong leader selection, bar stops affecting text, stale pointer gestures, browser keyboard traps, incorrect list-level removal, hidden duplication in undo/revisions, regressions in TOCs and imported documents. Mitigate with explicit action matrix, atomic transactions, shared geometry, fixture coverage and independent CI checkpoints. Roll back a failing work package with a normal revert, not a forced history rewrite or removal of safety gates.

Definition of done: Word-documented behavior is verified, ambiguous cases are either evidenced or clearly scoped, user can use tabs in actual Pages demo, layouts and export agree, and all required tests/deployments pass. Full desktop Word equivalence is not claimed for unsupported Word features or OS-owned shortcuts.


## 8. Implementation evidence and remaining parity gaps (2026-11-16)

The first public tab lab release passed the full deploy, npm publish, style-gallery, geometry and review workflows for commit `9126c2e`. Pages deployment: [43859647680](https://github.com/celsowm/oasis-editor/actions/runs/43859647680); [build and browser gates](https://github.com/celsowm/oasis-editor/actions/runs/43857864871). The [opt-in tab lab](https://celsowm.github.io/oasis-editor/?demo=tabs#/editor) is separate from the persisted default document.

The implementation includes contextual Tab, table navigation, positional inheritance, measured geometry, primitive-based Tabs dialog, ruler gestures, DOCX round trips, PDF strokes and rich clipboard tests. The current follow-up hardens API input validation and tab-capacity behavior, dialog focus, and pointer cancellation; its own CI must pass before treating it as released.

**Still open:** active column/cell ruler origins, RTL and mirrored margins, default-tab marks and mixed marker display, localized position units, complete desktop Word K01–K24 evidence, w:ptab and numbering-suffix edge cases, tracked-revision and story-specific round trips, browser shortcut differences, cross-engine and real-device validation, and representative layout performance baseline. The opt-in lab is not proof of complete Word parity. Preserve the existing gates and record measured evidence instead of checking off these items prematurely.
