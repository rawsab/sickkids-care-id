import "server-only";
import { db } from "@/lib/db";
import type { IngestResult } from "@/lib/ingest";
import { defaultRegionForFsa } from "@/lib/regions";

const INSERT_CHUNK = 5_000;

/** Admin-reviewed FSA → region mapping, or null when none has been recorded yet. */
export async function loadRegionLookup(): Promise<Map<string, string> | null> {
  const rows = await db.fsaLookup.findMany({ where: { active: true } });
  return rows.length ? new Map(rows.map((r) => [r.fsa, r.region])) : null;
}

/** Saves an ingested file's weekly aggregates as a new active upload. */
export async function saveUpload(fileName: string, result: IngestResult, uploadedById?: string) {
  return db.$transaction(
    async (tx) => {
      const created = await tx.upload.create({
        data: {
          fileName,
          uploadedById,
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
    },
    { timeout: 60_000 },
  );
}
