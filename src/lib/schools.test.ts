import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { areaForPostalCode } from "./geo";
import { normalisePostalCode } from "./regions";
import { parseSchoolList } from "./school-import";
import { decodeSchools, gradeSpan, indexSchools, schoolArea, searchKey, searchSchools, type SchoolFile } from "./schools";

// Rows copied from the official September 2026 file (contact columns blanked),
// in its real layout: pipe-delimited, BOM, CRLF line endings.
const HEADER =
  "Region|Board Number|Board Name|Board Type|Board Language|School Number|School Name|School Level|School Language|School Type|School Special Conditions|Suite|PO Box|Street|City|Province|Postal Code|Phone|Fax|Grade Range|Date Open|Email|Website|Board Website";
const ROWS = [
  "Toronto Region|B66303|CS Viamonde|Pub Dist Sch Brd (E/F)|French|023549|Académie Alexandre-Dumas|Elementary|French|Public|Not applicable|||255 Coronation promenade|Scarborough|Ontario|M1E2J3|||JK-6||||",
  "Toronto Region|B66303|CS Viamonde|Pub Dist Sch Brd (E/F)|French|019735|École élémentaire La Mosaïque|Elementary|French|Public|Not applicable|||80 Queensdale av|East York|Ontario|M4J1Y3|||JK-6||||",
  "East Region|B67105|Durham CDSB|Cath Dist Sch Brd (E/F)|English|811696|St Joseph Catholic School|Elementary|English|Catholic|Not applicable||Box 1570|25 Quaker Village Dr|Uxbridge|Ontario|L9P1N7|||JK-8||||",
  "East Region|B67105|Durham CDSB|Cath Dist Sch Brd (E/F)|English|814423|St Joseph Catholic School|Elementary|English|Catholic|Not applicable|||1200 Summerwood Heights|Oshawa|Ontario|L1K0C2|||JK-8||||",
  "Central Region|B67083|Dufferin-Peel CDSB|Cath Dist Sch Brd (E/F)|English|736228|St. Oscar Romero School|Secondary|English|Catholic|Not applicable|||2495 Credit Valley Road|Mississauga|Ontario|L5M4G8|||9-12||||",
  "Central Region|B67083|Dufferin-Peel CDSB|Cath Dist Sch Brd (E/F)|English|832489|St. Oscar Romero School|Elementary|English|Catholic|Not applicable|||2495 Credit Valley Road|Mississauga|Ontario|L5M4G8|||JK-8||||",
  "Toronto Region|B66052|Toronto DSB|Pub Dist Sch Brd (E/F)|English|642754|Tre-Add - Rexdale|Secondary|English|Public|Care/Treatment Facility|||7 Hawksdale Rd|Toronto|Ontario||||9-12||||",
  "North Region|B28010|Algoma DSB|Pub Dist Sch Brd (E/F)|English|019186|Anna McCrea Public School|Elementary|English|Public|Not applicable|||250 Mark St|Sault Ste Marie|Ontario|P6A3M7|||JK-8||||",
  "Toronto Region|B66052|Toronto DSB|Pub Dist Sch Brd (E/F)|English|941948|Sir John A Macdonald Collegiate Institute|Secondary|English|Public|Not applicable|||2300 Pharmacy Ave|Toronto|Ontario|M1W1H8|||9-12||||",
];
const COVERED = new Set(["M1E", "M4J", "L9P", "L1K", "L5M", "M1W"]);
const file = (rows: string[]) => "﻿" + [HEADER, ...rows].join("\r\n") + "\r\n";

describe("parseSchoolList", () => {
  const result = parseSchoolList(file(ROWS), COVERED);
  const byId = Object.fromEntries(result.schools.map((s) => [s.id, s]));

  it("keeps accents and leading zeros", () => {
    expect(byId["023549"].name).toBe("Académie Alexandre-Dumas");
    expect(byId["019735"].name).toBe("École élémentaire La Mosaïque");
  });

  it("keeps only schools in covered FSAs", () => {
    expect(byId["019186"]).toBeUndefined();
    expect(result.counts.outsideCoverage).toBe(1);
  });

  it("flags a missing postal code instead of guessing one", () => {
    expect(byId["642754"]).toBeUndefined();
    expect(result.flagged).toEqual([{ id: "642754", name: "Tre-Add - Rexdale", issue: "noPostalCode" }]);
  });

  it("keeps same-named schools apart, including two at one campus", () => {
    expect(result.schools.filter((s) => s.name === "St Joseph Catholic School").map((s) => s.city).sort()).toEqual(["Oshawa", "Uxbridge"]);
    expect(result.schools.filter((s) => s.name === "St. Oscar Romero School").map((s) => s.grades).sort()).toEqual(["9-12", "JK-8"]);
  });

  it("drops a record repeated under a second number", () => {
    const repeat = ROWS[1].replace("|019735|", "|999999|");
    const again = parseSchoolList(file([ROWS[1], repeat]), COVERED);
    expect(again.schools.map((s) => s.id)).toEqual(["019735"]);
    expect(again.flagged[0]).toMatchObject({ id: "999999", issue: "duplicateRecord" });
  });

  it("drops summer and adult programs", () => {
    const summer = ROWS[0].replace("|023549|", "|111111|").replace("Not applicable", "Summer");
    expect(parseSchoolList(file([summer]), COVERED).counts).toMatchObject({ kept: 0, excludedProgram: 1 });
  });

  it("rejects a file whose columns have changed", () => {
    expect(() => parseSchoolList(file([]).replace("Postal Code", "Postcode"), COVERED)).toThrow(/Postal Code/);
  });
});

