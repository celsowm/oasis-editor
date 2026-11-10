import type { OasisEditorClient } from "@/app/client/OasisEditorClient.js";
import { createEditorParagraph } from "@/core/editorState.js";
import {
  getDocumentParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";

/** Synthetic content only. IDs and selections are resolved after import. */
export const ribbonFixtures = {
  text: '<h1>Ribbon reference</h1><p>Normal text with <strong>bold</strong>, <em>emphasis</em>, and a <a href="https://example.com">reference link</a>.</p><h2>Heading two</h2><p>Caption sample and a second paragraph for selection.</p>',
  lists:
    "<p>List reference</p><ol><li>First level</li><li>Second item<ol><li>Nested item</li></ol></li></ol><ul><li>Bullet one</li><li>Bullet two</li></ul>",
  table:
    "<table><tr><th>Item</th><th>Quantity</th></tr><tr><td>Alpha</td><td>2</td></tr><tr><td>Beta</td><td>3</td></tr></table><p>After the table.</p>",
  styles:
    "<h1>Style reference</h1><p>Normal sample.</p><p><em>Emphasis sample.</em></p><p>Caption sample.</p>",
  sections:
    "<p>First section reference.</p><p>Landscape section reference.</p>",
  review: "<p>Review reference text.</p><p>Unchanged comparison paragraph.</p>",
  image:
    '<p>Image reference</p><p><img alt="Synthetic red square" width="48" height="48" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/mXPo5QAAAABJRU5ErkJggg==" /></p>',
} as const;
export type RibbonFixture = keyof typeof ribbonFixtures;

/** Seed through the host boundary; fixtures never depend on a personal document. */
export async function prepareRibbonFixture(
  client: OasisEditorClient,
  fixture: RibbonFixture,
): Promise<void> {
  await client.import.html(ribbonFixtures[fixture]);
  if (fixture === "review") {
    const document = client.document.get();
    const paragraph = getDocumentParagraphs(document)[0]!;
    client.document.load({
      ...document,
      sections: document.sections!.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) =>
          block.id === paragraph.id
            ? {
                ...paragraph,
                runs: paragraph.runs.map((run) => ({
                  ...run,
                  revision: {
                    id: "reference-revision",
                    type: "insert" as const,
                    author: "Reference author",
                    date: 1000,
                  },
                })),
              }
            : block,
        ),
      })),
      comments: {
        order: ["reference-comment", "reference-reply"],
        items: {
          "reference-comment": {
            id: "reference-comment",
            author: "Reference author",
            text: "Synthetic review comment.",
            date: 1000,
            start: { paragraphId: paragraph.id, offset: 0 },
            end: { paragraphId: paragraph.id, offset: 6 },
          },
          "reference-reply": {
            id: "reference-reply",
            parentId: "reference-comment",
            author: "Reference reviewer",
            text: "Synthetic reply.",
            date: 2000,
          },
        },
      },
    });
  }
  if (fixture === "styles") {
    const document = client.document.get();
    const caption = getDocumentParagraphs(document).at(-1)!;
    client.document.load({
      ...document,
      sections: document.sections!.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) =>
          block.id === caption.id
            ? { ...caption, style: { ...caption.style, styleId: "Caption" } }
            : block,
        ),
      })),
    });
  }
  if (fixture === "sections") {
    const document = client.document.get();
    const section = document.sections![0]!;
    client.document.load({
      ...document,
      sections: [
        {
          ...section,
          blocks: [section.blocks[0]!],
          header: [createEditorParagraph("Synthetic first header")],
          footer: [createEditorParagraph("Synthetic first footer")],
        },
        {
          ...section,
          id: "reference-landscape-section",
          blocks: [section.blocks[1]!],
          breakType: "nextPage",
          pageSettings: {
            ...section.pageSettings,
            width: section.pageSettings.height,
            height: section.pageSettings.width,
            orientation: "landscape",
          },
          header: [createEditorParagraph("Synthetic second header")],
          footer: [createEditorParagraph("Synthetic second footer")],
        },
      ],
    });
  }
  const paragraphs = getDocumentParagraphs(client.document.get());
  const paragraph =
    fixture === "image"
      ? paragraphs.find((paragraph) =>
          paragraph.runs.some((run) => run.kind === "image"),
        )!
      : fixture === "styles"
        ? paragraphs.at(-1)!
        : fixture === "lists"
          ? paragraphs.find((paragraph) => paragraph.list)!
          : fixture === "sections"
            ? paragraphs.find((paragraph) =>
                paragraph.runs.some((run) =>
                  run.text.includes("Landscape section"),
                ),
              )!
            : paragraphs[0]!;
  const imageOffset =
    fixture === "image"
      ? paragraph.runs
          .slice(
            0,
            paragraph.runs.findIndex((run) => run.kind === "image"),
          )
          .reduce((sum, run) => sum + run.text.length, 0)
      : 0;
  const anchor = paragraphOffsetToPosition(paragraph, imageOffset);
  client.selection.set({
    anchor,
    focus: paragraphOffsetToPosition(
      paragraph,
      imageOffset + (fixture === "image" ? 1 : fixture === "review" ? 6 : 0),
    ),
  });
  client.history.clear();
  client.document.markClean();
}
