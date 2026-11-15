import { describe, expect, it } from "vitest";
import { DEFAULT_EDITOR_STYLES } from "@/core/editorState/defaultStyles.js";
import { legacyBuiltinStyle, migrateBuiltinStyles } from "@/core/editorState/migrateBuiltinStyles.js";
import { builtinStyleLabel, resolveStyleDisplayName } from "@/ui/app/essentials/builtinStyleLabel.js";
import { createTranslator } from "@/i18n/index.js";
import { createEditorStateFromParagraphRuns } from "@/core/editorState.js";

describe("semantic native style presentation", () => {
  const heading = DEFAULT_EDITOR_STYLES.heading1!;
  const pt = createTranslator(() => "pt-BR");
  const en = createTranslator(() => "en");

  it("survives copies, JSON persistence and locale changes", () => {
    const copy = JSON.parse(JSON.stringify(heading)) as typeof heading;
    expect(resolveStyleDisplayName(copy, pt)).toBe("Título 1");
    expect(resolveStyleDisplayName(copy, en)).toBe("Heading 1");
    expect(copy.name).toBe("Heading 1");
    expect(copy.id).toBe("heading1");
  });
  it("preserves explicitly custom and unknown styles", () => {
    expect(builtinStyleLabel({ ...heading, customStyle: true })).toBeUndefined();
    expect(builtinStyleLabel({ id: "custom", name: "Heading 1", type: "paragraph" })).toBeUndefined();
    expect(builtinStyleLabel({ id: "heading1", name: "My heading", type: "paragraph" })).toBeUndefined();
  });
  it("migrates legacy canonical definitions without changing names or formatting", () => {
    const state = createEditorStateFromParagraphRuns([[{ text: "Text" }]]);
    const { builtinStyle: _builtin, ...oldHeading } = heading;
    const legacy = JSON.parse(JSON.stringify(oldHeading)) as typeof heading;
    expect(legacyBuiltinStyle(legacy)).toBe("heading1");
    const document = { ...state.document, styles: { heading1: legacy } };
    const migrated = migrateBuiltinStyles(document);
    expect(migrated.styles?.heading1).toEqual(heading);
    expect(document.styles.heading1.builtinStyle).toBeUndefined();
    expect(migrateBuiltinStyles(migrated)).toBe(migrated);
    expect(builtinStyleLabel(legacy, false)).toBeUndefined();
  });
});
