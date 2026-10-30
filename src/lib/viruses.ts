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
  // Names live in the dictionaries (common.viruses).
  { key: "COVID19", sourceColumn: "CORO19", color: "#2a78d6" },
  { key: "INF_ANY", sourceColumn: null, color: "#eb6834" },
  { key: "INF_A", sourceColumn: "INF_A", color: "#6250d6" },
  { key: "INF_B", sourceColumn: "INF_B", color: "#eda100" },
  { key: "RSV", sourceColumn: "RSV_PCR", color: "#1baf7a" },
];

export const VIRUS_BY_KEY = Object.fromEntries(VIRUSES.map((v) => [v.key, v])) as Record<VirusKey, VirusDef>;

/** Combined influenza: positive if either type is detected, negative only if both are negative. */
export function combineInfluenza(a: TestResult, b: TestResult): TestResult {
  if (a === "detected" || b === "detected") return "detected";
  if (a === "not_detected" && b === "not_detected") return "not_detected";
  return "indeterminate";
}

/** Viruses shown to school communities (influenza types are combined). */
export const COMMUNITY_VIRUSES = ["COVID19", "INF_ANY", "RSV"] as const satisfies readonly VirusKey[];
export type CommunityVirus = (typeof COMMUNITY_VIRUSES)[number];
