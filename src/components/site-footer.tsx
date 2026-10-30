import Link from "next/link";
import { localePath } from "@/i18n/config";
import { rich } from "@/i18n/format";
import { getI18n } from "@/i18n/server";

export async function SiteFooter() {
  const { locale, dict } = await getI18n();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-4 px-4 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl">{rich(dict.footer.statement, { b: (s) => <span className="font-semibold text-text">{s}</span> })}</p>
        <nav aria-label={dict.footer.navLabel} className="flex gap-5">
          <Link href={localePath(locale, "/notes")} className="hover:text-text">
            {dict.footer.notes}
          </Link>
          <Link href={localePath(locale, "/notes#privacy")} className="hover:text-text">
            {dict.footer.privacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
