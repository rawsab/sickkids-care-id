// Publicly funded Ontario schools, used on the kids page to find "the area
// around my school". A school only leads to its reporting area (the FSA of its
// postal code): CARE-ID has no school-level results, and a school's address
// says nothing about where its students live.
//
// Source: Ontario Ministry of Education, "Ontario public school contact
// information" (Open Government Licence – Ontario). `npm run schools:import`
// rebuilds public/data/gta-schools.json from the official download (parsing
// is in school-import.ts, so it stays out of the browser bundle).

import { areaForPostalCode, type AreaLookup } from "./geo";

export const SCHOOLS_URL = "/data/gta-schools.json";

export const SCHOOL_SOURCE = {
  datasetUrl: "https://data.ontario.ca/dataset/ontario-public-school-contact-information",
  catalogueApi: "https://data.ontario.ca/api/3/action/package_show?id=ontario-public-school-contact-information",
  licenceUrl: "https://www.ontario.ca/page/open-government-licence-ontario",
} as const;

export interface School {
  /** Ministry school number. A string: many have leading zeros. */
  id: string;
  name: string;
  city: string;
  street: string;
  postalCode: string;
  /** "Elementary", "Secondary" or "Elem/Sec", as in the source. */
  level: string;
  /** e.g. "JK-8", as in the source. */
  grades: string;
  board: string;
  /** The postal code may belong to a PO box rather than the building. */
  poBox: boolean;
  /** No special condition (e.g. not a treatment-centre program); ranked first. */
  regular: boolean;
}

export type SchoolIssue = "badId" | "noName" | "noPostalCode" | "badPostalCode" | "duplicateId" | "duplicateRecord";

export interface SchoolImport {
  schools: School[];
  /** Records that couldn't be used as they are. Nothing is guessed for them. */
  flagged: { id: string; name: string; issue: SchoolIssue }[];
  counts: { rows: number; kept: number; excludedProgram: number; outsideCoverage: number; flagged: number };
}

/** The file as served to the browser: one array per school, in `fields` order. */
export interface SchoolFile {
  source: Record<string, string>;
  counts: SchoolImport["counts"];
  flagged: SchoolImport["flagged"];
  fields: (keyof School)[];
  schools: (string | boolean)[][];
}

export const SCHOOL_FIELDS: (keyof School)[] = ["id", "name", "city", "street", "postalCode", "level", "grades", "board", "poBox", "regular"];

export function encodeSchools(schools: readonly School[]): SchoolFile["schools"] {
  return schools.map((s) => SCHOOL_FIELDS.map((f) => s[f]));
}

export function decodeSchools(file: Pick<SchoolFile, "fields" | "schools">): School[] {
  return file.schools.map((row) => Object.fromEntries(file.fields.map((f, i) => [f, row[i]])) as unknown as School);
}

/** Lowest and highest grade ("JK-8" → [-1, 8]); JK is −1 and K is 0. Null if not a range. */
export function gradeSpan(grades: string): [number, number] | null {
  const m = /^(JK|K|\d{1,2})-(\d{1,2})$/.exec(grades);
  if (!m) return null;
  const low = m[1] === "JK" ? -1 : m[1] === "K" ? 0 : Number(m[1]);
  return [low, Number(m[2])];
}

/** Teaches any of grades 3 to 5, the kids page's audience. */
function teachesGrades3to5(s: School) {
  const span = gradeSpan(s.grades);
  return span !== null && span[0] <= 5 && span[1] >= 3;
}

// "St.", "Saint", "Ste" and "Sainte" are written every way in school names.
const SAINT = /^(saint|sainte|ste)$/;

/** Lowercase, without accents or punctuation, for matching ("Saint-Jean d’Arc" → "st jean darc"). */
export function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .map((w) => (SAINT.test(w) ? "st" : w))
    .join(" ");
}

export interface SchoolIndex {
  schools: School[];
  keys: string[];
}

export function indexSchools(schools: School[]): SchoolIndex {
  return { schools, keys: schools.map((s) => searchKey(s.name)) };
}

/**
 * Schools whose name matches the query: every word of the query starts a word
 * of the name, in any order, or the query (ignoring spaces) is inside the
 * name. Names that start with the query come first, then schools teaching
 * grades 3–5, then alphabetical order.
 */
export function searchSchools(index: SchoolIndex, query: string, limit = 8): School[] {
  const q = searchKey(query);
  if (q.length < 2) return [];
  const qWords = q.split(" ");
  const qCompact = q.replaceAll(" ", "");

  const hits: { school: School; score: number }[] = [];
  index.keys.forEach((key, i) => {
    const words = key.split(" ");
    let score = 0;
    if (key.startsWith(q)) score = 3;
    else if (qWords.every((qw) => words.some((w) => w.startsWith(qw)))) score = 2;
    else if (key.replaceAll(" ", "").includes(qCompact)) score = 1;
    if (!score) return;
    const school = index.schools[i];
    hits.push({ school, score: score * 4 + (teachesGrades3to5(school) ? 2 : 0) + (school.regular ? 1 : 0) });
  });

  return hits
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name, "en-CA") || a.school.city.localeCompare(b.school.city))
    .slice(0, limit)
    .map((h) => h.school);
}

export type SchoolArea = AreaLookup | { error: "poBox" };

/**
 * The reporting area around a school, through the same postal-code lookup as
 * the search box. A PO-box postal code may be far from the building, so
 * those schools aren't placed.
 */
export function schoolArea(school: School, coveredFsas: ReadonlySet<string> | null): SchoolArea {
  if (school.poBox) return { error: "poBox" };
  return areaForPostalCode(school.postalCode, coveredFsas);
}

/** Most common town among each FSA's schools, as a hint next to area codes. */
export function townsByFsa(schools: readonly School[]): Record<string, string> {
  const tally = new Map<string, Map<string, number>>();
  for (const s of schools) {
    const fsa = s.postalCode.slice(0, 3);
    const towns = tally.get(fsa) ?? new Map<string, number>();
    towns.set(s.city, (towns.get(s.city) ?? 0) + 1);
    tally.set(fsa, towns);
  }
  return Object.fromEntries(
    [...tally].map(([fsa, towns]) => [fsa, [...towns].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]]),
  );
}
