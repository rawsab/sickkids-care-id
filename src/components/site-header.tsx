"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { logoutAction } from "@/app/[lang]/login/actions";
import { useI18n } from "@/i18n/client";
import { isLocale, localePath, switchLocalePath, type Locale } from "@/i18n/config";

const NAV = [
  { path: "/", key: "map" },
  { path: "/dashboard", key: "dashboard" },
  { path: "/kids", key: "kids" },
  { path: "/about", key: "notes" },
  { path: "/admin/upload", key: "upload", signedInOnly: true },
] as const;

const isActive = (pathname: string, href: string, home: string) => (href === home ? pathname === home : pathname.startsWith(href));

/** Same page in the other language; carries the query and hash along at click time. */
function LanguageSwitch({ className }: { className: string }) {
  const { dict } = useI18n();
  const pathname = usePathname();
  const to = dict.languageSwitch.hrefLang as Locale;
  return (
    <a
      href={switchLocalePath(pathname, isLocale(to) ? to : "en")}
      lang={to}
      hrefLang={to}
      onClick={(e) => {
        e.currentTarget.search = window.location.search;
        e.currentTarget.hash = window.location.hash;
      }}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <Icon name="globe" className="size-4" />
      {dict.languageSwitch.label}
    </a>
  );
}

/** Sign in link, or a sign-out button (a form, so it works before hydration). */
function AccountControl({ signedIn, className, onNavigate }: { signedIn: boolean; className: string; onNavigate?: () => void }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  if (signedIn) {
    return (
      <form action={logoutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className={className}>
          {dict.header.signOut}
        </button>
      </form>
    );
  }
  const login = localePath(locale, "/login");
  return (
    <Link href={pathname === login ? login : `${login}?next=${encodeURIComponent(pathname)}`} onClick={onNavigate} className={className}>
      {dict.header.signIn}
    </Link>
  );
}

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = localePath(locale, "/");
  const nav = NAV.filter((item) => signedIn || !("signedInOnly" in item)).map((item) => ({
    href: localePath(locale, item.path),
    label: dict.header.nav[item.key],
  }));

  return (
    <header className="sticky top-0 z-40 bg-brand-royal text-white shadow-header">
      <div className="mx-auto flex h-18 max-w-[90rem] items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
        {/* Negative (white) CARE-ID logo on the solid royal bar, per the SickKids tip sheet. */}
        <Link href={home} className="flex min-w-0 items-center gap-3 sm:gap-4" onClick={() => setOpen(false)}>
          <Image src="/brand/care-id-logo-white.png" alt="CARE-ID" width={44} height={52} priority className="h-[52px] w-auto" />
          <span className="whitespace-pre-line text-xs font-bold leading-tight text-white sm:text-base">{dict.header.tagline}</span>
        </Link>

        {/* Inline from lg: the French labels need the room. */}
        <nav aria-label={dict.header.navLabel} className="hidden lg:block">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {nav.map((item) => {
              const active = isActive(pathname, item.href, home);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
                      active ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="ml-2 border-l border-white/20 pl-3">
              <LanguageSwitch className="rounded-lg px-3 py-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white" />
            </li>
            <li>
              <AccountControl
                signedIn={signedIn}
                className="whitespace-nowrap rounded-lg px-3 py-2 font-medium text-white ring-1 ring-white/40 transition-colors hover:bg-white/10"
              />
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSwitch className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10" />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? dict.header.closeMenu : dict.header.openMenu}
            onClick={() => setOpen((o) => !o)}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label={dict.header.navLabel} className="border-t border-white/15 bg-brand-royal lg:hidden">
          <ul className="space-y-1 px-4 py-3">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href, home) ? "page" : undefined}
                  className="block rounded-lg px-3 py-2.5 font-medium text-white/90 hover:bg-white/10 aria-[current=page]:bg-white/15 aria-[current=page]:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-white/15 pt-1">
              <AccountControl
                signedIn={signedIn}
                onNavigate={() => setOpen(false)}
                className="block w-full rounded-lg px-3 py-2.5 text-left font-medium text-white/90 hover:bg-white/10"
              />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
