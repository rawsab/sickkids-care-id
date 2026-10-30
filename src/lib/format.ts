import { epiWeek, parseIsoDate } from "./epiweek";

export const pct = (v: number) => `${v.toFixed(1)}%`;

export function weekLabel(iso: string): string {
  const d = parseIsoDate(iso)!;
  const date = d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `Week ${epiWeek(d).week} (${date})`;
}

export function shortWeek(iso: string): string {
  return parseIsoDate(iso)!.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });
}
