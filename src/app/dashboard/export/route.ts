import Papa from "papaparse";
import { getDataRange, getWeeklySeries } from "@/lib/queries";
import { VIRUS_BY_KEY } from "@/lib/viruses";
import { areaLabel, parseFilters } from "../filters";

// TODO(auth): require a PH_USER or ADMIN session (currently gated by src/proxy.ts).
export async function GET(request: Request) {
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
          virus: VIRUS_BY_KEY[v].label,
          area: areaLabel(filters),
          age_group: filters.ageBand ?? "All",
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
