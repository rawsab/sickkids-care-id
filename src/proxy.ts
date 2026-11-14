import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

/** Best supported language from Accept-Language, e.g. "fr-CA,fr;q=0.9,en;q=0.8" → "fr". */
function negotiate(header: string | null): Locale {
  const ranked = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { lang: tag.split("-")[0], q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);
  return (ranked.find((r) => isLocale(r.lang))?.lang as Locale | undefined) ?? DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  // No language segment: send the visitor to their language, keeping the rest of the URL.
  if (!isLocale(first)) {
    const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookie) ? cookie : negotiate(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (request.cookies.get(LOCALE_COOKIE)?.value !== first) {
    response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}

export const config = {
  // Everything except Next internals and files with an extension (GeoJSON, worker, favicon).
  matcher: ["/((?!_next/|.*\\.[^/]+$).*)"],
};
