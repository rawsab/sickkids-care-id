import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-4 px-4 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl">
          <span className="font-semibold text-text">CARE-ID</span> shows de-identified, combined results only. Individual
          test results are never stored or shown, and small numbers are hidden.
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/notes" className="hover:text-text">
            Technical notes
          </Link>
          <Link href="/notes#privacy" className="hover:text-text">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
