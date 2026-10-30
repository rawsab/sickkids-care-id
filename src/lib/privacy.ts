// Small-cell suppression, applied server-side before any figure leaves the
// API. The risk being managed is a small denominator — e.g. one child tested
// in an FSA, age band and week — so suppression keys on the number of tests,
// not on the number of positives (positivity × tests would reveal it anyway).

import { positivity, testedCount, type Counts } from "./metrics";

export type Audience = "public" | "ph";

export interface PrivacyRules {
  /** Cells with fewer definitive tests than this are suppressed. */
  minTests: number;
}

export const PRIVACY_RULES: Record<Audience, PrivacyRules> = {
  public: { minTests: 10 },
  ph: { minTests: 5 },
};

export type PublishedCell<K> =
  | { key: K; suppressed: true; reason: "no_data" | "small_cell" | "complementary" }
  | {
      key: K;
      suppressed: false;
      tested: number;
      nDetected: number;
      nIndeterminate: number;
      positivity: number;
    };

export interface PublishOptions {
  /**
   * Set when the cells partition a total that is also published (e.g. a
   * breakdown by age band). If exactly one cell is suppressed, the next
   * smallest is suppressed too so it can't be recovered by subtraction.
   * Leave off for time series, where weeks don't sum to a shown total.
   */
  complementary?: boolean;
  rules?: PrivacyRules;
}

export function publishCells<K>(
  cells: readonly { key: K; counts: Counts }[],
  audience: Audience,
  { complementary = false, rules = PRIVACY_RULES[audience] }: PublishOptions = {},
): PublishedCell<K>[] {
  const out: PublishedCell<K>[] = cells.map(({ key, counts }) => {
    const tested = testedCount(counts);
    if (tested === 0) return { key, suppressed: true, reason: "no_data" };
    if (tested < rules.minTests) return { key, suppressed: true, reason: "small_cell" };
    return {
      key,
      suppressed: false,
      tested,
      nDetected: counts.nDetected,
      nIndeterminate: counts.nIndeterminate,
      positivity: positivity(counts)!,
    };
  });

  if (complementary && out.filter((c) => c.suppressed && c.reason === "small_cell").length === 1) {
    let smallest = -1;
    out.forEach((c, i) => {
      if (c.suppressed) return;
      const best = out[smallest];
      if (smallest === -1 || (!best.suppressed && c.tested < best.tested)) smallest = i;
    });
    if (smallest !== -1) out[smallest] = { key: out[smallest].key, suppressed: true, reason: "complementary" };
  }

  return out;
}
