import { describe, expect, it } from "vitest";
import { DEFAULT_EDITOR_STYLES } from "@/core/editorState/defaultStyles.js";
import { builtinStyleLabel } from "@/ui/app/essentials/builtinStyleLabel.js";
import { createTranslator } from "@/i18n/index.js";

describe("native style presentation labels", () => {
  it("localizes native definitions without mutating the original name or ID", () => {
    const heading = DEFAULT_EDITOR_STYLES.heading1!;
    const key = builtinStyleLabel(heading)!;
    expect(createTranslator(() => "pt-BR")(key)).toBe("Título 1");
    expect(createTranslator(() => "en")(key)).toBe("Heading 1");
    expect(heading.name).toBe("Heading 1");
    expect(heading.id).toBe("heading1");
  });
  it("preserves names when provenance is not known, even with matching ID and name", () => {
    const heading = DEFAULT_EDITOR_STYLES.heading1!;
    expect(builtinStyleLabel({ ...heading })).toBeUndefined();
    expect(builtinStyleLabel({ ...heading, name: "My heading" })).toBeUndefined();
    expect(builtinStyleLabel({ ...heading, id: "custom" })).toBeUndefined();
  });
});
