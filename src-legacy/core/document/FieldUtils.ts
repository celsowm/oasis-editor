import { FieldInfo } from "../document/BlockTypes.js";

export const FieldInstructions = {
  PAGE: "PAGE \\* MERGEFORMAT",
  NUMPAGES: "NUMPAGES \\* MERGEFORMAT",
  DATE: "DATE \\@ \"dd/MM/yyyy\"",
  TIME: "TIME \\@ \"HH:mm\"",
};

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export const FieldUtils = {
  getPlaceholder(type: string): string {
    switch (type) {
      case "page": return "1";
      case "numpages": return "1";
      case "date": return formatDate(new Date());
      case "time": return formatTime(new Date());
      case "toc": return "[Table of Contents]";
      default: return "[FIELD]";
    }
  },

  resolveField(field: FieldInfo): string {
    switch (field.type) {
      case "page": return "1";
      case "numpages": return "1";
      case "date": return formatDate(new Date());
      case "time": return formatTime(new Date());
      case "toc": return "[Table of Contents]";
      case "hyperlink": return "";
      default: return "";
    }
  },

  parseFieldInstruction(instruction: string): FieldInfo | null {
    const trimmed = instruction.trim().toUpperCase();
    if (trimmed.startsWith("PAGE")) return { type: "page", instruction: trimmed };
    if (trimmed.startsWith("NUMPAGES")) return { type: "numpages", instruction: trimmed };
    if (trimmed.startsWith("DATE")) return { type: "date", instruction: trimmed };
    if (trimmed.startsWith("TIME")) return { type: "time", instruction: trimmed };
    if (trimmed.startsWith("TOC")) return { type: "toc", instruction: trimmed };
    if (trimmed.startsWith("HYPERLINK")) {
      const parts = instruction.trim().split(/\s+/);
      const url = parts[1] || "";
      return { type: "hyperlink", instruction: url };
    }
    return null;
  }
};
