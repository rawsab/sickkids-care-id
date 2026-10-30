// Supported languages. Safe to import from client and server code alike.

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Remembers the last language a visitor used, for bare URLs like `/`. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const isLocale = (value: string | undefined): value is Locale => LOCALES.includes(value as Locale);

/** BCP 47 tag for Intl formatting: Canadian conventions in both languages. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-CA", fr: "fr-CA" };

/** Prefixes an app path (e.g. "/notes#privacy") with the language segment. */
export const localePath = (locale: Locale, path: string) => `/${locale}${path === "/" ? "" : path}`;

/** The same page in another language: swaps the leading language segment. */
export function switchLocalePath(pathname: string, to: Locale): string {
  const [, first, ...rest] = pathname.split("/");
  return localePath(to, isLocale(first) ? `/${rest.join("/")}` : pathname);
}
