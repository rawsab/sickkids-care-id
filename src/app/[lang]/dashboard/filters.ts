import type { Dictionary } from "@/i18n/dictionaries/en";
import { DEFAULT_AGE_BANDS } from "@/lib/ingest/deidentify";
import type { Sex } from "@/lib/ingest/validate";
import { normaliseFsa } from "@/lib/regions";
import type { SeriesFilter } from "@/lib/queries";
import { DASHBOARD_VIRUSES, type VirusKey } from "@/lib/viruses";

type SearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_VIRUSES: VirusKey[] = [...DASHBOARD_VIRUSES];
// Labels: dashboard.filters.weeks and common.sex in the dictionaries.
export const WEEK_OPTIONS = ["8", "12", "26", "52", "all"];
export const SEX_OPTIONS: Sex[] = ["FEMALE", "MALE", "OTHER", "UNKNOWN"];

/** Dashboard filter state, kept in the URL so views can be bookmarked and shared. */
export interface DashboardFilters extends SeriesFilter {
  /** "all", "region:<name>" or "fsa:<code>". */
  area: string;
  /** Inclusive ages; always on age-band edges, since only bands are stored. */
  age?: AgeRange;
  weeksParam: string;
}

export interface AgeRange {
  min: number;
  max: number;
}

/** The age filter for a range: every stored band that lies inside it, or nothing for all ages. */
export function ageFilter(range: AgeRange | undefined): Pick<DashboardFilters, "age" | "ageBands"> {
  const bands = range ? DEFAULT_AGE_BANDS.filter((b) => b.min >= range.min && b.max <= range.max) : [];
  if (!bands.length || bands.length === DEFAULT_AGE_BANDS.length) return { age: undefined, ageBands: undefined };
  return { age: { min: bands[0].min, max: bands.at(-1)!.max }, ageBands: bands.map((b) => b.label) };
}

/** "4-13" → 4–13; older links used one band's label ("4–8"). */
function parseAge(value: string | undefined): AgeRange | undefined {
  const match = value?.match(/^(\d{1,2})\D(\d{1,2})$/);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : undefined;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function parseFilters(sp: SearchParams): DashboardFilters {
  const known = new Set<VirusKey>(DASHBOARD_VIRUSES);
  const viruses = all(sp.v).filter((v): v is VirusKey => known.has(v as VirusKey));

  const area = first(sp.area) ?? "all";
  const [kind, value = ""] = area.split(":", 2);
  const region = kind === "region" && value ? value : undefined;
  const fsa = kind === "fsa" ? (normaliseFsa(value) ?? undefined) : undefined;

  const weeksParam = WEEK_OPTIONS.includes(first(sp.weeks) ?? "") ? first(sp.weeks)! : "12";
  const sex = SEX_OPTIONS.find((o) => o === first(sp.sex));

  return {
    viruses: viruses.length ? DASHBOARD_VIRUSES.filter((k) => viruses.includes(k)) : DEFAULT_VIRUSES,
    area: region ? `region:${region}` : fsa ? `fsa:${fsa}` : "all",
    region,
    fsa,
    ...ageFilter(parseAge(first(sp.age))),
    sex,
    weeksParam,
    weeks: weeksParam === "all" ? null : Number(weeksParam),
    rolling: first(sp.rolling) === "1",
  };
}

export function filtersToQuery(f: DashboardFilters): string {
  const q = new URLSearchParams();
  f.viruses.forEach((v) => q.append("v", v));
  if (f.area !== "all") q.set("area", f.area);
  if (f.age) q.set("age", `${f.age.min}-${f.age.max}`);
  if (f.sex) q.set("sex", f.sex);
  q.set("weeks", f.weeksParam);
  if (f.rolling) q.set("rolling", "1");
  return q.toString();
}

export function areaLabel(f: DashboardFilters, dict: Dictionary): string {
  if (f.region) return dict.common.regions[f.region] ?? f.region;
  if (f.fsa) return dict.dashboard.fsaArea.replace("{fsa}", f.fsa);
  return dict.dashboard.allAreas;
}
