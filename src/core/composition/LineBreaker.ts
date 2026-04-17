// @ts-nocheck








export const breakTextIntoLines = (
  runs,
  maxWidth,
  measure,
  defaultFontFamily,
  defaultFontSize,
  isHeading,
) => {
  const lines = [];

  let currentLineText = "";
  let currentLineWidth = 0;

  for (const run of runs) {
    const weight = run.marks?.bold || isHeading ? 700 : 400;
    const style = run.marks?.italic ? "italic" : "normal";
    const family = run.marks?.fontFamily || defaultFontFamily;
    const size = run.marks?.fontSize || defaultFontSize;

    const words = run.text.split(/(\s+)/); // Keep spaces as distinct segments
    
    for (const segment of words) {
      if (!segment) continue;

      const metrics = measure.measureText({
         text: segment,
         fontFamily: family,
         fontSize: size,
         fontWeight: weight,
         fontStyle: style
      });

      if (currentLineWidth + metrics.width <= maxWidth || !currentLineText) {
         currentLineText += segment;
         currentLineWidth += metrics.width;
      } else {
         lines.push({ text: currentLineText, width: currentLineWidth });
         // If it's a space that caused the overflow, we usually don't push it to the next line.
         // Standard word wrap drops leading spaces of a new line. But we simplify here.
         currentLineText = segment.trimLeft() ? segment : "";
         currentLineWidth = segment.trimLeft() ? metrics.width : 0;
      }
    }
  }

  if (currentLineText) {
    lines.push({ text: currentLineText, width: currentLineWidth });
  }

  return lines;
};
