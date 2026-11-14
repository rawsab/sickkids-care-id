"use client";

import { useI18n } from "@/i18n/client";
import { formatNumber, plural, t } from "@/i18n/format";
import { shortWeek } from "@/lib/format";
import type { TestCount } from "@/lib/test-counts";

/**
 * A few weekly test counts as plain HTML bars from a zero baseline, each with
 * its number written above it. Weeks without a shown number get a label
 * instead of a bar, so "hidden" or "nothing reported" never looks like zero.
 */
export function TestBars({
  weeks,
  values,
  color,
  label,
  partialLast,
  minTests,
}: {
  weeks: string[];
  values: TestCount[];
  color: string;
  /** Names the chart for screen readers. */
  label: string;
  partialLast: boolean;
  minTests: number;
}) {
  const { locale, dict } = useI18n();
  const k = dict.kids.tests;
  const max = Math.max(0, ...values.filter((v): v is number => typeof v === "number"));

  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((week, i) => {
          const v = values[i];
          const date = shortWeek(week, locale);
          const partial = partialLast && i === weeks.length - 1;
          const spoken =
            typeof v === "number"
              ? plural(locale, v, k.barSr, { date })
              : v === "no_data"
                ? t(k.noneSr, { date })
                : t(k.tooFewSr, { date, minTests });
          return (
            <li key={week} className="flex flex-col">
              <span className="sr-only">
                {spoken}
                {partial && `. ${k.partial}`}
              </span>
              <div aria-hidden className="flex h-56 flex-col items-center justify-end border-b-2 border-text px-1.5 sm:px-3">
                {typeof v === "number" ? (
                  <>
                    <span className="tabular mb-1 text-xl font-bold text-text sm:text-2xl">{formatNumber(locale, v)}</span>
                    <span
                      className={`w-full max-w-20 rounded-t-lg ${partial ? "opacity-60" : ""}`}
                      style={{ height: `${Math.max(2, (v / max) * 100) * 0.78}%`, background: color }}
                    />
                  </>
                ) : (
                  <span className="mb-2 flex flex-col items-center gap-2 text-center text-sm font-semibold leading-tight text-text-muted sm:text-base">
                    {v === "no_data" ? (
                      <span className="text-2xl leading-none text-text-subtle">–</span>
                    ) : (
                      <span className="hatch size-8 rounded-md ring-1 ring-border-strong" />
                    )}
                    {v === "no_data" ? k.none : k.tooFew}
                  </span>
                )}
              </div>
              <span aria-hidden className="mt-2 text-center text-base leading-tight text-text-muted">
                <span className="block text-sm">{k.weekOf}</span>
                <span className="block font-semibold text-text">{date}</span>
                {partial && <span className="mt-1 block text-sm italic">{k.partial}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
