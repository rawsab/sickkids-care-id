import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ActivityBadge } from "@/components/ui/activity-badge";
import { DEFAULT_AGE_BANDS } from "@/lib/ingest/deidentify";
import { COLUMNS } from "@/lib/ingest/validate";
import { DEFAULT_ACTIVITY_THRESHOLDS } from "@/lib/metrics";
import { PRIVACY_RULES } from "@/lib/privacy";
import { ONTARIO_REGIONS } from "@/lib/regions";
import { VIRUSES } from "@/lib/viruses";

export const metadata: Metadata = { title: "Technical notes" };

const SECTIONS = [
  { id: "source", title: "Data source" },
  { id: "deidentification", title: "De-identification" },
  { id: "positivity", title: "Percent positivity" },
  { id: "privacy", title: "Small-number suppression" },
  { id: "activity", title: "Activity levels" },
  { id: "regions", title: "Areas and regions" },
  { id: "format", title: "Upload file format" },
] as const;

function Section({ id, children }: { id: (typeof SECTIONS)[number]["id"]; children: React.ReactNode }) {
  const title = SECTIONS.find((s) => s.id === id)!.title;
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 space-y-3">
      <h2 id={`${id}-h`} className="text-xl font-semibold tracking-tight text-text">
        {title}
      </h2>
      <div className="space-y-3 leading-7 text-text-muted">{children}</div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-brand-sky px-4 py-3 text-sm leading-6 text-brand-navy ring-1 ring-brand-blue/15">{children}</div>;
}

export default function TechnicalNotes() {
  const t = DEFAULT_ACTIVITY_THRESHOLDS;
  return (
    <>
      <PageHeader eyebrow="Methods" title="Technical notes" lead="How CARE-ID turns school test results into community-level information." />
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[14rem_minmax(0,44rem)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 border-l border-border text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-4 text-text-muted hover:border-brand-blue hover:text-text">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12">
          <Section id="source">
            <p>
              Results come from school-based respiratory testing programs run with SickKids. Each specimen is tested
              for influenza A, influenza B, RSV and SARS-CoV-2 (COVID-19). Influenza (A or B) counts as detected if
              either type is detected.
            </p>
          </Section>

          <Section id="deidentification">
            <p>Uploaded results are processed in memory, and only weekly counts are kept:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>The collection date is replaced by its epidemiological week (Sunday to Saturday).</li>
              <li>Exact age is replaced by an age band: {DEFAULT_AGE_BANDS.map((b) => b.label).join(", ")} years.</li>
              <li>Location is the forward sortation area (FSA), the first three characters of the postal code.</li>
            </ul>
            <Callout>Individual test results are never saved. The uploaded file is discarded once weekly counts are calculated.</Callout>
          </Section>

          <Section id="positivity">
            <p>
              Percent positivity is the number of specimens with the virus detected, divided by the number with a
              definitive result (detected or not detected). Indeterminate results are left out of the denominator and
              reported separately. The 3-week rolling figure pools counts over the current and previous two weeks
              rather than averaging percentages.
            </p>
          </Section>

          <Section id="privacy">
            <p>
              Any figure based on fewer than <strong className="text-text">{PRIVACY_RULES.public.minTests} tests</strong>{" "}
              is not shown in the community map, and fewer than{" "}
              <strong className="text-text">{PRIVACY_RULES.ph.minTests} tests</strong> in the public health dashboard.
              In breakdowns that add up to a shown total, a second figure is also hidden when needed so a hidden value
              can&apos;t be worked out by subtraction.
            </p>
            <Callout>
              The community map shows activity levels, never case counts or numbers of tests. Suppression is applied
              on the server, so hidden figures never reach the browser.
            </Callout>
          </Section>

          <Section id="activity">
            <p>The community map describes each area using pooled results from the last 3 weeks:</p>
            <ul className="space-y-2">
              <li className="flex flex-wrap items-center gap-x-3"><ActivityBadge level="low" /> under {t.moderate}% of tests positive</li>
              <li className="flex flex-wrap items-center gap-x-3"><ActivityBadge level="moderate" /> {t.moderate}% to under {t.high}%</li>
              <li className="flex flex-wrap items-center gap-x-3"><ActivityBadge level="high" /> {t.high}% or more</li>
              <li className="flex flex-wrap items-center gap-x-3"><ActivityBadge level="insufficient" /> fewer than {t.minTests} tests</li>
            </ul>
            <p>
              Trends compare the latest 3 weeks with the 3 weeks before; a change of 2 percentage points or more is shown
              as rising or falling. These bands are provisional and will be set with public health partners.
            </p>
          </Section>

          <Section id="regions">
            <p>
              The map covers FSAs in the Greater Toronto Area, using Statistics Canada 2021 FSA boundaries. FSAs are grouped
              into Toronto, Peel, York, Durham and Halton; elsewhere in Ontario, by first letter:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(ONTARIO_REGIONS).map(([letter, region]) => (
                <li key={letter}>
                  {letter}: {region}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="format">
            <div className="overflow-x-auto rounded-xl ring-1 ring-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-text">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Column</th>
                    <th className="px-4 py-2.5 font-semibold">Contents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  <tr><td className="px-4 py-2.5 font-mono text-text">{COLUMNS.sex}</td><td className="px-4 py-2.5">Male, Female, other or blank</td></tr>
                  <tr><td className="px-4 py-2.5 font-mono text-text">{COLUMNS.age}</td><td className="px-4 py-2.5">Whole years, 0–19</td></tr>
                  <tr><td className="px-4 py-2.5 font-mono text-text">{COLUMNS.collectedOn}</td><td className="px-4 py-2.5">Collection date, YYYY-MM-DD</td></tr>
                  <tr><td className="px-4 py-2.5 font-mono text-text">{COLUMNS.fsa}</td><td className="px-4 py-2.5">Ontario FSA, e.g. M5G</td></tr>
                  {VIRUSES.filter((v) => v.sourceColumn).map((v) => (
                    <tr key={v.key}>
                      <td className="px-4 py-2.5 font-mono text-text">{v.sourceColumn}</td>
                      <td className="px-4 py-2.5">{v.label}: Detected, Not detected, Indeterminate, or blank if not tested</td>
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
