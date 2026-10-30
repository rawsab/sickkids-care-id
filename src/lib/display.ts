import type { ActivityLevel, Trend } from "./metrics";

// Activity levels are ordinal: one hue, light → dark (validated with the
// dataviz palette checker, --ordinal, against white). Always paired with dots
// and a word, never colour alone.
export const ACTIVITY: Record<ActivityLevel, { label: string; dots: number; color: string; description: string }> = {
  low: { label: "Low", dots: 1, color: "#ee9e5c", description: "Little virus detected" },
  moderate: { label: "Moderate", dots: 2, color: "#d9622b", description: "Virus is circulating" },
  high: { label: "High", dots: 3, color: "#9e3410", description: "Virus is widespread" },
  insufficient: { label: "Not enough data", dots: 0, color: "#a3adba", description: "Too few tests to report" },
};

export const ACTIVITY_ORDER: ActivityLevel[] = ["high", "moderate", "low", "insufficient"];

export const TREND: Record<Trend, { label: string; arrow: string }> = {
  rising: { label: "Rising", arrow: "↗" },
  falling: { label: "Falling", arrow: "↘" },
  steady: { label: "Steady", arrow: "→" },
};

// Sequential positivity bins for the dashboard map (single blue hue, light → dark).
export const POSITIVITY_BINS: { max: number; color: string; label: string }[] = [
  { max: 2, color: "#cde2fb", label: "Under 2%" },
  { max: 5, color: "#86b6ef", label: "2–5%" },
  { max: 10, color: "#3987e5", label: "5–10%" },
  { max: 20, color: "#1c5cab", label: "10–20%" },
  { max: Infinity, color: "#0d366b", label: "20% or more" },
];

export const positivityColor = (p: number) => POSITIVITY_BINS.find((b) => p < b.max)!.color;
