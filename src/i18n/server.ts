import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { isLocale, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { getDictionary } from "./dictionaries";

/** The current request's language (from the /[lang] segment) and its dictionary. */
export async function getI18n(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  return { locale, dict: await getDictionary(locale) };
}
