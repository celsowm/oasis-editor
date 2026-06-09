# Refactor FontDialog.tsx into SOLID components

## Goal

Reduce `src/ui/components/Dialogs/FontDialog.tsx` from a 1200+ line dialog implementation into small, cohesive, testable units while preserving the current UI behavior, Solid.js reactivity, public API, and test IDs.

## Current findings

- `FontDialog.tsx` currently owns too many responsibilities:
  - public types and props
  - dialog orchestration
  - tab state initialization
  - validation
  - apply-value normalization
  - preview CSS generation
  - font tab JSX
  - advanced tab JSX
  - nested event handlers for every control
- Existing `FontDialogModel.ts` already contains pure helpers for parsing, CSS mapping, and font face style resolution. It is the right place to grow the model/domain layer.
- `src/__tests__/ui/fontDialog.test.tsx` already covers key UI behavior and should remain the regression safety net.
- Public imports currently read types from `../components/Dialogs/FontDialog.js`; avoid breaking that contract unless re-exporting types from the same file.

## Proposed structure

Keep `FontDialog.tsx` as the orchestrator only:

```ts
export function FontDialog(props: FontDialogProps) {
  // active tab
  // font/advanced signals
  // open effect
  // derived memos
  // handleApply delegates to model
  // render Dialog + Tabs with FontTab and AdvancedFontTab
}
```

New or expanded files:

1. `src/ui/components/Dialogs/FontDialogModel.ts`
   - Move all pure behavior here:
     - initial tab state creation
     - advanced validation
     - apply values normalization
     - preview style creation
     - visible family filtering
     - effective size option generation
   - Keep existing exports intact:
     - `parsePositiveNumber`
     - `parseNonNegativeNumber`
     - `formatNullableNumber`
     - `resolveSpacingMode`
     - `resolvePositionMode`
     - `parseStylisticSet`
     - `ligaturesToCss`
     - `numericToCss`
     - `featureSettingsToCss`
     - `resolveFontFaceStyle`
   - Add focused exports such as:
     - `createInitialFontTabValues`
     - `createInitialAdvancedTabValues`
     - `validateAdvancedTabValues`
     - `createFontDialogApplyValues`
     - `createFontDialogPreviewStyle`
     - `getVisibleFamilyOptions`
     - `getEffectiveSizeOptions`

2. `src/ui/components/Dialogs/FontDialogFooter.tsx`
   - Owns cancel/apply footer buttons.
   - Preserves `data-testid` values:
     - `editor-font-dialog-cancel`
     - `editor-font-dialog-apply`

3. `src/ui/components/Dialogs/FontTab.tsx`
   - Owns the Font tab UI:
     - family filter
     - family dropdown
     - size dropdown
     - custom size input
     - style list preset
     - color/highlight/shading controls
     - underline style/color controls
     - style toggles
     - preview
   - Receives values, setters, derived lists/errors/style, and event handlers from `FontDialog`.
   - Preserves existing `data-testid` values.

4. `src/ui/components/Dialogs/AdvancedFontTab.tsx`
   - Owns the Advanced tab UI:
     - character spacing fieldset
     - OpenType fieldset
     - advanced preview
     - validation placeholder
   - Preserves existing `data-testid` values.

5. Optional small subcomponents if the tab files remain too large:
   - `FontFamilyControls.tsx`
   - `FontColorControls.tsx`
   - `FontStyleToggles.tsx`
   - `UnderlineControls.tsx`
   - `AdvancedCharacterSpacingControls.tsx`
   - `AdvancedOpenTypeControls.tsx`

Only create optional subcomponents if the first extraction leaves tab files still large or duplicated. Avoid over-splitting before measuring.

## Implementation steps

1. Add model-level unit tests before moving logic:
   - Create `src/__tests__/ui/fontDialogModel.test.ts` or a nearby model test.
   - Cover:
     - invalid custom size is not validated by advanced validation, but apply returns `fontSize: null`
     - invalid advanced spacing/position/kerning/stylistic set produces validation messages
     - underline style `"none"` maps to `underline: false`, `underlineStyle: null`, `underlineColor: null`
     - advanced spacing/position signs map correctly
     - OpenType values map correctly
     - preview style reflects underline, strike, ligatures, numeric features, and contextual alternates

2. Extract pure helpers from `FontDialog.tsx` into `FontDialogModel.ts`.
   - Do not change behavior while extracting.
   - Keep type compatibility with `FontDialogInitialValues` and `FontDialogApplyValues`.

3. Extract `FontDialogFooter.tsx`.
   - This is a low-risk first UI extraction.
   - Verify existing footer tests still pass.

4. Extract `FontTab.tsx`.
   - Move the first tab panel JSX and related event handlers.
   - Keep the same labels, classes, and `data-testid` values.
   - Keep `customSizeError` and `previewStyle` computed in `FontDialog.tsx` or move their creation to `FontDialogModel.ts`.

5. Extract `AdvancedFontTab.tsx`.
   - Move the second tab panel JSX and related event handlers.
   - Keep `advancedValidationError` and `previewStyle` as props.

6. Simplify `FontDialog.tsx`.
   - It should coordinate state, effects, derived values, apply handling, and tab panels.
   - Target size: ideally under 250 lines.

7. Run regression checks:
   - `npm test -- src/__tests__/ui/fontDialog.test.tsx`
   - `npm test -- src/__tests__/ui/fontDialogModel.test.ts` if added
   - `npm run build`
   - If the project has a TSX-capable ESLint path, run it for the changed files; otherwise rely on `npm run build` plus tests.

## SOLID rationale

- **Single Responsibility**
  - `FontDialog.tsx` coordinates dialog state.
  - `FontDialogModel.ts` owns pure font dialog rules.
  - Tab components own their UI.
  - Footer component owns footer actions.

- **Open/Closed**
  - New controls can be added inside focused tab components or model helpers without editing the orchestrator.

- **Liskov Substitution / Interface Segregation**
  - Each tab component receives only the data and setters it needs.
  - Public dialog props remain stable for existing callers.

- **Dependency Inversion**
  - UI components depend on simple value/setter props, not on the full dialog state or parent internals.
  - Pure behavior depends on small value objects, not on Solid signals or JSX.

## Risks and safeguards

- **Solid reactivity regressions**
  - Avoid passing plain objects that need to update reactively unless wrapped in signals/memos.
  - Prefer passing `values={fontTabValues()}` with setter props for controlled inputs, or pass individual signals if reactivity is clearer.

- **Public API breakage**
  - Keep `FontDialog`, `FontDialogProps`, `FontDialogInitialValues`, and `FontDialogApplyValues` exported from `FontDialog.tsx`.
  - If moving types, re-export them from `FontDialog.tsx`.

- **Behavior drift**
  - Preserve existing `data-testid` values exactly.
  - Preserve apply behavior: call `props.onApply` with normalized values, then `props.onClose`, and do nothing when advanced validation fails.
  - Preserve `original` argument as `props.initial`.

- **Validation behavior**
  - Keep custom size validation display-only during editing.
  - Keep invalid custom size from applying as `fontSize: null`, matching current behavior.

## Acceptance criteria

- `FontDialog.tsx` is materially smaller and no longer contains large tab-specific JSX blocks.
- Existing `fontDialog.test.tsx` passes unchanged.
- New model tests cover extracted pure behavior.
- `npm run build` succeeds.
- No test IDs, labels, or user-visible behavior intentionally change.
