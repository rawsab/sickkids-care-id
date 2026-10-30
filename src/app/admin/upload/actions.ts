"use server";

import { db } from "@/lib/db";
import { ingestCsv, type IngestResult } from "@/lib/ingest";
import type { RowError } from "@/lib/ingest/validate";
import { sumCounts, type Counts } from "@/lib/metrics";
import { defaultRegionForFsa } from "@/lib/regions";
import { VIRUSES, type VirusKey } from "@/lib/viruses";

export interface UploadSummary {
  fileName: string;
  rowCount: number;
  acceptedCount: number;
  missingHeaders: string[];
  errors: RowError[];
  /** True when more errors exist than are listed. */
  errorsTruncated: boolean;
  minDate: string | null;
  maxDate: string | null;
  weekCount: number;
  fsaCount: number;
  totals: ({ virus: VirusKey } & Counts)[];
  duplicateOf: string | null;
  warning: string | null;
}

export type UploadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "preview"; summary: UploadSummary }
  | { status: "saved"; summary: UploadSummary; uploadId: string };

const MAX_LISTED_ERRORS = 200;
const INSERT_CHUNK = 5_000;

async function loadRegionLookup(): Promise<Map<string, string> | null> {
  const rows = await db.fsaLookup.findMany({ where: { active: true } });
  return rows.length ? new Map(rows.map((r) => [r.fsa, r.region])) : null;
}

function summarise(fileName: string, result: IngestResult, duplicateOf: string | null, warning: string | null): UploadSummary {
  return {
    fileName,
    rowCount: result.rowCount,
    acceptedCount: result.acceptedCount,
    missingHeaders: result.missingHeaders,
    errors: result.errors.slice(0, MAX_LISTED_ERRORS),
    errorsTruncated: result.errors.length > MAX_LISTED_ERRORS,
    minDate: result.minDate,
    maxDate: result.maxDate,
    weekCount: new Set(result.aggregates.map((a) => a.weekStart)).size,
    fsaCount: new Set(result.aggregates.map((a) => a.fsa)).size,
    totals: VIRUSES.map((v) => ({ virus: v.key, ...sumCounts(result.aggregates.filter((a) => a.virus === v.key)) })),
    duplicateOf,
    warning,
  };
}

// TODO(auth): require the ADMIN role and record uploadedById once Auth.js is in.
export async function uploadAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const file = formData.get("file");
  const intent = formData.get("intent");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a CSV file to upload." };

  let lookup: Map<string, string> | null = null;
  let warning: string | null = null;
  try {
    lookup = await loadRegionLookup();
  } catch {
    if (intent === "commit") return { status: "error", message: "The database is unavailable, so the upload was not saved." };
    warning = "The database is unavailable. This preview uses the default FSA → region mapping and can't check for duplicates.";
  }

  const result = ingestCsv(await file.text(), {
    regionFor: (fsa) => lookup?.get(fsa) ?? defaultRegionForFsa(fsa) ?? "Unassigned",
  });

  let duplicateOf: string | null = null;
  if (!warning) {
    const existing = await db.upload.findFirst({ where: { fileSha256: result.fileSha256, status: "ACTIVE" } });
    duplicateOf = existing ? existing.createdAt.toISOString() : null;
  }

  const summary = summarise(file.name, result, duplicateOf, warning);
  if (intent !== "commit") return { status: "preview", summary };

  if (duplicateOf) return { status: "error", message: "This file has already been uploaded." };
  if (result.acceptedCount === 0) return { status: "error", message: "No valid rows to save." };

  const upload = await db.$transaction(async (tx) => {
    const created = await tx.upload.create({
      data: {
        fileName: file.name,
        fileSha256: result.fileSha256,
        rowCount: result.rowCount,
        acceptedCount: result.acceptedCount,
        rejectedCount: result.errors.length,
        minDate: result.minDate ? new Date(result.minDate) : null,
        maxDate: result.maxDate ? new Date(result.maxDate) : null,
      },
    });
    // Chunked to stay under Postgres's limit on bind parameters per statement.
    for (let i = 0; i < result.aggregates.length; i += INSERT_CHUNK) {
      await tx.weeklyAggregate.createMany({
        data: result.aggregates
          .slice(i, i + INSERT_CHUNK)
          .map((a) => ({ ...a, uploadId: created.id, weekStart: new Date(a.weekStart) })),
      });
    }
    // Register FSAs seen for the first time so admins can review their region.
    await tx.fsaLookup.createMany({
      data: [...new Set(result.aggregates.map((a) => a.fsa))].map((fsa) => ({
        fsa,
        region: defaultRegionForFsa(fsa) ?? "Unassigned",
      })),
      skipDuplicates: true,
    });
    return created;
  }, { timeout: 60_000 });

  return { status: "saved", summary, uploadId: upload.id };
}
