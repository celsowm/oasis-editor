// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  isAllowedImageSrc,
  parseInlineImage,
} from "@/core/html/inlineImageParser.js";

function imgWithSrc(src: string): HTMLImageElement {
  const img = document.createElement("img");
  img.setAttribute("src", src);
  return img;
}

describe("isAllowedImageSrc", () => {
  it("accepts inline data: image URLs", () => {
    expect(isAllowedImageSrc("data:image/png;base64,AAAA")).toBe(true);
    expect(isAllowedImageSrc("DATA:IMAGE/PNG;base64,AAAA")).toBe(true);
  });

  it("accepts blob: URLs", () => {
    expect(isAllowedImageSrc("blob:https://app.example/abc")).toBe(true);
  });

  it("rejects remote and dangerous schemes", () => {
    expect(isAllowedImageSrc("https://evil.example/pixel.gif")).toBe(false);
    expect(isAllowedImageSrc("http://evil.example/pixel.gif")).toBe(false);
    expect(isAllowedImageSrc("javascript:alert(1)")).toBe(false);
    expect(isAllowedImageSrc("data:text/html,<script>")).toBe(false);
    expect(isAllowedImageSrc("")).toBe(false);
  });
});

describe("parseInlineImage", () => {
  it("returns image data for an allowed src", () => {
    const image = parseInlineImage(imgWithSrc("data:image/png;base64,AAAA"));
    expect(image?.src).toBe("data:image/png;base64,AAAA");
  });

  it("drops images with a disallowed src", () => {
    expect(parseInlineImage(imgWithSrc("https://evil.example/x.png"))).toBe(
      undefined,
    );
    expect(parseInlineImage(imgWithSrc("javascript:alert(1)"))).toBe(undefined);
  });
});
