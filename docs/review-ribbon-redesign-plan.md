# Review ribbon visual redesign — implementation plan

Status: initial redesign implemented; CI and baseline/final screenshots pending.
Target: main. Scope: reusable Oasis Editor Review ribbon, not the demo sidebar.
Report: 2026-11-15, Safari/macOS, pt-BR, demo embedded beside its sidebar.

## 1. Baseline diagnosis

The existing Review tab exposes three groups (tracking, changes, comments).
- `src/ui/components/Toolbar/presets/defaultToolbar.ts` uses generic Lucide glyphs (file-check, check, x, check-check, undo-2, chevron-up/down, message-square, messages-square). These are legal icons but can communicate the wrong action or lack semantic detail.
- `presets/defaultToolbar/ribbonPlacements.ts` distributes tracking, revision and comment commands across two/three rows; the comments group combines two large actions and seven small actions.
- `ReviewDisplayModeButton.tsx` uses the shared Menu primitive with icon and tooltip but no visible selected-mode label. `ShowMarkupButton.tsx` uses a similar filter menu.
- `ribbon/ribbonModel.ts` has compactLabels: hide for all three Review groups; disappearance of labels is therefore expected under width pressure, but currently obscures distinctions between similar glyphs.
- `toolbar.css` already defines shared geometry: 63 px ribbon body, 30 px two-row controls, 20 px stacked rows, 16/24/32 px icon tiers. Start with these constraints rather than enlarging the whole ribbon.
- The screenshot shows genuinely disabled-looking revision/comment actions. Inspect command state and an enabled fixture before concluding there is a contrast or enablement defect.

Capture baseline screenshots: empty/no revisions, pending tracked changes, both pane states, existing active comment, resolved comment, read-only; light/dark and en/pt-BR; wide and narrow embedded editor. Record commit, browser, actual host width and group state.

## 2. Proposed information architecture

Keep the current three groups and command scope.

### Tracking (Control of Changes)

- Primary large toggle: Track Changes, dedicated document + pencil/revision glyph. Preserve pressed state and existing toggleTrackChanges command.
- Selected review display mode: labeled compact dropdown showing current value (Simple Markup, All Markup, Final, Original), not only an icon. Preserve setReviewDisplayMode radio semantics.
- Labeled Show Markup dropdown: category/author filtering, using existing applyShowMarkup behavior.
- Reviewing Pane toggle with semantic pane icon and visible label.
- Retain toggleRevisionMarkup, distinct from filtering via Show Markup; choose explicit terminology such as Show/Hide Revisions or equivalent based on verified existing command semantics and pt-BR translations. It must remain discoverable at every responsive state.

### Changes

- Accept / Reject as large primary actions with document + check / document + X glyphs; subtle semantic accents green/red in enabled state.
- Prefer split actions only if shared primitives support independent main/arrow availability, keyboard access and distinct command scopes. Main executes acceptRevisions/rejectRevisions; menu exposes existing requestAcceptAllRevisions/requestRejectAllRevisions with confirmation intact. If this design would hide or disable a valid document-scoped action when the selection-scoped action is unavailable, use separate labeled secondary actions instead.
- Previous / Next revisions use distinguishable matching navigation arrows, not anonymous chevrons.
- Never change confirmation semantics, selection-vs-document action scope, history or read-only gating to improve appearance.

### Comments

- New Comment first, then Discussions/Comments Pane as large actions.
- Reply, Resolve and Delete more recognizable small actions with consistent comment-family icons.
- Previous / Next comments must use opposing directional badges/arrows rather than message-square versus messages-square.
- Edit and Reopen remain available in a labeled secondary row or More menu, subject to contextual command state. Never make the only route dependent on a tooltip.
- Maintain all nine existing comments commands and test IDs, or update their shared action contract and test resolver atomically if split menus require moving the control.
- Keep panels, comment thread state and document hierarchy unchanged.

## 3. Icon design system (P0/P1)

Create cohesive original review SVGs in the existing custom icon registry, using the repository's existing license and no copied proprietary Office artwork. Review the existing customIcons.tsx conventions and use shared icon geometry instead of per-control inline SVGs.

