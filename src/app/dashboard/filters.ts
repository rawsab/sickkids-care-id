import type { Sex } from "@/lib/ingest/validate";
import { normaliseFsa } from "@/lib/regions";
import type { SeriesFilter } from "@/lib/queries";
import { VIRUSES, type VirusKey } from "@/lib/viruses";

type SearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_VIRUSES: VirusKey[] = ["COVID19", "INF_ANY", "RSV"];
export const WEEK_OPTIONS = [
  { value: "8", label: "Last 8 weeks" },
  { value: "12", label: "Last 12 weeks" },
  { value: "26", label: "Last 26 weeks" },
  { value: "52", label: "Last 52 weeks" },
  { value: "all", label: "All available" },
];
export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
  { value: "UNKNOWN", label: "Not reported" },
];

/** Dashboard filter state, kept in the URL so views can be bookmarked and shared. */
export interface DashboardFilters extends SeriesFilter {
  /** "all", "region:<name>" or "fsa:<code>". */
  area: string;
  weeksParam: string;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function parseFilters(sp: SearchParams): DashboardFilters {
  const known = new Set(VIRUSES.map((v) => v.key));
  const viruses = all(sp.v).filter((v): v is VirusKey => known.has(v as VirusKey));

  const area = first(sp.area) ?? "all";
  const [kind, value = ""] = area.split(":", 2);
  const region = kind === "region" && value ? value : undefined;
  const fsa = kind === "fsa" ? (normaliseFsa(value) ?? undefined) : undefined;

  const weeksParam = WEEK_OPTIONS.some((o) => o.value === first(sp.weeks)) ? first(sp.weeks)! : "12";
  const sex = SEX_OPTIONS.find((o) => o.value === first(sp.sex))?.value;

  return {
    viruses: viruses.length ? VIRUSES.map((v) => v.key).filter((k) => viruses.includes(k)) : DEFAULT_VIRUSES,
    area: region ? `region:${region}` : fsa ? `fsa:${fsa}` : "all",
    region,
    fsa,
    ageBand: first(sp.age) || undefined,
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
  if (f.ageBand) q.set("age", f.ageBand);
  if (f.sex) q.set("sex", f.sex);
  q.set("weeks", f.weeksParam);
  if (f.rolling) q.set("rolling", "1");
  return q.toString();
}

export function areaLabel(f: DashboardFilters): string {
  if (f.region) return f.region;
  if (f.fsa) return `FSA ${f.fsa}`;
  return "All areas";
}
