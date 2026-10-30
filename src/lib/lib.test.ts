import { describe, expect, it } from "vitest";
import { epiWeek, parseIsoDate, toIsoDate, weekStart } from "./epiweek";
import { activityLevel, positivity, rollingCounts } from "./metrics";
import { publishCells } from "./privacy";
import { normaliseFsa } from "./regions";
import { combineInfluenza } from "./viruses";

const d = (s: string) => parseIsoDate(s)!;
const counts = (nDetected: number, nNotDetected: number, nIndeterminate = 0) => ({ nDetected, nNotDetected, nIndeterminate });

describe("epi weeks", () => {
  it("rejects impossible dates", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("16/10/2026")).toBeNull();
  });

  it("starts weeks on Sunday", () => {
    expect(toIsoDate(weekStart(d("2026-10-16")))).toBe("2026-10-11");
    expect(toIsoDate(weekStart(d("2026-10-11")))).toBe("2026-10-11");
  });

  it("matches MMWR week numbering, including year boundaries", () => {
    expect(epiWeek(d("2026-10-16"))).toEqual({ year: 2026, week: 41 });
    expect(epiWeek(d("2026-01-04"))).toEqual({ year: 2026, week: 1 });
    expect(epiWeek(d("2025-12-31"))).toEqual({ year: 2025, week: 53 });
    expect(epiWeek(d("2027-01-01"))).toEqual({ year: 2026, week: 52 });
  });
});

describe("metrics", () => {
  it("excludes indeterminate results from the denominator", () => {
    expect(positivity(counts(1, 3, 6))).toBe(25);
    expect(positivity(counts(0, 0, 5))).toBeNull();
  });

  it("pools counts across the rolling window", () => {
    const rolled = rollingCounts([counts(1, 9), counts(0, 1), counts(5, 5)]);
    expect(rolled.map(positivity)).toEqual([10, (100 * 1) / 11, (100 * 6) / 21]);
  });

  it("assigns activity levels and withholds them below the test threshold", () => {
    expect(activityLevel(counts(0, 20))).toBe("low");
    expect(activityLevel(counts(2, 18))).toBe("moderate");
    expect(activityLevel(counts(5, 15))).toBe("high");
    expect(activityLevel(counts(5, 4))).toBe("insufficient");
  });

  it("combines influenza A and B", () => {
    expect(combineInfluenza("detected", "indeterminate")).toBe("detected");
    expect(combineInfluenza("not_detected", "not_detected")).toBe("not_detected");
    expect(combineInfluenza("not_detected", "indeterminate")).toBe("indeterminate");
  });
});

describe("suppression", () => {
  const cells = [
    { key: "0–3", counts: counts(0, 3) },
    { key: "4–8", counts: counts(4, 40) },
    { key: "9–13", counts: counts(2, 20) },
    { key: "14–19", counts: counts(0, 0) },
  ];

  it("suppresses small denominators for each audience", () => {
    const ph = publishCells(cells, "ph");
    expect(ph.map((c) => c.suppressed && c.reason)).toEqual(["small_cell", false, false, "no_data"]);
    const pub = publishCells([{ key: "a", counts: counts(1, 8) }, { key: "b", counts: counts(1, 9) }], "public");
    expect(pub.map((c) => c.suppressed)).toEqual([true, false]);
  });

  it("suppresses a second cell when a lone suppressed cell could be recovered from the total", () => {
    const ph = publishCells(cells, "ph", { complementary: true });
    expect(ph.map((c) => c.suppressed && c.reason)).toEqual(["small_cell", false, "complementary", "no_data"]);
  });

  it("doesn't add complementary suppression when two cells are already hidden", () => {
    const ph = publishCells([...cells, { key: "x", counts: counts(1, 1) }], "ph", { complementary: true });
    expect(ph.filter((c) => c.suppressed && c.reason === "complementary")).toHaveLength(0);
  });
});

describe("normaliseFsa", () => {
  it("takes the first three characters of a postal code", () => {
    expect(normaliseFsa("m5g 1x8")).toBe("M5G");
    expect(normaliseFsa("12345")).toBeNull();
  });
});
