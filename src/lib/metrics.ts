import type { PublishedCell } from "./privacy";

export interface Counts {
  nDetected: number;
  nNotDetected: number;
  nIndeterminate: number;
}

/** Tests with a definitive result. Indeterminate results are excluded. */
export function testedCount(c: Counts): number {
  return c.nDetected + c.nNotDetected;
}

/** Percent positivity (0–100), or null when nothing was tested. */
export function positivity(c: Counts): number | null {
  const tested = testedCount(c);
  return tested === 0 ? null : (100 * c.nDetected) / tested;
}

export function sumCounts(cells: readonly Counts[]): Counts {
  return cells.reduce(
    (acc, c) => ({
      nDetected: acc.nDetected + c.nDetected,
      nNotDetected: acc.nNotDetected + c.nNotDetected,
      nIndeterminate: acc.nIndeterminate + c.nIndeterminate,
    }),
    { nDetected: 0, nNotDetected: 0, nIndeterminate: 0 },
  );
}

/**
 * Trailing rolling window over a weekly series (oldest first). Counts are
 * pooled across the window rather than averaging percentages, so weeks with
 * few tests don't swing the result.
 */
export function rollingCounts(series: readonly Counts[], window = 3): Counts[] {
  return series.map((_, i) => sumCounts(series.slice(Math.max(0, i - window + 1), i + 1)));
}

export type Trend = "rising" | "falling" | "steady";

/** Direction of change between two positivity values (%), ignoring changes under `minChange` points. */
export function trendDirection(current: number, previous: number, minChange = 2): Trend {
  const diff = current - previous;
  if (diff >= minChange) return "rising";
  if (diff <= -minChange) return "falling";
  return "steady";
}

export type ActivityLevel = "low" | "moderate" | "high" | "insufficient";

export interface ActivityThresholds {
  /** Minimum tests before a level is shown. */
  minTests: number;
  /** Positivity (%) at or above which activity is moderate. */
  moderate: number;
  /** Positivity (%) at or above which activity is high. */
  high: number;
}

// Placeholder bands — to be set with SickKids / public health partners.
export const DEFAULT_ACTIVITY_THRESHOLDS: ActivityThresholds = { minTests: 10, moderate: 5, high: 15 };

export function activityLevel(c: Counts, t: ActivityThresholds = DEFAULT_ACTIVITY_THRESHOLDS): ActivityLevel {
  const p = positivity(c);
  if (p === null || testedCount(c) < t.minTests) return "insufficient";
  if (p >= t.high) return "high";
  if (p >= t.moderate) return "moderate";
  return "low";
}

/** Activity level of an already-suppressed cell. */
export function publishedLevel(cell: PublishedCell<unknown> | undefined, t = DEFAULT_ACTIVITY_THRESHOLDS): ActivityLevel {
  if (!cell || cell.suppressed) return "insufficient";
  return activityLevel({ nDetected: cell.nDetected, nNotDetected: cell.tested - cell.nDetected, nIndeterminate: 0 }, t);
}

/**
 * Trend of the latest published value against the one `lag` weeks earlier.
 * With 3-week rolling cells, a lag of 3 compares non-overlapping windows.
 */
export function publishedTrend(cells: readonly PublishedCell<unknown>[], lag = 3): Trend | null {
  const now = cells.at(-1);
  const before = cells.at(-1 - lag);
  if (!now || !before || now.suppressed || before.suppressed) return null;
  return trendDirection(now.positivity, before.positivity);
}
