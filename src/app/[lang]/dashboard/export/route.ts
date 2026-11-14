import Papa from "papaparse";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getDataRange, getWeeklySeries } from "@/lib/queries";
import { areaLabel, parseFilters } from "../filters";

// TODO(auth): require a PH_USER or ADMIN session (currently gated by src/proxy.ts).
// Column names and coded values (sex, notes) are a stable data contract and stay in
// English; virus and area names follow the page language.
export async function GET(request: Request, { params }: RouteContext<"/[lang]/dashboard/export">) {
  const { lang } = await params;
  const dict = await getDictionary(isLocale(lang) ? lang : "en");
  const url = new URL(request.url);
  const sp: Record<string, string[]> = {};
  url.searchParams.forEach((value, key) => (sp[key] ??= []).push(value));
  const filters = parseFilters(sp);

  const range = await getDataRange();
  const rows: Record<string, string | number>[] = [];
  if (range) {
    const { weeks, series } = await getWeeklySeries(filters, "ph", range);
    for (const v of filters.viruses) {
      weeks.forEach((week, i) => {
        const c = series[v][i];
        rows.push({
          week_start: week,
          virus: dict.common.viruses[v].label,
          area: areaLabel(filters, dict),
          age_group: filters.age ? `${filters.age.min}–${filters.age.max}` : "All",
          sex: filters.sex ?? "All",
          rolling_3_week: filters.rolling ? "yes" : "no",
          tests: c.suppressed ? "" : c.tested,
          detected: c.suppressed ? "" : c.nDetected,
          indeterminate: c.suppressed ? "" : c.nIndeterminate,
          percent_positive: c.suppressed ? "" : c.positivity.toFixed(1),
          note: c.suppressed ? (c.reason === "no_data" ? "no tests" : "suppressed: small numbers") : "",
        });
      });
    }
  }

  return new Response(Papa.unparse(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="care-id-positivity.csv"`,
    },
  });
}
