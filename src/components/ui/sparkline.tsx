"use client";

import { useI18n } from "@/i18n/client";
import { INK } from "@/lib/brand";

/** Tiny inline trend line. Nulls (suppressed weeks) break the line rather than being bridged. */
export function Sparkline({
  values,
  color,
  width = 120,
  height = 32,
  label,
}: {
  values: (number | null)[];
  color: string;
  width?: number;
  height?: number;
  label?: string;
}) {
  const { dict } = useI18n();
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) {
    return <span className="text-xs text-text-subtle">{dict.common.noTrend}</span>;
  }
  const max = Math.max(10, ...known);
  const pad = 3;
  const x = (i: number) => pad + (i * (width - 2 * pad)) / Math.max(1, values.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - 2 * pad);

  let d = "";
  values.forEach((v, i) => {
    if (v === null) return;
    d += `${i === 0 || values[i - 1] === null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  const lastIndex = values.findLastIndex((v) => v !== null);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke={INK.border} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(lastIndex)} cy={y(values[lastIndex]!)} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}
