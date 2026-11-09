# Oasis Editor — WordCraft Ribbon Parity & Feature Completion Plan

> **Status:** Proposed implementation roadmap (documentation only)  
> **Baseline date:** 2026-11-07  
> **Oasis baseline:** `celsowm/oasis-editor`, `main` @ `3c913fdbd33db8cf59d4b1835626dbcfefeae994`  
> **WordCraft reference:** `storytold/wordcraft`, `main` @ `e53cae3482d4e080a15dc2320eb4929ea7722db2`  
> **Scope:** General-purpose document editing; Ribbon and the underlying feature stack  
> **Relationship:** Complements `docs/ooxml-near-full-compatibility-plan.md`. That plan governs OOXML interoperability; this one governs discoverability, authoring workflows, parity, and end-to-end proof.

## 1. Objective and product boundaries

Make Oasis Editor a feature-complete, accessible, extensible, general-purpose word processor with a discoverable Ribbon that is competitive with WordCraft. **Do not optimize the core or default UI for any particular consuming application, industry, or document workflow.** Application-specific behavior belongs in integrations and plugins.

WordCraft is a **reference implementation and feature inventory**, not a codebase to copy or a requirement to duplicate every Microsoft Word surface. Avoid importing Rust/egui UI architecture into SolidJS, and do not treat a registered command, a visible button, or a preserved DOCX XML element as evidence that a feature is usable.

Success means:

1. A user can discover and complete common and advanced editing tasks from the default Ribbon and relevant contextual menus.
2. A command is enabled, active, and parameterized consistently with selection and editor state; UI interactions do not lose selection or undo history.
3. Authored content renders correctly, round-trips through DOCX where applicable, exports correctly to PDF, and is accessible to keyboard and assistive technology users.
4. The core, toolbar schema, command registry, plugin API, model, renderers, import/export pipeline, and host integrations remain independently testable.
5. Unsupported functionality is represented truthfully: preserved-only content is never presented as fully editable.

**Out of scope for automatic parity:** WordCraft-specific platform integrations, a requirement to expose every obscure command by default, cloning Word visuals pixel-for-pixel, or embedding integration-specific document variables in Oasis.

## 2. Sources and reproducible audit baseline

### Oasis implementation anchors

- `src/core/pluginUiTypes.ts` — built-in Ribbon tabs and contextual-tab predicates.
- `src/ui/components/Toolbar/Toolbar.tsx` — Ribbon vs compact modes, selection-driven tab changes.
- `src/ui/components/Toolbar/ribbon/{ribbonModel,RibbonTabs,RibbonPanel}.ts(x)` — tab/group composition, responsive collapse, visibility.
- `src/ui/components/Toolbar/presets/defaultToolbar.ts` and `presets/defaultToolbar/{ribbonPlacements,buttonSpecs}.ts` — actual default toolbar inventory.
- `src/ui/components/Toolbar/schema/items.ts`, `registry/ToolbarRegistry.ts`, `state/createToolbarApi.ts` — declarative UI contract.
- `src/core/commands/builtinCommands.ts` — registered built-in command IDs, **not** proof of end-to-end feature readiness.
- `src/plugins/internal/essentialsCommandGroups/*` and `src/ui/app/essentials/*` — command bindings/implementations.
- `src/ui/components/Menubar/defaultMenuItems.ts` — some features are currently accessible only via menus.
- `src/core/model/`, `src/layoutProjection/`, `src/import/docx/`, `src/export/docx/`, `src/export/pdf/` — semantic capability, layout, and persistence.
- `docs/contextual-table-tabs.md` — previously completed contextual-table foundation.
- `docs/ooxml-near-full-compatibility-plan.md` — preservation and document fidelity acceptance requirements.

### WordCraft reference anchors

- `crates/engine/src/ribbon.rs` — customizable Ribbon, tab inventory, Quick Access Toolbar (QAT), persistence and validation.
- `crates/ui-egui/src/ribbon/{home,insert,design,layout,references,review,view,mailings,table,picture,shape,draw,charts,tabs}.rs` — visible UI entry points.
- `crates/engine/src/catalog.rs` — capability catalog.
- `docs/parity-checklist.md` — generated registry coverage, **not proof that every UI path or workflow is complete**.
- `docs/ui-parity.md` and `docs/gaps.md` — context, known WordCraft constraints and parity caveats.

WordCraft currently declares 13 main tabs and 7 named contextual categories in its Ribbon configuration. The Oasis tab vocabulary already declares `file`, `home`, `insert`, `design`, `draw`, `layout`, `references`, `collaboration`, `protection`, `view`, `tableDesign`, `tableLayout`, `imageFormat`, `plugins`, and `ai`. **Declaring a tab does not populate it:** Oasis builds tabs from actual contributions, so empty tabs remain hidden. The built-in preset currently populates File, Home, Insert, Design, Layout, References, Table Design, Table Layout, and Image Format.

The initial comparison below is **code-inspection-based, not an executed functional benchmark**. It must be replaced by a generated, tested inventory in Phase 0. Before implementation, refresh both repository SHAs and revisit changes to each catalog.

## 3. Status vocabulary and non-negotiable parity contract

Maintain one machine-readable row per feature (with reference command IDs, Oasis commands, UI, and tests):

| Status | Definition |
| --- | --- |
| `complete` | Discoverable and working; model/layout/export/round-trip and accessibility tests satisfy the feature contract. |
| `ui-only` | User-facing control exists; semantic action or persisted result is missing/broken. |
| `core-only` | Working core command exists but default Ribbon cannot reach it. |
| `menu-only` | Working action exposed in a menu/pane but not the intended Ribbon location. |
| `preservation-only` | Imported OOXML survives edit/export; native authoring or rendering is incomplete. |
| `partial` | Real workflow exists but essential options or cases are unsupported. |
| `missing` | No verified end-to-end path. |
| `not-applicable` | Explicitly excluded with a documented rationale and alternative (if any). |

