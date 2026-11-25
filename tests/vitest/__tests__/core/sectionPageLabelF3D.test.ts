import {describe,expect,it} from "vitest";
import {formatSectionPageLabel,isValidTocPageLabel} from "@/core/format/pageNumberFormat.js";
describe("F3D section page labels",()=>{
  it("maps the OOXML section formats without changing field switch semantics",()=>{
    expect(formatSectionPageLabel(4,undefined)).toBe(4);
    expect(formatSectionPageLabel(4,"decimalZero")).toBe("04");
    expect(formatSectionPageLabel(49,"lowerRoman")).toBe("xlix");
    expect(formatSectionPageLabel(49,"upperRoman")).toBe("XLIX");
    expect(formatSectionPageLabel(26,"upperLetter")).toBe("Z");
    expect(formatSectionPageLabel(27,"upperLetter")).toBe("AA");
    expect(formatSectionPageLabel(28,"upperLetter")).toBe("BB");
    expect(formatSectionPageLabel(53,"lowerLetter")).toBe("aaa");
  });
  it("rejects unsupported, oversized and invalid labels",()=>{
    for(const [n,f] of [[0,"decimal"],[1.5,"decimal"],[4000,"upperRoman"],[3329,"lowerLetter"],[1,"none"]] as const)
      expect(formatSectionPageLabel(n,f)).toBeUndefined();
    for(const n of ["", "1\t2","a\n","x".repeat(129),-1,Infinity])
      expect(isValidTocPageLabel(n)).toBe(false);
    expect(isValidTocPageLabel("iv")).toBe(true);
    expect(isValidTocPageLabel("04")).toBe(true);
  });
});
