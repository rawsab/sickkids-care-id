"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityLegend } from "@/components/map/legend";
import { ActivityBadge } from "@/components/ui/activity-badge";
import { Icon } from "@/components/ui/icons";
import { Button, inputClass, Skeleton } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sparkline } from "@/components/ui/sparkline";
import { useI18n } from "@/i18n/client";
import { INTL_LOCALE, localePath } from "@/i18n/config";
import { t } from "@/i18n/format";
import type { ActivitySummary, AreaActivity } from "@/lib/activity";
import { ACTIVITY, ACTIVITY_ORDER } from "@/lib/display";
import { areaForPostalCode, FSA_GEOJSON_URL, fsaAt, type FsaCollection } from "@/lib/geo";
import type { ActivityLevel, Trend } from "@/lib/metrics";
import { defaultRegionForFsa, normaliseFsa } from "@/lib/regions";
import { COMMUNITY_VIRUSES, VIRUS_BY_KEY, type CommunityVirus } from "@/lib/viruses";

const FsaMap = dynamic(() => import("@/components/map/fsa-map").then((m) => m.FsaMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const PANEL_WIDTH = 384;

function MapSkeleton() {
  return (
    <div className="grid size-full place-items-center bg-map-canvas">
      <Skeleton className="h-6 w-40 bg-white/70" />
    </div>
  );
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

export function CommunityExplorer({
  activity,
  regions,
  latestWeekLabel,
  initialFsa,
  initialVirus,
}: {
  activity: ActivitySummary;
  regions: Record<string, string>;
  latestWeekLabel: string;
  initialFsa: string | null;
  initialVirus: CommunityVirus;
}) {
  const { dict } = useI18n();
  const h = dict.home;
  const [virus, setVirus] = useState<CommunityVirus>(initialVirus);
  const [selected, setSelected] = useState<string | null>(initialFsa);
  const [query, setQuery] = useState(initialFsa ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [expanded, setExpanded] = useState(initialFsa !== null);
  const [geojson, setGeojson] = useState<FsaCollection | null>(null);
  const [locating, setLocating] = useState(false);
  const desktop = useIsDesktop();

  // On mobile the panel is a bottom sheet; track its height so the map can
  // frame areas and place its controls above it rather than underneath.
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSheetHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch(FSA_GEOJSON_URL)
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => setMessage(h.errors.mapFailed));
    // Load once; the language can't change without a full page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapFsas = useMemo(() => new Set(geojson?.features.map((f) => f.properties.CFSAUID)), [geojson]);
  const regionOf = useCallback(
    (fsa: string) => {
      const region = regions[fsa] ?? defaultRegionForFsa(fsa) ?? "Ontario";
      return dict.common.regions[region] ?? region;
    },
    [regions, dict],
  );

  // Keep the URL shareable without a server round trip; history entries for selections.
  const syncUrl = useCallback((fsa: string | null, v: CommunityVirus, push: boolean) => {
    const params = new URLSearchParams();
    if (fsa) params.set("fsa", fsa);
    if (v !== "COVID19") params.set("virus", v);
    const url = params.size ? `?${params}` : window.location.pathname;
    window.history[push ? "pushState" : "replaceState"](null, "", url);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const fsa = normaliseFsa(params.get("fsa") ?? "");
      setSelected(fsa);
      setQuery(fsa ?? "");
      const v = params.get("virus");
      setVirus(COMMUNITY_VIRUSES.includes(v as CommunityVirus) ? (v as CommunityVirus) : "COVID19");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const select = (fsa: string | null) => {
    setSelected(fsa);
    setQuery(fsa ?? "");
    setMessage(null);
    syncUrl(fsa, virus, true);
    if (fsa) setExpanded(true);
  };

  const changeVirus = (v: CommunityVirus) => {
    setVirus(v);
    syncUrl(selected, v, false);
  };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return select(null);
    const area = areaForPostalCode(query, geojson ? mapFsas : null);
    if ("error" in area) return setMessage(area.error === "notPostal" ? h.errors.notPostal : t(h.errors.outsideGta, { fsa: area.fsa! }));
    select(area.fsa);
    setView("map");
  };

  const locate = () => {
    if (!navigator.geolocation || !geojson) return setMessage(h.errors.noGeolocation);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const fsa = fsaAt(geojson, coords.longitude, coords.latitude);
        if (fsa) select(fsa);
        else setMessage(h.errors.locationOutside);
      },
      () => {
        setLocating(false);
        setMessage(h.errors.locationFailed);
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const fillColors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [fsa, area] of Object.entries(activity.byFsa)) {
      const level = area[virus]?.level;
      if (level && level !== "insufficient") out[fsa] = ACTIVITY[level].color;
    }
    return out;
  }, [activity, virus]);

  const padding = desktop
    ? { top: 48, right: 48, bottom: 48, left: PANEL_WIDTH + 56 }
    : { top: 72, right: 24, bottom: sheetHeight + 24, left: 24 };
  // The sheet sits 8px above the bottom edge (bottom-2).
  const controlsInset = desktop ? 0 : sheetHeight + 8;

  const selectedArea = selected ? activity.byFsa[selected] : undefined;
  const shownArea = selected ? selectedArea : activity.overall;
  const virusSegments = COMMUNITY_VIRUSES.map((v) => ({ value: v, label: dict.common.viruses[v].short, color: VIRUS_BY_KEY[v].color }));

  return (
    <section aria-label={h.sectionLabel} className="relative h-[calc(100dvh-4.5rem)] min-h-[560px] overflow-hidden bg-map-canvas">
      {/* Map or list fills the section; the panel floats over it. */}
      <div className="absolute inset-0">
        {view === "map" ? (
          geojson ? (
            <FsaMap
              geojson={geojson}
              fillColors={fillColors}
              selected={selected}
              onSelect={select}
              padding={padding}
              controlsInset={controlsInset}
              unsupportedMessage={h.errors.mapUnsupported}
              label={t(h.mapLabel, { virus: dict.common.viruses[virus].label })}
              renderTooltip={(fsa) => {
                const a = activity.byFsa[fsa]?.[virus];
                return (
                  <>
                    <p className="font-semibold">
                      {fsa} <span className="font-normal text-text-muted">· {regionOf(fsa)}</span>
                    </p>
                    <div className="mt-1">
                      <ActivityBadge level={a?.level ?? "insufficient"} trend={a?.trend} size="sm" />
                    </div>
                  </>
                );
              }}
            />
          ) : (
            <MapSkeleton />
          )
        ) : (
          <AreaList activity={activity} virus={virus} regionOf={regionOf} onSelect={(f) => (select(f), setView("map"))} panelOffset={desktop} />
        )}
      </div>

      {view === "map" && (
        <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
          <ActivityLegend title={t(h.legendTitle, { virus: dict.common.viruses[virus].short })} compact={!desktop} />
        </div>
      )}

      {view === "map" && (
        <a
          href="#how-heading"
          className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface/95 px-4 py-2 text-sm font-semibold text-brand-blueberry shadow-raised ring-1 ring-border hover:bg-surface xl:flex"
        >
          {h.howItWorksLink} <Icon name="arrowDown" className="size-4" />
        </a>
      )}

      {/* Floating panel (desktop) / bottom sheet (mobile). */}
      <div
        ref={sheetRef}
        className="absolute inset-x-2 bottom-2 z-20 flex max-h-[calc(100%-13rem)] flex-col rounded-[var(--radius-card)] bg-surface shadow-overlay ring-1 ring-border lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-4 lg:max-h-none"
        style={desktop ? { width: PANEL_WIDTH } : undefined}
      >
        <button
          type="button"
          className="flex h-11 w-full shrink-0 items-center justify-center rounded-t-[var(--radius-card)] lg:hidden"
          aria-label={expanded ? h.hideDetails : h.showDetails}
          aria-expanded={expanded}
          aria-controls="area-details"
          onClick={() => setExpanded((e) => !e)}
        >
          <span aria-hidden className="h-1.5 w-10 rounded-full bg-border-strong" />
        </button>
        <div className="overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 sm:pb-5 lg:pt-5">
          <h1 className="text-xl font-black tracking-tight text-text">{h.title}</h1>
          <p className="mt-1 hidden text-sm text-text-muted sm:block lg:block">
            {h.lead}
          </p>

          <form onSubmit={search} className="mt-4 flex gap-2" role="search">
            <label htmlFor="postal" className="sr-only">
              {h.postalLabel}
            </label>
            <input
              id="postal"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={h.postalPlaceholder}
              autoComplete="postal-code"
              className={`${inputClass} uppercase placeholder:normal-case`}
            />
            <Button type="submit">{h.search}</Button>
          </form>
          <div className="mt-2 flex items-center justify-between gap-2 text-sm">
            <button type="button" onClick={locate} disabled={locating || !geojson} className="shrink-0 whitespace-nowrap font-medium text-brand-royal hover:underline disabled:opacity-50">
              {locating ? h.locating : h.useLocation}
            </button>
            <span className="text-right text-xs text-text-subtle">{h.postalHint}</span>
          </div>
          {message && (
            <p role="alert" className="mt-3 rounded-lg bg-warning-surface px-3 py-2 text-sm ring-1 ring-warning-border">
              {message}
            </p>
          )}

          <SegmentedControl label={h.virusControl} segments={virusSegments} value={virus} onChange={changeVirus} className="mt-4 lg:mt-5" />

          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              aria-controls="area-details"
              className="mt-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-left text-sm lg:hidden"
            >
              <span className="font-semibold">{selected ?? h.allAreas}</span>
              <ActivityBadge level={shownArea?.[virus]?.level ?? "insufficient"} trend={shownArea?.[virus]?.trend} size="sm" />
            </button>
          )}

          <div id="area-details" className={`${expanded ? "" : "hidden"} lg:block`}>
            <div className="mt-5">
              {selected ? (
                <AreaSummary
                  title={selected}
                  subtitle={regionOf(selected)}
                  area={selectedArea}
                  virus={virus}
                  onClear={() => select(null)}
                />
              ) : (
                <AreaSummary title={h.allParticipating} subtitle={h.gta} area={activity.overall} virus={virus} />
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-text-muted">
              <span>{t(h.windowEnding, { week: latestWeekLabel })}</span>
              <button
                type="button"
                onClick={() => setView((v) => (v === "map" ? "list" : "map"))}
                className="rounded-md px-2 py-1 font-semibold text-brand-royal hover:bg-brand-sky"
              >
                {view === "map" ? h.viewList : h.viewMap}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AreaSummary({
  title,
  subtitle,
  area,
  virus,
  onClear,
}: {
  title: string;
  subtitle: string;
  area: AreaActivity | undefined;
  virus: CommunityVirus;
  onClear?: () => void;
}) {
  const { locale, dict } = useI18n();
  const h = dict.home;
  return (
    <div aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
        {onClear && (
          <button type="button" onClick={onClear} className="rounded-md px-2 py-1 text-sm font-medium text-text-muted hover:bg-surface-muted hover:text-text">
            {h.clear}
          </button>
        )}
      </div>

      {!area ? (
        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-3 text-sm text-text-muted">
          {h.noResultsForArea}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-xl ring-1 ring-border">
          {COMMUNITY_VIRUSES.map((v) => {
            const a = area[v];
            const active = v === virus;
            return (
              <li key={v} className={`flex items-center justify-between gap-3 px-3 py-3 ${active ? "bg-brand-sky/50" : ""}`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: VIRUS_BY_KEY[v].color }} />
                    {dict.common.viruses[v].label}
                  </p>
                  <div className="mt-1">
                    <ActivityBadge level={a?.level ?? "insufficient"} trend={a?.trend} size="sm" />
                  </div>
                </div>
                <Sparkline
                  values={a?.spark ?? []}
                  color={VIRUS_BY_KEY[v].color}
                  width={96}
                  height={30}
                  label={t(h.sparkLabel, { virus: dict.common.viruses[v].label, count: a?.spark.length ?? 0 })}
                />
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-text-subtle">
        {h.levelsNote}{" "}
        <Link href={localePath(locale, "/about#activity")} className="underline underline-offset-2 hover:text-text">
          {h.levelsLink}
        </Link>
      </p>
    </div>
  );
}

type SortKey = "area" | "region" | "activity";
type AreaRow = { fsa: string; region: string; level: ActivityLevel; trend: Trend | null };

const SORT_COLUMNS: SortKey[] = ["area", "region", "activity"];

function AreaList({
  activity,
  virus,
  regionOf,
  onSelect,
  panelOffset,
}: {
  activity: ActivitySummary;
  virus: CommunityVirus;
  regionOf: (fsa: string) => string;
  onSelect: (fsa: string) => void;
  panelOffset: boolean;
}) {
  const { locale, dict } = useI18n();
  const [sort, setSort] = useState<{ key: SortKey; dir: "ascending" | "descending" }>({ key: "activity", dir: "descending" });

  const rows = useMemo(() => {
    // "Descending" activity means highest first; ties fall back to FSA order.
    const compare: Record<SortKey, (x: AreaRow, y: AreaRow) => number> = {
      area: (x, y) => x.fsa.localeCompare(y.fsa),
      region: (x, y) => x.region.localeCompare(y.region, INTL_LOCALE[locale]),
      activity: (x, y) => ACTIVITY_ORDER.indexOf(y.level) - ACTIVITY_ORDER.indexOf(x.level),
    };
    const sign = sort.dir === "ascending" ? 1 : -1;
    return Object.entries(activity.byFsa)
      .map(([fsa, a]) => ({ fsa, region: regionOf(fsa), level: a[virus]?.level ?? "insufficient", trend: a[virus]?.trend ?? null }))
      .sort((x, y) => sign * compare[sort.key](x, y) || x.fsa.localeCompare(y.fsa));
  }, [activity, virus, regionOf, sort, locale]);

  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "ascending" ? "descending" : "ascending" }
        : { key, dir: key === "activity" ? "descending" : "ascending" },
    );

  return (
    <div className="size-full overflow-y-auto bg-canvas pb-48 lg:pb-0" style={panelOffset ? { paddingLeft: PANEL_WIDTH + 32 } : undefined}>
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <h2 className="mb-3 text-lg font-semibold">{t(dict.home.listTitle, { virus: dict.common.viruses[virus].label })}</h2>
        <table className="w-full overflow-hidden rounded-xl bg-surface text-left text-sm shadow-card ring-1 ring-border">
          <thead className="bg-surface-muted text-text-muted">
            <tr>
              {SORT_COLUMNS.map((key) => {
                const active = sort.key === key;
                return (
                  <th key={key} scope="col" aria-sort={active ? sort.dir : "none"} className="px-2 py-1.5 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface hover:text-text ${active ? "text-text" : ""}`}
                    >
                      {dict.home.columns[key]}
                      <Icon
                        name={active ? (sort.dir === "ascending" ? "arrowUp" : "arrowDown") : "chevronsUpDown"}
                        className={`size-3.5 ${active ? "" : "opacity-40"}`}
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.fsa} className="hover:bg-surface-muted">
                <th scope="row" className="px-4 py-2.5">
                  <button type="button" onClick={() => onSelect(r.fsa)} className="font-semibold text-brand-royal hover:underline">
                    {r.fsa}
                  </button>
                </th>
                <td className="px-4 py-2.5 text-text-muted">{r.region}</td>
                <td className="px-4 py-2.5">
                  <ActivityBadge level={r.level} trend={r.trend} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
