import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ingestCsv } from ".";
import { parseCsv } from "./parse";
import { validateRows } from "./validate";

const today = new Date("2026-10-30T00:00:00Z");
const example = readFileSync(join(__dirname, "../../../example.csv"), "utf8");

const HEADER = "Gender,AGE_IN_YEARS,DTM_COL,INF_A,INF_B,RSV_PCR,CORO19,FSA";
const rowsOf = (...lines: string[]) => parseCsv([HEADER, ...lines].join("\n")).rows;

describe("ingestCsv on the SickKids example file", () => {
  const result = ingestCsv(example, { today });

  it("strips the BOM and accepts every row", () => {
    expect(example.charCodeAt(0)).toBe(0xfeff);
    expect(result.missingHeaders).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.rowCount).toBe(6);
    expect(result.acceptedCount).toBe(6);
    expect([result.minDate, result.maxDate]).toEqual(["2026-10-16", "2026-10-28"]);
  });

  it("produces one cell per row × (4 viruses + combined influenza)", () => {
    expect(result.aggregates).toHaveLength(30);
  });

  it("buckets by Sunday-start epi week and keeps no exact dates or ages", () => {
    expect(new Set(result.aggregates.map((a) => a.weekStart))).toEqual(new Set(["2026-10-11", "2026-10-18", "2026-10-25"]));
    for (const a of result.aggregates) {
      expect(Object.keys(a).sort()).toEqual(
        ["ageBand", "fsa", "nDetected", "nIndeterminate", "nNotDetected", "region", "sex", "virus", "weekStart"].sort(),
      );
    }
  });

  it("totals match the file", () => {
    const sum = (virus: string, field: "nDetected" | "nNotDetected" | "nIndeterminate") =>
      result.aggregates.filter((a) => a.virus === virus).reduce((n, a) => n + a[field], 0);
    expect(sum("COVID19", "nDetected")).toBe(1);
    expect(sum("COVID19", "nIndeterminate")).toBe(2);
    expect(sum("INF_A", "nDetected")).toBe(2);
    expect(sum("INF_B", "nDetected")).toBe(1);
    expect(sum("INF_ANY", "nDetected")).toBe(3);
    expect(sum("INF_ANY", "nNotDetected")).toBe(3);
    expect(sum("RSV", "nDetected")).toBe(1);
  });

  it("maps Toronto FSAs to the Toronto region", () => {
    expect(new Set(result.aggregates.map((a) => a.region))).toEqual(new Set(["Toronto"]));
  });
});

describe("validation", () => {
  it("reports missing columns", () => {
    expect(ingestCsv("Gender,FSA\nMale,M5G").missingHeaders).toContain("DTM_COL");
  });

  it("rejects bad rows with row numbers and reasons, without echoing values", () => {
    const { valid, errors } = validateRows(
      rowsOf(
        "Male,,2026-10-16,Detected,,,,M5G",
        "Male,8,2026-13-01,Detected,,,,M5G",
        "Male,8,2026-11-15,Detected,,,,M5G",
        "Male,8,2026-10-16,Positive,,,,M5G",
        "Male,8,2026-10-16,Detected,,,,V6B",
        "Male,8,2026-10-16,,,,,M5G",
        "Female,9,2026-10-16,detected,NOT DETECTED,,,m5g",
      ),
      { today },
    );
    expect(errors.map((e) => e.rowNumber)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(errors[0].issues).toEqual([{ column: "AGE_IN_YEARS", code: "required" }]);
    expect(errors[1].issues[0]).toEqual({ column: "DTM_COL", code: "dateFormat" });
    expect(errors[2].issues).toEqual([{ column: "DTM_COL", code: "futureDate" }]);
    expect(errors[3].issues[0]).toEqual({ column: "INF_A", code: "resultValue" });
    expect(errors[4].issues).toEqual([{ column: "FSA", code: "unknownFsa" }]);
    expect(errors[5].issues).toEqual([{ code: "noResults" }]);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({ fsa: "M5G", sex: "FEMALE", results: { INF_A: "detected", INF_B: "not_detected" } });
  });

  it("restricts FSAs to the lookup table when one is given", () => {
    const { errors } = validateRows(rowsOf("Male,8,2026-10-16,Detected,,,,M5G"), { today, knownFsas: new Set(["M6H"]) });
    expect(errors).toHaveLength(1);
  });

  it("gives the same hash for the same file", () => {
    expect(ingestCsv(example, { today }).fileSha256).toBe(ingestCsv(example, { today }).fileSha256);
  });

  it("hashes a file the same with or without a BOM", () => {
    const bare = example.replace(/^\uFEFF/, "");
    expect(ingestCsv(`\uFEFF${bare}`, { today }).fileSha256).toBe(ingestCsv(bare, { today }).fileSha256);
  });
});
