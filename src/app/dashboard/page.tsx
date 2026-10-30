import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TrendChart } from "@/components/trend-chart";
import { ButtonLink, Card, EmptyState } from "@/components/ui/primitives";
import { Sparkline } from "@/components/ui/sparkline";
import { pct, shortWeek, weekLabel } from "@/lib/format";
import { PRIVACY_RULES, type PublishedCell } from "@/lib/privacy";
import { getAgeBands, getAreas, getDataRange, getFsaPositivity, getLastUploadAt, getWeeklySeries } from "@/lib/queries";
import { VIRUS_BY_KEY, type VirusKey } from "@/lib/viruses";
import { DashboardMap } from "./dashboard-map";
import { FilterBar } from "./filter-bar";
import { areaLabel, filtersToQuery, parseFilters, type DashboardFilters } from "./filters";

export const metadata: Metadata = { title: "Public health dashboard" };

const TABS = [
  { id: "trends", label: "Trends" },
  { id: "map", label: "Map" },
  { id: "table", label: "Data table" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const tab: TabId = TABS.some((t) => t.id === first(sp.tab)) ? (first(sp.tab) as TabId) : "trends";
  const mapVirusParam = first(sp.mapVirus) as VirusKey | undefined;
  const mapVirus = mapVirusParam && filters.viruses.includes(mapVirusParam) ? mapVirusParam : filters.viruses[0];

  const range = await getDataRange();
  if (!range) {
    return (
      <>
        <PageHeader eyebrow="Public health" title="Respiratory virus dashboard" />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <EmptyState title="No results uploaded yet" action={<ButtonLink href="/admin/upload">Upload results</ButtonLink>}>
            Weekly positivity trends will appear here once school testing results are uploaded.
          </EmptyState>
        </div>
      </>
    );
  }

  const [{ weeks, series }, areas, ageBands, lastUpload, mapCells] = await Promise.all([
    getWeeklySeries(filters, "ph", range),
    getAreas(),
    getAgeBands(),
    getLastUploadAt(),
    tab === "map" ? getFsaPositivity(filters, mapVirus, range) : Promise.resolve(null),
  ]);
  const regions = Object.fromEntries(areas.fsas.map((f) => [f.fsa, f.region]));
  const tabHref = (id: TabId) => {
    const q = new URLSearchParams(filtersToQuery(filters));
    if (id !== "trends") q.set("tab", id);
    return `/dashboard?${q}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Public health"
        title="Respiratory virus dashboard"
        lead={
          <>
            Weekly percent positivity from school testing · <span className="font-medium text-text">{areaLabel(filters)}</span>
          </>
        }
      >
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
          <div className="flex gap-1.5">
            <dt>Latest week:</dt>
            <dd className="font-medium text-text">{weekLabel(range.latest)}</dd>
          </div>
          {lastUpload && (
            <div className="flex gap-1.5">
              <dt>Data as of:</dt>
              <dd className="font-medium text-text">{lastUpload.toLocaleDateString("en-CA", { dateStyle: "medium" })}</dd>
            </div>
          )}
        </dl>
      </PageHeader>

      <FilterBar filters={filters} tab={tab} areas={areas} ageBands={ageBands} />

      <div className="mx-auto max-w-[90rem] space-y-6 px-4 py-6 sm:px-6">
        <section aria-labelledby="kpi-heading">
          <h2 id="kpi-heading" className="sr-only">
            Latest week by virus
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
            {filters.viruses.map((v) => (
              <KpiCard key={v} virus={v} cells={series[v]} rolling={!!filters.rolling} />
            ))}
          </div>
        </section>

        <Card className="overflow-hidden">
          <nav aria-label="Dashboard views" className="flex gap-1 border-b border-border px-3 pt-2">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={tabHref(t.id)}
                scroll={false}
                aria-current={t.id === tab ? "page" : undefined}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  t.id === tab ? "border-brand-blue text-brand-navy" : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 sm:p-6">
            {tab === "trends" && (
              <>
                <h2 className="sr-only">Percent positivity over time</h2>
                <TrendChart
                  weeks={weeks}
                  lines={filters.viruses.map((v) => ({
                    key: v,
                    label: VIRUS_BY_KEY[v].label,
                    color: VIRUS_BY_KEY[v].color,
                    values: series[v].map((c) => (c.suppressed ? null : c.positivity)),
                  }))}
                />
                <p className="mt-3 text-xs text-text-subtle">
                  {filters.rolling ? "3-week rolling percent positivity. " : ""}Gaps mark weeks with fewer than{" "}
                  {PRIVACY_RULES.ph.minTests} tests, which are suppressed. The data table has the same figures.
                </p>
              </>
            )}

            {tab === "map" && mapCells && (
              <DashboardMap
                cells={mapCells}
                filters={filters}
                mapVirus={mapVirus}
                regions={regions}
                periodLabel={filters.rolling ? `3 weeks ending ${shortWeek(range.latest)}` : `week of ${shortWeek(range.latest)}`}
              />
            )}

            {tab === "table" && <DataTable filters={filters} weeks={weeks} series={series} />}
          </div>
        </Card>
      </div>
    </>
  );
}

function KpiCard({ virus, cells, rolling }: { virus: VirusKey; cells: PublishedCell<string>[]; rolling: boolean }) {
  const def = VIRUS_BY_KEY[virus];
  const latest = cells.at(-1);
  const previous = cells.at(-2);
  const change =
    latest && previous && !latest.suppressed && !previous.suppressed ? latest.positivity - previous.positivity : null;

  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-text-muted">
        <span aria-hidden className="size-2.5 rounded-full" style={{ background: def.color }} />
        {def.label}
      </p>
      {latest && !latest.suppressed ? (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-bold tracking-tight text-text">{pct(latest.positivity)}</p>
            <p className="tabular mt-0.5 text-xs text-text-muted">
              {latest.nDetected.toLocaleString()} of {latest.tested.toLocaleString()} tests{rolling && " · 3 wk"}
            </p>
          </div>
          <Sparkline
            values={cells.map((c) => (c.suppressed ? null : c.positivity))}
            color={def.color}
            width={88}
            height={36}
            label={`${def.label} positivity trend`}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          {latest?.suppressed && latest.reason === "no_data" ? "No tests this week" : "Too few tests to report"}
        </p>
      )}
      {change !== null && (
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text">
          <span aria-hidden>{change > 0.05 ? "▲" : change < -0.05 ? "▼" : "–"}</span>
          {Math.abs(change) < 0.05 ? "No change" : `${Math.abs(change).toFixed(1)} pts ${change > 0 ? "higher" : "lower"}`}
          <span className="text-text-muted">vs last week</span>
        </p>
      )}
    </Card>
  );
}

function DataTable({
  filters,
  weeks,
  series,
}: {
  filters: DashboardFilters;
  weeks: string[];
  series: Record<string, PublishedCell<string>[]>;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Weekly percent positivity</h2>
        <ButtonLink href={`/dashboard/export?${filtersToQuery(filters)}`} variant="secondary" prefetch={false}>
          Download CSV
        </ButtonLink>
      </div>
      <div className="max-h-[32rem] overflow-auto rounded-xl ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-muted text-text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Week of</th>
              {filters.viruses.map((v) => (
                <th key={v} scope="col" className="px-4 py-2.5 text-right font-semibold">
                  {VIRUS_BY_KEY[v].shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular divide-y divide-border">
            {[...weeks].reverse().map((week, ri) => {
              const i = weeks.length - 1 - ri;
              return (
                <tr key={week} className="hover:bg-surface-muted/60">
                  <th scope="row" className="px-4 py-2.5 font-medium">{shortWeek(week)}</th>
                  {filters.viruses.map((v) => {
                    const c = series[v][i];
                    return (
                      <td key={v} className="px-4 py-2.5 text-right">
                        {c.suppressed ? (
                          <span className="text-text-subtle">{c.reason === "no_data" ? "—" : "Suppressed"}</span>
                        ) : (
                          <>
                            <span className="font-medium">{pct(c.positivity)}</span>{" "}
                            <span className="text-text-subtle">
                              {c.nDetected}/{c.tested}
                            </span>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
