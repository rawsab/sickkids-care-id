"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/client";
import { isLocale, localePath, switchLocalePath, type Locale } from "@/i18n/config";

const NAV = [
  { path: "/", key: "map" },
  { path: "/dashboard", key: "dashboard" },
  { path: "/notes", key: "notes" },
  { path: "/admin/upload", key: "upload" },
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

export function SiteHeader() {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = localePath(locale, "/");
  const nav = NAV.map((item) => ({ href: localePath(locale, item.path), label: dict.header.nav[item.key] }));

  return (
    <header className="sticky top-0 z-40 bg-brand-navy text-white shadow-raised">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-6 px-4 sm:px-6">
        {/* Wordmark only — the SickKids logo needs approved co-branding artwork. */}
        <Link href={home} className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-white text-sm font-bold text-brand-navy">
            C
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight text-white">CARE-ID</span>
            <span className="block whitespace-nowrap text-xs text-white/85">{dict.header.partnership}</span>
          </span>
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
      <div className="h-0.5 bg-brand-blue" />

      {open && (
        <nav id="mobile-nav" aria-label={dict.header.navLabel} className="border-t border-white/15 bg-brand-navy lg:hidden">
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
          </ul>
        </nav>
      )}
    </header>
  );
}
