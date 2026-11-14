import { describe, expect, it } from "vitest";
import type { ActivityRow } from "./activity";
import { publishCells } from "./privacy";
import { buildFsaTestCounts, partialThrough, testCounts } from "./test-counts";

const weeks = ["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"];
const row = (fsa: string, virus: ActivityRow["virus"], weekStart: string, nDetected: number, nNotDetected: number, nIndeterminate = 0): ActivityRow => ({
  fsa,
  virus,
  weekStart,
  nDetected,
  nNotDetected,
  nIndeterminate,
});

describe("buildFsaTestCounts", () => {
  const rows = [
    // Two age/sex cells in the same week are pooled: 3 + 9 = 12 tests.
    row("M6H", "RSV", weeks[0], 1, 2),
    row("M6H", "RSV", weeks[0], 0, 9),
    row("M6H", "RSV", weeks[1], 0, 7),
    // Indeterminate results only: no definitive tests.
    row("M6H", "RSV", weeks[3], 0, 0, 4),
    row("M6H", "COVID19", weeks[0], 2, 10),
    row("M6H", "COVID19", weeks[1], 0, 20),
  ];
  const result = buildFsaTestCounts(rows, weeks, ["RSV", "COVID19"]);

  it("counts definitive tests per virus and week, and keeps gaps distinct", () => {
    expect(result.byFsa.M6H.RSV).toEqual([12, "small_cell", "no_data", "no_data"]);
    expect(result.byFsa.M6H.COVID19).toEqual([12, 20, "no_data", "no_data"]);
  });

  it("never adds viruses together", () => {
    expect(Object.keys(result.byFsa.M6H)).toEqual(["RSV", "COVID19"]);
  });

  it("uses the public threshold; the dashboard's lower one shows more", () => {
    const ph = buildFsaTestCounts(rows, weeks, ["RSV"], "ph");
    expect(ph.byFsa.M6H.RSV![1]).toBe(7);
  });

  it("matches the dashboard's weekly series for the same area", () => {
    // getWeeklySeries publishes each week's pooled counts with publishCells, then testCounts.
    const pooled = [
      { nDetected: 1, nNotDetected: 11, nIndeterminate: 0 },
      { nDetected: 0, nNotDetected: 7, nIndeterminate: 0 },
      { nDetected: 0, nNotDetected: 0, nIndeterminate: 0 },
      { nDetected: 0, nNotDetected: 0, nIndeterminate: 4 },
    ];
    const dashboard = testCounts(publishCells(weeks.map((key, i) => ({ key, counts: pooled[i] })), "public"));
    expect(result.byFsa.M6H.RSV).toEqual(dashboard);
  });

  it("carries no positives", () => {
    expect(JSON.stringify(result)).not.toMatch(/nDetected|positivity/);
  });
});

describe("partialThrough", () => {
  it("returns the last collection date when it falls before the week's Saturday", () => {
    expect(partialThrough("2026-10-25", "2026-10-28")).toBe("2026-10-28");
    expect(partialThrough("2026-10-25", "2026-10-31")).toBeNull();
    expect(partialThrough("2026-10-25", null)).toBeNull();
  });
});