For each `complete` entry, record: feature ID, WordCraft ID(s), Oasis command(s), default tab/group, contextual predicate, model support, canvas/layout support, DOCX import/export, PDF behavior, accessibility, automated tests, limitations, and documentation. “Unknown” is distinct from “missing”.

**Feature acceptance ladder:** discover -> interact -> mutate model -> undo/redo -> render -> import/export -> round-trip -> test. Do not mark complete before every applicable step passes. A preservation-only state is a valid interoperability milestone, **not** UI parity.

## 4. Initial gap analysis

| Area | Verified Oasis baseline | WordCraft comparison / remaining work | Initial priority |
| --- | --- | --- | --- |
| File | New/import/export DOCX/PDF/print in preset; save is available in menus/host facilities. | Align discoverability, save/QAT workflow, document lifecycle, error and unsaved-change UX. | P1 |
| Home / Clipboard | Undo/redo, styles, font formatting, alignment, lists, indent/spacing. `copy` is registered; cut/paste have menu/host paths. | Expose cut/copy/paste; Paste Special, format painter, advanced find/replace, optional advanced typography. | P0/P2 |
| Home / Paragraph | Alignment, bullet/ordered lists, list options, special indents, spacing, shading/borders. | Multilevel lists, sorting, paragraph direction, sophisticated list numbering/style parity. | P1/P2 |
| Insert | Tables, images, shapes, symbols, links, footnotes, image captions. | Header/footer editing, page numbering, bookmarks/cross-references, fields, text boxes, date/time, reusable parts, chart/SmartArt (later). | P1/P2 |
| Design | Themes, design default, watermark, page color/borders, document style options. | Close option/preview gaps after confirming actual state and DOCX serialization. | P2 |
| Layout | Margins, orientation, section breaks, paragraph metrics. | Paper size, columns, hyphenation, line numbers, richer section setup, object arrange controls. | P1/P2 |
| References | Footnote control in Ribbon. `insertTableOfContents` and `updateTableOfContents` exist in built-ins and menu. | Add TOC actions immediately; then endnote UX, captions/cross-references, sources/bibliography, figure/index/authorities workflows. | P0/P2 |
| Review | `toggleTrackChanges`, `acceptRevisions`, `rejectRevisions` already registered; no populated default Review tab. | Expose existing revision commands first; add navigation, tracked-change detail, comments authoring, comparison/merge, proofing and protection later. | P0/P1 |
| View | Menu options for margins, paragraph marks, outline and more; Ribbon tab currently unpopulated. | Expose existing view options, zoom, navigation, ruler and view modes; avoid duplicating status bar functionality. | P0/P1 |
| Table Design/Layout | Contextual tabs, conditional styles, borders, shading, row/column/merge/distribute/AutoFit. | Table selection/properties, cell margins/vertical alignment, repeat header, text direction, sorting/formulas, split table, text conversion. | P2 |
| Picture Format | Contextual crop, width/height, border. | Wrapping/position, rotation, arrangement, richer picture effects; preserve unsupported markup. | P2 |
| Draw/Shape/Equation | Shape and equation-related commands exist; richer tabs are not populated by the default preset. | Contextual shape/equation authoring; drawing tools only after underlying editing model and interaction design are proven. | P2/P3 |
| Mailings | No dedicated built-in tab. | Generic mail merge, merge fields, data-source interface, preview, envelope/label output. | P3 |
| Developer / Content Controls | OOXML and document model may preserve some related content; authoring requires audit. | Structured content controls, properties, repeating sections, template/field authoring, optional macros/add-ins. | P3 |
| Customization / QAT | Data-driven, plugin-extensible Ribbon; responsive groups and compact mode. | Persist user tab/group ordering, show/hide, QAT, reset, command search, keyboard KeyTips. | P1/P2 |
| Accessibility / Localization | Translation keys, command-state and UI primitives already exist. | Audit screen-reader roles/names, keyboard-only navigation, RTL layouts, high contrast, focus restoration, responsive widths. | All phases |

### Evidence: built-ins not surfaced in the default Ribbon

The baseline `OASIS_BUILTIN_COMMANDS` array contains `find`, `replace`, `toggleTrackChanges`, `acceptRevisions`, `rejectRevisions`, `toggleShowMargins`, `toggleShowParagraphMarks`, `pageBreak`, `insertTableOfContents`, `updateTableOfContents`, and `copy`. The default toolbar preset does **not** expose these as corresponding first-class Ribbon actions. Expose them by reusing command-state and command-dispatch APIs; do not invent parallel handlers.

### Important limitations

- The Oasis model/export code contains header/footer stories and page-number fields. **This does not establish full authoring/editing support**; verify selection, placement, rendering and DOCX serialization before promising it.
- Comments and tracked revisions have import/export or preservation tests, but authoring, navigation and UI completeness must be separately verified.
- WordCraft controls are evidence of visible affordances, **not necessarily evidence of bug-free behavior**; validate its command handlers and actual user journey when prioritizing.
- Feature parity is not equivalent to pixel parity, nor does it require every plugin-specific tab to be a core dependency.

## 5. Delivery principles and architecture