Proposed semantic names: reviewTrackChanges, reviewAccept, reviewReject, reviewAcceptAll, reviewRejectAll, reviewPrevious, reviewNext, reviewDisplay, reviewMarkupFilter, reviewPane, commentNew, commentReply, commentEdit, commentPrevious, commentNext, commentResolve, commentReopen, commentDelete. Reuse existing commentsPane and other suitable icons if consistent. Choose a 24x24 logical viewBox and consistent 1.5–1.8 stroke width; use existing 16/24/32 display tiers. Avoid micro-details that disappear at 16 px. Directional icons use mirrored geometry where appropriate.

Use currentColor for neutral outlines; CSS semantic accent tokens for positive/negative and informational marks. Ensure disabled state overrides semantic accent contrast appropriately, with no false enabled affordance. Do not rely solely on color; every icon must remain distinguishable in grayscale. SVGs are decorative inside labeled controls (aria-hidden); preserve accessible command name. Capture each new icon in normal/hover/pressed/disabled states, light/dark and representative sizes.

Refresh the line-dependent icon inventory using node scripts/audit-ribbon-icons.mjs --write; update reviewed icon catalog and parity data where necessary, never bypass audits.

## 4. Reusable component and layout changes (P1)

- Inspect existing shared Menu, Popover, button/toggle renderers and split-button primitives. Add a reusable label-bearing value menu only if needed; do not fork a Review-only toolbar system.
- Derive state from command bus, not local duplicate booleans; preserve command guards, document selection, focus return and menu dismissal.
- Standardize button states: default, hover, pressed/toggled, focus-visible, disabled, menu-open. Preserve keyboard focus rings. Aim for accessible text/active-control contrast (WCAG 2.2 AA as appropriate); disabled controls are exempt from minimum contrast but should remain recognizable.
- Use existing toolbar tokens with semantic additions as needed; do not apply global opacity changes blindly across all tabs. Test enabled and disabled fixtures.
- Establish compact label priority by control, rather than blanket hiding every label. Keep the current review mode and ambiguous/primary actions labeled where practical; move secondary commands into accessible collapsed menus. Localized labels may wrap only within documented geometry.
- Review responsive allocation priority (comments currently collapses first, then changes, then tracking according to existing policy). Preserve monotonic resizing, direct-mount/resize parity, measured widths and available horizontal scrolling. Avoid squeezing more items into tiny buttons; collapse group when needed.
- Full ribbon: 63 px command body; primary large icons, secondary rows aligned. Compact: primary actions retained, lower-priority labels reduced or commands grouped. Collapsed: labeled group trigger and full action access.
- Simplified ribbon: same shared actions, one-line layout, no custom Review-only height. Verify inline/balloon shells remain unaffected.
- Avoid duplicate DOM identities, global focus selectors, stale popovers or resize-observer feedback loops.
- Files: Toolbar/presets/defaultToolbar.ts, presets/defaultToolbar/ribbonPlacements.ts, ribbon/ribbonModel.ts, toolbar.css, ReviewDisplayModeButton.tsx, ShowMarkupButton.tsx, primitives/Menu.tsx (only if required), src/ui/utils/customIcons.tsx, locale files.

## 5. Internationalization and accessibility

Use existing en/pt-BR locale system. Resolve selected display-mode labels reactively; provide consistent distinctions for markup visibility, markup filters and reviewing pane. Verify keyboard navigation, Enter/Space, Escape, radio/checkbox semantics, split button main/arrow semantics, names for icon-only controls, focus restoration, disabled states and localization inside collapsed menus. No raw English labels in Portuguese or raw translation keys on screen.

## 6. Functional regressions and visual evidence

Existing scripts/verify-ribbon-review.mjs already verifies Accept All/Reject All confirmation and scope, undo, disabled states, review modes and categories, revision rendering, reviewing pane, structural and formatting changes. Existing scripts/verify-ribbon-comments.mjs verifies authoring/threading, navigation, resolve/reopen, deletion+undo, read-only and DOCX round-trip. Keep these checks and adapt locators to any split/menu presentation without weakening assertions.

Add focused visual/geometry tests, rather than replacing functional coverage. Incorporate Review and comments suites into maintained CI orchestration (current cited default runner does not invoke them), or use a focused Review suite with independent cross-engine matrix. Do not make the deploy ignore failures.

