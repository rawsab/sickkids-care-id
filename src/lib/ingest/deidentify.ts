import { toIsoDate, weekStart } from "../epiweek";
import { combineInfluenza, type TestResult, type VirusKey } from "../viruses";
import type { Sex, ValidRecord } from "./validate";

export interface AgeBand {
  label: string;
  min: number;
  max: number;
}

export const DEFAULT_AGE_BANDS: readonly AgeBand[] = [
  { label: "0–3", min: 0, max: 3 },
  { label: "4–8", min: 4, max: 8 },
  { label: "9–13", min: 9, max: 13 },
  { label: "14–19", min: 14, max: 19 },
];

/**
 * A test record with direct identifiers coarsened: the collection date
 * becomes its epi week, exact age becomes an age band. Exists only in memory
 * between validation and aggregation.
 */
export interface DeidentifiedRecord {
  weekStart: string;
  fsa: string;
  region: string;
  ageBand: string;
  sex: Sex;
  results: Partial<Record<VirusKey, TestResult>>;
}

export function ageBandFor(age: number, bands: readonly AgeBand[] = DEFAULT_AGE_BANDS): string {
  return bands.find((b) => age >= b.min && age <= b.max)?.label ?? "Other";
}

export function deidentify(
  record: ValidRecord,
  regionFor: (fsa: string) => string,
  bands: readonly AgeBand[] = DEFAULT_AGE_BANDS,
): DeidentifiedRecord {
  const results: Partial<Record<VirusKey, TestResult>> = { ...record.results };
  const { INF_A: a, INF_B: b } = record.results;
  if (a && b) results.INF_ANY = combineInfluenza(a, b);
  else if (a === "detected" || b === "detected") results.INF_ANY = "detected";

  return {
    weekStart: toIsoDate(weekStart(record.collectedOn)),
    fsa: record.fsa,
    region: regionFor(record.fsa),
    ageBand: ageBandFor(record.age, bands),
    sex: record.sex,
    results,
  };
}