1. **One command boundary.** Ribbon, menus, context menus, keyboard shortcuts and host API dispatch the same command registry. No direct model writes from toolbar components.
2. **Core first only when needed.** Prefer a real existing command; otherwise implement model mutation + command registration + state + tests before adding a visible control.
3. **Declarative placement.** Keep toolbar items in the preset/registry and placements in `ribbonPlacements.ts`. Extend generic primitives once rather than adding one-off controls.
4. **Selection safety.** Preserve caret/selection through popovers, dialogs, drag/drop, disabled-state transitions and contextual-tab switches. Respect IME composition.
5. **Separate semantic state from UI state.** Document state is serializable and undoable; Ribbon ordering/active tab/dialog openness belongs in UI preferences.
6. **Plugin-safe.** Public command and UI-contribution types are stable; plugins can contribute tabs, groups, controls and predicates without importing internal Solid components.
7. **Preservation first.** Reuse the existing DOCX source-preservation architecture; never rewrite unrelated OOXML or remove unknown content when editing adjacent features.
8. **No fake functionality.** Do not ship noop controls or buttons that merely open “coming soon” panels in the default Ribbon.
9. **No consumer coupling.** Fields, templates, forms, references and mail merge are generic, documented editor capabilities.
10. **Clean design.** Avoid compatibility shims for unshipped APIs, duplicated registries, monolithic command switches and UI-specific logic in the document core.

## 6. Implementation roadmap

### Phase 0 — Generate the authoritative feature matrix (P0, prerequisite)

**Deliverables**

- Add `docs/ribbon-parity-matrix.md`, generated from a structured source such as `scripts/ribbon-parity/features.json`.
- Implement an audit script that enumerates Oasis default toolbar items, item placement, core built-ins, menu-only commands and contextual predicates.
- Produce a stable mapping to WordCraft catalog IDs (baseline commit pinned), with statuses from Section 3 and the supporting source/test paths.
- Include special-case checks for custom controls, menus, nested items, multiple UI entry points, plugins and selection-dependent commands.
- Add a “claims requiring runtime verification” queue. Never infer completeness from command-name presence.

**Acceptance:** deterministic regeneration; no duplicate feature IDs or broken references; all default toolbar actions map to real commands (or explicitly documented UI behaviors); human-reviewed reference mapping; CI fails on unclassified additions/regressions.

### Phase 1 — Expose already-working commands (P0)

**Home — Clipboard + Editing**

- Add accessible cut, copy, paste controls with context-sensitive states using browser-safe clipboard adapters. Differentiate plain text, rich internal clipboard and paste-from-OS; do not assume arbitrary clipboard permissions.
- Add Find/Replace entry points reusing the existing pane; expose Select All and Paragraph Marks toggle.
- Expose `pageBreak` through Insert or Layout, with clear keyboard shortcuts/tooltip text.
- Do **not** label Paste Special or Format Painter complete until their underlying behaviors are implemented.

**Review**

- Populate `review` (add to Ribbon vocabulary and translations if absent): Track Changes, Accept, Reject, change list/navigation (navigation may be a later follow-on), current enabled/active states.
- Wire `toggleTrackChanges`, `acceptRevisions` and `rejectRevisions` to the existing built-ins.
- Handle no-selection, mixed revisions, editing inside tables and cross-section boundaries.
- Keep tracked-change interaction and comment authoring distinct; do not imply review collaboration is complete.

**References**

- Add Insert TOC and Update TOC using `insertTableOfContents`/`updateTableOfContents`; keep Footnote.
- Correct disabled states for stale, absent or non-updatable TOCs.

**View**

- Populate `view` with supported show-margins, show-paragraph-marks, zoom and outline/navigation actions, reusing existing menus/status infrastructure where possible.
- Explicitly classify view-mode items as core-only, UI-only or missing rather than adding decorative controls.

**Tests and exit:** command parity between Ribbon and menu; correct shortcut/active/disabled state; selection and focus retention; keyboard/screen-reader reachability; undo/redo; DOCX smoke when document content changes; no regressions in compact mode.

### Phase 2 — Document structure, fields and page setup (P1)

**Insert**

- Author/edit/remove headers and footers with first/even/default story handling, section boundaries and safe caret navigation between stories.
- Insert/edit page-number fields and choose placement/format/start/continuation per section.
- Introduce generic bookmark and cross-reference commands, including source references, refresh, broken target behavior and DOCX round-trip.
- Provide date/time and document fields with a typed field model; use the same infrastructure for future reusable parts.
- Expose text-box insertion/editing only when shape/text-box model, hit-testing, layout and serialization are complete.

**Layout**

- Paper sizes including custom dimensions; margins and orientation per section; multi-column layout; hard page/column/section breaks.
- Verify interaction with pagination, headers/footers, tables, images, footnotes, page numbering and PDF.
- Line numbering and hyphenation after stable core/layout algorithms; no visual-only impostors.

**Acceptance:** multi-section DOCX fixtures survive at least two import/edit/export cycles; page/section numbering and fields update deterministically; correct PDF page geometry; no content loss; stable selection and undo/redo.

### Phase 3 — Advanced text, references and review (P1/P2)

**Home**

- Format Painter with one-shot and sticky behavior, and precise paragraph vs run-level copy semantics.
- True multilevel list definitions/restarts/indent/style mapping; robust list behavior inside tables and across sections.
- Paragraph sorting, text direction (LTR/RTL) and advanced typography only after semantic/layout support.

**References**

- Complete endnote authoring and navigation; captions for figures/tables/objects with labels and numbering.
- Cross-references, table of figures, index, sources/citation styles, bibliography and table of authorities in dependency order.
- Generic citation source schema and extensible providers; optional Zotero integration must remain a plugin.

**Review**

- New/edit/delete/reply/resolve comments, scoped anchors and navigation.
- Accept/reject selected/all changes, next/previous change, change display options and tracked edits to tables/structures.
- Compare/merge documents with semantic, reviewable diffs and explicit conflict policies.
- Proofing and document protection should have verifiable enforcement, not only visual toggles.

**Acceptance:** anchored edits remain stable under insert/delete/move; no detached comment/revision annotations; DOCX import/export/round-trip and PDF annotation policies documented and tested; collaborative workflows do not bypass undo/redo or permission restrictions.

### Phase 4 — Advanced tables, drawing and contextual toolsets (P2)

**Table Design/Layout**

