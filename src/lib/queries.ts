import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ACTIVITY_WINDOW, buildActivity, type ActivityRow, type ActivitySummary } from "./activity";
import { db } from "./db";
import { parseIsoDate, toIsoDate } from "./epiweek";
import type { Sex } from "./ingest/validate";
import { rollingCounts, type Counts } from "./metrics";
import { publishCells, type Audience, type PublishedCell } from "./privacy";
import { buildFsaTestCounts, type FsaTestCounts } from "./test-counts";
import type { VirusKey } from "./viruses";

// Every query reads only aggregates from active (not rolled-back) uploads,
// and every figure returned has already been through suppression.

const ACTIVE: Prisma.WeeklyAggregateWhereInput = { upload: { status: "ACTIVE" } };
const WEEK_MS = 7 * 86_400_000;
const ROLLING_WINDOW = 3;

export interface SeriesFilter {
  viruses: VirusKey[];
  region?: string;
  fsa?: string;
  /** Stored age-band labels to include; undefined for all ages. */
  ageBands?: string[];
  sex?: Sex;
  /** Number of weeks ending at the latest week; null for all available weeks. */
  weeks: number | null;
  rolling?: boolean;
}

export interface WeeklySeries {
  weeks: string[];
  series: Record<VirusKey, PublishedCell<string>[]>;
}

export async function getDataRange(): Promise<{ first: string; latest: string } | null> {
  const r = await db.weeklyAggregate.aggregate({ where: ACTIVE, _min: { weekStart: true }, _max: { weekStart: true } });
  if (!r._min.weekStart || !r._max.weekStart) return null;
  return { first: toIsoDate(r._min.weekStart), latest: toIsoDate(r._max.weekStart) };
}

export async function getLastUploadAt(): Promise<Date | null> {
  const u = await db.upload.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  return u?.createdAt ?? null;
}

/** Weeks (Sunday ISO dates) from `first` to `latest` inclusive. */
export function weeksBetween(first: string, latest: string): string[] {
  const out: string[] = [];
  for (let t = parseIsoDate(first)!.getTime(); t <= parseIsoDate(latest)!.getTime(); t += WEEK_MS) {
    out.push(toIsoDate(new Date(t)));
  }
  return out;
}

function addWeeks(week: string, n: number): string {
  return toIsoDate(new Date(parseIsoDate(week)!.getTime() + n * WEEK_MS));
}

export async function getWeeklySeries(
  filter: SeriesFilter,
  audience: Audience,
  range: { first: string; latest: string },
): Promise<WeeklySeries> {
  const from =
    filter.weeks === null ? range.first : [range.first, addWeeks(range.latest, -(filter.weeks - 1))].sort().at(-1)!;
  // Fetch extra leading weeks so the first rolling value has a full window.
  const fetchFrom = filter.rolling ? addWeeks(from, -(ROLLING_WINDOW - 1)) : from;

  const rows = await db.weeklyAggregate.groupBy({
    by: ["weekStart", "virus"],
    where: {
      ...ACTIVE,
      virus: { in: filter.viruses },
      weekStart: { gte: parseIsoDate(fetchFrom)!, lte: parseIsoDate(range.latest)! },
      ...(filter.region && { region: filter.region }),
      ...(filter.fsa && { fsa: filter.fsa }),
      ...(filter.ageBands && { ageBand: { in: filter.ageBands } }),
      ...(filter.sex && { sex: filter.sex }),
    },
    _sum: { nDetected: true, nNotDetected: true, nIndeterminate: true },
  });

  const byKey = new Map(rows.map((r) => [`${toIsoDate(r.weekStart)}|${r.virus}`, r._sum]));
  const allWeeks = weeksBetween(fetchFrom, range.latest);
  const weeks = weeksBetween(from, range.latest);
  const offset = allWeeks.length - weeks.length;

  const series = {} as Record<VirusKey, PublishedCell<string>[]>;
  for (const virus of filter.viruses) {
    let counts: Counts[] = allWeeks.map((w) => {
      const s = byKey.get(`${w}|${virus}`);
      return { nDetected: s?.nDetected ?? 0, nNotDetected: s?.nNotDetected ?? 0, nIndeterminate: s?.nIndeterminate ?? 0 };
    });
    if (filter.rolling) counts = rollingCounts(counts, ROLLING_WINDOW);
    series[virus] = publishCells(
      weeks.map((week, i) => ({ key: week, counts: counts[i + offset] })),
      audience,
    );
  }
  return { weeks, series };
}

