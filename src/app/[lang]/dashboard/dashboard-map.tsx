"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PositivityLegend } from "@/components/map/legend";
import { Skeleton } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { positivityColor } from "@/lib/display";
import { useI18n } from "@/i18n/client";
import { formatNumber, formatPct, t } from "@/i18n/format";
import { FSA_GEOJSON_URL, type FsaCollection } from "@/lib/geo";
import type { PublishedCell } from "@/lib/privacy";
import { VIRUS_BY_KEY, type VirusKey } from "@/lib/viruses";
import { filtersToQuery, type DashboardFilters } from "./filters";

const FsaMap = dynamic(() => import("@/components/map/fsa-map").then((m) => m.FsaMap), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const PADDING = { top: 40, right: 40, bottom: 40, left: 40 };

export function DashboardMap({
  cells,
  filters,
  mapVirus,
  regions,
  periodLabel,
}: {
  cells: Record<string, PublishedCell<string>>;
  filters: DashboardFilters;
  mapVirus: VirusKey;
  regions: Record<string, string>;
  periodLabel: string;
}) {
  const { locale, dict } = useI18n();
  const m = dict.dashboard.map;
  const virusName = dict.common.viruses[mapVirus].label;
  const router = useRouter();
  const pathname = usePathname();
  const [geojson, setGeojson] = useState<FsaCollection | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(FSA_GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setGeojson)
      .catch(() => setFailed(true));
  }, []);

  const fillColors = useMemo(
    () => Object.fromEntries(Object.values(cells).flatMap((c) => (c.suppressed ? [] : [[c.key, positivityColor(c.positivity)]]))),
    [cells],
  );

  const go = (patch: Partial<DashboardFilters>, extra: Record<string, string>) => {
    const q = new URLSearchParams(filtersToQuery({ ...filters, ...patch }));
    Object.entries(extra).forEach(([k, v]) => q.set(k, v));
    router.replace(`${pathname}?${q}`, { scroll: false });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          {t(m.caption, { virus: virusName, period: periodLabel })}
        </p>
        {filters.viruses.length > 1 && (
          <SegmentedControl
            label={dict.home.virusControl}
            segments={filters.viruses.map((v) => ({ value: v, label: dict.common.viruses[v].short, color: VIRUS_BY_KEY[v].color }))}
            value={mapVirus}
            onChange={(v) => go({}, { tab: "map", mapVirus: v })}
          />
        )}
      </div>
      <div className="relative h-[560px] overflow-hidden rounded-xl ring-1 ring-border">
        {geojson ? (
          <FsaMap
            geojson={geojson}
            fillColors={fillColors}
            selected={filters.fsa ?? null}
            onSelect={(fsa) => go({ area: `fsa:${fsa}`, fsa, region: undefined }, {})}
            padding={PADDING}
            cooperative
            unsupportedMessage={m.unsupported}
            label={t(m.label, { virus: virusName })}
            renderTooltip={(fsa) => {
              const c = cells[fsa];
              return (
                <>
                  <p className="font-semibold">
                    {fsa} <span className="font-normal text-text-muted">· {regions[fsa] ? (dict.common.regions[regions[fsa]] ?? regions[fsa]) : m.noRegion}</span>
                  </p>
                  <p className="tabular mt-0.5 text-text-muted">
                    {!c || c.suppressed ? m.tooFew : t(m.tooltip, { pct: formatPct(locale, c.positivity), tests: formatNumber(locale, c.tested) })}
                  </p>
                </>
              );
            }}
          />
        ) : failed ? (
          <div role="alert" className="grid size-full place-items-center bg-surface-muted p-6 text-center">
            <p className="max-w-sm text-sm text-text-muted">
              {m.failed}
            </p>
          </div>
        ) : (
          <Skeleton className="size-full rounded-none" />
        )}
        {!failed && (
          <div className="absolute right-3 top-3 z-10">
            <PositivityLegend title={m.legendTitle} />
          </div>
        )}
      </div>
    </div>
  );
}
