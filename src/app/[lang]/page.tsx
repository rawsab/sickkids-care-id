import { CommunityExplorer } from "@/components/community/explorer";
import { EmptyState } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { localePath, type Locale } from "@/i18n/config";
import { rich, t } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { weekLabel } from "@/lib/format";
import { PRIVACY_RULES } from "@/lib/privacy";
import { getAreas, getDataRange, getFsaActivity } from "@/lib/queries";
import { normaliseFsa } from "@/lib/regions";
import { COMMUNITY_VIRUSES, type CommunityVirus } from "@/lib/viruses";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CommunityView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { locale, dict } = await getI18n();
  const range = await getDataRange();

  if (!range) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title={dict.home.emptyTitle}>{dict.home.emptyBody}</EmptyState>
      </div>
    );
  }

  const [activity, areas] = await Promise.all([getFsaActivity(range, [...COMMUNITY_VIRUSES]), getAreas()]);
  const virusParam = first(sp.virus);
  const initialVirus = COMMUNITY_VIRUSES.includes(virusParam as CommunityVirus) ? (virusParam as CommunityVirus) : "COVID19";

  return (
    <>
      <CommunityExplorer
        activity={activity}
        regions={Object.fromEntries(areas.fsas.map((f) => [f.fsa, f.region]))}
        latestWeekLabel={weekLabel(range.latest, locale, dict.common.weekLabel)}
        initialFsa={normaliseFsa(first(sp.fsa) ?? "")}
        initialVirus={initialVirus}
      />
      <InfoSections locale={locale} dict={dict} />
    </>
  );
}

function InfoSections({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { how, privacy, tips } = dict.home;
  const bold = { b: (chunk: React.ReactNode) => <span className="font-semibold text-text">{chunk}</span> };
  return (
    <div className="bg-canvas">
      <div className="mx-auto max-w-[90rem] space-y-14 px-4 py-14 sm:px-6">
        <section aria-labelledby="how-heading">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-royal">{how.eyebrow}</p>
          <h2 id="how-heading" className="scroll-mt-24 mt-1 text-2xl font-bold tracking-tight">
            {how.title}
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {how.steps.map((s, i) => (
              <li key={s.title} className="rounded-[var(--radius-card)] bg-surface p-6 shadow-card ring-1 ring-border/70">
                <span className="grid size-8 place-items-center rounded-full bg-brand-sky text-sm font-bold text-brand-blueberry">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="privacy-heading" className="rounded-[var(--radius-card)] bg-brand-blueberry p-8 text-white">
            <h2 id="privacy-heading" className="text-xl font-bold">
              {privacy.title}
            </h2>
            <ul className="mt-4 space-y-2 text-white/85">
              {privacy.items.map((item) => (
                <li key={item}>{t(item, { minTests: PRIVACY_RULES.public.minTests })}</li>
              ))}
            </ul>
            <a href={localePath(locale, "/about#privacy")} className="mt-5 inline-block font-semibold text-white underline underline-offset-4">
              {privacy.link}
            </a>
          </section>

          <section aria-labelledby="tips-heading" className="rounded-[var(--radius-card)] bg-surface p-8 shadow-card ring-1 ring-border/70">
            <h2 id="tips-heading" className="text-xl font-bold">
              {tips.title}
            </h2>
            <ul className="mt-4 space-y-3 text-text-muted">
              {tips.items.map((item) => (
                <li key={item}>{rich(item, bold)}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
