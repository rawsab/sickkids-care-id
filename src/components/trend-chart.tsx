"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/i18n/client";
import { INTL_LOCALE, type Locale } from "@/i18n/config";
import { formatPct, t } from "@/i18n/format";

export interface TrendLine {
  key: string;
  label: string;
  color: string;
  /** Percent positivity per week; null where suppressed or no data. */
  values: (number | null)[];
}

const shortDate = (iso: string, locale: Locale) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(INTL_LOCALE[locale], { month: "short", day: "numeric", timeZone: "UTC" });

const INK_MUTED = "#626e7c"; // --text-subtle; Recharts needs a literal
const GRID = "#e9edf2";
const MARGIN = { top: 12, right: 96, bottom: 4, left: 0 };
const X_AXIS_HEIGHT = 30;
const LABEL_GAP = 15;

/** Vertical nudges (px) that keep end-of-line labels from overlapping. */
function endLabelOffsets(lines: TrendLine[], yMax: number, plotHeight: number): Record<string, number> {
  const ends = lines
    .map((l) => ({ key: l.key, v: l.values.findLast((v) => v !== null) }))
    .filter((e): e is { key: string; v: number } => e.v !== undefined)
    .map((e) => ({ key: e.key, y: plotHeight * (1 - e.v / yMax) }))
    .sort((a, b) => a.y - b.y);
  const placed = ends.map((e) => ({ ...e, at: e.y }));
  for (let i = 1; i < placed.length; i++) placed[i].at = Math.max(placed[i].at, placed[i - 1].at + LABEL_GAP);
  // Shift the stack back up if it ran past the bottom of the plot.
  const overflow = (placed.at(-1)?.at ?? 0) - plotHeight;
  if (overflow > 0) placed.forEach((p) => (p.at -= overflow));
  return Object.fromEntries(placed.map((p) => [p.key, p.at - p.y]));
}

/**
 * Weekly positivity lines. Each line is labelled at its last published point
 * (identity never relies on colour alone); suppressed weeks are gaps.
 */
export function TrendChart({ weeks, lines, height = 340 }: { weeks: string[]; lines: TrendLine[]; height?: number }) {
  const { locale, dict } = useI18n();
  const data = weeks.map((week, i) => ({ week, ...Object.fromEntries(lines.map((l) => [l.key, l.values[i]])) }));
  const max = Math.max(0, ...lines.flatMap((l) => l.values.filter((v): v is number => v !== null)));
  const step = max > 40 ? 20 : max > 20 ? 10 : 5;
  const yMax = Math.max(10, Math.ceil(max / step) * step);
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const labelOffsets = endLabelOffsets(lines, yMax, height - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT);

  return (
    <div>
      {/* HTML rather than Recharts' legend so it can wrap on narrow screens without overlapping the plot. */}
      {lines.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={MARGIN}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="week"
            height={X_AXIS_HEIGHT}
            tickFormatter={(w: string) => shortDate(w, locale)}
            tick={{ fontSize: 12, fill: INK_MUTED }}
            tickLine={false}
            axisLine={{ stroke: "#c9d1dc" }}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v: number) => formatPct(locale, v).replace(/[.,]0(?=\s?%)/, "")}
            tick={{ fontSize: 12, fill: INK_MUTED }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[0, yMax]}
            ticks={ticks}
          />
          <Tooltip
            cursor={{ stroke: "#c9d1dc", strokeWidth: 1 }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e7ee", boxShadow: "0 8px 24px -8px rgb(15 27 45 / 0.2)", fontSize: 13 }}
            labelStyle={{ fontWeight: 600, color: "#0f1b2d", marginBottom: 4 }}
            itemStyle={{ color: "#0f1b2d", padding: 0 }}
            labelFormatter={(w) => t(dict.dashboard.chart.weekOf, { date: shortDate(String(w), locale) })}
            formatter={(v) => (typeof v === "number" ? formatPct(locale, v) : dict.common.tooFewTests)}
          />
          {lines.map((l) => {
            const last = l.values.findLastIndex((v) => v !== null);
            return (
              <Line
                key={l.key}
                dataKey={l.key}
                name={l.label}
                stroke={l.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
                label={({ x, y, index }: { x?: number | string; y?: number | string; index?: number }) =>
                  index === last ? (
                    <text key={`${l.key}-label`} x={Number(x) + 8} y={Number(y) + (labelOffsets[l.key] ?? 0)} dy={4} fontSize={12} fontWeight={600} fill="#0f1b2d">
                      {l.label.split(" (")[0]}
                    </text>
                  ) : (
                    <g key={`${l.key}-${index}`} />
                  )
                }
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
