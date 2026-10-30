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

/** Why a row was rejected; the interface turns codes into words (upload.issues). */
export type IssueCode =
  | "required"
  | "wholeNumber"
  | "maxAge"
  | "dateFormat"
  | "futureDate"
  | "fsaFormat"
  | "unknownFsa"
  | "resultValue"
  | "noResults";

export interface RowIssue {
  /** CSV column the problem is in; absent for whole-row problems. */
  column?: string;
  code: IssueCode;
}

export interface RowError {
  rowNumber: number;
  issues: RowIssue[];
}

const issue = (code: IssueCode) => ({ message: code });

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
  .refine((v) => v === "" || v in RESULT_VALUES, issue("resultValue"))
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
      .min(1, { ...issue("required"), abort: true })
      .regex(/^\d+$/, issue("wholeNumber"))
      .transform(Number)
      .pipe(z.number().max(19, issue("maxAge"))),
    [COLUMNS.collectedOn]: z
      .string()
      .transform((v, ctx) => {
        const d = parseIsoDate(v);
        if (!d) ctx.addIssue({ code: "custom", ...issue("dateFormat") });
        else if (d > today) ctx.addIssue({ code: "custom", ...issue("futureDate") });
        return d ?? z.NEVER;
      }),
    [COLUMNS.fsa]: z
      .string()
      .transform((v) => v.toUpperCase())
      .refine((v) => FSA_PATTERN.test(v), issue("fsaFormat"))
      .refine((v) => (knownFsas ? knownFsas.has(v) : defaultRegionForFsa(v) !== null), issue("unknownFsa")),
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
        issues: parsed.error.issues.map((i) => ({ column: String(i.path[0]), code: i.message as IssueCode })),
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
      errors.push({ rowNumber, issues: [{ code: "noResults" }] });
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
