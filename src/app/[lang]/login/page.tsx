import type { Metadata } from "next";
import { Card } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.login.metaTitle, robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { dict } = await getI18n();
  const { next } = await searchParams;
  const l = dict.login;
  return (
    <section className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <Card className="p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-royal">{l.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-text">{l.title}</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">{l.lead}</p>
        <div className="mt-6">
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </Card>
    </section>
  );
}
