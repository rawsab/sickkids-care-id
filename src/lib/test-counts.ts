// Weekly numbers of tests, for the bar charts on the dashboard and kids page.
//
// A "test" here is one specimen's definitive result (detected or not
// detected) for one virus: the same count positivity divides by and
// suppression keys on. Indeterminate results are left out. Each specimen is
// usually tested for every virus, so counts for different viruses overlap and
// are never added together; and one child can give more than one specimen,
// so tests are not people. Every count has been through `publishCells`.

import type { ActivityRow } from "./activity";
import { parseIsoDate, toIsoDate } from "./epiweek";
import { sumCounts, type Counts } from "./metrics";
import { publishCells, type Audience, type PublishedCell } from "./privacy";
import type { VirusKey } from "./viruses";

/** Why a week has no count. "no_data": nothing reported; the others: suppressed. */
export type TestGap = "no_data" | "small_cell" | "complementary";
export type TestCount = number | TestGap;

/** Published cells → test counts; suppressed cells become the reason, never a number. */
export function testCounts(cells: readonly PublishedCell<string>[]): TestCount[] {
  return cells.map((c) => (c.suppressed ? c.reason : c.tested));
}

export interface FsaTestCounts {
  weeks: string[];
  byFsa: Record<string, Partial<Record<VirusKey, TestCount[]>>>;
}

const ZERO: Counts = { nDetected: 0, nNotDetected: 0, nIndeterminate: 0 };

/**
 * Weekly (not rolling) test counts per FSA and virus, each week suppressed on
 * its own, exactly as the dashboard's weekly series is for one FSA.
 */
export function buildFsaTestCounts(
  rows: readonly ActivityRow[],
  weeks: readonly string[],
  viruses: readonly VirusKey[],
  audience: Audience = "public",
): FsaTestCounts {
  const weekIndex = new Map(weeks.map((w, i) => [w, i]));
  const counts = new Map<string, Map<VirusKey, Counts[]>>();
  for (const r of rows) {
    const i = weekIndex.get(r.weekStart);
    if (i === undefined || !viruses.includes(r.virus)) continue;
    let fsa = counts.get(r.fsa);
    if (!fsa) counts.set(r.fsa, (fsa = new Map(viruses.map((v) => [v, weeks.map(() => ({ ...ZERO }))]))));
    const series = fsa.get(r.virus)!;
    series[i] = sumCounts([series[i], r]);
  }

  const byFsa: FsaTestCounts["byFsa"] = {};
  for (const [fsa, m] of counts) {
    byFsa[fsa] = Object.fromEntries(
      viruses.map((v) => [v, testCounts(publishCells(weeks.map((key, i) => ({ key, counts: m.get(v)![i] })), audience))]),
    );
  }
  return { weeks: [...weeks], byFsa };
}

/** The Saturday that ends the epi week starting on `week`. */
export function weekEndDate(week: string): string {
  return toIsoDate(new Date(parseIsoDate(week)!.getTime() + 6 * 86_400_000));
}

/**
 * The latest week may still be filling in: if the newest specimen in the data
 * was collected before that week's Saturday, returns that collection date.
 */
export function partialThrough(latestWeek: string, lastCollected: string | null): string | null {
  return lastCollected && lastCollected >= latestWeek && lastCollected < weekEndDate(latestWeek) ? lastCollected : null;
}
