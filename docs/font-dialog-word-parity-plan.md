# Font Dialog Word Parity Expansion Plan

## Goal

Expand the current Oasis Editor font dialog from a basic formatting panel into a Word-like font dialog that can cover the common authoring controls from Word's **Font** and **Advanced** tabs, while preserving round-trip behavior across the editor model, canvas rendering, DOCX import/export, and PDF export.

## Current State

The current dialog supports:

- Font family
- Font size
- Text color
- Bold
- Italic
- Single underline toggle
- Strikethrough toggle
- Live preview

The editor model and rendering stack already support some richer features that are not exposed in the dialog yet:

- Underline style via `EditorTextStyle.underlineStyle`
- Superscript and subscript
- Highlight color
- DOCX import/export for underline style, superscript, subscript, color, highlight, font family, and font size
- Canvas/PDF rendering for several underline styles and vertical alignment effects

## Non-Goals

- Exact pixel-perfect recreation of the Microsoft Word modal chrome.
- Full OpenType shaping parity in the first iteration.
- Platform-native font enumeration on every target before the core UX is useful.
- Adding unsupported typography options to the UI before the document model, rendering, and export paths can preserve them.

## Product Scope

### Font Tab

Target controls:

- Font family list with search/filter.
- Font style list: Regular, Italic, Bold, Bold Italic.
- Font size list plus custom numeric entry.
- Font color with automatic/default option.
- Underline style dropdown.
- Underline color dropdown.
- Effects:
  - Strikethrough
  - Double strikethrough
  - Superscript
  - Subscript
  - Small caps
  - All caps
  - Hidden text
- Preview panel matching the selected family, size, weight, style, decoration, color, and baseline options.
- “Set as Default” placeholder flow, if document defaults are not ready yet.
- “Text Effects” placeholder or disabled entry until text effects have model support.

### Advanced Tab

Target controls:

- Character scale.
- Character spacing: Normal, Expanded, Condensed.
- Character spacing amount.
- Position: Normal, Raised, Lowered.
- Position amount.
- Kerning threshold.
- OpenType feature controls:
  - Ligatures
  - Number spacing
  - Number forms
  - Stylistic sets
  - Contextual alternates

## Implementation Phases

### Phase 1: Restructure the Dialog Shell

Purpose: make room for Word-like controls without changing document behavior yet.

Tasks:

- Convert `FontDialog` into a two-tab dialog: `Font` and `Advanced`.
- Keep existing props working so callers do not need a large rewrite.
- Introduce internal value objects for `fontTab` and `advancedTab` state.
- Replace the current simple rows with Word-like grouped sections:
  - Font selection
  - Color and underline
  - Effects
  - Preview
- Keep all existing `data-testid` values and add stable IDs for new controls.
- Add keyboard navigation for tab switching and form controls.

Acceptance criteria:

- Existing font dialog behavior remains unchanged.
- The dialog opens with current selection values.
- Applying existing fields still changes the selected text exactly as before.
- Cancel still leaves the document unchanged.

### Phase 2: Expose Already-Supported Text Features

Purpose: add UI for capabilities already present in the editor model.

Tasks:

- Add underline style dropdown using the existing toolbar underline options.
- Add superscript and subscript checkboxes.
- Add highlight color control if the product decision is to include highlight in this modal.
- Add conflict handling:
  - Superscript disables subscript and vice versa.
  - Selecting “No underline” clears `underline` and `underlineStyle`.
  - Selecting any non-empty underline style enables `underline`.
- Update `FontDialogInitialValues` and `FontDialogApplyValues`.
- Update `openFontDialog` and `applyFontDialogValues` in `OasisEditorApp`.
- Reuse existing style commands where possible.
- Add i18n keys in `en.ts` and `pt-BR.ts`.

Acceptance criteria:

- Underline style selected in the toolbar is reflected in the dialog.
- Dialog-applied underline styles match canvas, DOCX export, and PDF export.
- Superscript/subscript applied through the dialog match toolbar behavior.
- Mixed-selection behavior is defined and tested.

