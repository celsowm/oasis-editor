import type { MeasuredToken } from "./types.js";

const KNUTH_PLASS_BREAK_PENALTY = 100;

/**
 * Knuth-Plass optimal line breaking for a single segment (no newlines).
 * Returns indices of whitespace tokens where a line break should occur.
 * Uses DP minimizing sum of slack² across lines, so line lengths are even.
 */
export function computeKnuthPlassBreaks(
  tokens: MeasuredToken[],
  availableWidth: number,
): Set<number> {
  const n = tokens.length;
  if (n === 0 || availableWidth <= 0) return new Set();

  // Precompute prefix widths for O(1) range sums
  const prefixWidth = new Array<number>(n + 1).fill(0);
  for (let k = 0; k < n; k++) {
    prefixWidth[k + 1] = prefixWidth[k]! + tokens[k]!.width;
  }

  // Break candidates: index -1 (before first token) plus each whitespace token, plus n (end)
  // candidateAt[j] is the token index of break candidate j (-1 or n for sentinels)
  const candidateAt: number[] = [-1];
  for (let i = 0; i < n; i++) {
    if (tokens[i]!.kind === "whitespace") candidateAt.push(i);
  }
  candidateAt.push(n);
  const m = candidateAt.length;

  // dp[j] = min total badness for optimally breaking tokens 0..candidateAt[j]-1
  const dp = new Array<number>(m).fill(Infinity);
  const prevIdx = new Array<number>(m).fill(-1);
  dp[0] = 0;

  for (let j = 1; j < m; j++) {
    const lineEnd = candidateAt[j]!; // exclusive end of this line's tokens
    const isLastSegment = j === m - 1;

    for (let i = j - 1; i >= 0; i--) {
      if (dp[i] === Infinity) continue;
      const lineStart = candidateAt[i]! + 1; // first token of this line

      // Width = sum of tokens[lineStart..lineEnd-1]
      const lineWidth = prefixWidth[lineEnd]! - prefixWidth[lineStart]!;

      if (lineWidth > availableWidth) break; // adding more tokens only widens

      const slack = availableWidth - lineWidth;
      // Last segment (remainder of paragraph) is not justified — don't penalise
      const cost = isLastSegment
        ? dp[i]!
        : dp[i]! + KNUTH_PLASS_BREAK_PENALTY + slack * slack;

      if (cost < dp[j]!) {
        dp[j] = cost;
        prevIdx[j] = i;
      }
    }
  }

  if (!isFinite(dp[m - 1]!)) return new Set(); // no solution — fall back to greedy

  // Reconstruct break token indices (exclude start and end sentinels)
  const breaks = new Set<number>();
  let cur = m - 1;
  while (cur > 0) {
    const p = prevIdx[cur]!;
    if (p > 0) breaks.add(candidateAt[p]!); // whitespace token to break at
    cur = p;
  }
  return breaks;
}
