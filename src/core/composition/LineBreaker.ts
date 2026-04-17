// @ts-nocheck








export const breakTextIntoLines = (
  text,
  maxWidth,
  measure,
  fontFamily,
  fontSize,
) => {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const measured = measure.measureText({ text: next, fontFamily, fontSize });

    if (measured.width <= maxWidth || !current) {
      current = next;
    } else {
      const currentMeasured = measure.measureText({
        text: current,
        fontFamily,
        fontSize,
      });
      lines.push({ text: current, width: currentMeasured.width });
      current = word;
    }
  }

  if (current) {
    const lastMeasured = measure.measureText({
      text: current,
      fontFamily,
      fontSize,
    });
    lines.push({ text: current, width: lastMeasured.width });
  }

  return lines;
};
