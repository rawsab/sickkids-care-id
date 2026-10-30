import { z } from "zod";
import { parseIsoDate } from "../epiweek";
import { defaultRegionForFsa, FSA_PATTERN } from "../regions";
import type { TestResult, VirusKey } from "../viruses";

export type SourceVirus = Exclude<VirusKey, "INF_ANY">;
export type Sex = "FEMALE" | "MALE" | "OTHER" | "UNKNOWN";

/** Expected CSV columns, as supplied by the SickKids testing program. */
export const COLUMNS = {
  sex: "Gender",
  age: "AGE_IN_YEARS",
  collectedOn: "DTM_COL",
  fsa: "FSA",
  results: { INF_A: "INF_A", INF_B: "INF_B", RSV: "RSV_PCR", COVID19: "CORO19" } satisfies Record<SourceVirus, string>,
} as const;

export const REQUIRED_HEADERS = [
  COLUMNS.sex,
  COLUMNS.age,
  COLUMNS.collectedOn,
  COLUMNS.fsa,
  ...Object.values(COLUMNS.results),
];

export interface ValidRecord {
  rowNumber: number;
  collectedOn: Date;
  age: number;
  sex: Sex;
  fsa: string;
  results: Partial<Record<SourceVirus, TestResult>>;
}

export interface RowError {
  rowNumber: number;
  messages: string[];
}

export interface ValidateOptions {
  /** Dates after this are rejected. Defaults to now. */
  today?: Date;
  /** If given, FSAs must be in this set; otherwise any Ontario FSA is accepted. */
  knownFsas?: ReadonlySet<string>;
}

const RESULT_VALUES: Record<string, TestResult> = {
  detected: "detected",
  "not detected": "not_detected",
  indeterminate: "indeterminate",
};

const SEX_VALUES: Record<string, Sex> = { female: "FEMALE", male: "MALE", f: "FEMALE", m: "MALE" };

// A blank result means the specimen wasn't tested for that virus.
const resultSchema = z
  .string()
  .transform((v) => v.toLowerCase())
  .refine((v) => v === "" || v in RESULT_VALUES, { message: "must be Detected, Not detected, Indeterminate or blank" })
  .transform((v) => (v === "" ? undefined : RESULT_VALUES[v]));

export function validateHeaders(headers: readonly string[]): string[] {
  return REQUIRED_HEADERS.filter((h) => !headers.includes(h));
}

export function validateRows(
  rows: readonly Record<string, string>[],
  { today = new Date(), knownFsas }: ValidateOptions = {},
): { valid: ValidRecord[]; errors: RowError[] } {
  const rowSchema = z.object({
    [COLUMNS.sex]: z
      .string()
      .transform((v) => (v === "" ? "UNKNOWN" : (SEX_VALUES[v.toLowerCase()] ?? "OTHER"))),
    [COLUMNS.age]: z
      .string()
      .min(1, { message: "is required", abort: true })
      .regex(/^\d+$/, "must be a whole number")
      .transform(Number)
      .pipe(z.number().max(19, "must be 19 or under")),
    [COLUMNS.collectedOn]: z
      .string()
      .transform((v, ctx) => {
        const d = parseIsoDate(v);
        if (!d) ctx.addIssue({ code: "custom", message: "must be a date in YYYY-MM-DD format" });
        else if (d > today) ctx.addIssue({ code: "custom", message: "is in the future" });
        return d ?? z.NEVER;
      }),
    [COLUMNS.fsa]: z
      .string()
      .transform((v) => v.toUpperCase())
      .refine((v) => FSA_PATTERN.test(v), "must be a 3-character FSA such as M5G")
      .refine((v) => (knownFsas ? knownFsas.has(v) : defaultRegionForFsa(v) !== null), "is not a known Ontario FSA"),
    ...Object.fromEntries(Object.values(COLUMNS.results).map((col) => [col, resultSchema])),
  });

  const valid: ValidRecord[] = [];
  const errors: RowError[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // header is line 1
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({
        rowNumber,
        messages: parsed.error.issues.map((issue) => `${String(issue.path[0])} ${issue.message}`),
      });
      return;
    }
    const data = parsed.data as Record<string, unknown>;
    const results: Partial<Record<SourceVirus, TestResult>> = {};
    for (const [virus, col] of Object.entries(COLUMNS.results) as [SourceVirus, string][]) {
      const r = data[col] as TestResult | undefined;
      if (r) results[virus] = r;
    }
    if (Object.keys(results).length === 0) {
      errors.push({ rowNumber, messages: ["has no test results"] });
      return;
    }
    valid.push({
      rowNumber,
      collectedOn: data[COLUMNS.collectedOn] as Date,
      age: data[COLUMNS.age] as number,
      sex: data[COLUMNS.sex] as Sex,
      fsa: data[COLUMNS.fsa] as string,
      results,
    });
  });

  return { valid, errors };
}
