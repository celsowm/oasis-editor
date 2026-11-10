import { describe, expect, it } from "vitest";
import { canonicalReferenceDocument } from "../../../browser/ribbon/fixtureMetadata.js";

const first = "paragraph:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const second = "paragraph:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
function document(id: string, text = "Reference text") {
  return {
    blocks: [{ id, text }],
    comment: { paragraphId: id, offset: 3 },
    order: [id],
  };
}
describe("synthetic reference fingerprints", () => {
  it("ignores regenerated identities while preserving their anchor relationships", () => {
    expect(canonicalReferenceDocument(document(first))).toBe(
      canonicalReferenceDocument(document(second)),
    );
    expect(
      canonicalReferenceDocument({
        ...document(first),
        comment: { paragraphId: second, offset: 3 },
      }),
    ).not.toBe(canonicalReferenceDocument(document(first)));
  });
  it("retains content changes, including text that happens to equal a generated identity", () => {
    expect(canonicalReferenceDocument(document(first, first))).toContain(first);
    expect(canonicalReferenceDocument(document(first, "Other text"))).not.toBe(
      canonicalReferenceDocument(document(first)),
    );
  });
  it("normalizes asset keys and references consistently", () => {
    const make = (id: string) => ({
      assets: { [id]: { data: "same bytes" } },
      image: { src: `asset:${id}` },
    });
    expect(canonicalReferenceDocument(make(first))).toBe(
      canonicalReferenceDocument(make(second)),
    );
    expect(
      canonicalReferenceDocument({
        ...make(first),
        image: { src: `asset:${second}` },
      }),
    ).not.toBe(canonicalReferenceDocument(make(first)));
  });
});
