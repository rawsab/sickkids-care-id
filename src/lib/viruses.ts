import { SK } from "./brand";

export type VirusKey = "INF_A" | "INF_B" | "INF_ANY" | "COVID19" | "RSV";

export type TestResult = "detected" | "not_detected" | "indeterminate";

export interface VirusDef {
  key: VirusKey;
  /** CSV column the result comes from; null for derived series. */
  sourceColumn: string | null;
  /** Fixed data colour for this virus in every chart (order validated for colour-vision deficiency). */
  color: string;
}

export const VIRUSES: readonly VirusDef[] = [
  // Names live in the dictionaries (common.viruses). The most colour-blind-safe
  // five of the SickKids palette.
  { key: "COVID19", sourceColumn: "CORO19", color: SK.royal },
  { key: "INF_ANY", sourceColumn: null, color: SK.tangerine },
  { key: "INF_A", sourceColumn: "INF_A", color: SK.blueberry },
  { key: "INF_B", sourceColumn: "INF_B", color: SK.cherry },
  { key: "RSV", sourceColumn: "RSV_PCR", color: SK.ocean },
];

export const VIRUS_BY_KEY = Object.fromEntries(VIRUSES.map((v) => [v.key, v])) as Record<VirusKey, VirusDef>;

/** Combined influenza: positive if either type is detected, negative only if both are negative. */
export function combineInfluenza(a: TestResult, b: TestResult): TestResult {
  if (a === "detected" || b === "detected") return "detected";
  if (a === "not_detected" && b === "not_detected") return "not_detected";
  return "indeterminate";
}

/** Viruses on the public health dashboard: influenza A and B are reported separately. */
export const DASHBOARD_VIRUSES = ["COVID19", "INF_A", "INF_B", "RSV"] as const satisfies readonly VirusKey[];

/** Viruses shown to school communities on the map. */
export const COMMUNITY_VIRUSES = ["COVID19", "INF_A", "INF_B", "RSV"] as const satisfies readonly VirusKey[];
export type CommunityVirus = (typeof COMMUNITY_VIRUSES)[number];