- Expand cell/row/column/table selection and properties; cell vertical alignment, margins, repeating header rows, text direction and resize handles.
- Add split table, delete table/cells, table-to-text/text-to-table, sorting and formula evaluation with explicit supported-function scope.
- Preserve conditional table styles, nested tables, border painting and source-backed OOXML fidelity.

**Picture / Shape / Equation**

- Contextual shape-format and equation tabs using the existing contextual-tab predicate pattern; add new predicates rather than hardcoding selection logic in `Toolbar.tsx`.
- Picture wrapping, floating positioning, anchor behavior, rotate/flip, arrange/align, image accessibility metadata and effects.
- Shape fill/outline/text, grouping, z-order, alignment and connectors.
- Equation editing and symbol galleries with keyboard and accessibility contracts.

**Charts/SmartArt**

- Treat as separate semantic/layout/OOXML projects. Until native editing is reliable, preserve imported content and provide previews/placeholders with clear diagnostics. Do not advertise native authoring prematurely.

**Acceptance:** overlay/hit-testing and pagination tests; exported text wrapping/anchor behavior close to reference; import/edit/export preserves relationships and unsupported effects; table and floating-object visual-diff coverage.

### Phase 5 — Mailings, forms, developer features and customizable Ribbon (P2/P3)

**Generic mail merge**

- Data-source interface (JSON/CSV/provider adapters), typed merge fields, preview, batch document output, conditionals, safe escaping and failure diagnostics.
- Optional labels/envelopes built on document templates; do not bind the core to any product's placeholder syntax.

**Structured documents**

- Content controls (plain/rich text, checkbox, dropdown, date, repeating section) with validation, properties and authoring UI; preserve OOXML for unsupported controls.
- Reusable templates/Quick Parts, structured custom properties and field refresh.
- Macro execution, external add-ins and network integrations are separate opt-in security projects, not prerequisites for Ribbon parity.

**User customization**

- User-configurable tab/group visibility and ordering, custom tab/groups, command search and QAT; persist and migrate preferences.
- Keep built-in contributions immutable in registry semantics while allowing presentation customization; ensure plugin uninstallation does not corrupt saved layouts.
- Keyboard KeyTips with conflict resolution, accessible focus order and keyboard-only tab navigation.

**Acceptance:** plugin registration/unregistration, cold start with stale preferences, upgrade/downgrade layout migration, restored QAT, malformed-config resilience and security boundaries covered.

## 7. Interaction, accessibility and responsive requirements

Apply to **every** phase, not as a final polish pass:

- Tab/group/item focus order; `Tab`, arrow navigation, Enter/Space, Escape and shortcut interoperability without stealing editor input.
- Menus/dialogs preserve selection, restore focus on close and expose programmatic labels; screen readers announce enabled/pressed/expanded/selected state correctly.
- Pointer, touch and keyboard flows work at narrow and wide viewport widths; no inaccessible overflow menus.
- Contextual tabs appear only for valid selections; leaving the context returns to a sensible tab without losing the caret.
- Tooltip labels, translated strings, font/sample previews and visible keyboard shortcuts are consistent in English and Brazilian Portuguese.
- RTL UI and RTL document content are separate responsibilities; both need tests.
- High contrast, reduced motion and zoom: avoid relying on color alone to convey state.
- Resize policies stay generic and deterministic; heavy popover content must not regress typing/scrolling latency.

## 8. Automated test and evidence strategy

| Layer | Required evidence |
| --- | --- |
| Static inventory | Snapshot/JSON matrix of commands, groups, tabs, contextual predicates, shortcut collisions and documentation links. |
| Core unit | Commands with selection boundary tests, no-op and disabled behavior, undo/redo, malformed inputs, nested structures. |
| UI unit | Toolbar registry/renderer state, active/disabled/visible, popup dismissal, keyboard navigation, localization, plugin conflict handling. |
| E2E | Mouse + keyboard flows for each new item, compact/Ribbon variants, responsive overflow, IME typing and selection preservation. |
| DOCX | Import -> edit -> export -> reimport, source package preservation, Word/LibreOffice consumability where available, independent validation. |
| PDF/layout | Pagination geometry, field numbering, reference resolution, image placement, representative screenshots and visual diffs. |
| Accessibility | Automated checks plus manual keyboard/screen-reader smoke tests; no inaccessible control shipped as complete. |
| Performance | Measure editor startup, Ribbon first paint, tab switch, keystroke latency, memory and document scroll on representative large fixtures. |