describe("postal codes", () => {
  it("normalises spacing and case", () => {
    expect(normalisePostalCode(" m1e 2j3 ")).toBe("M1E2J3");
    expect(normalisePostalCode("M1E2J")).toBeNull();
  });

  it("finds the covered reporting area or says why not", () => {
    expect(areaForPostalCode("m1e 2j3", COVERED)).toEqual({ fsa: "M1E" });
    expect(areaForPostalCode("P6A 3M7", COVERED)).toEqual({ error: "outside", fsa: "P6A" });
    expect(areaForPostalCode("hello", COVERED)).toEqual({ error: "notPostal" });
  });
});

describe("school search", () => {
  const { schools } = parseSchoolList(file(ROWS), COVERED);
  const index = indexSchools(schools);
  const names = (q: string) => searchSchools(index, q).map((s) => s.name);

  it("ignores case, accents and punctuation", () => {
    expect(names("ACADEMIE alex")).toEqual(["Académie Alexandre-Dumas"]);
    expect(names("ecole elementaire la mosaique")).toEqual(["École élémentaire La Mosaïque"]);
    expect(names("alexandre dumas")).toEqual(["Académie Alexandre-Dumas"]);
    expect(names("alexandredumas")).toEqual(["Académie Alexandre-Dumas"]);
  });

  it("treats St, St. and Saint alike", () => {
    expect(names("saint oscar")).toEqual(["St. Oscar Romero School", "St. Oscar Romero School"]);
    expect(names("st. joseph")).toHaveLength(2);
  });

  it("ranks schools teaching grades 3–5 above others with the same name", () => {
    expect(searchSchools(index, "oscar romero").map((s) => s.grades)).toEqual(["JK-8", "9-12"]);
  });

  it("needs two characters and returns nothing for unknown names", () => {
    expect(names("s")).toEqual([]);
    expect(names("zzzz")).toEqual([]);
  });

  it("strips accents and apostrophes in keys", () => {
    expect(searchKey("Archbishop O’Sullivan")).toBe("archbishop osullivan");
    expect(searchKey("Sainte-Marguerite-d’Youville")).toBe("st marguerite dyouville");
  });

  it("parses grade ranges", () => {
    expect(gradeSpan("JK-8")).toEqual([-1, 8]);
    expect(gradeSpan("K-12")).toEqual([0, 12]);
    expect(gradeSpan("No Grades Applicable")).toBeNull();
  });
});

describe("schoolArea", () => {
  const { schools } = parseSchoolList(file(ROWS), COVERED);
  const find = (id: string) => schools.find((s) => s.id === id)!;

  it("resolves a school's postal code to its reporting area", () => {
    expect(schoolArea(find("814423"), COVERED)).toEqual({ fsa: "L1K" });
  });

  it("doesn't place schools whose postal code may be a PO box", () => {
    expect(schoolArea(find("811696"), COVERED)).toEqual({ error: "poBox" });
  });
});

describe("committed school list (public/data/gta-schools.json)", () => {
  const data: SchoolFile = JSON.parse(readFileSync("public/data/gta-schools.json", "utf8"));
  const covered = new Set<string>(
    JSON.parse(readFileSync("public/geo/gta-fsa.geojson", "utf8")).features.map((f: { properties: { CFSAUID: string } }) => f.properties.CFSAUID),
  );
  const schools = decodeSchools(data);

  it("records its official source and licence", () => {
    expect(data.source.datasetUrl).toBe("https://data.ontario.ca/dataset/ontario-public-school-contact-information");
    expect(data.source.licenceUrl).toBe("https://www.ontario.ca/page/open-government-licence-ontario");
    expect(data.source.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("only lists schools in covered FSAs, with valid postal codes and unique numbers", () => {
    expect(schools.length).toBe(data.counts.kept);
    expect(schools.every((s) => covered.has(s.postalCode.slice(0, 3)) && normalisePostalCode(s.postalCode) === s.postalCode)).toBe(true);
    expect(new Set(schools.map((s) => s.id)).size).toBe(schools.length);
    expect(schools.some((s) => s.id.startsWith("0"))).toBe(true);
  });

  it("keeps no contact details", () => {
    expect(JSON.stringify(data)).not.toMatch(/[\w.+-]+@[\w-]+\.\w|https?:\/\/(?!data\.ontario\.ca|www\.ontario\.ca)|\d{3}-\d{3}-\d{4}/);
  });
});
