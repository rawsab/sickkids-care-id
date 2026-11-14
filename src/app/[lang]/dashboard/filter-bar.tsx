"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { DEFAULT_AGE_BANDS } from "@/lib/ingest/deidentify";
import { DASHBOARD_VIRUSES, VIRUS_BY_KEY, type VirusKey } from "@/lib/viruses";
import { AgeRangeFilter } from "./age-range-filter";
import { ageFilter, DEFAULT_VIRUSES, filtersToQuery, SEX_OPTIONS, WEEK_OPTIONS, type DashboardFilters } from "./filters";

const selectClass =
  "select-chevron h-9 max-w-[13rem] rounded-[var(--radius-control)] border border-border-control bg-surface pl-3 pr-9 text-sm text-text hover:border-text-subtle focus:border-brand-royal focus:outline-none focus:ring-2 focus:ring-brand-royal/20";

/** Filters apply immediately; state lives in the URL so views can be shared. */
export function FilterBar({
  filters,
  tab,
  areas,
  ageBands,
}: {
  filters: DashboardFilters;
  tab: string;
  areas: { regions: string[]; fsas: { fsa: string; region: string }[] };
  ageBands: string[];
}) {
  const { dict } = useI18n();
  const f = dict.dashboard.filters;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const apply = (patch: Partial<DashboardFilters>) => {
    const next = { ...filters, ...patch };
    const q = new URLSearchParams(filtersToQuery(next));
    if (tab !== "trends") q.set("tab", tab);
    startTransition(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  };

  const toggleVirus = (v: VirusKey) => {
    const has = filters.viruses.includes(v);
    if (has && filters.viruses.length === 1) return; // keep at least one
    apply({ viruses: has ? filters.viruses.filter((x) => x !== v) : [...filters.viruses, v] });
  };

  const setArea = (area: string) => {
    const [kind, value] = area.split(":", 2);
    apply({ area, region: kind === "region" ? value : undefined, fsa: kind === "fsa" ? value : undefined });
  };

  const isDefault =
    filters.area === "all" &&
    !filters.age &&
    !filters.sex &&
    filters.weeksParam === "12" &&
    !filters.rolling &&
    filters.viruses.join() === DEFAULT_VIRUSES.join();

  return (
    <div
      // Sticky only on wide screens: wrapped onto phones it would cover a third of the viewport.
      className="z-30 border-b border-border bg-surface/95 backdrop-blur lg:sticky lg:top-18"
      aria-busy={pending}
    >
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">{f.viruses}</legend>
          {DASHBOARD_VIRUSES.map((key) => {
            const v = VIRUS_BY_KEY[key];
            const on = filters.viruses.includes(v.key);
            return (
              <button
                key={v.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleVirus(v.key)}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 transition ${
                  on ? "bg-surface text-text shadow-card ring-border-strong" : "text-text-subtle ring-border hover:text-text"
                }`}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full ring-2 ring-inset"
                  style={{ background: on ? v.color : "transparent", ["--tw-ring-color" as string]: v.color }}
                />
                {dict.common.viruses[v.key].label.split(" (")[0]}
              </button>
            );
          })}
        </fieldset>

        <span aria-hidden className="mx-1 hidden h-6 w-px bg-border lg:block" />

        <label className="sr-only" htmlFor="f-area">{f.area}</label>
        <select id="f-area" value={filters.area} onChange={(e) => setArea(e.target.value)} className={selectClass}>
          <option value="all">{f.allAreas}</option>
          <optgroup label={f.regionGroup}>
            {areas.regions.map((r) => (
              <option key={r} value={`region:${r}`}>{dict.common.regions[r] ?? r}</option>
            ))}
          </optgroup>
          <optgroup label={f.fsaGroup}>
            {areas.fsas.map((a) => (
              <option key={a.fsa} value={`fsa:${a.fsa}`}>{a.fsa} · {dict.common.regions[a.region] ?? a.region}</option>
            ))}
          </optgroup>
        </select>

        <AgeRangeFilter
          bands={DEFAULT_AGE_BANDS.filter((b) => ageBands.includes(b.label))}
          value={filters.age}
          onApply={(range) => apply(ageFilter(range))}
          buttonClass={`${selectClass} min-w-[8.5rem]`}
        />

        <label className="sr-only" htmlFor="f-sex">{f.sex}</label>
        <select
          id="f-sex"
          value={filters.sex ?? ""}
          onChange={(e) => apply({ sex: SEX_OPTIONS.find((o) => o === e.target.value) })}
          className={selectClass}
        >
          <option value="">{f.allSexes}</option>
          {SEX_OPTIONS.map((o) => (
            <option key={o} value={o}>{dict.common.sex[o]}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-weeks">{f.period}</label>
        <select
          id="f-weeks"
          value={filters.weeksParam}
          onChange={(e) => apply({ weeksParam: e.target.value, weeks: e.target.value === "all" ? null : Number(e.target.value) })}
          className={selectClass}
        >
          {WEEK_OPTIONS.map((o) => (
            <option key={o} value={o}>{f.weeks[o]}</option>
          ))}
        </select>

        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 text-sm text-text-muted hover:text-text">
          <input type="checkbox" checked={!!filters.rolling} onChange={(e) => apply({ rolling: e.target.checked })} className="size-4 accent-brand-royal" />
          {f.rolling}
        </label>

        <div className="ml-auto flex items-center gap-3">
          {pending && <span className="text-xs text-text-subtle" role="status">{f.updating}</span>}
          {!isDefault && (
            <button
              type="button"
              onClick={() => startTransition(() => router.replace(tab === "trends" ? pathname : `${pathname}?tab=${tab}`, { scroll: false }))}
              className="text-sm font-semibold text-brand-royal hover:underline"
            >
              {f.reset}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
