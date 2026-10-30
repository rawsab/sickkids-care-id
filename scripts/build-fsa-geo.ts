// Builds public/geo/gta-fsa.geojson from the Statistics Canada 2021 FSA
// cartographic boundary file (Statistics Canada Open Licence).
//
// Download lfsa000b21a_e.zip in a browser (StatCan blocks scripted
// downloads) into data/raw/, then run: npm run geo:build

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";

const INPUT = "data/raw/lfsa000b21a_e.zip";
const OUTPUT = "public/geo/gta-fsa.geojson";
// Greater Toronto Area: Toronto plus Peel, York, Durham and Halton.
const GTA_BBOX = { west: -80.25, south: 43.25, east: -78.55, north: 44.45 };
// FSAs inside the box but outside the GTA: Hamilton (L8, L9H), Barrie and
// Innisfil (L4M, L4N, L9J, L9S, L9X), Bradford (L3Z), Dufferin and Simcoe
// (L0M, L0N, L9R, L9V, L9W), Guelph (N1) and Peterborough County (K9).
const NOT_GTA = /^(K|N|L8|L9[HJRSVWX]|L4[MN]|L3Z|L0[MN])/;

if (!existsSync(INPUT)) {
  console.error(`Missing ${INPUT}. Download it from the Statistics Canada 2021 boundary files page.`);
  process.exit(1);
}
mkdirSync("public/geo", { recursive: true });

const inBbox = `this.centroidX >= ${GTA_BBOX.west} && this.centroidX <= ${GTA_BBOX.east} && this.centroidY >= ${GTA_BBOX.south} && this.centroidY <= ${GTA_BBOX.north}`;

execFileSync(
  "node_modules/.bin/mapshaper",
  [
    "-i", INPUT,
    "-filter", "PRUID == '35'",
    "-proj", "wgs84",
    "-filter", inBbox,
    "-filter", `!${NOT_GTA}.test(CFSAUID)`,
    "-simplify", "4%", "keep-shapes",
    "-clean",
    "-filter-fields", "CFSAUID",
    "-o", OUTPUT, "format=geojson", "precision=0.00001",
  ],
  { stdio: "inherit" },
);

const fsas = JSON.parse(readFileSync(OUTPUT, "utf8")).features.map((f: { properties: { CFSAUID: string } }) => f.properties.CFSAUID);
console.log(`${fsas.length} FSAs, ${(statSync(OUTPUT).size / 1024).toFixed(0)} KB → ${OUTPUT}`);
