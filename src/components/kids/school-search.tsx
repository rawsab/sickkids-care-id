"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/client";
import { plural, t } from "@/i18n/format";
import { decodeSchools, indexSchools, searchSchools, SCHOOLS_URL, type School, type SchoolFile, type SchoolIndex } from "@/lib/schools";

export type SchoolList =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; index: SchoolIndex; source: SchoolFile["source"] };

/**
 * Loads the official school list once, in the browser. Searching happens on
 * this device, so school names typed here are never sent anywhere.
 */
export function useSchoolList(): SchoolList {
  const [list, setList] = useState<SchoolList>({ status: "loading" });
  useEffect(() => {
    let live = true;
    fetch(SCHOOLS_URL)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SchoolFile>;
      })
      .then((file) => live && setList({ status: "ready", index: indexSchools(decodeSchools(file)), source: file.source }))
      .catch(() => live && setList({ status: "error" }));
    return () => {
      live = false;
    };
  }, []);
  return list;
}

const MAX_RESULTS = 8;

/** Combobox with a list of matching schools (WAI-ARIA combobox pattern, list autocomplete). */
export function SchoolSearch({ list, onPick }: { list: SchoolList; onPick: (school: School) => void }) {
  const { locale, dict } = useI18n();
  const k = dict.kids.area;
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const results = useMemo(
    () => (list.status === "ready" ? searchSchools(list.index, query, MAX_RESULTS) : []),
    [list, query],
  );
  const searching = query.trim().length >= 2;
  const expanded = open && results.length > 0;
  const optionId = (i: number) => `${id}-option-${i}`;

  const pick = (school: School) => {
    setQuery(school.name);
    setOpen(false);
    setActive(-1);
    onPick(school);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!results.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a === -1 ? (step === 1 ? 0 : results.length - 1) : (a + step + results.length) % results.length));
    } else if (e.key === "Enter") {
      if (expanded && active >= 0) {
        e.preventDefault();
        pick(results[active]);
      }
    } else if (e.key === "Escape") {
      if (expanded) setOpen(false);
      else setQuery("");
      setActive(-1);
    }
  };

  let status = "";
  if (list.status === "loading") status = k.schoolsLoading;
  else if (list.status === "error") status = k.schoolsFailed;
  else if (searching && open) status = results.length ? plural(locale, results.length, k.resultsCount) : t(k.noSchools, { query: query.trim() });

  // Shown on screen when typing finds nothing, or before the list has loaded; otherwise read out only.
  const noMatches = searching && open && list.status === "ready" && !results.length;
  const visibleStatus = noMatches || (searching && list.status === "loading");

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="flex items-center gap-2 text-xl font-bold text-text">
        <Icon name="school" className="size-6 text-brand-royal" />
        {k.schoolLabel}
      </label>
      <p id={`${id}-hint`} className="mt-1 text-base text-text-muted">
        {k.schoolHint}
      </p>
      <div className="relative mt-3">
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-text-muted" />
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={k.schoolPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-h-14 w-full rounded-[var(--radius-control)] border-2 border-border-control bg-surface py-3 pl-13 pr-4 text-lg text-text placeholder:text-text-subtle focus:border-brand-royal focus:outline-none"
        />
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={k.schoolLabel}
          hidden={!expanded}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[22rem] overflow-y-auto rounded-[var(--radius-control)] bg-surface py-1 shadow-overlay ring-1 ring-border"
        >
          {results.map((s, i) => (
            <li
              key={s.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              // Keep focus in the input; the option is chosen on click.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              onMouseMove={() => setActive(i)}
              className={`cursor-pointer px-4 py-3 ${i === active ? "bg-brand-sky" : ""}`}
            >
              <span className="block font-semibold text-text">{s.name}</span>
              <span className="block text-base text-text-muted">
                {s.street}, {s.city}
              </span>
              <span className="block text-sm text-text-subtle">
                {t(k.schoolDetail, { board: s.board, grades: s.grades })}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p role="status" className={visibleStatus ? "mt-3 rounded-lg bg-surface-muted px-4 py-3 text-base" : "sr-only"}>
        {status}
        {noMatches && <span className="mt-1 block text-text-muted">{k.noSchoolsHelp}</span>}
      </p>
      {list.status === "error" && (
        <p className="mt-3 rounded-lg bg-warning-surface px-4 py-3 text-base ring-1 ring-warning-border">{k.schoolsFailed}</p>
      )}
    </div>
  );
}
