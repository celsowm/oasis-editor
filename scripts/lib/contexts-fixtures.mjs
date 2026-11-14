/**
 * Synthetic fixture definitions for the contextual ribbon matrix.
 * One tab list per fixture; one scenario label per fixture used in evidence.
 */
export const cases = {
  text: ["home"],
  lists: ["home"],
  styles: ["home"],
  table: ["tableDesign", "tableLayout", "home", "insert"],
  image: ["imageFormat", "insert", "home"],
  sections: ["layout", "insert"],
  review: ["review"],
};
export const fixtureScenarios = {
  text: "text/caret",
  lists: "list/selected-item",
  styles: "style/caption-paragraph",
  table: "table/selected-cell",
  image: "image/selected-object",
  sections: "section/landscape-paragraph",
  review: "review/changed-text-range",
};
