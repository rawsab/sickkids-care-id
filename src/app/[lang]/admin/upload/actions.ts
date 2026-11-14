"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ingestCsv, type IngestResult } from "@/lib/ingest";
import type { RowError } from "@/lib/ingest/validate";
import { sumCounts, type Counts } from "@/lib/metrics";
import { defaultRegionForFsa } from "@/lib/regions";
import { loadRegionLookup, saveUpload } from "@/lib/uploads";
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
  /** Set when the preview couldn't reach the database. */
  warning: "dbUnavailablePreview" | null;
}

/** Keys into the upload.errors dictionary; the form turns them into words. */
export type UploadErrorCode = "unauthorized" | "noFile" | "dbUnavailable" | "duplicate" | "noValidRows";

export type UploadState =
  | { status: "idle" }
  | { status: "error"; code: UploadErrorCode }
  | { status: "preview"; summary: UploadSummary }
  | { status: "saved"; summary: UploadSummary; uploadId: string };

const MAX_LISTED_ERRORS = 200;

function summarise(fileName: string, result: IngestResult, duplicateOf: string | null, warning: UploadSummary["warning"]): UploadSummary {
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

// Server actions are reachable without the page, so this checks the session itself.
export async function uploadAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", code: "unauthorized" };

  const file = formData.get("file");
  const intent = formData.get("intent");
  if (!(file instanceof File) || file.size === 0) return { status: "error", code: "noFile" };

  let lookup: Map<string, string> | null = null;
  let warning: UploadSummary["warning"] = null;
  try {
    lookup = await loadRegionLookup();
  } catch {
    if (intent === "commit") return { status: "error", code: "dbUnavailable" };
    warning = "dbUnavailablePreview";
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

  if (duplicateOf) return { status: "error", code: "duplicate" };
  if (result.acceptedCount === 0) return { status: "error", code: "noValidRows" };

  const upload = await saveUpload(file.name, result, user.id);

  return { status: "saved", summary, uploadId: upload.id };
}
