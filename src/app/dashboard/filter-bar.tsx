"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { VIRUSES, type VirusKey } from "@/lib/viruses";
import { DEFAULT_VIRUSES, filtersToQuery, SEX_OPTIONS, WEEK_OPTIONS, type DashboardFilters } from "./filters";

const selectClass =
  "h-9 max-w-[10.5rem] rounded-[var(--radius-control)] border border-border-control bg-surface pl-3 pr-8 text-sm text-text hover:border-text-subtle focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20";

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
    !filters.ageBand &&
    !filters.sex &&
    filters.weeksParam === "12" &&
    !filters.rolling &&
    filters.viruses.join() === DEFAULT_VIRUSES.join();

  return (
    <div
      // Sticky only on wide screens: wrapped onto phones it would cover a third of the viewport.
      className="z-30 border-b border-border bg-surface/95 backdrop-blur lg:sticky lg:top-16"
      aria-busy={pending}
    >
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Viruses</legend>
          {VIRUSES.map((v) => {
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
                {v.shortLabel}
              </button>
            );
          })}
        </fieldset>

        <span aria-hidden className="mx-1 hidden h-6 w-px bg-border lg:block" />

        <label className="sr-only" htmlFor="f-area">Area</label>
        <select id="f-area" value={filters.area} onChange={(e) => setArea(e.target.value)} className={selectClass}>
          <option value="all">All areas</option>
          <optgroup label="Region">
            {areas.regions.map((r) => (
              <option key={r} value={`region:${r}`}>{r}</option>
            ))}
          </optgroup>
          <optgroup label="FSA">
            {areas.fsas.map((f) => (
              <option key={f.fsa} value={`fsa:${f.fsa}`}>{f.fsa} · {f.region}</option>
            ))}
          </optgroup>
        </select>

        <label className="sr-only" htmlFor="f-age">Age group</label>
        <select id="f-age" value={filters.ageBand ?? ""} onChange={(e) => apply({ ageBand: e.target.value || undefined })} className={selectClass}>
          <option value="">All ages</option>
          {ageBands.map((a) => (
            <option key={a} value={a}>{a} years</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-sex">Sex</label>
        <select
          id="f-sex"
          value={filters.sex ?? ""}
          onChange={(e) => apply({ sex: SEX_OPTIONS.find((o) => o.value === e.target.value)?.value })}
          className={selectClass}
        >
          <option value="">All sexes</option>
          {SEX_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-weeks">Time period</label>
        <select
          id="f-weeks"
          value={filters.weeksParam}
          onChange={(e) => apply({ weeksParam: e.target.value, weeks: e.target.value === "all" ? null : Number(e.target.value) })}
          className={selectClass}
        >
          {WEEK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 text-sm text-text-muted hover:text-text">
          <input type="checkbox" checked={!!filters.rolling} onChange={(e) => apply({ rolling: e.target.checked })} className="size-4 accent-brand-blue" />
          3-week average
        </label>

        <div className="ml-auto flex items-center gap-3">
          {pending && <span className="text-xs text-text-subtle" role="status">Updating…</span>}
          {!isDefault && (
            <button
              type="button"
              onClick={() => startTransition(() => router.replace(tab === "trends" ? pathname : `${pathname}?tab=${tab}`, { scroll: false }))}
              className="text-sm font-semibold text-brand-blue hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
