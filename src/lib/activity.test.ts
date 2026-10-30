import { describe, expect, it } from "vitest";
import { buildActivity, type ActivityRow } from "./activity";
import { publishedLevel, publishedTrend } from "./metrics";
import { publishCells } from "./privacy";

const weeks = ["2026-09-06", "2026-09-13", "2026-09-20", "2026-09-27", "2026-10-04", "2026-10-11"];
const row = (fsa: string, weekStart: string, nDetected: number, nNotDetected: number): ActivityRow => ({
  fsa,
  virus: "RSV",
  weekStart,
  nDetected,
  nNotDetected,
  nIndeterminate: 0,
});

describe("buildActivity", () => {
  // M5G: 20 tests a week. M6H: 3 a week, so even pooled over 3 weeks it stays under 10.
  const rows = weeks.flatMap((w, i) => [row("M5G", w, i < 3 ? 1 : 4, i < 3 ? 19 : 16), row("M6H", w, 1, 2)]);
  const result = buildActivity(rows, weeks, ["RSV"]);

  it("drops the leading rolling-window weeks from the shown range", () => {
    expect(result.weeks).toEqual(weeks.slice(2));
    expect(result.byFsa.M5G.RSV!.spark).toHaveLength(4);
  });

  it("publishes levels and trends for areas with enough tests", () => {
    expect(result.byFsa.M5G.RSV).toMatchObject({ level: "high", trend: "rising" });
    expect(result.byFsa.M5G.RSV!.spark.at(-1)).toBe(20);
  });

  it("withholds everything for areas under the public threshold", () => {
    expect(result.byFsa.M6H.RSV).toEqual({ level: "insufficient", trend: null, spark: [null, null, null, null] });
  });

  it("pools all areas into the overall summary", () => {
    expect(result.overall.RSV!.level).not.toBe("insufficient");
  });

  it("never includes counts in its output", () => {
    expect(JSON.stringify(result)).not.toMatch(/nDetected|nNotDetected|nIndeterminate|tested/);
  });
});

describe("published level and trend", () => {
  const cells = publishCells(
    [
      { key: 0, counts: { nDetected: 1, nNotDetected: 19, nIndeterminate: 0 } },
      { key: 1, counts: { nDetected: 1, nNotDetected: 2, nIndeterminate: 0 } },
      { key: 2, counts: { nDetected: 4, nNotDetected: 16, nIndeterminate: 0 } },
    ],
    "public",
  );

  it("reads levels from published cells and treats suppressed cells as insufficient", () => {
    expect(publishedLevel(cells[0])).toBe("moderate");
    expect(publishedLevel(cells[1])).toBe("insufficient");
    expect(publishedLevel(cells[2])).toBe("high");
  });

  it("needs both ends of the comparison to be published", () => {
    expect(publishedTrend(cells, 2)).toBe("rising");
    expect(publishedTrend(cells, 1)).toBeNull();
  });
});
