"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n/client";
import { formatNumber, t } from "@/i18n/format";
import { INK } from "@/lib/brand";
import { shortWeek } from "@/lib/format";
import type { TestCount } from "@/lib/test-counts";

export interface TestCountSeries {
  key: string;
  label: string;
  color: string;
  /** Weekly test counts, aligned with `weeks`; a gap reason where there is no number. */
  values: TestCount[];
}

const GAP = (key: string) => `${key}__gap`;

/**
 * Weekly test counts as grouped bars, one per virus, from a zero baseline.
 * Suppressed weeks get a hollow ring on the baseline rather than a bar, so a
 * hidden count is never drawn as a value; weeks with nothing reported get no
 * mark. A table with the same figures follows the chart.
 */
export function TestCountChart({
  weeks,
  series,
  partialThrough,
  minTests,
  height = 260,
}: {
  weeks: string[];
  series: TestCountSeries[];
  /** Latest collection date when the last week isn't over yet. */
  partialThrough: string | null;
  minTests: number;
  height?: number;
}) {
  const { locale, dict } = useI18n();
  const c = dict.dashboard.testChart;
  const last = weeks.length - 1;
  // Gaps are plotted as 0 only so the shape below can draw their marker; the
  // tooltip and table read the gap reason instead.
  const data = weeks.map((week, i) => ({
    week,
    ...Object.fromEntries(series.flatMap((s) => [[s.key, typeof s.values[i] === "number" ? s.values[i] : 0], [GAP(s.key), typeof s.values[i] === "number" ? null : s.values[i]]])),
  }));
  const gapText = (gap: string) => (gap === "no_data" ? c.noData : t(c.suppressed, { minTests }));
  const weekText = (week: string, i: number) =>
    t(dict.dashboard.chart.weekOf, { date: shortWeek(week, locale) }) + (i === last && partialThrough ? ` ${t(c.partialShort, { date: shortWeek(partialThrough, locale) })}` : "");

  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div aria-hidden>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap="18%" barGap={1}>
            <CartesianGrid stroke={INK.grid} vertical={false} />
            <XAxis
              dataKey="week"
              height={30}
              tickFormatter={(w: string) => shortWeek(w, locale)}
              tick={{ fontSize: 12, fill: INK.subtle }}
              tickLine={false}
              axisLine={{ stroke: INK.borderStrong }}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(v: number) => formatNumber(locale, v)}
              tick={{ fontSize: 12, fill: INK.subtle }}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={[0, "auto"]}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: INK.grid }}
              contentStyle={{ borderRadius: 12, border: `1px solid ${INK.border}`, boxShadow: "0 8px 24px -8px rgb(0 32 88 / 0.2)", fontSize: 13 }}
              labelStyle={{ fontWeight: 600, color: INK.text, marginBottom: 4 }}
              itemStyle={{ color: INK.text, padding: 0 }}
              labelFormatter={(w) => weekText(String(w), weeks.indexOf(String(w)))}
              formatter={(value, _name, item) => {
                const gap = (item.payload as Record<string, string | null>)[GAP(String(item.dataKey))];
                return gap ? gapText(gap) : t(c.tooltip, { count: formatNumber(locale, Number(value)) });
              }}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                isAnimationActive={false}
                shape={(props: { x?: number; y?: number; width?: number; height?: number; index?: number; payload?: Record<string, unknown> }) => {
                  const { x = 0, y = 0, width = 0, height: h = 0, index = 0, payload } = props;
                  const gap = payload?.[GAP(s.key)];
                  if (gap === "no_data") return <g />;
                  if (gap) {
                    const r = Math.max(2, Math.min(4, width / 2 - 0.5));
                    return <circle cx={x + width / 2} cy={y - r - 1} r={r} fill="#fff" stroke={s.color} strokeWidth={1.5} />;
                  }
                  return <rect x={x} y={y} width={width} height={h} fill={s.color} fillOpacity={index === last && partialThrough ? 0.45 : 1} rx={1} />;
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-text-subtle">
        {t(c.marksNote, { minTests })}
        {partialThrough && ` ${t(c.partialNote, { date: shortWeek(partialThrough, locale) })}`}
      </p>

      <details className="group mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-2 text-sm font-semibold text-brand-royal hover:bg-brand-sky">
          {c.tableToggle}
        </summary>
        <div className="mt-2 max-h-80 overflow-auto rounded-xl ring-1 ring-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{c.title}</caption>
            <thead className="sticky top-0 bg-surface-muted text-text-muted">
              <tr>
                <th scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold">{dict.dashboard.table.weekOf}</th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="whitespace-nowrap px-4 py-2.5 text-right font-semibold">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-border">
              {[...weeks].reverse().map((week, ri) => {
                const i = last - ri;
                return (
                  <tr key={week}>
                    <th scope="row" className="whitespace-nowrap px-4 py-2 font-medium">
                      {shortWeek(week, locale)}
                      {i === last && partialThrough && <span className="ml-1 font-normal text-text-subtle">{t(c.partialShort, { date: shortWeek(partialThrough, locale) })}</span>}
                    </th>
                    {series.map((s) => {
                      const v = s.values[i];
                      return (
                        <td key={s.key} className="px-4 py-2 text-right">
                          {typeof v === "number" ? formatNumber(locale, v) : <span className="text-text-subtle">{gapText(v)}</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
