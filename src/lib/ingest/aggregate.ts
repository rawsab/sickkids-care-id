import type { Counts } from "../metrics";
import type { VirusKey } from "../viruses";
import type { DeidentifiedRecord } from "./deidentify";
import type { Sex } from "./validate";

export interface AggregateRow extends Counts {
  weekStart: string;
  fsa: string;
  region: string;
  virus: VirusKey;
  ageBand: string;
  sex: Sex;
}

const FIELD = { detected: "nDetected", not_detected: "nNotDetected", indeterminate: "nIndeterminate" } as const;

export function aggregate(records: Iterable<DeidentifiedRecord>): AggregateRow[] {
  const cells = new Map<string, AggregateRow>();
  for (const r of records) {
    for (const [virus, result] of Object.entries(r.results) as [VirusKey, keyof typeof FIELD][]) {
      const key = [r.weekStart, r.fsa, virus, r.ageBand, r.sex].join("|");
      let cell = cells.get(key);
      if (!cell) {
        cell = {
          weekStart: r.weekStart,
          fsa: r.fsa,
          region: r.region,
          virus,
          ageBand: r.ageBand,
          sex: r.sex,
          nDetected: 0,
          nNotDetected: 0,
          nIndeterminate: 0,
        };
        cells.set(key, cell);
      }
      cell[FIELD[result]]++;
    }
  }
  return [...cells.values()].sort(
    (x, y) => x.weekStart.localeCompare(y.weekStart) || x.fsa.localeCompare(y.fsa) || x.virus.localeCompare(y.virus),
  );
}
