// Loads a results CSV into the database through the same de-identification
// pipeline as the upload page. Defaults to the committed synthetic.csv.
// Outside production it also makes sure the demo sign-in account exists.
//
//   npm run db:seed [-- file.csv]

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { ingestCsv } from "@/lib/ingest";
import { defaultRegionForFsa } from "@/lib/regions";
import { loadRegionLookup, saveUpload } from "@/lib/uploads";

const file = process.argv[2] ?? "synthetic.csv";

// Demo credentials for local testing only; documented in the README.
const DEMO_EMAIL = "demo@care-id.test";
const DEMO_PASSWORD = "careid-demo";

async function seedDemoUser() {
  if (process.env.NODE_ENV === "production") return;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: { email: DEMO_EMAIL, name: "Demo Researcher", passwordHash },
  });
  console.log(`Demo sign-in: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

async function main() {
  await seedDemoUser();
  const lookup = await loadRegionLookup();
  const result = ingestCsv(readFileSync(file, "utf8"), {
    regionFor: (fsa) => lookup?.get(fsa) ?? defaultRegionForFsa(fsa) ?? "Unassigned",
  });

  if (result.missingHeaders.length) throw new Error(`${file} is missing columns: ${result.missingHeaders.join(", ")}`);
  if (await db.upload.findFirst({ where: { fileSha256: result.fileSha256, status: "ACTIVE" } })) {
    console.log(`${file} is already loaded; nothing to do.`);
    return;
  }

  await saveUpload(basename(file), result);
  console.log(
    `Loaded ${file}: ${result.acceptedCount.toLocaleString()} of ${result.rowCount.toLocaleString()} rows ` +
      `→ ${result.aggregates.length.toLocaleString()} weekly aggregates (${result.minDate} to ${result.maxDate}).`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
