import { INTL_LOCALE, type Locale } from "@/i18n/config";
import { epiWeek, parseIsoDate } from "./epiweek";

/** e.g. "Week 43 (Oct 25, 2026)"; `template` comes from the dictionary (common.weekLabel). */
export function weekLabel(iso: string, locale: Locale, template: string): string {
  const d = parseIsoDate(iso)!;
  const date = d.toLocaleDateString(INTL_LOCALE[locale], { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return template.replace("{week}", String(epiWeek(d).week)).replace("{date}", date);
}

export function shortWeek(iso: string, locale: Locale): string {
  return parseIsoDate(iso)!.toLocaleDateString(INTL_LOCALE[locale], { month: "short", day: "numeric", timeZone: "UTC" });
}