Test matrices:
- Chromium, Firefox, Playwright WebKit; actual Safari when available.
- 1440, 1200, 1040, 960, 800, 640, 480 CSS px and independently resizable host with sidebar.
- Light/dark; English/Portuguese; full, compact, collapsed and simplified.
- No revisions vs pending revision; caret outside/inside revision; pending document changes outside selection; tracking on/off; comments absent, active, resolved; pane open/closed; read-only; keyboard only.
- Confirm bulk actions remain reachable when main action disabled. Confirm one user gesture invokes exactly one command. Confirm selection, document state, undo/redo, confirmation and DOCX round-trip remain correct.
- Assert no icon clipping, row overflow, duplicate actionable IDs, inaccessible clipped labels, popover overflow or unexplained layout oscillation. Test all three review groups.
- Record baseline and final screenshots with enabled and disabled states; include screenshot and JSON geometry evidence. Do not claim visual certification from static audit alone.

Run npm run typecheck, npm run lint, npm test, npm run audit:ribbon, npm run audit:ribbon:icons, npm run build, existing Review/comments browser scripts with their documented server and RIBBON_BROWSER environment, npm run test:ribbon:resize, npm run test:ribbon:ci and npm run test:smoke.

## 7. Ordered deliverables

1. test(review): capture baseline and add state/geometry regressions.
2. feat(icons): add cohesive semantic review icon family.
3. refactor(review): expose labeled display and markup commands.
4. feat(review): redesign accept/reject action hierarchy and comment navigation.
5. fix(ribbon): responsive label priority and accessible group collapse.
6. test(review): validate commands, geometry, a11y and cross-engine states.
7. docs(review): update icon inventory, feature matrix and visual evidence.

## 8. Acceptance gates

- [ ] Review primary actions are recognizable at native ribbon dimensions.
- [ ] Dropdown communicates selected review display mode and filters have explicit labels.
- [ ] Comment previous/next and revision previous/next are visibly distinguishable.
- [ ] Disabled controls remain truly disabled, recognizable and consistent; no fake enabled actions.
- [ ] All existing review/comment actions remain reachable at supported widths.
- [ ] Selection/document scopes, confirmation, history, read-only and DOCX behavior unchanged.
- [ ] en/pt-BR, light/dark, full/compact/collapsed/simplified render correctly.
- [ ] Existing and new tests and audits pass; cross-engine screenshots inspected.
- [ ] Review in real Safari with demo sidebar verified or separately marked outstanding.

Decisions: retain existing three groups, use original Word-inspired icon semantics rather than proprietary artwork, and keep visual hierarchy distinct from command enablement. Split buttons are conditional on proving independent action gating. This is a planning artifact only.

## Implementation notes

Added 19 shared original semantic SVGs, distinct forward/backward navigation, labeled current display mode and markup filter, revised tracking rows, primary New Comment ordering, compact label preservation for tracking/changes and large comment actions, scoped disabled-state contrast, and updated icon inventories. All commands and test IDs remain unchanged. Bulk accept/reject remain separate labeled actions to preserve independent command enablement; split buttons are not required. No browser or visual certification is claimed yet.

Added a dedicated review layout browser suite and separate Chromium/Firefox/WebKit workflow. It runs the existing review and comments functional scenarios unchanged, and captures enabled/disabled fixtures under independently constrained host widths with actual command-state assertions. The new suite is not yet validated; existing deployment gate remains unchanged. Real Safari and baseline screenshot reconciliation remain outstanding.

CI follow-up: the redesign passed TypeScript, unit tests, application build, parity and icon audits; the existing style-gallery matrix also passed. The first dedicated Review run failed in Chromium/Firefox when the generic openGroup helper selected controls with geometry but no accessible name (likely inert measurement copies); WebKit passed the new layout suite and then hit an overly broad table-grid revision selector in the older functional test (2 nodes, one document outline and potentially a pane row). Scoped command resolution to live group content/open popover and explicitly exclude inert/aria-hidden nodes. Scoped the table filter assertions to the existing cellMarkup locator. Retained accessible-name, command-state and exact outline-count checks. Revalidation pending.
