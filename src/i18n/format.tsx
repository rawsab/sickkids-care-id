// Message helpers shared by server and client components. Dictionary strings
// use {name} placeholders, { one, other } plural pairs, and <tag>…</tag> spans
// for inline markup (rendered by `rich`).

import { Fragment, type ReactNode } from "react";
import { INTL_LOCALE, type Locale } from "./config";

export interface Plural {
  one: string;
  other: string;
}

type Vars = Record<string, string | number>;

/** Fills {name} placeholders. */
export function t(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Picks the plural form for `count` and fills {count} plus any other placeholders. */
export function plural(locale: Locale, count: number, forms: Plural, vars: Vars = {}, options?: Intl.PluralRulesOptions): string {
  const rule = new Intl.PluralRules(INTL_LOCALE[locale], options).select(count);
  return t(rule === "one" ? forms.one : forms.other, { count: formatNumber(locale, count), ...vars });
}

/**
 * Renders <tag>…</tag> spans in a message with the matching component, e.g.
 * rich("Read the <link>notes</link>", { link: (s) => <a href="/notes">{s}</a> }).
 */
export function rich(template: string, tags: Record<string, (chunk: ReactNode) => ReactNode>, vars: Vars = {}): ReactNode {
  const parts: ReactNode[] = [];
  const re = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  for (let m = re.exec(template); m; m = re.exec(template)) {
    parts.push(t(template.slice(last, m.index), vars));
    const render = tags[m[1]];
    parts.push(<Fragment key={m.index}>{render ? render(t(m[2], vars)) : t(m[2], vars)}</Fragment>);
    last = m.index + m[0].length;
  }
  parts.push(t(template.slice(last), vars));
  return parts;
}

export const formatNumber = (locale: Locale, n: number) => n.toLocaleString(INTL_LOCALE[locale]);

/** One-decimal percentage of a value already in percent: 5 → "5.0%" / "5,0 %". */
export const formatPct = (locale: Locale, value: number) =>
  new Intl.NumberFormat(INTL_LOCALE[locale], { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value / 100);

/** Percentage bin boundary without decimals: 2 → "2%" / "2 %". */
export const formatWholePct = (locale: Locale, value: number) =>
  new Intl.NumberFormat(INTL_LOCALE[locale], { style: "percent", maximumFractionDigits: 0 }).format(value / 100);
