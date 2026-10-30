"use client";

import { useI18n } from "@/i18n/client";
import { Icon, type IconName } from "@/components/ui/icons";
import { ACTIVITY } from "@/lib/display";
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

const TREND_ICON: Record<Trend, IconName> = { rising: "arrowUpRight", falling: "arrowDownRight", steady: "arrowRight" };

/** Level with dots and a word; text stays in text colours, the dots carry the hue. */
export function ActivityBadge({ level, trend, size = "md" }: { level: ActivityLevel; trend?: Trend | null; size?: "sm" | "md" }) {
  const { dict } = useI18n();
  return (
    <span className="inline-flex items-center gap-2">
      <ActivityDots level={level} size={size} />
      <span className={`font-semibold ${level === "insufficient" ? "text-text-muted" : "text-text"} ${size === "sm" ? "text-sm" : ""}`}>
        {dict.common.activity[level]}
      </span>
      {trend && (
        <span className={`inline-flex items-center gap-1 text-text-muted ${size === "sm" ? "text-xs" : "text-sm"}`}>
          <Icon name={TREND_ICON[trend]} className="size-[1.1em]" />
          {dict.common.trend[trend]}
        </span>
      )}
    </span>
  );
}
