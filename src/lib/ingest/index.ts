import { createHash } from "node:crypto";
import { toIsoDate } from "../epiweek";
import { defaultRegionForFsa } from "../regions";
import { aggregate, type AggregateRow } from "./aggregate";
import { deidentify, type AgeBand } from "./deidentify";
import { parseCsv } from "./parse";
import { validateHeaders, validateRows, type RowError, type ValidateOptions } from "./validate";

export interface IngestResult {
  fileSha256: string;
  rowCount: number;
  acceptedCount: number;
  missingHeaders: string[];
  errors: RowError[];
  minDate: string | null;
  maxDate: string | null;
  aggregates: AggregateRow[];
}

export interface IngestOptions extends ValidateOptions {
  regionFor?: (fsa: string) => string;
  ageBands?: readonly AgeBand[];
}

/**
 * CSV text → validated → de-identified → weekly aggregates. Row-level data
 * never leaves this function; callers only see counts and row-level errors
 * (row number and reason, never the row's values).
 */
export function ingestCsv(text: string, options: IngestOptions = {}): IngestResult {
  // Browsers drop a leading BOM when reading a File; strip it here too so the
  // same file hashes the same whether uploaded or loaded by script.
  const fileSha256 = createHash("sha256").update(text.replace(/^\uFEFF/, "")).digest("hex");
  const { headers, rows } = parseCsv(text);
  const missingHeaders = validateHeaders(headers);
  if (missingHeaders.length > 0) {
    return { fileSha256, rowCount: rows.length, acceptedCount: 0, missingHeaders, errors: [], minDate: null, maxDate: null, aggregates: [] };
  }

  const { valid, errors } = validateRows(rows, options);
  const regionFor = options.regionFor ?? ((fsa: string) => defaultRegionForFsa(fsa) ?? "Unassigned");

  let min: Date | null = null;
  let max: Date | null = null;
  for (const r of valid) {
    if (!min || r.collectedOn < min) min = r.collectedOn;
    if (!max || r.collectedOn > max) max = r.collectedOn;
  }

  return {
    fileSha256,
    rowCount: rows.length,
    acceptedCount: valid.length,
    missingHeaders,
    errors,
    minDate: min && toIsoDate(min),
    maxDate: max && toIsoDate(max),
    aggregates: aggregate(valid.map((r) => deidentify(r, regionFor, options.ageBands))),
  };
}
