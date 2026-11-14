import Image from "next/image";
import Link from "next/link";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export async function SiteFooter() {
  const { locale, dict } = await getI18n();
  return (
    <footer className="border-t border-border bg-surface">
      {/* Gaps keep the tip sheet's clear space (one "K" cap height) around the SickKids logo; it stays above the 1" minimum. */}
      <div className="mx-auto flex max-w-[90rem] flex-col gap-10 px-4 py-10 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Image src="/brand/sickkids-logo.png" alt="SickKids" width={140} height={42} className="h-[42px] w-auto shrink-0 self-start sm:self-center" />
        <nav aria-label={dict.footer.navLabel} className="flex gap-5">
          <Link href={localePath(locale, "/about")} className="hover:text-text">
            {dict.footer.notes}
          </Link>
          <Link href={localePath(locale, "/about#privacy")} className="hover:text-text">
            {dict.footer.privacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
