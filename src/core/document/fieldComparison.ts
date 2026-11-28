/** Shared, bounded comparison for IF/COMPARE/NEXTIF/SKIPIF. No field
 * evaluation, external lookup or regex injection; wildcards are escaped. */
export type ComparisonOperator = "=" | "<>" | ">" | "<" | ">=" | "<=";
const operators: ReadonlySet<string> = new Set([
  "=",
  "<>",
  ">",
  "<",
  ">=",
  "<=",
]);
const maxExpressionLength = 128;
const numberPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export function isComparisonOperator(
  value: string,
): value is ComparisonOperator {
  return operators.has(value);
}

/** `undefined` means the operands are not comparable and the caller must
 * preserve its cached result rather than inventing a boolean. */
export function compareOperands(
  left: string,
  right: string,
  operator: string,
): boolean | undefined {
  if (
    !isComparisonOperator(operator) ||
    left.length > 4096 ||
    right.length > 4096 ||
    [...(left + right)].some((ch) => ch.charCodeAt(0) < 32)
  )
    return undefined;
  if (numberPattern.test(left) && numberPattern.test(right)) {
    const a = Number(left),
      b = Number(right);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
    switch (operator) {
      case "=":
        return a === b;
      case "<>":
        return a !== b;
      case ">":
        return a > b;
      case "<":
        return a < b;
      case ">=":
        return a >= b;
      case "<=":
        return a <= b;
    }
  }
  if (operator !== "=" && operator !== "<>") return undefined;
  const hasWildcard =
    left.includes("*") ||
    left.includes("?") ||
    right.includes("*") ||
    right.includes("?");
  if (!hasWildcard) return operator === "=" ? left === right : left !== right;
  // Word bounds the matched portion plus the unmatched remainder to 128 chars.
  if (left.length + right.length > maxExpressionLength) return undefined;
  const pattern = (value: string): string =>
    value
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\?/g, ".")
      .replace(/\*/g, ".*");
  const wildcard = pattern(
    right.includes("*") || right.includes("?") ? right : left,
  );
  const subject = right.includes("*") || right.includes("?") ? left : right;
  let matches: boolean;
  try {
    matches = new RegExp(`^${wildcard}$`, "u").test(subject);
  } catch {
    return undefined;
  }
  return operator === "=" ? matches : !matches;
}
