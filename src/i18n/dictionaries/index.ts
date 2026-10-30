import type { Locale } from "../config";
import type { Dictionary } from "./en";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./en").then((m) => m.en),
  fr: () => import("./fr").then((m) => m.fr),
};

/** Loads a language's dictionary. Server code only; client components use `useI18n`. */
export const getDictionary = (locale: Locale) => dictionaries[locale]();
