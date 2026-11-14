"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/client";
import { t } from "@/i18n/format";
import { areaForPostalCode, fsaAt, type FsaCollection } from "@/lib/geo";
import { schoolArea, type School } from "@/lib/schools";
import { SchoolSearch, type SchoolList } from "./school-search";

export type AreaChoice =
  | { fsa: string; via: "school"; school: string }
  | { fsa: string; via: "location"; approximate: boolean }
  | { fsa: string; via: "postal" | "list" | "map" };

export type GeoState = { status: "loading" } | { status: "error" } | { status: "ready"; collection: FsaCollection; fsas: Set<string> };

// A reported accuracy worse than this (metres) is several FSAs wide in the
// city, so the page says the area may be wrong. A usability choice, not a data rule.
const APPROXIMATE_METRES = 1500;

export const bigButton =
  "inline-flex min-h-14 items-center justify-center gap-3 rounded-[var(--radius-control)] px-6 py-3 text-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function AreaPicker({
  geo,
  schools,
  regionOf,
  towns,
  onChoose,
  onCancel,
}: {
  geo: GeoState;
  schools: SchoolList;
  regionOf: (fsa: string) => string;
  towns: Record<string, string>;
  onChoose: (choice: AreaChoice) => void;
  onCancel?: () => void;
}) {
  const { dict } = useI18n();
  const k = dict.kids.area;
  const e = k.errors;
  const [message, setMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const covered = geo.status === "ready" ? geo.fsas : null;

  const locate = () => {
    setMessage(null);
    if (!("geolocation" in navigator)) return setMessage(e.unsupported);
    if (geo.status === "loading") return setMessage(e.mapLoading);
    if (geo.status === "error") return setMessage(e.unavailable);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      // Only the FSA is kept; the coordinates go out of scope here.
      ({ coords }) => {
        setLocating(false);
        const fsa = fsaAt(geo.collection, coords.longitude, coords.latitude);
        if (!fsa) return setMessage(e.outside);
        onChoose({ fsa, via: "location", approximate: coords.accuracy > APPROXIMATE_METRES });
      },
      (err) => {
        setLocating(false);
        setMessage(err.code === 1 ? e.denied : err.code === 3 ? e.timeout : e.unavailable);
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const pickSchool = (school: School) => {
    const area = schoolArea(school, covered);
    if ("error" in area) {
      setMessage(t(area.error === "poBox" ? e.schoolPoBox : e.schoolOutside, { school: school.name }));
      return;
    }
    setMessage(null);
    onChoose({ fsa: area.fsa, via: "school", school: school.name });
  };

  return (
    <div className="space-y-8">
      <div>
        <button type="button" onClick={locate} disabled={locating} className={`${bigButton} w-full bg-brand-royal text-white shadow-card hover:bg-brand-royal-dark sm:w-auto`}>
          <Icon name="mapPin" className="size-6" />
          {locating ? k.locating : k.useLocation}
        </button>
      </div>

      {message && (
        <p role="alert" className="rounded-xl bg-warning-surface px-4 py-3 ring-1 ring-warning-border">
          {message}
        </p>
      )}

      <SchoolSearch list={schools} onPick={pickSchool} />

      <details className="group rounded-xl ring-1 ring-border">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 font-bold text-brand-royal hover:bg-brand-sky [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Icon name="list" className="size-6" />
            {k.otherWays}
          </span>
          <Icon name="chevronDown" className="size-6 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-8 border-t border-border px-4 py-5 md:grid-cols-2">
          <AreaList covered={covered} regionOf={regionOf} towns={towns} onChoose={(fsa) => onChoose({ fsa, via: "list" })} />
          <PostalForm
            onSubmit={(value) => {
              const area = areaForPostalCode(value, covered);
              if ("error" in area) return area.error === "notPostal" ? e.notPostal : t(e.postalOutside, { fsa: area.fsa! });
              setMessage(null);
              onChoose({ fsa: area.fsa, via: "postal" });
              return null;
            }}
          />
        </div>
      </details>

      {onCancel && (
        <button type="button" onClick={onCancel} className="min-h-12 rounded-[var(--radius-control)] px-4 font-semibold text-brand-royal hover:bg-brand-sky">
          {k.cancel}
        </button>
      )}
    </div>
  );
}

const selectClass =
  "select-chevron min-h-12 w-full rounded-[var(--radius-control)] border-2 border-border-control bg-surface py-2 pl-3 pr-9 text-lg text-text focus:border-brand-royal focus:outline-none";

/** Region, then area, from the FSAs on the map. Area codes come with the town most of their schools list. */
function AreaList({
  covered,
  regionOf,
  towns,
  onChoose,
}: {
  covered: ReadonlySet<string> | null;
  regionOf: (fsa: string) => string;
  towns: Record<string, string>;
  onChoose: (fsa: string) => void;
}) {
  const { dict } = useI18n();
  const k = dict.kids.area;
  const [region, setRegion] = useState("");
  const [fsa, setFsa] = useState("");

  const byRegion = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const f of [...(covered ?? [])].sort()) {
      const r = regionOf(f);
      out.set(r, [...(out.get(r) ?? []), f]);
    }
    return out;
  }, [covered, regionOf]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (fsa) onChoose(fsa);
      }}
      className="space-y-3"
    >
      <h3 className="text-lg font-bold">{k.listTitle}</h3>
      <div>
        <label htmlFor="kids-region" className="block text-base font-semibold">
          {k.regionLabel}
        </label>
        <select
          id="kids-region"
          value={region}
          disabled={!covered}
          onChange={(e) => {
            setRegion(e.target.value);
            setFsa("");
          }}
          className={`${selectClass} mt-1`}
        >
          <option value="">{k.regionPlaceholder}</option>
          {[...byRegion.keys()].sort().map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="kids-fsa" className="block text-base font-semibold">
          {k.fsaLabel}
        </label>
        <select id="kids-fsa" value={fsa} disabled={!region} onChange={(e) => setFsa(e.target.value)} className={`${selectClass} mt-1`}>
          <option value="">{k.fsaPlaceholder}</option>
          {(byRegion.get(region) ?? []).map((f) => (
            <option key={f} value={f}>
              {towns[f] ? t(k.fsaOption, { fsa: f, town: towns[f] }) : f}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-text-muted">{k.fsaHint}</p>
      </div>
      <button type="submit" disabled={!fsa} className={`${bigButton} min-h-12 w-full bg-brand-royal text-white hover:bg-brand-royal-dark`}>
        {k.show}
      </button>
    </form>
  );
}

/** `onSubmit` returns an error to show beside the field, or null. */
function PostalForm({ onSubmit }: { onSubmit: (value: string) => string | null }) {
  const { dict } = useI18n();
  const k = dict.kids.area;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) setError(onSubmit(value));
      }}
      className="space-y-3"
    >
      <h3 className="text-lg font-bold">{k.postalTitle}</h3>
      <div>
        <label htmlFor="kids-postal" className="block text-base font-semibold">
          {k.postalLabel}
        </label>
        <input
          id="kids-postal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={k.postalPlaceholder}
          autoComplete="postal-code"
          aria-describedby="kids-postal-hint"
          aria-invalid={error ? true : undefined}
          className="mt-1 min-h-12 w-full rounded-[var(--radius-control)] border-2 border-border-control bg-surface px-3 text-lg uppercase text-text placeholder:normal-case placeholder:text-text-subtle focus:border-brand-royal focus:outline-none"
        />
        <p id="kids-postal-hint" className="mt-1 text-sm text-text-muted">
          {k.postalHint}
        </p>
        {error && (
          <p role="alert" className="mt-2 rounded-lg bg-warning-surface px-3 py-2 text-base ring-1 ring-warning-border">
            {error}
          </p>
        )}
      </div>
      <button type="submit" className={`${bigButton} min-h-12 w-full border-2 border-brand-royal bg-surface text-brand-royal hover:bg-brand-sky`}>
        {k.show}
      </button>
    </form>
  );
}
