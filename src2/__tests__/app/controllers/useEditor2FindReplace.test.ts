import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { useEditor2FindReplace } from "../../../app/controllers/useEditor2FindReplace.js";
import { createEditor2Document, createEditor2Paragraph } from "../../../core/editorState.js";

describe("useEditor2FindReplace", () => {
  const setup = () => {
    const [state, setState] = createStore({
      document: createEditor2Document([
        createEditor2Paragraph("Hello world"),
        createEditor2Paragraph("Test find replace"),
      ]),
      selection: {
        anchor: { paragraphId: "p1", runId: "r1", offset: 0 },
        focus: { paragraphId: "p1", runId: "r1", offset: 0 },
      },
    });

    const deps = {
      state: state as any,
      applyState: vi.fn((next) => setState(next)),
      applyTransactionalState: vi.fn((producer) => setState(producer(state as any))),
      focusInput: vi.fn(),
    };

    return { deps, state, setState };
  };

  it("should find matches and navigate", async () => {
    const { deps } = setup();

    await createRoot(async (dispose) => {
      const fr = useEditor2FindReplace(deps);
      
      fr.setSearchTerm("world");
      
      // Wait for effect
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(fr.matches()).toHaveLength(1);
      expect(fr.currentIndex()).toBe(0);
      
      fr.findNext();
      // Only 1 match, index should stay 0 but navigate called
      expect(fr.currentIndex()).toBe(0);
      expect(deps.applyState).toHaveBeenCalled();
      
      dispose();
    });
  });

  it("should replace text", async () => {
    const { deps, state } = setup();

    await createRoot(async (dispose) => {
      const fr = useEditor2FindReplace(deps);
      
      fr.setSearchTerm("world");
      fr.setReplaceTerm("Oasis");
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      fr.replace();
      
      // Document should be updated
      const p1Text = (state.document.blocks[0] as any).runs[0].text;
      expect(p1Text).toContain("Oasis");
      expect(p1Text).not.toContain("world");
      
      dispose();
    });
  });

  it("should replace all occurrences", async () => {
    const { deps, state, setState } = setup();
    
    // Add multiple occurrences
    setState("document", "blocks", 0, createEditor2Paragraph("word word word"));

    await createRoot(async (dispose) => {
      const fr = useEditor2FindReplace(deps);
      
      fr.setSearchTerm("word");
      fr.setReplaceTerm("bird");
      
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fr.matches()).toHaveLength(3);
      
      fr.replaceAll();
      
      const p1Text = (state.document.blocks[0] as any).runs[0].text;
      expect(p1Text).toBe("bird bird bird");
      
      dispose();
    });
  });
});