/** Counts per FSA, virus and week (all ages and sexes) from `weeks[0]` to `weeks.at(-1)`. */
async function getFsaWeekRows(weeks: string[], viruses: VirusKey[]): Promise<ActivityRow[]> {
  const rows = await db.weeklyAggregate.groupBy({
    by: ["fsa", "virus", "weekStart"],
    where: { ...ACTIVE, virus: { in: viruses }, weekStart: { gte: parseIsoDate(weeks[0])!, lte: parseIsoDate(weeks.at(-1)!)! } },
    _sum: { nDetected: true, nNotDetected: true, nIndeterminate: true },
  });
  return rows.map((r) => ({
    fsa: r.fsa,
    virus: r.virus,
    weekStart: toIsoDate(r.weekStart),
    nDetected: r._sum.nDetected ?? 0,
    nNotDetected: r._sum.nNotDetected ?? 0,
    nIndeterminate: r._sum.nIndeterminate ?? 0,
  }));
}

/** Public activity for every FSA (and all areas pooled) over the last `shownWeeks` weeks. */
export async function getFsaActivity(
  range: { first: string; latest: string },
  viruses: VirusKey[],
  shownWeeks = 8,
): Promise<ActivitySummary> {
  const weeks = weeksBetween(addWeeks(range.latest, -(shownWeeks + ACTIVITY_WINDOW - 2)), range.latest);
  return buildActivity(await getFsaWeekRows(weeks, viruses), weeks, viruses);
}

/** Weekly test counts for every FSA over the last `shownWeeks` weeks, with public suppression. */
export async function getFsaWeeklyTests(
  range: { first: string; latest: string },
  viruses: VirusKey[],
  shownWeeks = 4,
): Promise<FsaTestCounts> {
  const weeks = weeksBetween(addWeeks(range.latest, -(shownWeeks - 1)), range.latest);
  return buildFsaTestCounts(await getFsaWeekRows(weeks, viruses), weeks, viruses, "public");
}

/** Collection date of the newest specimen in any active upload. */
export async function getLastCollectedDate(): Promise<string | null> {
  const r = await db.upload.aggregate({ where: { status: "ACTIVE" }, _max: { maxDate: true } });
  return r._max.maxDate ? toIsoDate(r._max.maxDate) : null;
}

/** Dashboard map: positivity per FSA for one virus in the latest week (or 3-week window), PH suppression. */
export async function getFsaPositivity(
  filter: Pick<SeriesFilter, "ageBands" | "sex" | "rolling">,
  virus: VirusKey,
  range: { first: string; latest: string },
): Promise<Record<string, PublishedCell<string>>> {
  const from = filter.rolling ? addWeeks(range.latest, -(ROLLING_WINDOW - 1)) : range.latest;
  const rows = await db.weeklyAggregate.groupBy({
    by: ["fsa"],
    where: {
      ...ACTIVE,
      virus,
      weekStart: { gte: parseIsoDate(from)!, lte: parseIsoDate(range.latest)! },
      ...(filter.ageBands && { ageBand: { in: filter.ageBands } }),
      ...(filter.sex && { sex: filter.sex }),
    },
    _sum: { nDetected: true, nNotDetected: true, nIndeterminate: true },
  });
  const cells = publishCells(
    rows.map((r) => ({
      key: r.fsa,
      counts: { nDetected: r._sum.nDetected ?? 0, nNotDetected: r._sum.nNotDetected ?? 0, nIndeterminate: r._sum.nIndeterminate ?? 0 },
    })),
    "ph",
  );
  return Object.fromEntries(cells.map((c) => [c.key, c]));
}

export async function getAreas(): Promise<{ regions: string[]; fsas: { fsa: string; region: string }[] }> {
  const rows = await db.weeklyAggregate.groupBy({ by: ["fsa", "region"], where: ACTIVE, orderBy: { fsa: "asc" } });
  return {
    regions: [...new Set(rows.map((r) => r.region))].sort(),
    fsas: rows.map((r) => ({ fsa: r.fsa, region: r.region })),
  };
}

export async function getAgeBands(): Promise<string[]> {
  const rows = await db.weeklyAggregate.groupBy({ by: ["ageBand"], where: ACTIVE });
  return rows.map((r) => r.ageBand).sort((a, b) => parseInt(a) - parseInt(b));
}
