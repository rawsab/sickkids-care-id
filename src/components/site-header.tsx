"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Community map" },
  { href: "/dashboard", label: "Public health dashboard" },
  { href: "/notes", label: "Technical notes" },
  { href: "/admin/upload", label: "Upload" },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-brand-navy text-white shadow-raised">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-6 px-4 sm:px-6">
        {/* Wordmark only — the SickKids logo needs approved co-branding artwork. */}
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-white text-sm font-bold text-brand-navy">
            C
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight text-white">CARE-ID</span>
            <span className="block text-xs text-white/85">in partnership with SickKids</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-3 py-2 transition-colors ${
                      active ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      <div className="h-0.5 bg-brand-blue" />

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-white/15 bg-brand-navy md:hidden">
          <ul className="space-y-1 px-4 py-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
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
