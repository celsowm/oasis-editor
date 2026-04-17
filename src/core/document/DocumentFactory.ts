// @ts-nocheck








import { createDocumentMetadata } from "./DocumentTypes.js";
import { createDefaultBreakPolicy, createDefaultMargins } from "./SectionTypes.js";

let sectionCounter = 0;
let blockCounter = 0;
let runCounter = 0;

const nextSectionId = () => `section:${sectionCounter++}`;
const nextBlockId = () => `block:${blockCounter++}`;
const nextRunId = () => `run:${runCounter++}`;

export const createTextRun = (text, marks = {}) => ({
  id: nextRunId(),
  text,
  marks,
});

export const createParagraph = (text, align = "left") => ({
  id: nextBlockId(),
  kind: "paragraph",
  align,
  children: [createTextRun(text)],
});

export const createHeading = (text, level = 1, align = "left") => ({
  id: nextBlockId(),
  kind: "heading",
  level,
  align,
  children: [createTextRun(text, { bold: true, fontSize: 24 })],
});

export const createSection = (children = []) => ({
  id: nextSectionId(),
  pageTemplateId: "template:a4:default",
  margins: createDefaultMargins(),
  orientation: "portrait",
  breakPolicy: createDefaultBreakPolicy(),
  children,
});

export const createDocument = () => ({
  id: "doc:root",
  revision: 0,
  metadata: createDocumentMetadata("Lorem Ipsum Document"),
  sections: [
    createSection([
      createHeading("Lorem Ipsum Dolor Sit Amet", 1),
      {
        id: nextBlockId(),
        kind: "paragraph",
        align: "left",
        children: [
          createTextRun("Lorem ipsum dolor sit amet, ", { bold: true }),
          createTextRun("consectetur adipiscing elit. "),
          createTextRun("Integer nec odio. ", { italic: true }),
          createTextRun("Praesent libero. Sed cursus ante dapibus diam.")
        ]
      },
      createParagraph("Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa."),
      {
        id: nextBlockId(),
        kind: "heading",
        level: 2,
        align: "left",
        children: [createTextRun("Vestibulum Lacinia", { bold: true, fontSize: 18 })]
      },
      {
        id: nextBlockId(),
        kind: "paragraph",
        align: "left",
        children: [
          createTextRun("Vestibulum lacinia arcu eget nulla. "),
          createTextRun("Class aptent taciti sociosqu", { underline: true }),
          createTextRun(" ad litora torquent per conubia nostra, per inceptos himenaeos. ")
        ]
      },
      createParagraph("Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet.")
    ]),
  ],
});
