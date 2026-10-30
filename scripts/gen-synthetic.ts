// Generates a realistic-looking synthetic results file in the SickKids CSV
// format, for demos and development. No real data is involved.
//
//   npx tsx scripts/gen-synthetic.ts [rows] [out.csv]

import { readFileSync, writeFileSync } from "node:fs";

const ROWS = Number(process.argv[2] ?? 60_000);
const OUT = process.argv[3] ?? "synthetic.csv";
const START = Date.UTC(2025, 8, 2); // 2025-09-02, first day of school
const END = Date.UTC(2026, 9, 29); // 2026-10-29
const DAY = 86_400_000;

// Deterministic RNG so the file is reproducible.
let seed = 20261030;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Every FSA on the GTA map (built by `npm run geo:build`). Toronto FSAs and
// suburban FSAs get more tests than rural ones (L0*, second digit 0).
const GTA_FSAS: string[] = JSON.parse(readFileSync("public/geo/gta-fsa.geojson", "utf8")).features
  .map((f: { properties: { CFSAUID: string } }) => f.properties.CFSAUID)
  .sort();
// Each FSA gets a fixed "intensity" so the map has real variation, smoothed
// by FSA order so neighbouring codes (which tend to be nearby) look alike.
let drift = 1;
const FSAS = GTA_FSAS.map((fsa) => {
  drift = Math.min(1.5, Math.max(0.55, drift + (rand() - 0.5) * 0.35));
  return { fsa, weight: fsa[1] === "0" ? 0.5 : fsa[0] === "M" ? 3 : 2, intensity: drift * (0.85 + rand() * 0.3) };
});
const totalWeight = FSAS.reduce((n, f) => n + f.weight, 0);
const pickFsa = () => {
  let r = rand() * totalWeight;
  for (const f of FSAS) if ((r -= f.weight) <= 0) return f;
  return FSAS[0];
};

/** Bell-shaped seasonal curve: positivity (0–1) peaking on a month/day each school year. */
const wave = (t: number, base: number, peak: number, month: number, day: number, widthWeeks: number) => {
  const d = new Date(t);
  const seasonYear = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  const year = month >= 6 ? seasonYear : seasonYear + 1;
  const weeks = (t - Date.UTC(year, month, day)) / (7 * DAY);
  return base + (peak - base) * Math.exp(-(weeks * weeks) / (2 * widthWeeks * widthWeeks));
};

const VIRUS_CURVES = {
  INF_A: (t: number) => wave(t, 0.01, 0.24, 0, 15, 3.5),
  INF_B: (t: number) => wave(t, 0.005, 0.1, 2, 10, 3.5),
  RSV_PCR: (t: number) => wave(t, 0.01, 0.17, 11, 5, 3),
  CORO19: (t: number) => Math.max(wave(t, 0.03, 0.09, 8, 28, 3), wave(t, 0.03, 0.11, 0, 5, 3)),
};

// School days only: weekdays, September to June.
const schoolDays: number[] = [];
for (let t = START; t <= END; t += DAY) {
  const d = new Date(t);
  if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && ![6, 7].includes(d.getUTCMonth())) schoolDays.push(t);
}

const result = (p: number) => (rand() < 0.015 ? "Indeterminate" : rand() < p ? "Detected" : "Not detected");
const lines = ["Gender,AGE_IN_YEARS,DTM_COL,INF_A,INF_B,RSV_PCR,CORO19,FSA"];
for (let i = 0; i < ROWS; i++) {
  const t = schoolDays[Math.floor(rand() * schoolDays.length)];
  const area = pickFsa();
  const p = (curve: (t: number) => number) => Math.min(0.6, curve(t) * area.intensity);
  const gender = rand() < 0.02 ? "" : rand() < 0.5 ? "Female" : "Male";
  const age = 4 + Math.floor(rand() * 11);
  lines.push(
    [
      gender,
      age,
      new Date(t).toISOString().slice(0, 10),
      result(p(VIRUS_CURVES.INF_A)),
      result(p(VIRUS_CURVES.INF_B)),
      result(p(VIRUS_CURVES.RSV_PCR)),
      result(p(VIRUS_CURVES.CORO19)),
      area.fsa,
    ].join(","),
  );
}

writeFileSync(OUT, "﻿" + lines.join("\n") + "\n");
console.log(`Wrote ${ROWS.toLocaleString()} rows to ${OUT}`);
