import json
import sys

import fitz


def normalize_text(value: str) -> str:
    return value.replace("\u00A0", " ")


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: extract-pdf-lines.py <pdf-path>")

    pdf_path = sys.argv[1]
    document = fitz.open(pdf_path)
    pages = []

    for page in document:
      page_lines = []
      text_dict = page.get_text("dict")

      for block in text_dict.get("blocks", []):
          if block.get("type") != 0:
              continue

          for line in block.get("lines", []):
              spans = line.get("spans", [])
              text = normalize_text("".join(span.get("text", "") for span in spans))
              if not text.strip():
                  continue

              bbox = line.get("bbox", [0, 0, 0, 0])
              page_lines.append(
                  {
                      "text": text,
                      "x": bbox[0],
                      "y": bbox[1],
                      "width": bbox[2] - bbox[0],
                      "height": bbox[3] - bbox[1],
                  }
              )

      page_lines.sort(key=lambda item: (round(item["y"], 3), round(item["x"], 3)))
      pages.append(
          {
              "width": page.rect.width,
              "height": page.rect.height,
              "lines": page_lines,
          }
      )

    print(json.dumps({"pages": pages}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
