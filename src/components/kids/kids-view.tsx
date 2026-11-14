"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityLegend } from "@/components/map/legend";
import { ActivityBadge } from "@/components/ui/activity-badge";
import { Icon, type IconName } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useI18n } from "@/i18n/client";
import { INTL_LOCALE, localePath } from "@/i18n/config";
import { rich, t } from "@/i18n/format";
import { ACTIVITY } from "@/lib/display";
import { parseIsoDate } from "@/lib/epiweek";
import { FSA_GEOJSON_URL, type FsaCollection } from "@/lib/geo";
import { DEFAULT_ACTIVITY_THRESHOLDS, type ActivityLevel, type Trend } from "@/lib/metrics";
import { PRIVACY_RULES } from "@/lib/privacy";
import { defaultRegionForFsa } from "@/lib/regions";
import { SCHOOL_SOURCE, townsByFsa } from "@/lib/schools";
import type { FsaTestCounts } from "@/lib/test-counts";
import { COMMUNITY_VIRUSES, VIRUS_BY_KEY, type CommunityVirus } from "@/lib/viruses";
import { AreaPicker, bigButton, type AreaChoice, type GeoState } from "./area-picker";
import { useSchoolList } from "./school-search";
import { TestBars } from "./test-bars";

const FsaMap = dynamic(() => import("@/components/map/fsa-map").then((m) => m.FsaMap), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

/** Public activity (level and trend only) per FSA and virus. */
export type KidsActivity = Record<string, Partial<Record<CommunityVirus, { level: ActivityLevel; trend: Trend | null }>>>;

const TREND_ICON: Record<Trend, IconName> = { rising: "arrowUpRight", falling: "arrowDownRight", steady: "arrowRight" };

function useGeo(): GeoState {
  const [geo, setGeo] = useState<GeoState>({ status: "loading" });
  useEffect(() => {
    fetch(FSA_GEOJSON_URL)
      .then((r) => r.json() as Promise<FsaCollection>)
      .then((collection) => setGeo({ status: "ready", collection, fsas: new Set(collection.features.map((f) => f.properties.CFSAUID)) }))
      .catch(() => setGeo({ status: "error" }));
  }, []);
  return geo;
}

function Step({ n, id, title, headingRef, children }: { n: number; id: string; title: string; headingRef?: React.Ref<HTMLHeadingElement>; children: ReactNode }) {
  const { dict } = useI18n();
  return (
    <section aria-labelledby={id} className="scroll-mt-24 rounded-[1.5rem] bg-surface p-5 shadow-card ring-1 ring-border/70 sm:p-8">
      <p className="flex items-center gap-3 text-base font-bold uppercase tracking-wide text-brand-royal">
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-brand-ocean text-xl font-black text-brand-blueberry">
          {n}
        </span>
        {t(dict.kids.stepLabel, { n })}
      </p>
      <h2 id={id} ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-black tracking-tight text-text focus:outline-none sm:text-3xl">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl bg-brand-sky ring-1 ring-brand-royal/15">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 font-bold text-brand-blueberry [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Icon name="info" className="size-6" />
          {title}
        </span>
        <Icon name="chevronDown" className="size-6 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-5 text-brand-blueberry">{children}</div>
    </details>
  );
}

export function KidsView({
  activity,
  tests,
  regions,
  period,
  partialThrough,
  stale,
}: {
  activity: KidsActivity;
  tests: FsaTestCounts;
  regions: Record<string, string>;
  /** First and last day of the 3 weeks behind the activity levels. */
  period: { from: string; to: string };
  partialThrough: string | null;
  stale: boolean;
}) {
  const { locale, dict } = useI18n();
  const k = dict.kids;
  const geo = useGeo();
  const schools = useSchoolList();
  const [choice, setChoice] = useState<AreaChoice | null>(null);
  const [editing, setEditing] = useState(true);
  const [testVirus, setTestVirus] = useState<CommunityVirus>("COVID19");
  const [mapVirus, setMapVirus] = useState<CommunityVirus>("COVID19");
  const [mapOpen, setMapOpen] = useState(false);
  const areaHeading = useRef<HTMLHeadingElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef<"area" | "summary" | null>(null);

  const towns = useMemo(() => (schools.status === "ready" ? townsByFsa(schools.index.schools) : {}), [schools]);
  const regionOf = useCallback(
    (fsa: string) => {
      const region = regions[fsa] ?? defaultRegionForFsa(fsa) ?? "Ontario";
      return dict.common.regions[region] ?? region;
    },
    [regions, dict],
  );

  // Move focus to the content that just changed, so keyboard and screen-reader users follow along.
  useEffect(() => {
    const target = focusNext.current === "summary" ? summaryHeading.current : focusNext.current === "area" ? areaHeading.current : null;
    focusNext.current = null;
    target?.focus();
  });

  const choose = (next: AreaChoice) => {
    setChoice(next);
    setEditing(false);
    if (next.via !== "map") focusNext.current = "summary";
  };

  const date = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" }) =>
    parseIsoDate(iso)!.toLocaleDateString(INTL_LOCALE[locale], { ...opts, timeZone: "UTC" });

  const fsa = choice?.fsa ?? null;
  const area = fsa ? activity[fsa] : undefined;
  const town = fsa ? towns[fsa] : undefined;
  const place = fsa ? (town && town !== regionOf(fsa) ? t(k.area.townRegion, { town, region: regionOf(fsa) }) : regionOf(fsa)) : "";
  const areaTitle = !choice
    ? ""
    : choice.via === "school"
      ? t(k.area.aroundSchool, { school: choice.school })
      : choice.via === "location"
        ? k.area.nearYou
        : t(k.area.postalArea, { fsa: choice.fsa });
  const hasLevels = !!area && COMMUNITY_VIRUSES.some((v) => area[v] && area[v].level !== "insufficient");
  const virusSegments = COMMUNITY_VIRUSES.map((v) => ({ value: v, label: dict.common.viruses[v].short, color: VIRUS_BY_KEY[v].color }));
  const th = DEFAULT_ACTIVITY_THRESHOLDS;

  const fillColors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [f, a] of Object.entries(activity)) {
      const level = a[mapVirus]?.level;
      if (level && level !== "insufficient") out[f] = ACTIVITY[level].color;
    }
    return out;
  }, [activity, mapVirus]);

  return (
    <div className="text-lg leading-relaxed">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-10 sm:px-6">
          <p className="text-base font-bold uppercase tracking-wide text-brand-royal">{k.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-text sm:text-4xl">{k.title}</h1>
          <p className="mt-3 max-w-2xl text-xl text-text-muted">{k.lead}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <Step n={1} id="kids-area" title={k.steps.area} headingRef={areaHeading}>
          {choice && !editing ? (
            <div aria-live="polite">
              <p className="text-base font-semibold text-text-muted">{k.area.showing}</p>
              <p className="mt-1 flex items-start gap-3 text-2xl font-bold text-text">
                <Icon name={choice.via === "school" ? "school" : "mapPin"} className="mt-1 size-7 text-brand-royal" />
                <span>{areaTitle}</span>
              </p>
              <p className="mt-1 text-text-muted">
                {choice.via === "school" || choice.via === "location" ? t(k.area.areaDetail, { fsa: choice.fsa, place }) : place}
              </p>
              {choice.via === "school" && (
                <p className="mt-4 rounded-xl bg-brand-sky px-4 py-3 text-base text-brand-blueberry ring-1 ring-brand-royal/15">
                  {t(k.area.schoolNote, { fsa: choice.fsa })}
                </p>
              )}
              {choice.via === "location" && choice.approximate && (
                <p className="mt-4 rounded-xl bg-warning-surface px-4 py-3 text-base ring-1 ring-warning-border">{k.area.locationApprox}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  focusNext.current = "area";
                }}
                className={`${bigButton} mt-5 border-2 border-brand-royal bg-surface text-brand-royal hover:bg-brand-sky`}
              >
                {k.area.change}
              </button>
            </div>
          ) : (
            <>
              <p className="mb-6 text-text-muted">{k.area.intro}</p>
              <AreaPicker
                geo={geo}
                schools={schools}
                regionOf={regionOf}
                towns={towns}
                onChoose={choose}
                onCancel={choice ? () => setEditing(false) : undefined}
              />
            </>
          )}
        </Step>

        {!choice && <p className="px-2 text-center text-text-muted">{k.pickFirst}</p>}

        {choice && fsa && (
          <>
            <Step n={2} id="kids-summary" title={k.steps.summary} headingRef={summaryHeading}>
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-base">
                <div>
                  <dt className="font-semibold text-text-muted">{k.summary.areaLabel}</dt>
                  <dd className="font-bold text-text">{areaTitle}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-muted">{k.summary.periodLabel}</dt>
                  <dd className="font-bold text-text">{t(k.summary.period, { from: date(period.from), to: date(period.to, { month: "long", day: "numeric", year: "numeric" }) })}</dd>
                </div>
              </dl>
              {stale && <p className="mt-4 rounded-xl bg-warning-surface px-4 py-3 text-base ring-1 ring-warning-border">{k.summary.stale}</p>}

              {hasLevels ? (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {COMMUNITY_VIRUSES.map((v) => {
                    const a = area?.[v];
                    const level = a?.level ?? "insufficient";
                    return (
                      <li key={v} className="overflow-hidden rounded-2xl bg-surface ring-2 ring-border">
                        <div aria-hidden className="h-2" style={{ background: VIRUS_BY_KEY[v].color }} />
                        <div className="p-5">
                          <h3 className="text-2xl font-black text-text">{dict.common.viruses[v].label}</h3>
                          <p className="mt-2">
                            <span className="sr-only">{k.summary.levelLabel} </span>
                            <ActivityBadge level={level} />
                          </p>
                          <p className="mt-2 text-text">{k.summary.levels[level]}</p>
                          {level !== "insufficient" && (
                            <p className="mt-2 flex items-start gap-2 text-base text-text-muted">
                              {a?.trend && <Icon name={TREND_ICON[a.trend]} className="mt-1 size-5" />}
                              {a?.trend ? k.summary.trends[a.trend] : k.summary.noTrend}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <NotEnough title={k.summary.noArea} body={k.summary.noAreaHelp} />
              )}

              <div className="mt-6 space-y-3">
                <Disclosure title={k.summary.meaningTitle}>
                  {k.summary.meaning.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </Disclosure>
                <Disclosure title={k.summary.levelsTitle}>
                  <ul className="space-y-2">
                    {(["low", "moderate", "high", "insufficient"] as const).map((level) => (
                      <li key={level} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <ActivityBadge level={level} size="sm" />
                        <span>— {t(k.summary.levelRules[level], { moderate: th.moderate, high: th.high, minTests: th.minTests })}</span>
                      </li>
                    ))}
                  </ul>
                  <p>{k.summary.levelsProvisional}</p>
                </Disclosure>
              </div>
            </Step>

            <Step n={3} id="kids-tests" title={k.steps.tests}>
              <p>{t(k.tests.intro, { virus: dict.common.viruses[testVirus].label })}</p>
              <SegmentedControl label={k.tests.virusLabel} segments={virusSegments} value={testVirus} onChange={setTestVirus} size="lg" className="mt-4" />
              <div className="mt-6">
                <TestBars
                  weeks={tests.weeks}
                  values={tests.byFsa[fsa]?.[testVirus] ?? tests.weeks.map(() => "no_data")}
                  color={VIRUS_BY_KEY[testVirus].color}
                  label={t(k.tests.chartLabel, { virus: dict.common.viruses[testVirus].label, area: areaTitle })}
                  partialLast={partialThrough !== null}
                  minTests={PRIVACY_RULES.public.minTests}
                />
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <Icon name="info" className="mt-1 size-6 text-brand-royal" />
                  {k.tests.notPeople}
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="info" className="mt-1 size-6 text-brand-royal" />
                  {k.tests.notIllness}
                </li>
              </ul>
              <div className="mt-6">
                <Disclosure title={k.tests.detailsTitle}>
                  {k.tests.details.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {partialThrough && <p>{t(k.tests.partialDetail, { date: date(partialThrough) })}</p>}
                </Disclosure>
              </div>
            </Step>

            <Step n={4} id="kids-map" title={k.steps.map}>
              <p>{k.map.intro}</p>
              <button
                type="button"
                aria-expanded={mapOpen}
                aria-controls="kids-map-panel"
                onClick={() => setMapOpen((o) => !o)}
                className={`${bigButton} mt-4 border-2 border-brand-royal bg-surface text-brand-royal hover:bg-brand-sky`}
              >
                <Icon name="map" className="size-6" />
                {mapOpen ? k.map.hide : k.map.show}
              </button>
              <div id="kids-map-panel" hidden={!mapOpen} className="mt-5 space-y-4">
                {mapOpen && (
                  <>
                    <SegmentedControl label={k.map.virusLabel} segments={virusSegments} value={mapVirus} onChange={setMapVirus} size="lg" />
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold">{t(k.map.yourArea, { fsa })}</span>
                      <ActivityBadge level={area?.[mapVirus]?.level ?? "insufficient"} />
                    </p>
                    <div className="text-base">
                      <ActivityLegend title={t(k.map.legendTitle, { virus: dict.common.viruses[mapVirus].label })} />
                    </div>
                    <div className="h-[26rem] overflow-hidden rounded-2xl ring-1 ring-border">
                      {geo.status === "ready" ? (
                        <FsaMap
                          geojson={geo.collection}
                          fillColors={fillColors}
                          selected={fsa}
                          onSelect={(f) => choose({ fsa: f, via: "map" })}
                          padding={{ top: 40, right: 40, bottom: 40, left: 40 }}
                          cooperative
                          label={t(k.map.label, { virus: dict.common.viruses[mapVirus].label, fsa })}
                          unsupportedMessage={k.map.unsupported}
                          renderTooltip={(f) => (
                            <>
                              <p className="font-semibold">
                                {f}
                                {towns[f] && <span className="font-normal text-text-muted"> · {towns[f]}</span>}
                              </p>
                              <div className="mt-1">
                                <ActivityBadge level={activity[f]?.[mapVirus]?.level ?? "insufficient"} size="sm" />
                              </div>
                            </>
                          )}
                        />
                      ) : geo.status === "error" ? (
                        <p role="status" className="grid size-full place-items-center bg-map-canvas p-6 text-center text-text-muted">
                          {k.map.failed}
                        </p>
                      ) : (
                        <Skeleton className="size-full rounded-none" />
                      )}
                    </div>
                    <p className="text-base text-text-muted">{k.map.tapHint}</p>
                  </>
                )}
              </div>
            </Step>
          </>
        )}

        <section aria-labelledby="kids-sources" className="px-2 pt-4 text-base text-text-muted">
          <h2 id="kids-sources" className="text-lg font-bold text-text">
            {k.sources.title}
          </h2>
          <p className="mt-2">{k.sources.tests}</p>
          <p className="mt-2">
            {schools.status === "ready" && schools.source.lastModified
              ? t(k.sources.schoolsDated, { date: date(schools.source.lastModified.slice(0, 10), { month: "long", year: "numeric" }) })
              : k.sources.schools}{" "}
            {rich(k.sources.licence, {
              link: (chunk) => (
                <a href={SCHOOL_SOURCE.licenceUrl} className="font-semibold text-brand-royal underline underline-offset-2">
                  {chunk}
                </a>
              ),
            })}
          </p>
          <p className="mt-2">
            <Link href={localePath(locale, "/about")} className="font-semibold text-brand-royal underline underline-offset-2">
              {k.sources.about}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function NotEnough({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 flex items-start gap-4 rounded-2xl bg-surface-muted p-5">
      <span aria-hidden className="hatch mt-1 size-10 shrink-0 rounded-lg ring-1 ring-border-strong" />
      <div>
        <p className="text-xl font-bold text-text">{title}</p>
        <p className="mt-1 text-text-muted">{body}</p>
      </div>
    </div>
  );
}
