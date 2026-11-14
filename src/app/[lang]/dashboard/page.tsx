import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TestCountChart } from "@/components/test-count-chart";
import { TrendChart } from "@/components/trend-chart";
import { Icon } from "@/components/ui/icons";
import { ButtonLink, Card, EmptyState } from "@/components/ui/primitives";
import { Sparkline } from "@/components/ui/sparkline";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { INTL_LOCALE, localePath, type Locale } from "@/i18n/config";
import { formatNumber, formatPct, plural, t } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { shortWeek, weekLabel } from "@/lib/format";
import { PRIVACY_RULES, type PublishedCell } from "@/lib/privacy";
import { getAgeBands, getAreas, getDataRange, getFsaPositivity, getLastCollectedDate, getLastUploadAt, getWeeklySeries } from "@/lib/queries";
import { partialThrough, testCounts } from "@/lib/test-counts";
import { VIRUS_BY_KEY, type VirusKey } from "@/lib/viruses";
import { DashboardMap } from "./dashboard-map";
import { FilterBar } from "./filter-bar";
import { areaLabel, filtersToQuery, parseFilters, type DashboardFilters } from "./filters";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.dashboard.metaTitle };
}

const TABS = ["trends", "map", "table"] as const;
type TabId = (typeof TABS)[number];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { locale, dict } = await getI18n();
  const d = dict.dashboard;
  const filters = parseFilters(sp);
  const tab: TabId = TABS.includes(first(sp.tab) as TabId) ? (first(sp.tab) as TabId) : "trends";
  const mapVirusParam = first(sp.mapVirus) as VirusKey | undefined;
  const mapVirus = mapVirusParam && filters.viruses.includes(mapVirusParam) ? mapVirusParam : filters.viruses[0];

  const range = await getDataRange();
  if (!range) {
    return (
      <>
        <PageHeader eyebrow={d.eyebrow} title={d.title} />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <EmptyState title={d.emptyTitle} action={<ButtonLink href={localePath(locale, "/admin/upload")}>{d.emptyAction}</ButtonLink>}>
            {d.emptyBody}
          </EmptyState>
        </div>
      </>
    );
  }

  const [{ weeks, series }, areas, ageBands, lastUpload, mapCells, weekly, lastCollected] = await Promise.all([
    getWeeklySeries(filters, "ph", range),
    getAreas(),
    getAgeBands(),
    getLastUploadAt(),
    tab === "map" ? getFsaPositivity(filters, mapVirus, range) : Promise.resolve(null),
    // Test counts are always weekly: with the 3-week average on, fetch the unpooled series too.
    tab === "trends" && filters.rolling ? getWeeklySeries({ ...filters, rolling: false }, "ph", range) : Promise.resolve(null),
    tab === "trends" ? getLastCollectedDate() : Promise.resolve(null),
  ]);
  const weeklySeries = (weekly ?? { series }).series;
  const regions = Object.fromEntries(areas.fsas.map((f) => [f.fsa, f.region]));
  const tabHref = (id: TabId) => {
    const q = new URLSearchParams(filtersToQuery(filters));
    if (id !== "trends") q.set("tab", id);
    return `${localePath(locale, "/dashboard")}?${q}`;
  };

  return (
    <>
      <PageHeader
        eyebrow={d.eyebrow}
        title={d.title}
        lead={
          <>
            {d.lead.split("{area}")[0]}
            <span className="font-medium text-text">{areaLabel(filters, dict)}</span>
            {d.lead.split("{area}")[1]}
          </>
        }
      >
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
          <div className="flex gap-1.5">
            <dt>{d.latestWeek}</dt>
            <dd className="font-medium text-text">{weekLabel(range.latest, locale, dict.common.weekLabel)}</dd>
          </div>
          {lastUpload && (
            <div className="flex gap-1.5">
              <dt>{d.dataAsOf}</dt>
              <dd className="font-medium text-text">{lastUpload.toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "medium" })}</dd>
            </div>
          )}
        </dl>
      </PageHeader>

      <FilterBar filters={filters} tab={tab} areas={areas} ageBands={ageBands} />

      <div className="mx-auto max-w-[90rem] space-y-6 px-4 py-6 sm:px-6">
        <section aria-labelledby="kpi-heading">
          <h2 id="kpi-heading" className="sr-only">
            {d.kpiHeading}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
            {filters.viruses.map((v) => (
              <KpiCard key={v} virus={v} cells={series[v]} rolling={!!filters.rolling} locale={locale} dict={dict} />
            ))}
          </div>
        </section>

        <Card className="overflow-hidden">
          <nav aria-label={d.tabsLabel} className="flex gap-1 border-b border-border px-3 pt-2">
            {TABS.map((id) => (
              <Link
                key={id}
                href={tabHref(id)}
                scroll={false}
                aria-current={id === tab ? "page" : undefined}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  id === tab ? "border-brand-royal text-brand-blueberry" : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {d.tabs[id]}
              </Link>
            ))}
          </nav>

          <div className="p-4 sm:p-6">
            {tab === "trends" && (
              <>
                <h2 className="sr-only">{d.trendsHeading}</h2>
                <TrendChart
                  weeks={weeks}
                  lines={filters.viruses.map((v) => ({
                    key: v,
                    label: dict.common.viruses[v].label,
                    color: VIRUS_BY_KEY[v].color,
                    values: series[v].map((c) => (c.suppressed ? null : c.positivity)),
                  }))}
                />
                <p className="mt-3 text-xs text-text-subtle">
                  {filters.rolling ? d.rollingNote : ""}
                  {t(d.gapsNote, { minTests: PRIVACY_RULES.ph.minTests })}
                </p>

                <section aria-labelledby="tests-heading" className="mt-8 border-t border-border pt-6">
                  <h2 id="tests-heading" className="font-semibold text-text">
                    {d.testChart.title}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm text-text-muted">
                    {d.testChart.lead}
                    {filters.rolling && <span className="font-medium text-text"> {d.testChart.notRolling}</span>}
                  </p>
                  <div className="mt-4">
                    <TestCountChart
                      weeks={weeks}
                      series={filters.viruses.map((v) => ({
                        key: v,
                        label: dict.common.viruses[v].label,
                        color: VIRUS_BY_KEY[v].color,
                        values: testCounts(weeklySeries[v]),
                      }))}
                      partialThrough={partialThrough(range.latest, lastCollected)}
                      minTests={PRIVACY_RULES.ph.minTests}
                    />
                  </div>
                </section>
              </>
            )}

            {tab === "map" && mapCells && (
              <DashboardMap
                cells={mapCells}
                filters={filters}
                mapVirus={mapVirus}
                regions={regions}
                periodLabel={t(filters.rolling ? d.periodRolling : d.periodWeek, { date: shortWeek(range.latest, locale) })}
              />
            )}

            {tab === "table" && <DataTable filters={filters} weeks={weeks} series={series} locale={locale} dict={dict} />}
          </div>
        </Card>
      </div>
    </>
  );
}