### Phase 3: Add Word-Like Basic Font UX

Purpose: make the basic tab feel closer to Word for everyday formatting.

Tasks:

- Replace plain dropdowns with listbox-style controls for font family, style, and size.
- Add custom size entry with validation.
- Add common Word sizes: 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72.
- Add a font style list that maps to existing `bold` and `italic` fields:
  - Regular: `bold=false`, `italic=false`
  - Italic: `bold=false`, `italic=true`
  - Bold: `bold=true`, `italic=false`
  - Bold Italic: `bold=true`, `italic=true`
- Improve preview to use a compact Word-like sample area and include decoration lines.
- Support “Automatic” text color by mapping it to `null` instead of a hard-coded dark color.

Acceptance criteria:

- Users can type a custom font size.
- Font style list and bold/italic checkboxes remain consistent if both are present.
- Automatic color preserves inherited/default color instead of forcing a specific hex value.
- Preview updates immediately for all basic fields.

### Phase 4: Add New Basic Text Effects to the Model

Purpose: cover Word effects that require new model fields.

Proposed model additions:

```ts
interface EditorTextStyle {
  doubleStrike?: boolean;
  smallCaps?: boolean;
  allCaps?: boolean;
  hidden?: boolean;
  underlineColor?: string | null;
}
```

Tasks:

- Extend `EditorTextStyle` and defaults.
- Extend style merge and effective-style resolution.
- Extend text commands to apply value and boolean styles.
- Extend clipboard HTML serialization/parsing where browser CSS has equivalents.
- Extend canvas rendering:
  - Double strikethrough as two line-through strokes.
  - Small caps/all caps during text rendering and measurement.
  - Hidden text policy: do not render by default, but preserve in the model.
  - Underline color separate from text color.
- Extend PDF drawing for double strike, hidden text, all caps/small caps, and underline color.
- Extend DOCX import/export:
  - `w:dstrike`
  - `w:smallCaps`
  - `w:caps`
  - `w:vanish`
  - `w:u w:color`

Acceptance criteria:

- New effects survive DOCX import/export round trips.
- Canvas and PDF output match the editor state.
- Hidden text behavior is documented and covered by tests.

### Phase 5: Add Advanced Character Spacing and Position

Purpose: cover the most visible controls in Word's Advanced tab.

Proposed model additions:

```ts
interface EditorTextStyle {
  characterScale?: number | null;
  characterSpacing?: number | null;
  baselineShift?: number | null;
  kerningThreshold?: number | null;
}
```

Definitions:

- `characterScale`: percent, where `100` is normal.
- `characterSpacing`: points, positive for expanded and negative for condensed.
- `baselineShift`: points, positive for raised and negative for lowered.
- `kerningThreshold`: points and above.

Tasks:

- Add Advanced tab controls with numeric validation.
- Update text measurement to account for character spacing and scale.
- Update canvas rendering to apply per-fragment spacing and baseline shifts.
- Update PDF text output to apply spacing and baseline shifts.
- Extend DOCX import/export:
  - `w:w`
  - `w:spacing`
  - `w:position`
  - `w:kern`
- Decide whether baseline shift is independent from superscript/subscript or derived for compatibility.

Acceptance criteria:

- Expanded/condensed spacing changes line wrapping consistently.
- Raised/lowered position affects rendering without changing font size.
- DOCX round-trip preserves spacing, scale, position, and kerning threshold.

### Phase 6: OpenType Feature Preservation

Purpose: preserve advanced typography settings even if rendering support is partial.

Proposed model additions:

```ts
interface EditorTextStyle {
  ligatures?: "none" | "standard" | "contextual" | "historical" | "standardContextual" | null;
  numberSpacing?: "default" | "proportional" | "tabular" | null;
  numberForm?: "default" | "lining" | "oldStyle" | null;
  stylisticSet?: number | null;
  contextualAlternates?: boolean;
}
```

