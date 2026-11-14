// Parses the Ministry of Education's school list for `npm run schools:import`.
// Kept apart from schools.ts so the CSV parser isn't sent to the browser.

import Papa from "papaparse";
import { normalisePostalCode } from "./regions";
import { searchKey, type School, type SchoolImport, type SchoolIssue } from "./schools";

/** Columns read from the official file; the rest (phone, email, website…) are dropped. */
export const SCHOOL_COLUMNS = {
  id: "School Number",
  name: "School Name",
  level: "School Level",
  grades: "Grade Range",
  board: "Board Name",
  special: "School Special Conditions",
  poBox: "PO Box",
  street: "Street",
  city: "City",
  postalCode: "Postal Code",
} as const;

// Programs no Grade 3–5 child attends as their school. Values checked against
// the September 2026 file; any other value is kept.
const EXCLUDED_CONDITIONS = new Set(["Summer", "Continuing Education", "Adult", "Cust/Correctional Facility"]);

/** "BRAMPTON" → "Brampton"; mixed-case names are left as published. */
function tidyCase(value: string): string {
  if (value !== value.toUpperCase() || !/[A-Z]{2}/.test(value)) return value;
  return value.toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Parses the official pipe-delimited file. Keeps schools whose postal code
 * falls in a covered FSA; flags records that can't be placed instead of
 * guessing. Throws if expected columns are missing (the format has changed).
 */
export function parseSchoolList(text: string, coveredFsas: ReadonlySet<string>): SchoolImport {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    delimiter: "|",
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });
  const missing = Object.values(SCHOOL_COLUMNS).filter((c) => !parsed.meta.fields?.includes(c));
  if (missing.length) throw new Error(`School file is missing columns: ${missing.join(", ")}`);

  const flagged: SchoolImport["flagged"] = [];
  const schools: School[] = [];
  const seenIds = new Set<string>();
  const seenPlaces = new Map<string, string>();
  let excludedProgram = 0;
  let outsideCoverage = 0;
  const C = SCHOOL_COLUMNS;

  for (const row of parsed.data) {
    const id = row[C.id] ?? "";
    const name = row[C.name] ?? "";
    const flag = (issue: SchoolIssue) => flagged.push({ id, name, issue });
    if (!/^\d+$/.test(id)) { flag("badId"); continue; }
    if (!name) { flag("noName"); continue; }
    if (seenIds.has(id)) { flag("duplicateId"); continue; }
    seenIds.add(id);
    if (EXCLUDED_CONDITIONS.has(row[C.special])) { excludedProgram++; continue; }

    const raw = row[C.postalCode] ?? "";
    const postalCode = normalisePostalCode(raw);
    if (!postalCode) { flag(raw ? "badPostalCode" : "noPostalCode"); continue; }
    if (!coveredFsas.has(postalCode.slice(0, 3))) { outsideCoverage++; continue; }

    // The same school listed twice under two numbers. Schools sharing a name and
    // a campus but teaching different grades (e.g. JK-8 and 9-12) are both kept.
    const place = [searchKey(name), searchKey(row[C.street]), postalCode, row[C.level], row[C.grades]].join("|");
    if (seenPlaces.has(place)) { flag("duplicateRecord"); continue; }
    seenPlaces.set(place, id);

    schools.push({
      id,
      name,
      city: tidyCase(row[C.city]),
      street: row[C.street],
      postalCode,
      level: row[C.level],
      grades: row[C.grades],
      board: row[C.board],
      poBox: row[C.poBox] !== "",
      regular: row[C.special] === "Not applicable",
    });
  }

  schools.sort((a, b) => a.name.localeCompare(b.name, "en-CA") || a.id.localeCompare(b.id));
  return {
    schools,
    flagged,
    counts: { rows: parsed.data.length, kept: schools.length, excludedProgram, outsideCoverage, flagged: flagged.length },
  };
}
