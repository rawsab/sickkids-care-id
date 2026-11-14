import type { Metadata } from "next";
import { KidsView, type KidsActivity } from "@/components/kids/kids-view";
import { EmptyState } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { ACTIVITY_WINDOW } from "@/lib/activity";
import { parseIsoDate, toIsoDate } from "@/lib/epiweek";
import { getAreas, getDataRange, getFsaActivity, getFsaWeeklyTests, getLastCollectedDate } from "@/lib/queries";
import { partialThrough, weekEndDate } from "@/lib/test-counts";
import { COMMUNITY_VIRUSES } from "@/lib/viruses";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.kids.metaTitle };
}

const DAY_MS = 86_400_000;
// Results are added weekly; older than this, the page says the newest results are a few weeks old.
const STALE_AFTER_DAYS = 14;

/** Rendered per request, so "now" is the time of the visit. */
function isStale(periodEnd: string): boolean {
  return Date.now() - parseIsoDate(periodEnd)!.getTime() > STALE_AFTER_DAYS * DAY_MS;
}

export default async function KidsPage() {
  const { dict } = await getI18n();
  const range = await getDataRange();

  if (!range) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-lg">
        <EmptyState title={dict.kids.emptyTitle}>{dict.kids.emptyBody}</EmptyState>
      </div>
    );
  }

  // Activity is the same public calculation as the community map. Only levels
  // and trends are sent on; this page doesn't show positivity.
  const [activity, tests, areas, lastCollected] = await Promise.all([
    getFsaActivity(range, [...COMMUNITY_VIRUSES], 4),
    getFsaWeeklyTests(range, [...COMMUNITY_VIRUSES], 4),
    getAreas(),
    getLastCollectedDate(),
  ]);
  const levels: KidsActivity = Object.fromEntries(
    Object.entries(activity.byFsa).map(([fsa, area]) => [
      fsa,
      Object.fromEntries(Object.entries(area).map(([v, a]) => [v, { level: a.level, trend: a.trend }])),
    ]),
  );

  const periodEnd = weekEndDate(range.latest);
  const periodStart = toIsoDate(new Date(parseIsoDate(range.latest)!.getTime() - (ACTIVITY_WINDOW - 1) * 7 * DAY_MS));

  return (
    <KidsView
      activity={levels}
      tests={tests}
      regions={Object.fromEntries(areas.fsas.map((f) => [f.fsa, f.region]))}
      period={{ from: periodStart, to: periodEnd }}
      partialThrough={partialThrough(range.latest, lastCollected)}
      stale={isStale(periodEnd)}
    />
  );
}