Tasks:

- Map the Word UI options to a stable internal representation.
- Export/import corresponding OOXML properties where available.
- Apply CSS `font-variant-*` and `font-feature-settings` where browser support is reliable.
- Document unsupported combinations and fallback behavior.
- Keep preview honest: show only effects the browser can render, but preserve all selected values.

Acceptance criteria:

- OpenType options survive DOCX round trips.
- Browser-renderable options appear in the preview and canvas.
- Unsupported options do not silently disappear from the document model.

### Phase 7: Defaults and Styles Integration

Purpose: make “Set as Default” and inherited style behavior coherent.

Tasks:

- Define whether default font changes update:
  - Current document default paragraph style.
  - Normal style.
  - Editor-wide user preference.
  - Future documents only.
- Add a confirmation dialog matching Word's intent:
  - Current document only.
  - All documents based on the default template, if templates exist.
- Ensure `null` values mean “inherit/default” and explicit values mean overrides.
- Update named style resolution tests.

Acceptance criteria:

- Default changes have predictable scope.
- Existing documents are not unexpectedly restyled.
- Exported DOCX expresses defaults in the correct style or document defaults part.

### Phase 8: Font Discovery and Availability

Purpose: improve the font list beyond hard-coded or document-derived options.

Tasks:

- Keep document-used fonts at the top of the list.
- Add bundled PDF-safe fonts and common web-safe fonts.
- Use the browser `queryLocalFonts()` API when available and permission is granted.
- Provide a fallback list when local font access is unavailable.
- Mark missing fonts imported from DOCX but not available locally.
- Ensure PDF export has a deterministic fallback when a selected font is unavailable.

Acceptance criteria:

- The dialog lists current document fonts even if unavailable locally.
- The user can select common fonts without typing.
- Missing font fallback is visible and testable.

## Testing Plan

Add tests in layers:

- Component tests for dialog state, tab switching, validation, and apply/cancel behavior.
- Command tests for new text style fields.
- Canvas rendering tests for underline color, double strike, caps, spacing, and baseline shifts.
- DOCX import/export tests for each OOXML property.
- PDF writer tests for visible rendering effects.
- E2E tests for opening the context-menu font dialog, applying changes, and verifying toolbar state.

## Suggested Delivery Order

1. Phase 1: dialog tabs and layout.
2. Phase 2: expose underline style, superscript, and subscript.
3. Phase 3: Word-like family/style/size UX.
4. Phase 4: double strike, caps, hidden text, and underline color.
5. Phase 5: character spacing, scale, position, and kerning.
6. Phase 7: default font behavior.
7. Phase 8: font discovery.
8. Phase 6: OpenType features, because support is more nuanced and should not block the higher-value controls.

## Main Code Areas

- `src/ui/components/Dialogs/FontDialog.tsx`
- `src/ui/components/Dialogs/Dialog.css`
- `src/ui/app/useEditorDialogs.ts`
- `src/ui/OasisEditorApp.tsx`
- `src/core/model.ts`
- `src/core/commands/utils.ts`
- `src/app/controllers/useEditorStyle.ts`
- `src/ui/toolbarStyleState.ts`
- `src/ui/components/Toolbar/underlineStyles.ts`
- `src/ui/components/CanvasEditorSurface.tsx`
- `src/ui/textMeasurement.ts`
- `src/import/docx/styles.ts`
- `src/export/docx/textXml.ts`
- `src/export/pdf/draw/drawFragment.ts`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/pt-BR.ts`

## Risks and Decisions

- Some Word controls need model support before they should be enabled in the UI.
- Character spacing and scale affect layout, so they must be implemented together with measurement.
- Hidden text needs a product decision: preserve-only, render when “show hidden text” is enabled, or always render with a marker.
- OpenType support varies by font and browser; round-trip preservation should come before full visual parity.
- Local font enumeration may require browser permission and should have a graceful fallback.
