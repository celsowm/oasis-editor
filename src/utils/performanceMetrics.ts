/**
 * Performance metrics infrastructure for oasis-editor.
 *
 * Captures longtasks, marks input-to-layout latency, and exposes
 * a global report via `window.__OASIS_PERF_REPORT()`.
 */

interface PerfMark {
  name: string;
  duration: number;
  timestamp: number;
}

interface LongTaskEntry {
  duration: number;
  startTime: number;
}

const marks: PerfMark[] = [];
const longTasks: LongTaskEntry[] = [];
let observer: PerformanceObserver | null = null;

// --- Public API ---

export function markStart(label: string): void {
  performance.mark(`${label}:start`);
}

export function markEnd(label: string): void {
  const startName = `${label}:start`;
  const endName = `${label}:end`;
  performance.mark(endName);

  try {
    const measure = performance.measure(label, startName, endName);
    const duration = Math.round(measure.duration * 100) / 100;
    marks.push({
      name: label,
      duration,
      timestamp: Math.round(measure.startTime),
    });

    // Auto-log to console in real time
    // eslint-disable-next-line no-console
    console.info(
      `%c[perf] ${label}`,
      "color: #f59e0b;",
      `${duration}ms`,
    );

    // Clean up marks from the browser timeline
    performance.clearMarks(startName);
    performance.clearMarks(endName);
  } catch {
    // Marks may not exist if called out of order
  }
}

export function recordDuration(label: string, durationMs: number): void {
  marks.push({
    name: label,
    duration: Math.round(durationMs * 100) / 100,
    timestamp: Date.now(),
  });

  // Auto-log to console in real time
  // eslint-disable-next-line no-console
  console.debug(
    `%c[perf] ${label}`,
    "color: #f59e0b;",
    `${Math.round(durationMs * 100) / 100}ms`,
  );
}

export function getMarks(): ReadonlyArray<PerfMark> {
  return marks;
}

export function getLongTasks(): ReadonlyArray<LongTaskEntry> {
  return longTasks;
}

export function clearAllMetrics(): void {
  marks.length = 0;
  longTasks.length = 0;
}

// --- Longtask observer ---

export function startLongTaskObserver(): void {
  if (observer || !window.PerformanceObserver) {
    return;
  }

  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({
          duration: Math.round(entry.duration * 100) / 100,
          startTime: Math.round(entry.startTime),
        });
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    // longtask not supported in this browser/context
  }
}

export function stopLongTaskObserver(): void {
  observer?.disconnect();
  observer = null;
}

// --- Percentile helpers ---

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function computePercentiles(durations: number[]): {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  count: number;
} {
  if (durations.length === 0) {
    return { p50: 0, p95: 0, p99: 0, max: 0, count: 0 };
  }
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] ?? 0,
    count: sorted.length,
  };
}

// --- Global report (on-demand) ---

export function installGlobalReport(): void {
  (window as any).__OASIS_PERF_REPORT = () => {
    const layoutDurations = marks
      .filter((m) => m.name.startsWith("layout:"))
      .map((m) => m.duration);

    const inputToLayout = marks
      .filter((m) => m.name === "input-to-layout")
      .map((m) => m.duration);

    const inputText = marks
      .filter((m) => m.name === "input:text")
      .map((m) => m.duration);

    const layoutP = computePercentiles(layoutDurations);
    const inputToLayoutP = computePercentiles(inputToLayout);
    const inputTextP = computePercentiles(inputText);
    const longtaskDurations = longTasks.map((t) => t.duration);
    const longtaskP = computePercentiles(longtaskDurations);

    // eslint-disable-next-line no-console
    console.group(
      "%c[perf] Summary",
      "color: #f59e0b; font-weight: bold;",
    );
    // eslint-disable-next-line no-console
    console.info(
      `input:text  → p50=${inputTextP.p50}ms p95=${inputTextP.p95}ms p99=${inputTextP.p99}ms max=${inputTextP.max}ms (n=${inputTextP.count})`,
    );
    // eslint-disable-next-line no-console
    console.info(
      `input-to-layout → p50=${inputToLayoutP.p50}ms p95=${inputToLayoutP.p95}ms p99=${inputToLayoutP.p99}ms max=${inputToLayoutP.max}ms (n=${inputToLayoutP.count})`,
    );
    // eslint-disable-next-line no-console
    console.info(
      `layout:sync   → p50=${layoutP.p50}ms p95=${layoutP.p95}ms p99=${layoutP.p99}ms max=${layoutP.max}ms (n=${layoutP.count})`,
    );
    // eslint-disable-next-line no-console
    console.info(
      `longtasks   → p50=${longtaskP.p50}ms p95=${longtaskP.p95}ms p99=${longtaskP.p99}ms max=${longtaskP.max}ms (n=${longtaskP.count})`,
    );
    // eslint-disable-next-line no-console
    console.groupEnd();
  };
}

export function uninstallGlobalReport(): void {
  // no-op
}
