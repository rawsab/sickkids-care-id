import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ActivityBadge } from "@/components/ui/activity-badge";
import { rich, t } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DEFAULT_AGE_BANDS } from "@/lib/ingest/deidentify";
import { COLUMNS } from "@/lib/ingest/validate";
import { DEFAULT_ACTIVITY_THRESHOLDS } from "@/lib/metrics";
import { PRIVACY_RULES } from "@/lib/privacy";
import { ONTARIO_REGIONS } from "@/lib/regions";
import { VIRUSES } from "@/lib/viruses";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.notes.metaTitle };
}

const SECTION_IDS = ["source", "deidentification", "positivity", "privacy", "activity", "regions", "format"] as const;
type SectionId = (typeof SECTION_IDS)[number];

function Section({ id, title, children }: { id: SectionId; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 space-y-3">
      <h2 id={`${id}-h`} className="text-xl font-semibold tracking-tight text-text">
        {title}
      </h2>
      <div className="space-y-3 leading-7 text-text-muted [&>p]:max-w-[37rem] [&>ul]:max-w-[37rem]">{children}</div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[34rem] rounded-xl bg-brand-sky px-4 py-3 text-sm leading-6 text-brand-navy ring-1 ring-brand-blue/15">{children}</div>;
}

export default async function TechnicalNotes() {
  const { dict } = await getI18n();
  const n = dict.notes;
  const th = DEFAULT_ACTIVITY_THRESHOLDS;
  const strong = { b: (chunk: React.ReactNode) => <strong className="text-text">{chunk}</strong> };
  const formatRows: [string, string][] = [
    [COLUMNS.sex, n.formatRows.sex],
    [COLUMNS.age, n.formatRows.age],
    [COLUMNS.collectedOn, n.formatRows.collectedOn],
    [COLUMNS.fsa, n.formatRows.fsa],
    ...VIRUSES.filter((v) => v.sourceColumn).map((v): [string, string] => [
      v.sourceColumn!,
      t(n.formatRows.result, { virus: dict.common.viruses[v.key].label }),
    ]),
  ];

  return (
    <>
      <PageHeader eyebrow={n.eyebrow} title={n.title} lead={n.lead} />
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[14rem_minmax(0,44rem)]">
        <nav aria-label={n.tocLabel} className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 border-l border-border text-sm">
            {SECTION_IDS.map((id) => (
              <li key={id}>
                <a href={`#${id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-4 text-text-muted hover:border-brand-blue hover:text-text">
                  {n.sections[id]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12">
          <Section id="source" title={n.sections.source}>
            <p>{n.source}</p>
          </Section>

          <Section id="deidentification" title={n.sections.deidentification}>
            <p>{n.deidIntro}</p>
            <ul className="list-disc space-y-1 pl-5">
              {n.deidItems.map((item) => (
                <li key={item}>{t(item, { bands: DEFAULT_AGE_BANDS.map((b) => b.label).join(", ") })}</li>
              ))}
            </ul>
            <Callout>{n.deidCallout}</Callout>
          </Section>

          <Section id="positivity" title={n.sections.positivity}>
            <p>{n.positivity}</p>
          </Section>

          <Section id="privacy" title={n.sections.privacy}>
            <p>{rich(n.privacy, strong, { publicMin: PRIVACY_RULES.public.minTests, phMin: PRIVACY_RULES.ph.minTests })}</p>
            <Callout>{n.privacyCallout}</Callout>
          </Section>

          <Section id="activity" title={n.sections.activity}>
            <p>{n.activityIntro}</p>
            <ul className="space-y-2">
              <li className="flex flex-wrap items-center gap-x-3"><ActivityBadge level="low" /> {t(n.activityLow, { ...th })}</li>
              <li className="flex flex-wrap items-center gap-x-3"><ActivityBadge level="moderate" /> {t(n.activityModerate, { ...th })}</li>
              <li className="flex flex-wrap items-center gap-x-3"><ActivityBadge level="high" /> {t(n.activityHigh, { ...th })}</li>
              <li className="flex flex-wrap items-center gap-x-3"><ActivityBadge level="insufficient" /> {t(n.activityInsufficient, { ...th })}</li>
            </ul>
            <p>{n.activityNote}</p>
          </Section>

          <Section id="regions" title={n.sections.regions}>
            <p>{n.regionsIntro}</p>
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(ONTARIO_REGIONS).map(([letter, region]) => (
                <li key={letter}>
                  {t(n.regionItem, { letter, region: dict.common.regions[region] ?? region })}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="format" title={n.sections.format}>
            <div className="overflow-x-auto rounded-xl ring-1 ring-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-text">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">{n.formatColumn}</th>
                    <th className="px-4 py-2.5 font-semibold">{n.formatContents}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {formatRows.map(([column, contents]) => (
                    <tr key={column}>
                      <td className="px-4 py-2.5 font-mono text-text">{column}</td>
                      <td className="px-4 py-2.5">{contents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
