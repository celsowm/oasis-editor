/**
 * Lossless lexical view of Word field instructions. Raw text and UTF-16
 * offsets are authoritative; this is not an evaluator or a complete switch
 * grammar. Unknown commands and switches are retained, never executed.
 */
export interface FieldInstructionToken {
  kind: "word" | "quoted" | "switch";
  raw: string;
  value: string;
  start: number;
  end: number;
}
export interface ParsedFieldInstruction {
  raw: string;
  command: string | null;
  tokens: readonly FieldInstructionToken[];
  error?: "length-limit" | "token-limit" | "missing-command" | "unterminated-quote" | "invalid-switch" | "adjacent-quote";
}
export const MAX_FIELD_INSTRUCTION_LENGTH = 65536;
const MAX_TOKENS = 4096;
const whitespace = (ch: string): boolean => /\s/u.test(ch);
export function parseFieldInstruction(raw: string): ParsedFieldInstruction {
  const tokens: FieldInstructionToken[] = [];
  const invalid = (error: NonNullable<ParsedFieldInstruction["error"]>): ParsedFieldInstruction =>
    ({ raw, command: null, tokens, error });
  if (raw.length > MAX_FIELD_INSTRUCTION_LENGTH) return invalid("length-limit");
  let i = 0;
  while (i < raw.length) {
    if (whitespace(raw[i]!)) { i++; continue; }
    if (tokens.length >= MAX_TOKENS) return invalid("token-limit");
    const start = i;
    let kind: FieldInstructionToken["kind"] = "word";
    let value = "";
    if (raw[i] === '"') {
      kind = "quoted";
      i++;
      let closed = false;
      while (i < raw.length) {
        const ch = raw[i++]!;
        if (ch === '"') { closed = true; break; }
        // Preserve unfamiliar escape sequences verbatim. Only escaped quote
        // and backslash are decoded here; semantic interpretation is later.
        if (ch === "\\" && (raw[i] === '"' || raw[i] === "\\")) value += raw[i++]!;
        else value += ch;
      }
      if (!closed) return invalid("unterminated-quote");
      if (i < raw.length && !whitespace(raw[i]!) && raw[i] !== "\\") return invalid("adjacent-quote");
    } else if (raw[i] === "\\") {
      kind = "switch";
      i++;
      const name = raw[i];
      if (!name || !/[A-Za-z*@#!]/.test(name)) return invalid("invalid-switch");
      i++;
      value = name;
      if (i < raw.length && !whitespace(raw[i]!) && raw[i] !== '"' && raw[i] !== "\\") {
        // A multi-letter switch name is not interpreted by this slice.
        while (i < raw.length && !whitespace(raw[i]!) && raw[i] !== '"' && raw[i] !== "\\") value += raw[i++]!;
      }
    } else {
      while (i < raw.length && !whitespace(raw[i]!) && raw[i] !== "\\" && raw[i] !== '"') i++;
      if (raw[i] === '"') return invalid("adjacent-quote");
      value = raw.slice(start, i);
    }
    tokens.push({kind,raw:raw.slice(start,i),value,start,end:i});
  }
  const first = tokens[0];
  if (!first || first.kind !== "word" || !/^(?:[A-Za-z][A-Za-z0-9]*|=)$/.test(first.value)) return invalid("missing-command");
  return {raw,command:first.value.toUpperCase(),tokens};
}
