import { describe, it, expect } from "vitest";
import { Operations } from "../core/operations/OperationFactory.js";
import { OperationType } from "../core/operations/OperationTypes.js";

describe("OperationFactory", () => {
  describe("Structural Operations", () => {
    it("should create appendParagraph operation", () => {
      const text = "Hello World";
      const op = Operations.appendParagraph(text);
      expect(op).toEqual({
        type: OperationType.APPEND_PARAGRAPH,
        payload: { text },
      });
    });

    it("should create setSectionTemplate operation", () => {
      const sectionId = "section-1";
      const templateId = "template-a";
      const op = Operations.setSectionTemplate(sectionId, templateId);
      expect(op).toEqual({
        type: OperationType.SET_SECTION_TEMPLATE,
        payload: { sectionId, templateId },
      });
    });

    it("should create insertParagraph operation", () => {
      const op = Operations.insertParagraph();
      expect(op).toEqual({
        type: OperationType.INSERT_PARAGRAPH,
        payload: {},
      });
    });
  });

  describe("Text and Alignment Operations", () => {
    it("should create insertText operation", () => {
      const text = "New text";
      const op = Operations.insertText(text);
      expect(op).toEqual({
        type: OperationType.INSERT_TEXT,
        payload: { text },
      });
    });

    it("should create deleteText operation", () => {
      const op = Operations.deleteText();
      expect(op).toEqual({
        type: OperationType.DELETE_TEXT,
        payload: {},
      });
    });

    it("should create toggleMark operation", () => {
      const mark = "bold";
      const op = Operations.toggleMark(mark);
      expect(op).toEqual({
        type: OperationType.TOGGLE_MARK,
        payload: { mark },
      });
    });

    it("should create setMark operation", () => {
      const mark = "fontSize";
      const value = 14;
      const op = Operations.setMark(mark, value);
      expect(op).toEqual({
        type: OperationType.SET_MARK,
        payload: { mark, value },
      });
    });

    it("should create setAlignment operation", () => {
      const align = "center";
      const op = Operations.setAlignment(align);
      expect(op).toEqual({
        type: OperationType.SET_ALIGNMENT,
        payload: { align },
      });
    });
  });

  describe("Selection Operations", () => {
    it("should create setSelection operation", () => {
      const selection = {
        anchor: {
          sectionId: "s1",
          blockId: "b1",
          inlineId: "i1",
          offset: 0,
        },
        focus: {
          sectionId: "s1",
          blockId: "b1",
          inlineId: "i1",
          offset: 5,
        },
      };
      const op = Operations.setSelection(selection);
      expect(op).toEqual({
        type: OperationType.SET_SELECTION,
        payload: { selection },
      });
    });

    it("should create moveSelection operation", () => {
      const key = "ArrowRight";
      const op = Operations.moveSelection(key);
      expect(op).toEqual({
        type: OperationType.MOVE_SELECTION,
        payload: { key },
      });
    });
  });
});