Use repository-supported gates: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:word-parity`, `npm run test:smoke`, `npm run test:e2e`, `npm run check:imports` and `npm run check:native-ui` as appropriate for each slice. Do not claim they passed without running them.

Run at least these fixture classes: small/large text documents, multisection documents, styles/multilevel lists, images/float anchors, nested tables, notes and TOCs, tracked revisions/comments, RTL/CJK, malformed DOCX, source-preservation stress, narrow viewport and mobile/touch interaction.

**Metrics:** catalog feature coverage by completion status and per tab; default Ribbon discoverability; command action success on applicable selections; interaction failures; DOCX round-trip preservation; page-layout mismatch rate; accessibility regressions; startup/typing/scrolling latency. Report numerator, denominator and unverified rows; never collapse `core-only` or `preservation-only` into `complete`.

## 9. Proposed implementation slices and dependency order

Ship vertical slices with code, test and documentation in the same change. Suggested order:

1. `audit/matrix` — catalog mapping + generator + status validation.
2. `ribbon/review-basic` — existing tracked-change commands and states.
3. `ribbon/references-basic` — TOC/footnote exposure.
4. `ribbon/home-clipboard-editing` — safe clipboard surface, find/replace, paragraph marks.
5. `ribbon/view-basic` — view options + navigation/zoom.
6. `document/headers-footers-fields` — model/layout/selection/DOCX/PDF first, Ribbon second.
7. `document/page-setup` — page size, columns, breaks, numbering and pagination.
8. `document/bookmarks-cross-references` — source-target model + refresh + UI.
9. `format/advanced-paragraph-lists` — numbering, styles, sort and formatting transfer.
10. `review/comments-diff` — authoring/navigation/compare.
11. `table/advanced-tools` — properties, direction, sort/formulas, conversions.
12. `objects/contextual-tools` — floating picture/shape/equation editing.
13. `references/advanced` — bibliography, figures, authorities and source plugins.
14. `ribbon/customization` — QAT, user layouts and KeyTips.
15. `mailings/structured-documents` — merge, controls, template workflows.

Slices 2–5 are intentionally low-risk UI exposure; slices 6 onward must not bypass the existing OOXML compatibility plan. Review dependencies before splitting work in parallel; share model primitives rather than duplicating them across features.

## 10. Definition of done and release gates

A slice can merge only when:

- Feature specification and matrix status change are included and manually verified.
- A real command exists (or documented non-command UI behavior), is reachable from the right location and has correct enabled/active/selection states.
- Changes are undoable/redone where document-mutating, with stable caret/selection.
- Model, layout, OOXML and PDF impacts are either tested or explicitly marked inapplicable.
- New UI is keyboard/touch accessible, localized, responsive and usable under plugin additions/removals.
- Unsupported input is preserved or rejected with clear diagnostics; no silent data loss.
- Relevant tests pass; failures and untested conditions are documented, not disguised as success.
- New feature logic follows existing public core/plugin APIs without a parallel event bus or ad hoc document mutations.
- The plan/matrix tracks what remains incomplete, with an accountable next test or implementation step.

**Release gate for a “WordCraft Ribbon parity” claim:** all in-scope mapped features reach `complete` or have a documented, reviewed `not-applicable` decision; all must pass the end-to-end acceptance ladder. Separately publish supported DOCX fidelity and layout limitations.

## 11. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Treating visible WordCraft controls as proof of behavior | Inspect command handling and exercise representative workflows; distinguish inventory from functional verification. |
| Superficial Oasis buttons with no semantics | Enforce feature acceptance ladder; disallow `ui-only` as a completed milestone. |
| Breakage of advanced DOCX markup on edits | Reuse source-preservation patchers and multi-cycle round-trip tests; follow existing OOXML roadmap. |
| Toolbar complexity and responsive overflow | Small groups, contextual controls, user customization, tested collapse priorities and command search. |
| Selection/focus losses from UI controls | Centralize focus/selection handling; test across popovers, IME, tables and headers/footers. |
| Platform-specific dependencies | Keep clipboard, filesystem, printers and data providers behind adapters and capability checks. |
| Plugin API instability | Contract tests for SolidJS, React, Vue and public headless API; avoid internal imports by consumers. |
| Performance regressions from feature expansion | Lazy-load heavy dialogs; benchmark typing, scrolling, Ribbon layout and first paint. |

## 12. Immediate execution checklist

- [ ] Generate feature-level catalog with pinned source commits and a repeatable update procedure.
- [ ] Identify verified `core-only` / `menu-only` commands and map their Ribbon placements.
- [ ] Add Review and View to populated default tabs with translation keys and responsive group definitions.
- [ ] Surface tracked-change actions and TOC insertion/update through the existing command bus.
- [ ] Expose Find/Replace, Paragraph Marks and basic clipboard actions without disrupting focus or browser permissions.
- [ ] Add state/interaction/regression tests and document what still lacks functional proof.
- [ ] Triage all remaining features into model/layout/OOXML/UI tasks; link to the existing OOXML plan.
- [ ] Run the documented quality gates, publish matrix deltas and update this roadmap after each completed slice.

---

## 13. Slice progress log

Completed command-surface slices (each core + tests, then wiring/parity; pushed to `main`, ribbon audit increments noted):

**Phase 4 — Tables (lines 205-206 of the plan)**
- [x] Table selection (cell/row/column/table), table properties dialog as a command, delete cells, row height, cell margins, AutoFit modes (contents/window/fixed), split, sort, formula, text↔table conversions, repeat header row, text direction, vertical align. Audit 187 → 195.

**Phase 4 — Pictures / Shapes (lines 212-213)**
- [x] Image flip (horizontal/vertical), rotate left/right by step. Audit → 197.
- [x] Shape fill, outline, change preset, text box text-direction, vertical-align, alt text, rotate by step. Audit → 207.
- [x] Arrange cluster for the selected floating object (image or text box): align to margin (left/center/right), reorder (front/back), nudge (dx/dy), move-with-text / fix position on page. Audit → 210.
- [x] Text box size (cm): get width/height, set width, set height (mirroring the image cm size commands). Audit → 209.
- [x] Shape outline width in points (Shape Outline > Weight). Audit → 211.
- [x] Floating-object exact rotation and wrap preset (arrange.rotation / arrange.wrap) exposed as shared commands. Audit → 213.
- [x] Floating-object position preset (arrange.position): topLeft…bottomRight positions of the margin area. Audit → 214.
- [x] Picture transparency (picture.transparency / OOXML a:alphaModFix): model field, import/export round-trip, canvas (globalAlpha) and PDF (ExtGState) rendering, get/set command. Audit → 215.
- [x] Floating-object wrap side (arrange.wrapText / wp:wrapText): model field, import/export round-trip, line-flow carve-out to one side or the widest side, get/set command. Audit → 216.
- [x] Reset picture (picture.reset): clears crop/mask/fit-fill/tile fill/transparency/border/rotation/flips while preserving box size + floating layout. Audit → 217.
- [x] Paragraph move up/down (para.moveUp / para.moveDown): swap the contiguous run of selected paragraph blocks with the neighbouring paragraph in the active zone, selection follows by id, refused at container edges / next to tables / footnote zone. Audit → 219.
- [x] Named page-margin presets (setMarginsPreset): normal/narrow/moderate/wide/mirrored as a reachable builtin; preset data lives in core pageSetup (single source for the ribbon's margin dropdown), applying four-sided margins while preserving header/footer/gutter. Audit → 220.
- [x] Keep-lines-together and widow/orphan control (para.keepLines / para.widowControl): exposed as reachable toggle builtins with active states; the controller toggle handles widowControl's on-by-default inversion (explicit false to disable). Audit → 222.
- [x] Select word / sentence / paragraph (select.word / select.sentence / select.paragraph): selection-only commands via applyState (no undo) that expand the selection to a Unicode word, a sentence within its paragraph (including the terminator), or whole paragraphs; wired as builtins and read-only-safe like selectAll. Audit → 225.
- [x] Replace all (edit.replaceAll): new core findReplace command module (literal search engine moved to core as single source of truth) with replaceAllInDocument applied across the document; reachable as a replaceAll builtin (search/replace payload + matchCase/wholeWord); the dialog's Replace All now drives the same core command instead of a duplicate inline loop. Audit → 226.
- [x] Small caps / all caps / double strikethrough (format.smallCaps / format.allCaps / format.doubleStrikethrough): reachable toggle builtins (smallCaps/allCaps/doubleStrike) with active states, mirroring strike/superscript/subscript; these model keys existed but were only reachable via the Font dialog. Audit → 229.
- [x] Section vertical alignment (layout.verticalAlign): new core getSectionVerticalAlign / setSectionVerticalAlign commands (w:vAlign: top/center/both/bottom; top is the Word default stored as undefined, null/top clear it) resolved against the active section, exposing the previously round-trip-only field as an authoring command wired as a setSectionVerticalAlign builtin. Audit → 230.
- [x] Hidden text (format.hidden): reachable hidden toggle builtin with an active state, mirroring strike/small-caps wiring; the hidden model key existed but was only reachable via the Font dialog. Audit → 231.
- [x] Collapse selection (select.collapse): selection-only selectCollapse command that collapses the selection to a single caret at its earlier (anchor) end (or later/focus end when `end` is true), handling backwards selections; applied via applyState (no undo) and gated read-only-safe. Audit → 232.
- [x] Underline color (format.underlineColor): setUnderlineColor value builtin through the essentials formatting capability and command group, exposing the active underline color; the underlineColor model key existed but was only reachable via the Font dialog / import-export. Audit → 233.
- [x] Advanced value character styles (format.scale / format.spacing / format.position): setCharacterScale / setCharacterSpacing / setBaselineShift value builtins through the essentials formatting capability and command group; these model keys existed but were only reachable via the Font dialog / import-export. Audit → 236.
- [x] Text-effect toggles (format.shadow / format.emboss / format.engrave): shadow/emboss/engrave toggle builtins with active states (engrave maps to the imprint model key), reachable via applyBooleanStyleCommand and the toolbar state; these model keys existed but were only reachable via the Font dialog. Audit → 239.
- [x] Outline text effect (format.outline): outline toggle builtin with an active state, mirroring strike/shadow wiring; the outline model key existed but was only reachable via the Font dialog. Audit → 240.
- [x] Emphasis mark (format.emphasisMark): setEmphasisMark value builtin (w:em: dot/comma/circle/underDot) through the essentials formatting capability and command group, exposing the active mark; the model key existed but was only reachable via the Font dialog / import-export. Audit → 241.
- [x] Underline convenience toggles (format.doubleUnderline / format.wordUnderline): doubleUnderline / wordUnderline toggle builtins that set underlineStyle to double/words and enable underline, with active states reading the resolved style; mirrors the toolbar split-button behavior. Audit → 243.
- [x] Paragraph text-direction (para.rtl / para.ltr): toggleParagraphBidi builtin (w:bidi on the selected paragraphs) through the essentials paragraph capability and command group, with an active state reading the resolved flag; the model key existed but was round-trip only. Audit → 244.
- [x] Paragraph sort (para.sort): sortParagraphs builtin through the essentials paragraph capability and command group, accepting an optional descending flag ({descending?: boolean} | boolean). Core sortSelectedParagraphs reorders the contiguous paragraph run by natural order (leading numbers first, then collation), refusing tables/footnotes and preserving selection by id. Audit → 245.
- [x] Character border (format.border): characterBorder toggle builtin through the essentials formatting capability, command group and controller, with an active state reading the resolved textBorder presence. Core toggleCharacterBorder applies Word's default single border (black, solid, 0.5pt) or clears it; the textBorder model key existed but was round-trip only. Audit → 246.
- [x] Select text by string (select.text): selectText builtin through the essentials formatting capability and command group, taking an occurrence-aware payload ({text, occurrence?}). Core selectTextOccurrence selects the Nth (literal, case-insensitive) occurrence, selection-only (applyState, no undo). Audit → 247.
- [x] Special-character insertion (text.nbsp / nbHyphen / optionalHyphen / emDash / ellipsis / copyright / registered / trademark): eight insert* builtins through the essentials formatting capability and command group. Core insertSpecialCharacter delegates to the text-editing engine with the exact WordCraft code points (NBSP \u{00A0}, NB_HYPHEN \u{2011}, SOFT_HYPHEN \u{00AD}, emDash \u{2014}, ellipsis \u{2026}, copyright \u{00A9}, registered \u{00AE}, trademark \u{2122}). Audit → 255.
- [x] Horizontal line (insert.horizontalLine): applyHorizontalLine builtin through the essentials paragraph capability and command group. Core applyHorizontalLine applies a single 1.5pt black bottom border to every paragraph the selection touches (Word's horizontal-line button), leaving the other borders untouched. Audit → 256.
- [x] Insert date-time as plain text (insert.dateTime, update:false): insertDateTime builtin through the essentials fields capability and command group, accepting an optional {dateFormat} payload. Core insertDateTimeText types the current date (formatted with a Word picture) as ordinary text at the caret, not a field. Audit → 257.
- [x] Select range (select.range): selectRange builtin through the essentials formatting capability and command group, accepting an {anchor, focus} position payload. Core selectRange sets the selection to the given clamped positions, selection-only (applyState, no undo). Audit → 258.
- [x] Section right-to-left layout (layout.sectionRtl): setSectionBidi builtin through the essentials section capability and command group, taking a boolean payload with an active state reading the resolved bidi flag. Core getSectionBidi/setSectionBidi read and set the active section's w:bidi flag (false/null/undefined clears), mirroring the vertical-align pair. Audit → 259.
- [x] Different first page / different odd & even (layout.differentFirstPage / layout.differentOddEven): setDifferentFirstPage / setDifferentOddEven builtins through the essentials header/footer capability and command group, taking boolean payloads with active states. Core get/setHasDifferentFirstPage and get/setHasDifferentOddEven read and toggle the active section's first-page / even-page header+footer stories (w:titlePg / w:evenAndOddHeaders), seeding on and clearing on disable. Audit → 261.
- [x] Document hyphenation settings (layout.hyphenation): setHyphenation builtin through the essentials section capability and command group, accepting a {value?, zone?, caps?, limit?} payload with an active state reading the automatic-hyphenation switch. Core getHyphenationSettings/setHyphenationSettings read and update the document's autoHyphenation / hyphenationZone / doNotHyphenateCaps / consecutiveHyphenLimit settings (w:autoHyphenation and friends), driving the composer's line-breaking. Audit → 262.
- [x] Drop cap (insert.dropCap): setDropCap builtin through the essentials paragraph capability and command group, accepting a {text?, lines?, type?, font?} payload with an active state reading whether the selection carries a drop cap. Core hasDropCap/setDropCap set or clear the EditorDropCap descriptor on selected paragraphs (text defaulting to the first character, lines default 3 clamped 1-10, type drop/margin, optional font), clearing on type none / lines 0 / empty text. Audit → 263.
- [x] 1-point font nudge (format.growFont1 / format.shrinkFont1): growFont1 / shrinkFont1 builtins through the essentials formatting capability and command group, applying an exact 1-point size change to the selection. Core nudgeFontSize changes each selected run's effective font size by exactly deltaPt (defaulting null sizes to the 11pt document default), clamped to Word's 1-1638 pt range, distinct from the stepping increase/decrease. Audit → 265.
- [x] Paragraph outline step (para.promote / para.demote): promote / demote builtins through the essentials paragraph capability and command group. Core stepOutlineLevel, mirroring WordCraft's outline_step, promotes/demotes each selected paragraph's outline step: a heading moves up/down one level (Heading 1 and Heading 9 are the ends); body text promoted becomes a heading at the level of the heading before it (Heading 1 when none) and can't be demoted further; a list item changes list level like Shift+Tab / Tab. A no-op when nothing can change. Audit → 267.
- [x] Reset paragraph formatting (para.reset): resetParagraphFormatting builtin through the essentials paragraph capability and command group. Core resetParagraphFormatting, mirroring WordCraft's para.reset (Word's Ctrl+Q), removes all direct paragraph formatting from the selected paragraphs — alignment, spacing, indents, line rule, shading, borders, tab stops, keep/break and bidi flags, outline level — while preserving the named style reference (styleId), the list/numbering, the drop cap, and the content. A no-op when there is nothing to reset. Audit → 268.
- [x] Paragraph tab stops (para.tabs): setParagraphTabStops payload builtin through the essentials paragraph capability and command group. Core editParagraphTabStops, mirroring WordCraft's tabs command, replaces the direct tab-stop list (tabs), adds/updates stops (set), clears stops at given positions — recording a `clear` stop over a style-declared position so the rest of the style's stops still inherit — clears every direct stop (clearAll), and changes the document default tab interval (default), in one undoable step. Stops are sorted by position and capped at MAX_TAB_STOPS; a no-op when nothing can change. Audit → 269.
- [x] Paragraph outline level (para.outlineLevel / outline.level): setOutlineLevel builtin through the essentials paragraph capability and command group. Core setParagraphOutlineLevel sets every selected paragraph's outline level (0–8, mirroring w:outlineLvl/@w:val where 0 is Heading 1) or returns it to body text with null/body by removing the level, keeping other style keys; levels are clamped to the valid range and rounded. A no-op when nothing can change. Audit → 270.
- [x] Footnote/endnote options (references.noteOptions): setNoteOptions payload builtin through the essentials formatting capability and command group, with a getNoteOptions readback. Core setNoteOptions/getNoteOptions update the document-wide footnote or endnote settings — number format (decimal/lowerRoman/upperRoman/lowerLetter/upperLetter/symbol), start number (clamped to ≥1), and restart rule (continuous/eachSection) — stored on document.footnotes.settings / document.endnotes.settings and round-tripped through OOXML w:footnotePr / w:endnotePr. Each field applies only when given; null unsets it; a no-op when nothing changes. Audit → 271.
- [x] Character typography options (format.scale/spacing/position peers): setKerning (kerningThreshold), setLigatures, setNumberSpacing, setNumberForm and setStylisticSet reachable builtins through the essentials formatting capability and command group, alongside the existing setCharacterScale/setCharacterSpacing/setBaselineShift/setEmphasisMark. These route through the setTextStyleValue core and round-trip OOXML (w:kern, w14:ligatures, w14:numSpacing, w14:numForm, w14:stylisticSets). Audit → 276.
- [x] Paragraph list level (para.listLevel): setListLevel builtin through the essentials paragraph capability and command group. Core setParagraphListLevel sets the selected list paragraphs' explicit list level (0–8, mirroring w:lvl), clamping and rounding the level and leaving non-list paragraphs untouched. A no-op when nothing can change. Audit → 277.
- [x] Paragraph contextual spacing (w:contextualSpacing, Word's "Don't add space between paragraphs of the same style"): setContextualSpacing builtin through the essentials paragraph capability and command group, with a boolOrNull payload helper. Core setParagraphContextualSpacing sets the contextualSpacing flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default off). A no-op when nothing can change. Audit → 278.
- [x] Paragraph mirror indents (w:mirrorIndents, Word's "Mirror indents" — swap left/right indents on facing pages): setMirrorIndents builtin through the essentials paragraph capability and command group. Core setParagraphMirrorIndents sets the mirrorIndents flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default off). A no-op when nothing can change. Audit → 279.
- [x] Paragraph line rule (w:lineRule, Word's Line spacing rule — auto/exact/atLeast): setLineRule builtin through the essentials paragraph capability and command group, with a strOrNull payload helper. Core setParagraphLineRule sets the lineRule on every selected paragraph, keeping the numeric lineHeight decoupled so the two stay editable independently; auto or null clears the key (default, omitted on export). A no-op when nothing can change. Audit → 280.
- [x] Paragraph text direction (w:textDirection, Word's paragraph Text Direction — vertical text flow): setTextDirection builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphTextDirection sets the text flow (lrTb/tbRl/btLr/lrTbV/tbRlV) on every selected paragraph, clearing the key for the lrTb default (omitted on export). A no-op when nothing can change. Audit → 281.
- [x] Paragraph suppress auto hyphens (w:suppressAutoHyphens, Word's paragraph "Don't hyphenate"): setSuppressAutoHyphens builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphSuppressAutoHyphens sets the suppressAutoHyphens flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default off). A no-op when nothing can change. Audit → 282.
- [x] Paragraph kinsoku (w:kinsoku, Word's "Use kinsoku rules for East Asian line breaking"): setKinsoku builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphKinsoku sets the kinsoku flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default on, omitted on export). A no-op when nothing can change. Audit → 286.
- [x] Paragraph overflow punct (w:overflowPunct, Word's "Allow punctuation to overflow margin"): setOverflowPunct builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphOverflowPunct sets the overflowPunct flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default on, omitted on export). A no-op when nothing can change. Audit → 287.
- [x] Paragraph word wrap (w:wordWrap, Word's "Allow Latin text to wrap in the middle of a word"): setWordWrap builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphWordWrap sets the wordWrap flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default on, omitted on export). A no-op when nothing can change. Audit → 288.
- [x] Paragraph autoSpaceDE (w:autoSpaceDE, Word's "Automatically adjust spacing between East Asian and Latin text"): setAutoSpaceDE builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphAutoSpaceDE sets the autoSpaceDE flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default on, omitted on export). A no-op when nothing can change. Audit → 289.
- [x] Paragraph autoSpaceDN (w:autoSpaceDN, Word's "Automatically adjust spacing between East Asian text and numbers"): setAutoSpaceDN builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphAutoSpaceDN sets the autoSpaceDN flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default on, omitted on export). A no-op when nothing can change. Audit → 290.
- [x] Paragraph adjustRightInd (w:adjustRightInd, Word's "Adjust right indent when grid is defined"): setAdjustRightInd builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphAdjustRightInd sets the adjustRightInd flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default on, omitted on export). A no-op when nothing can change. Audit → 291.
- [x] Paragraph top line punct (w:topLinePunct, Word's "Compress punctuation at start of a line"): setTopLinePunct builtin through the essentials paragraph capability and command group, with a toolbar readback added to the paragraph style state. Core setParagraphTopLinePunct sets the topLinePunct flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default off, omitted on export). A no-op when nothing can change. Audit → 292.
- [x] Paragraph page break before (w:pageBreakBefore, Word's "Page break before"): setPageBreakBefore builtin through the essentials paragraph capability and command group (a readback already exists in the paragraph style state). Core setParagraphPageBreakBefore sets the pageBreakBefore flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default off, omitted on export). A no-op when nothing can change. Audit → 293.
- [x] Paragraph keep with next (w:keepNext, Word's "Keep with next"): setKeepWithNext builtin through the essentials paragraph capability and command group (a readback already exists in the paragraph style state). Core setParagraphKeepWithNext sets the keepWithNext flag on every selected paragraph, storing an explicit false to honor it on export or clearing the key with null (default off, omitted on export). A no-op when nothing can change. Audit → 294.
- [x] Table cell spacing (w:tblCellSpacing, Word's Cell Spacing — the gap between adjacent cells): tableSetCellSpacing builtin through the essentials table capability and command group. Core setActiveTableCellSpacing sets the gap between adjacent cells on the active table, rounding to half-points, or clears it with null (Word's default); a no-op outside a table or when unchanged. Audit → 283.
- [x] Table indent (w:tblInd, Word's table Indent from Left): tableSetTableIndent builtin through the essentials table capability and command group. Core setActiveTableIndent sets the horizontal offset of the active table, rounding to half-points, ignoring negative/NaN/non-finite values, or clears it with null (Word's default); a no-op outside a table or when unchanged. Audit → 284.
- [x] Table alignment (w:jc, Word's table Alignment): tableSetAlignment builtin through the essentials table capability and command group. Core setActiveTableAlignment sets the left/center/right position of the active table, storing only the three valid OOXML values and clearing with null (Word's default of left); a no-op outside a table, on invalid values, or when unchanged. Audit → 285.

**Still open**
- Picture adjustments (corrections/color/effects/compress/reset) — require an `EditorImageRunData` effects model + OOXML import/export round-trip (no fields exist today).
- Grouping/connectors, contextual shape-format/equation tabs, equation galleries.
- Charts/SmartArt native authoring (kept as preservation-only per plan).
- Phase 5: mail merge, content controls, Quick Parts, custom properties, customizable Ribbon/QAT.

---

**Guiding rule:** build a genuinely capable **general-purpose** editor. A feature is not “done” because a toolbar button exists; the entire document workflow must work.