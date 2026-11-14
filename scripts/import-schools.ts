// Builds public/data/gta-schools.json from the Ontario Ministry of Education's
// "Ontario public school contact information" dataset (Open Government
// Licence – Ontario), for the school search on the kids page.
//
// The current English TXT resource is looked up in the official data.ontario.ca
// catalogue, so a renamed monthly file is still found. Only schools whose
// postal code falls in an FSA on the map (public/geo/gta-fsa.geojson) are kept,
// and only the fields needed for search, display and finding the area.
//
//   npm run schools:import                      # download the current file
//   npm run schools:import -- --file list.txt   # use a file downloaded by hand

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseSchoolList } from "@/lib/school-import";
import { encodeSchools, SCHOOL_FIELDS, SCHOOL_SOURCE, type SchoolFile } from "@/lib/schools";

const OUTPUT = "public/data/gta-schools.json";
const GEOJSON = "public/geo/gta-fsa.geojson";

interface CkanResource {
  id: string;
  name: string;
  format: string;
  url: string;
  last_modified?: string;
}

/** The English pipe-delimited resource, as listed in the official catalogue. */
async function findResource(): Promise<CkanResource> {
  const res = await fetch(SCHOOL_SOURCE.catalogueApi);
  if (!res.ok) throw new Error(`Catalogue request failed: HTTP ${res.status}`);
  const resources: CkanResource[] = (await res.json()).result.resources;
  const english = resources.filter((r) => r.format.toUpperCase() === "TXT" && /english/i.test(r.name));
  if (english.length !== 1) {
    const list = resources.map((r) => `  ${r.format} · ${r.name} · ${r.url}`).join("\n");
    throw new Error(`Expected one English TXT resource, found ${english.length}. Check ${SCHOOL_SOURCE.datasetUrl}:\n${list}`);
  }
  return english[0];
}

/** Decodes as UTF-8 and fails on invalid bytes rather than mangling accented names. */
function decode(bytes: ArrayBuffer | Buffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function main() {
  const fileArg = process.argv.indexOf("--file");
  let text: string;
  let source: Record<string, string>;

  if (fileArg !== -1) {
    const path = process.argv[fileArg + 1];
    text = decode(readFileSync(path));
    source = { title: basename(path), downloadUrl: "(local file)" };
  } else {
    const resource = await findResource();
    console.log(`Downloading ${resource.name}\n  ${resource.url}`);
    const res = await fetch(resource.url);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    text = decode(await res.arrayBuffer());
    source = {
      title: resource.name,
      resourceId: resource.id,
      downloadUrl: resource.url,
      ...(resource.last_modified && { lastModified: resource.last_modified }),
    };
  }

  const covered = new Set<string>(
    JSON.parse(readFileSync(GEOJSON, "utf8")).features.map((f: { properties: { CFSAUID: string } }) => f.properties.CFSAUID),
  );
  const result = parseSchoolList(text, covered);

  const file: SchoolFile = {
    source: {
      publisher: "Ontario Ministry of Education",
      datasetUrl: SCHOOL_SOURCE.datasetUrl,
      licence: "Open Government Licence – Ontario",
      licenceUrl: SCHOOL_SOURCE.licenceUrl,
      ...source,
      importedAt: new Date().toISOString().slice(0, 10),
    },
    counts: result.counts,
    flagged: result.flagged,
    fields: SCHOOL_FIELDS,
    schools: encodeSchools(result.schools),
  };
  mkdirSync("public/data", { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(file) + "\n");

  const c = result.counts;
  console.log(
    `${c.rows} rows → ${c.kept} schools in covered FSAs (${c.outsideCoverage} outside coverage, ` +
      `${c.excludedProgram} summer/adult/continuing-education/custody programs, ${c.flagged} flagged)`,
  );
  for (const f of result.flagged) console.log(`  flagged ${f.issue}: ${f.id} ${f.name}`);
  console.log(`→ ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
