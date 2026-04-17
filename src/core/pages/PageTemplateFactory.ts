// @ts-nocheck








export const A4_DEFAULT_TEMPLATE = {
  id: "template:a4:default",
  name: "A4 Default",
  size: { width: 794, height: 1123 },
  margins: { top: 96, right: 96, bottom: 96, left: 96 },
  header: { enabled: true, height: 48 },
  footer: { enabled: true, height: 48 },
  firstPageDifferent: false,
};

export const LETTER_TEMPLATE = {
  id: "template:letter:default",
  name: "Letter Default",
  size: { width: 816, height: 1056 },
  margins: { top: 96, right: 96, bottom: 96, left: 96 },
  header: { enabled: true, height: 48 },
  footer: { enabled: true, height: 48 },
  firstPageDifferent: false,
};

export const PAGE_TEMPLATES = {
  [A4_DEFAULT_TEMPLATE.id]: A4_DEFAULT_TEMPLATE,
  [LETTER_TEMPLATE.id]: LETTER_TEMPLATE,
};