function KpiCard({
  virus,
  cells,
  rolling,
  locale,
  dict,
}: {
  virus: VirusKey;
  cells: PublishedCell<string>[];
  rolling: boolean;
  locale: Locale;
  dict: Dictionary;
}) {
  const def = VIRUS_BY_KEY[virus];
  const k = dict.dashboard.kpi;
  const label = dict.common.viruses[virus].label;
  const latest = cells.at(-1);
  const previous = cells.at(-2);
  const change =
    latest && previous && !latest.suppressed && !previous.suppressed ? latest.positivity - previous.positivity : null;

  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-text-muted">
        <span aria-hidden className="size-2.5 rounded-full" style={{ background: def.color }} />
        {label}
      </p>
      {latest && !latest.suppressed ? (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-bold tracking-tight text-text">{formatPct(locale, latest.positivity)}</p>
            <p className="tabular mt-0.5 text-xs text-text-muted">
              {t(k.tests, { detected: formatNumber(locale, latest.nDetected), tested: formatNumber(locale, latest.tested) })}
              {rolling && k.rollingSuffix}
            </p>
          </div>
          <Sparkline
            values={cells.map((c) => (c.suppressed ? null : c.positivity))}
            color={def.color}
            width={88}
            height={36}
            label={t(k.trendLabel, { virus: label })}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          {latest?.suppressed && latest.reason === "no_data" ? k.noTests : k.tooFew}
        </p>
      )}
      {change !== null && (
        <p className="mt-3 inline-flex flex-wrap items-center gap-x-1 rounded-lg bg-surface-muted px-2 py-1 text-xs font-medium text-text">
          <Icon name={change > 0.05 ? "arrowUp" : change < -0.05 ? "arrowDown" : "minus"} className="size-3.5" />
          {Math.abs(change) < 0.05
            ? k.noChange
            : plural(locale, Number(Math.abs(change).toFixed(1)), change > 0 ? k.higher : k.lower, {}, { minimumFractionDigits: 1 })}
          <span className="text-text-muted">{k.vsLastWeek}</span>
        </p>
      )}
    </Card>
  );
}

function DataTable({
  filters,
  weeks,
  series,
  locale,
  dict,
}: {
  filters: DashboardFilters;
  weeks: string[];
  series: Record<string, PublishedCell<string>[]>;
  locale: Locale;
  dict: Dictionary;
}) {
  const d = dict.dashboard.table;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{d.title}</h2>
        <ButtonLink href={`${localePath(locale, "/dashboard/export")}?${filtersToQuery(filters)}`} variant="secondary" prefetch={false}>
          {d.download}
        </ButtonLink>
      </div>
      <div className="max-h-[32rem] overflow-auto rounded-xl ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-muted text-text-muted">
            <tr>
              <th scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold">{d.weekOf}</th>
              {filters.viruses.map((v) => (
                <th key={v} scope="col" className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">
                  {dict.common.viruses[v].short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular divide-y divide-border">
            {[...weeks].reverse().map((week, ri) => {
              const i = weeks.length - 1 - ri;
              return (
                <tr key={week} className="hover:bg-surface-muted/60">
                  <th scope="row" className="whitespace-nowrap px-4 py-2.5 font-medium">{shortWeek(week, locale)}</th>
                  {filters.viruses.map((v) => {
                    const c = series[v][i];
                    return (
                      <td key={v} className="px-4 py-2.5 text-right">
                        {c.suppressed ? (
                          c.reason === "no_data" ? (
                            <span className="text-text-subtle">
                              <span aria-hidden>—</span>
                              <span className="sr-only">{d.noData}</span>
                            </span>
                          ) : (
                            <span className="text-text-subtle">{d.suppressed}</span>
                          )
                        ) : (
                          <>
                            <span className="font-medium">{formatPct(locale, c.positivity)}</span>{" "}
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
