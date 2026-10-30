"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityLegend } from "@/components/map/legend";
import { ActivityBadge } from "@/components/ui/activity-badge";
import { Button, inputClass, Skeleton } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sparkline } from "@/components/ui/sparkline";
import type { ActivitySummary, AreaActivity } from "@/lib/activity";
import { ACTIVITY, ACTIVITY_ORDER } from "@/lib/display";
import { FSA_GEOJSON_URL, fsaAt, type FsaCollection } from "@/lib/geo";
import { defaultRegionForFsa, normaliseFsa } from "@/lib/regions";
import { COMMUNITY_VIRUSES, VIRUS_BY_KEY, type CommunityVirus } from "@/lib/viruses";

const FsaMap = dynamic(() => import("@/components/map/fsa-map").then((m) => m.FsaMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const PANEL_WIDTH = 384;

function MapSkeleton() {
  return (
    <div className="grid size-full place-items-center bg-[#eef1f4]">
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
  const [virus, setVirus] = useState<CommunityVirus>(initialVirus);
  const [selected, setSelected] = useState<string | null>(initialFsa);
  const [query, setQuery] = useState(initialFsa ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [expanded, setExpanded] = useState(initialFsa !== null);
  const [geojson, setGeojson] = useState<FsaCollection | null>(null);
  const [locating, setLocating] = useState(false);
  const desktop = useIsDesktop();

  useEffect(() => {
    fetch(FSA_GEOJSON_URL)
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => setMessage("The map couldn't be loaded. You can still search by postal code or use the list."));
  }, []);

  const mapFsas = useMemo(() => new Set(geojson?.features.map((f) => f.properties.CFSAUID)), [geojson]);
  const regionOf = useCallback((fsa: string) => regions[fsa] ?? defaultRegionForFsa(fsa) ?? "Ontario", [regions]);

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
    const fsa = normaliseFsa(query);
    if (!query.trim()) return select(null);
    if (!fsa) return setMessage("That doesn't look like a postal code. Try something like M5G 1X8.");
    if (geojson && !mapFsas.has(fsa)) return setMessage(`${fsa} is outside the Greater Toronto Area covered by CARE-ID.`);
    select(fsa);
    setView("map");
  };

  const locate = () => {
    if (!navigator.geolocation || !geojson) return setMessage("Location isn't available in this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const fsa = fsaAt(geojson, coords.longitude, coords.latitude);
        if (fsa) select(fsa);
        else setMessage("Your location is outside the Greater Toronto Area covered by CARE-ID.");
      },
      () => {
        setLocating(false);
        setMessage("We couldn't get your location. Try entering your postal code instead.");
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
    : { top: 72, right: 24, bottom: 200, left: 24 };

  const selectedArea = selected ? activity.byFsa[selected] : undefined;
  const virusSegments = COMMUNITY_VIRUSES.map((v) => ({ value: v, label: VIRUS_BY_KEY[v].shortLabel, color: VIRUS_BY_KEY[v].color }));

  return (
    <section aria-label="Community respiratory virus map" className="relative h-[calc(100dvh-4rem-2px)] min-h-[560px] overflow-hidden bg-[#eef1f4]">
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
              label={`Map of ${VIRUS_BY_KEY[virus].label} activity by FSA. Use the search box or list view for the same information.`}
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
          <ActivityLegend title={`${VIRUS_BY_KEY[virus].shortLabel} activity`} compact={!desktop} />
        </div>
      )}

      {view === "map" && (
        <a
          href="#how-heading"
          className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface/95 px-4 py-2 text-sm font-semibold text-brand-navy shadow-raised ring-1 ring-border hover:bg-surface lg:flex"
        >
          How CARE-ID works <span aria-hidden>↓</span>
        </a>
      )}

      {/* Floating panel (desktop) / bottom sheet (mobile). */}
      <div
        className="absolute inset-x-2 bottom-2 z-20 flex max-h-[78%] flex-col rounded-[var(--radius-card)] bg-surface shadow-overlay ring-1 ring-border lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-4 lg:max-h-none"
        style={desktop ? { width: PANEL_WIDTH } : undefined}
      >
        <button
          type="button"
          className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border-strong lg:hidden"
          aria-label={expanded ? "Collapse panel" : "Expand panel"}
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        />
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-5">
          <h1 className="text-xl font-bold tracking-tight text-text">Respiratory virus activity near you</h1>
          <p className="mt-1 hidden text-sm text-text-muted sm:block lg:block">
            From school testing programs across the GTA, updated weekly.
          </p>

          <form onSubmit={search} className="mt-4 flex gap-2" role="search">
            <label htmlFor="postal" className="sr-only">
              Postal code
            </label>
            <input
              id="postal"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Postal code, e.g. M5G 1X8"
              autoComplete="postal-code"
              className={`${inputClass} uppercase placeholder:normal-case`}
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="mt-2 flex items-center justify-between gap-2 text-sm">
            <button type="button" onClick={locate} disabled={locating || !geojson} className="font-medium text-brand-blue hover:underline disabled:opacity-50">
              {locating ? "Finding your area…" : "Use my location"}
            </button>
            <span className="text-xs text-text-subtle">Only the first 3 characters are used</span>
          </div>
          {message && (
            <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
              {message}
            </p>
          )}

          {!expanded && selected && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-left text-sm lg:hidden"
            >
              <span className="font-semibold">{selected}</span>
              <ActivityBadge level={selectedArea?.[virus]?.level ?? "insufficient"} trend={selectedArea?.[virus]?.trend} size="sm" />
            </button>
          )}

          <div className={`${expanded ? "" : "hidden"} lg:block`}>
            <SegmentedControl label="Virus shown on the map" segments={virusSegments} value={virus} onChange={changeVirus} className="mt-5" />

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
                <AreaSummary title="All participating areas" subtitle="Greater Toronto Area" area={activity.overall} virus={virus} />
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-text-muted">
              <span>3 weeks ending {latestWeekLabel}</span>
              <button
                type="button"
                onClick={() => setView((v) => (v === "map" ? "list" : "map"))}
                className="rounded-md px-2 py-1 font-semibold text-brand-blue hover:bg-brand-sky"
              >
                {view === "map" ? "View as list" : "View map"}
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
  return (
    <div aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
        {onClear && (
          <button type="button" onClick={onClear} className="rounded-md px-2 py-1 text-sm font-medium text-text-muted hover:bg-surface-muted hover:text-text">
            Clear
          </button>
        )}
      </div>

      {!area ? (
        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-3 text-sm text-text-muted">
          There are no school testing results for this area yet.
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
                    {VIRUS_BY_KEY[v].label}
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
                  label={`${VIRUS_BY_KEY[v].label} positivity over the last ${a?.spark.length ?? 0} weeks`}
                />
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-text-subtle">
        Levels use the share of tests that were positive.{" "}
        <Link href="/notes#activity" className="underline underline-offset-2 hover:text-text">
          How levels are set
        </Link>
      </p>
    </div>
  );
}

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
  const rows = Object.entries(activity.byFsa)
    .map(([fsa, a]) => ({ fsa, level: a[virus]?.level ?? "insufficient", trend: a[virus]?.trend ?? null }))
    .sort((x, y) => ACTIVITY_ORDER.indexOf(x.level) - ACTIVITY_ORDER.indexOf(y.level) || x.fsa.localeCompare(y.fsa));

  return (
    <div className="size-full overflow-y-auto bg-canvas pb-48 lg:pb-0" style={panelOffset ? { paddingLeft: PANEL_WIDTH + 32 } : undefined}>
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <h2 className="mb-3 text-lg font-semibold">{VIRUS_BY_KEY[virus].label} activity by area</h2>
        <table className="w-full overflow-hidden rounded-xl bg-surface text-left text-sm shadow-card ring-1 ring-border">
          <thead className="bg-surface-muted text-text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Area</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Region</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.fsa} className="hover:bg-surface-muted">
                <th scope="row" className="px-4 py-2.5">
                  <button type="button" onClick={() => onSelect(r.fsa)} className="font-semibold text-brand-blue hover:underline">
                    {r.fsa}
                  </button>
                </th>
                <td className="px-4 py-2.5 text-text-muted">{regionOf(r.fsa)}</td>
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
