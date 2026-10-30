// Per-FSA activity for the public map. Pure, so the privacy guarantees are
// unit-tested: everything returned has been through public suppression, and
// only levels, trends and positivity of published cells are included — never
// counts.

import { publishedLevel, publishedTrend, rollingCounts, sumCounts, type ActivityLevel, type Counts, type Trend } from "./metrics";
import { publishCells } from "./privacy";
import type { VirusKey } from "./viruses";

export const ACTIVITY_WINDOW = 3;

export interface ActivityRow extends Counts {
  fsa: string;
  virus: VirusKey;
  weekStart: string;
}

export interface VirusActivity {
  level: ActivityLevel;
  trend: Trend | null;
  /** Rolling positivity (%) per shown week; null where suppressed. */
  spark: (number | null)[];
}

export type AreaActivity = Partial<Record<VirusKey, VirusActivity>>;

export interface ActivitySummary {
  /** Weeks shown in sparklines (excludes the leading rolling-window weeks). */
  weeks: string[];
  overall: AreaActivity;
  byFsa: Record<string, AreaActivity>;
}

const ZERO: Counts = { nDetected: 0, nNotDetected: 0, nIndeterminate: 0 };

function summarise(countsByWeek: Counts[]): VirusActivity {
  const rolled = rollingCounts(countsByWeek, ACTIVITY_WINDOW).slice(ACTIVITY_WINDOW - 1);
  const cells = publishCells(rolled.map((counts, i) => ({ key: i, counts })), "public");
  return {
    level: publishedLevel(cells.at(-1)),
    trend: publishedTrend(cells, ACTIVITY_WINDOW),
    spark: cells.map((c) => (c.suppressed ? null : Math.round(c.positivity * 10) / 10)),
  };
}

/**
 * @param weeks every week fetched, oldest first, including the
 *   `ACTIVITY_WINDOW - 1` leading weeks needed for the first rolling value.
 */
export function buildActivity(rows: readonly ActivityRow[], weeks: readonly string[], viruses: readonly VirusKey[]): ActivitySummary {
  const weekIndex = new Map(weeks.map((w, i) => [w, i]));
  const blank = () => weeks.map(() => ({ ...ZERO }));
  const byFsaCounts = new Map<string, Map<VirusKey, Counts[]>>();
  const overallCounts = new Map<VirusKey, Counts[]>(viruses.map((v) => [v, blank()]));

  for (const r of rows) {
    const i = weekIndex.get(r.weekStart);
    if (i === undefined || !overallCounts.has(r.virus)) continue;
    let fsa = byFsaCounts.get(r.fsa);
    if (!fsa) byFsaCounts.set(r.fsa, (fsa = new Map(viruses.map((v) => [v, blank()]))));
    for (const target of [fsa.get(r.virus)!, overallCounts.get(r.virus)!]) {
      target[i] = sumCounts([target[i], r]);
    }
  }

  const toArea = (m: Map<VirusKey, Counts[]>): AreaActivity =>
    Object.fromEntries(viruses.map((v) => [v, summarise(m.get(v)!)]));

  return {
    weeks: weeks.slice(ACTIVITY_WINDOW - 1),
    overall: toArea(overallCounts),
    byFsa: Object.fromEntries([...byFsaCounts].map(([fsa, m]) => [fsa, toArea(m)])),
  };
}
