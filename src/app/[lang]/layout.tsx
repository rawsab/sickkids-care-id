import type { Metadata } from "next";
import { Libre_Franklin } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { I18nProvider } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth/session";
import "../globals.css";

// Libre Franklin: an open-source (OFL) revival of Franklin Gothic, the tip
// sheet's preferred face, which has no free web licence. Variable, so every
// weight from 100 to 900 is available.
const franklin = Libre_Franklin({ variable: "--font-franklin", subsets: ["latin"] });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return {
    title: { default: dict.meta.title, template: dict.meta.titleTemplate },
    description: dict.meta.description,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ locale, dict }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body className={`${franklin.variable} flex min-h-screen flex-col antialiased`}>
        <I18nProvider locale={locale} dict={dict}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-overlay"
          >
            {dict.header.skipLink}
          </a>
          <SiteHeader signedIn={user !== null} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
