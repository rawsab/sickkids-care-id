import { CommunityExplorer } from "@/components/community/explorer";
import { EmptyState } from "@/components/ui/primitives";
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
  const range = await getDataRange();

  if (!range) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="No results yet">Respiratory virus activity will appear here once school testing results are added.</EmptyState>
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
        latestWeekLabel={weekLabel(range.latest)}
        initialFsa={normaliseFsa(first(sp.fsa) ?? "")}
        initialVirus={initialVirus}
      />
      <InfoSections />
    </>
  );
}

const STEPS = [
  {
    title: "Schools test",
    body: "Students in participating school programs are tested for COVID-19, influenza and RSV.",
  },
  {
    title: "Results are de-identified",
    body: "Names, exact ages and dates are removed. Results are combined by week and by area (the first 3 characters of the postal code).",
  },
  {
    title: "Communities see the picture",
    body: "Families and schools see how much each virus is circulating. Public health teams see detailed trends.",
  },
];

function InfoSections() {
  return (
    <div className="bg-canvas">
      <div className="mx-auto max-w-[90rem] space-y-14 px-4 py-14 sm:px-6">
        <section aria-labelledby="how-heading">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">How CARE-ID works</p>
          <h2 id="how-heading" className="mt-1 text-2xl font-bold tracking-tight">
            From a school test to community information
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[var(--radius-card)] bg-surface p-6 shadow-card ring-1 ring-border/70">
                <span className="grid size-8 place-items-center rounded-full bg-brand-sky text-sm font-bold text-brand-navy">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="privacy-heading" className="rounded-[var(--radius-card)] bg-brand-navy p-8 text-white">
            <h2 id="privacy-heading" className="text-xl font-bold">
              How we protect privacy
            </h2>
            <ul className="mt-4 space-y-2 text-white/85">
              <li>Individual results are never stored or shown.</li>
              <li>Areas with fewer than {PRIVACY_RULES.public.minTests} tests in 3 weeks are shown as “Not enough data”.</li>
              <li>The map shows activity levels, not case counts.</li>
              <li>Your location, if you share it, stays in your browser.</li>
            </ul>
            <a href="/notes#privacy" className="mt-5 inline-block font-semibold text-white underline underline-offset-4">
              Read the technical notes
            </a>
          </section>

          <section aria-labelledby="tips-heading" className="rounded-[var(--radius-card)] bg-surface p-8 shadow-card ring-1 ring-border/70">
            <h2 id="tips-heading" className="text-xl font-bold">
              What you can do
            </h2>
            <ul className="mt-4 space-y-3 text-text-muted">
              <li>
                <span className="font-semibold text-text">Stay home when sick.</span> Keep children home if they have a fever or
                new cough.
              </li>
              <li>
                <span className="font-semibold text-text">Wash hands often</span> and cover coughs and sneezes.
              </li>
              <li>
                <span className="font-semibold text-text">Stay up to date with vaccines,</span> including flu and COVID-19.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
