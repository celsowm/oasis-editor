# Ribbon layout and reduction contracts

This describes the implemented foundation of the [Office execution plan](ribbon-office-execution-plan.md). The [delivery ledger](ribbon-office-progress.md) identifies verified scope and remaining acceptance.

## Contributions and composition

Existing contributions default to two rows. `ribbonGroupLayout: "three-rows"` opts a group into a compact three-command stack. `row: 3` also enables this layout so an action cannot disappear through an incompatible default. Large actions occupy the group's body height alongside the rows. Galleries retain their own renderer rather than becoming generic text menus.

These contribution types live in `core/pluginUiTypes.ts` and contain no Solid or CSS types. Plugins forward them through the UI adapter. Presentation sizes belong to scoped Ribbon CSS tokens: body height, normal row height/gap, stack row height/gap and small icon size. Both themes use the same geometry contract.

Visibility is resolved before composition. Empty groups and orphan/duplicate separators do not reserve space. Disabled actions remain present. Known group IDs resolve through locale keys; plugins should supply a localized `groupLabel`. An unnamed unknown group uses the localized General label.

## Measurement

Measurements are outer group widths, including group padding and border. Panel padding is subtracted from the available budget. Full, compact and collapsed measurements use temporary copies of the rendered DOM; these copies are hidden, inert, stripped of IDs/test IDs and synchronously removed. They do not instantiate additional interactive controllers or dispatch commands.

The original group content remains mounted while its surface is collapsed, so all states can be measured without temporarily exposing a full Ribbon or moving keyboard focus. The collapsed popup renders the same arrangement. A measurement is associated with its exact composition object, rather than a cache keyed only by an ID such as `paragraph`.

Composition/language/extension changes invalidate the context. Resize, font completion and the owning editor's theme/style attributes schedule a new measurement. Repeated events share a single pending animation frame. Widths update only when dimensions or composition change. Actual late-font/zoom and contextual stress scenarios remain required evidence.

## Reduction policy

The planner starts from full states on every call. Its result depends on the current budget, measured widths, composition and policies, without remembering the previous resize direction.

1. Apply useful compact transitions before collapsing a group.
2. Within a stage, reduce lower numeric priority first.
3. Break equal-priority ties from right to left, then by stable group ID.
4. Skip states that do not save width; a group with unchanged compact geometry can still collapse.
5. Stop when the budget fits or no useful reduction remains. Do not restore another group from the space released by a collapse.

Home currently reduces Styles, Editing and Clipboard before Font and Paragraph. History stays directly available in its own small group. Full/compact/collapsed state ordering is canonical even if a contribution supplies the states in a different order.

Style galleries can show more whole cards in compact mode only if that space would remain with every other group at full size. A neighbour's collapse never buys the gallery extra cards. Gallery allocations include their outer chrome; the renderer receives the remaining content width.

These priorities are an explicit initial Oasis policy. WordCraft and Word web differ here. Other tabs still require per-task review before claiming comparable responsiveness.

## Focus, overflow and popups

Width changes preserve mounted controls. If a focused formatting control becomes hidden by a collapsed group, focus moves to the group's visible trigger. Programmatic context changes do not force focus into the tab strip.

Below the sum of the smallest usable states, the panel exposes scroll buttons and a focusable horizontal scroll area. It does not rely on clipping or shrinking state dimensions. The scroll controls consume their own budget; they appear only when the minimum states cannot fit.

Collapsed popups preserve action sizes and row structure. Portalled popups retain logical ownership through a context tree, so clicking a child is not an outside click on its parent. Escape closes the deepest open popup and restores that trigger. Short viewports, inline flyouts, contextual transitions and VoiceOver remain in the validation backlog.

## Verification

`npm run test:ribbon:resize` exercises actual browser geometry. `npm run test:ribbon:ci` starts and cleans up its own reference server; PR and push workflows run it and retain the synthetic gallery/resize artifacts. Pure tests sweep 1,700 decreasing budgets and cover priority, measured-width authority, zero-saving states and below-minimum retention. Browser checks additionally cover direct/shrink/expand parity, width equality, context invalidation, focus and nested popups.

The icon observer resolves new placeholders incrementally. Replacing all existing SVGs on unrelated DOM changes would trigger another layout observation and an idle measurement loop. DOM tests guard SVG identity, accessible names and shared observer ownership; the browser suite separately checks for settled idle measurement work.

These checks establish foundation behavior in the exercised cases. Document commands, undo, DOCX/PDF fidelity, optical icon quality and the full execution plan require separate evidence.
