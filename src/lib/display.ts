import { SK, tint } from "./brand";
import type { ActivityLevel } from "./metrics";

// Activity levels are ordinal: light tangerine → tangerine → cherry, so
// lightness falls with every step. Always paired with dots and a word, never
// colour alone. Words live in the dictionaries (common.activity).
export const ACTIVITY: Record<ActivityLevel, { dots: number; color: string }> = {
  low: { dots: 1, color: tint(SK.tangerine, 0.6) },
  moderate: { dots: 2, color: SK.tangerine },
  high: { dots: 3, color: SK.cherry },
  insufficient: { dots: 0, color: tint(SK.charcoal, 0.45) },
};

export const ACTIVITY_ORDER: ActivityLevel[] = ["high", "moderate", "low", "insufficient"];

// Sequential positivity bins for the dashboard map (ocean → royal → blueberry, light → dark).
// Each bin covers [previous max, max); labels are built per language in the legend.
export const POSITIVITY_BINS: { max: number; color: string }[] = [
  { max: 2, color: tint(SK.ocean, 0.25) },
  { max: 5, color: tint(SK.ocean, 0.6) },
  { max: 10, color: SK.ocean },
  { max: 20, color: SK.royal },
  { max: Infinity, color: SK.blueberry },
];

export const positivityColor = (p: number) => POSITIVITY_BINS.find((b) => p < b.max)!.color;
