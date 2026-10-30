import type { ActivityLevel, Trend } from "./metrics";

// Activity levels are ordinal: one hue, light → dark (validated with the
// dataviz palette checker, --ordinal, against white). Always paired with dots
// and a word, never colour alone. Words live in the dictionaries (common.activity).
export const ACTIVITY: Record<ActivityLevel, { dots: number; color: string }> = {
  low: { dots: 1, color: "#ee9e5c" },
  moderate: { dots: 2, color: "#d9622b" },
  high: { dots: 3, color: "#9e3410" },
  insufficient: { dots: 0, color: "#a3adba" },
};

export const ACTIVITY_ORDER: ActivityLevel[] = ["high", "moderate", "low", "insufficient"];

// Sequential positivity bins for the dashboard map (single blue hue, light → dark).
export const TREND_ARROW: Record<Trend, string> = { rising: "↗", falling: "↘", steady: "→" };

// Each bin covers [previous max, max); labels are built per language in the legend.
export const POSITIVITY_BINS: { max: number; color: string }[] = [
  { max: 2, color: "#cde2fb" },
  { max: 5, color: "#86b6ef" },
  { max: 10, color: "#3987e5" },
  { max: 20, color: "#1c5cab" },
  { max: Infinity, color: "#0d366b" },
];

export const positivityColor = (p: number) => POSITIVITY_BINS.find((b) => p < b.max)!.color;
