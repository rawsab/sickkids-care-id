import { ACTIVITY, TREND } from "@/lib/display";
import type { ActivityLevel, Trend } from "@/lib/metrics";

export function ActivityDots({ level, size = "md" }: { level: ActivityLevel; size?: "sm" | "md" }) {
  const meta = ACTIVITY[level];
  const dim = size === "sm" ? "size-2.5" : "size-3";
  return (
    <span aria-hidden className="flex gap-1">
      {[1, 2, 3].map((n) =>
        level === "insufficient" ? (
          <span key={n} className={`${dim} hatch rounded-full`} />
        ) : (
          <span
            key={n}
            className={`${dim} rounded-full border-[1.5px]`}
            style={{ borderColor: meta.color, background: n <= meta.dots ? meta.color : "transparent" }}
          />
        ),
      )}
    </span>
  );
}

/** Level with dots and a word; text stays in text colours, the dots carry the hue. */
export function ActivityBadge({ level, trend, size = "md" }: { level: ActivityLevel; trend?: Trend | null; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ActivityDots level={level} size={size} />
      <span className={`font-semibold ${level === "insufficient" ? "text-text-muted" : "text-text"} ${size === "sm" ? "text-sm" : ""}`}>
        {ACTIVITY[level].label}
      </span>
      {trend && (
        <span className={`text-text-muted ${size === "sm" ? "text-xs" : "text-sm"}`}>
          <span aria-hidden>{TREND[trend].arrow}</span> {TREND[trend].label}
        </span>
      )}
    </span>
  );
}
