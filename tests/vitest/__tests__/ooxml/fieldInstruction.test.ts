import { describe, expect, it } from "vitest";
import { parseFieldInstruction, MAX_FIELD_INSTRUCTION_LENGTH } from "@/ooxml/word/fieldInstruction.js";
import { projectScalarFieldInstruction } from "@/import/docx/runs/fieldProjection.js";

describe("lossless field instruction lexer",()=>{
  it("preserves raw offsets, command case and quoted operands without promoting words",()=>{
    const raw=String.raw`  iF "NUMPAGES" = "a\"b\\c" \* MERGEFORMAT `;
    const parsed=parseFieldInstruction(raw);
    expect(parsed.command).toBe("IF");
    expect(parsed.raw).toBe(raw);
    expect(parsed.tokens.map(t=>t.value)).toEqual(["iF","NUMPAGES","=",'a"b\\c',"*","MERGEFORMAT"]);
    for(const token of parsed.tokens)expect(raw.slice(token.start,token.end)).toBe(token.raw);
    expect(projectScalarFieldInstruction(raw)).toBeUndefined();
  });
  it("supports case-sensitive page formats and exact reference names",()=>{
    expect(projectScalarFieldInstruction(" page \\* roman ")).toEqual({type:"PAGE",format:"roman"});
    expect(projectScalarFieldInstruction(" NUMPAGES \\* ROMAN ")).toEqual({type:"NUMPAGES",format:"ROMAN"});
    expect(projectScalarFieldInstruction(' REF "NUMPAGES" \\h ')).toEqual({type:"REF",bookmark:"NUMPAGES"});
    expect(projectScalarFieldInstruction(' DATE \\@ "yyyy-MM-dd" ')).toEqual({type:"DATE",dateFormat:"yyyy-MM-dd"});
  });
  it("retains unknown commands and unrepresentable operands",()=>{
    expect(parseFieldInstruction(" INCLUDETEXT file ").command).toBe("INCLUDETEXT");
    for(const raw of [" REF "," PAGE \\* Unknown "," REF X \\n "," DATE \\@ \"x\" \\* MERGEFORMAT "," PAGE extra "," X NUMPAGES "," PAGE \\ "," DATE \\@ \"unterminated","\"PAGE\""]){
      expect(projectScalarFieldInstruction(raw)).toBeUndefined();
    }
  });
  it("bounds parsing while keeping raw input",()=>{
    const raw=" ".repeat(MAX_FIELD_INSTRUCTION_LENGTH+1);
    expect(parseFieldInstruction(raw)).toMatchObject({raw,command:null,error:"length-limit"});
    expect(parseFieldInstruction("IF "+"x ".repeat(4096)).error).toBe("token-limit");
  });
});
