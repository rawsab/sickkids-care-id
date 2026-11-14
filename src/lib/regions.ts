// Default FSA → region mapping, from the first letter of Ontario FSAs. This
// seeds the editable `FsaLookup` table; admins refine it (e.g. to public
// health units) from the admin page.

export const ONTARIO_REGIONS: Record<string, string> = {
  K: "Eastern Ontario",
  L: "Central Ontario",
  M: "Toronto",
  N: "Southwestern Ontario",
  P: "Northern Ontario",
};

export const FSA_PATTERN = /^[A-Z]\d[A-Z]$/;

/** Normalise free-text input ("m6h 1a1", " M6H") to an FSA, or null. */
export function normaliseFsa(value: string): string | null {
  const fsa = value.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  return FSA_PATTERN.test(fsa) ? fsa : null;
}

/** A full Canadian postal code without spaces ("m6h 1a1" → "M6H1A1"), or null. */
export function normalisePostalCode(value: string): string | null {
  const code = value.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code) ? code : null;
}

// GTA regional municipalities, by FSA prefix. Approximate: a few FSAs straddle
// boundaries, so admins should review assignments in the FSA lookup.
const GTA_REGIONS: [RegExp, string][] = [
  [/^(L1|L9[LP]|L0[BCH])/, "Durham"],
  [/^(L4[T-Z]|L5|L6[P-Z]|L7[ACEK])/, "Peel"],
  [/^(L6[HJKLM]|L7[GJLMNPRST]|L9[ET]|L0P)/, "Halton"],
  [/^(L3|L4[A-L]|L4[PS]|L6[A-G]|L7B|L9N|L0[EGJ])/, "York"],
];

export function defaultRegionForFsa(fsa: string): string | null {
  return GTA_REGIONS.find(([re]) => re.test(fsa))?.[1] ?? ONTARIO_REGIONS[fsa[0]] ?? null;
}
