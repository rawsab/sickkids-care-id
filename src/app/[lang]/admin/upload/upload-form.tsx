"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { INTL_LOCALE, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { formatNumber, formatPct, plural, t } from "@/i18n/format";
import { positivity, testedCount } from "@/lib/metrics";
import { VIRUS_BY_KEY } from "@/lib/viruses";
import { uploadAction, type UploadState, type UploadSummary } from "./actions";

function formatBytes(n: number, locale: Locale, dict: Dictionary) {
  const mb = n >= 1024 * 1024;
  const size = (mb ? n / 1024 / 1024 : n / 1024).toLocaleString(INTL_LOCALE[locale], { maximumFractionDigits: mb ? 1 : 0 });
  return t(mb ? dict.upload.mb : dict.upload.kb, { size });
}

export function UploadForm() {
  const { locale, dict } = useI18n();
  const u = dict.upload;
  const [state, formAction] = useActionState(uploadAction, { status: "idle" } as UploadState);
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  // Submitting manually (rather than via <form action>) keeps the chosen file
  // selected between the review and the save.
  const submit = (intent: "preview" | "commit", f = file) => {
    if (!f) return;
    const data = new FormData();
    data.set("file", f);
    data.set("intent", intent);
    startTransition(() => formAction(data));
  };

  const choose = (f: File | null | undefined) => {
    if (!f) return;
    setFile(f);
    submit("preview", f);
  };

  const summary = state.status === "preview" || state.status === "saved" ? state.summary : null;
  const step = state.status === "saved" ? 2 : state.status === "preview" ? 1 : 0;
  const canSave = state.status === "preview" && !summary?.duplicateOf && !summary?.warning && (summary?.acceptedCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-3 text-sm" aria-label={u.progressLabel}>
        {u.steps.map((label, i) => (
          <li key={label} className="flex items-center gap-3" aria-current={i === step ? "step" : undefined}>
            <span
              className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                i < step ? "bg-success text-white" : i === step ? "bg-brand-blue text-white" : "bg-surface-muted text-text-subtle"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={i === step ? "font-semibold text-text" : "text-text-muted"}>{label}</span>
            {i < u.steps.length - 1 && <span aria-hidden className="h-px w-8 bg-border-strong sm:w-14" />}
          </li>
        ))}
      </ol>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          choose(e.dataTransfer.files[0]);
        }}
        className={`focus-proxy flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-brand-blue bg-brand-sky" : "border-border-strong bg-surface hover:border-brand-blue/60"
        }`}
      >
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
        <span aria-hidden className="mb-3 grid size-11 place-items-center rounded-full bg-brand-sky text-lg text-brand-blue">
          ↑
        </span>
        {file ? (
          <>
            <span className="font-semibold">{file.name}</span>
            <span className="mt-0.5 text-sm text-text-muted">
              {formatBytes(file.size, locale, dict)} · {pending ? u.checking : u.chooseAnother}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold">{u.drop}</span>
            <span className="mt-0.5 text-sm text-text-muted">{u.dropHint}</span>
          </>
        )}
      </label>

      <div aria-live="polite" className="space-y-6">
        {state.status === "error" && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-danger ring-1 ring-red-200">
            {u.errors[state.code]}
          </p>
        )}
        {state.status === "saved" && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-success ring-1 ring-green-200">
            {plural(locale, state.summary.acceptedCount, u.saved)}
          </p>
        )}
        {summary && <Summary summary={summary} locale={locale} dict={dict} />}
        {state.status === "preview" && (
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => submit("commit")} disabled={!canSave || pending}>
              {pending ? u.saving : plural(locale, summary?.acceptedCount ?? 0, u.save)}
            </Button>
            {summary && summary.rowCount > summary.acceptedCount && (
              <span className="text-sm text-text-muted">{u.rejectedSkipped}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ summary: s, locale, dict }: { summary: UploadSummary; locale: Locale; dict: Dictionary }) {
  const u = dict.upload;
  const n = (v: number) => formatNumber(locale, v);
  if (s.missingHeaders.length > 0) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-danger ring-1 ring-red-200">
        {t(u.missingColumns, { columns: s.missingHeaders.join(", ") })}
      </p>
    );
  }
  const rejected = s.rowCount - s.acceptedCount;
  return (
    <div className="space-y-6">
      {s.warning && <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">{u.errors[s.warning]}</p>}
      {s.duplicateOf && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
          {t(u.duplicate, { date: new Date(s.duplicateOf).toLocaleString(INTL_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" }) })}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-4">
        {[
          [u.stats.rows, n(s.rowCount)],
          [u.stats.valid, n(s.acceptedCount)],
          [u.stats.rejected, n(rejected)],
          [u.stats.dates, s.minDate ? `${s.minDate} – ${s.maxDate}` : "—"],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">{label}</dt>
            <dd className="mt-1 text-lg font-semibold">{value}</dd>
          </Card>
        ))}
      </dl>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <caption className="border-b border-border px-4 py-3 text-left font-semibold">
            {t(u.totalsCaption, { weeks: plural(locale, s.weekCount, u.weeks), fsas: plural(locale, s.fsaCount, u.fsas) })}
          </caption>
          <thead className="bg-surface-muted text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">{u.columns.virus}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{u.columns.detected}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{u.columns.notDetected}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{u.columns.indeterminate}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{u.columns.positivity}</th>
            </tr>
          </thead>
          <tbody className="tabular divide-y divide-border">
            {s.totals.map((row) => {
              const p = positivity(row);
              return (
                <tr key={row.virus}>
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full" style={{ background: VIRUS_BY_KEY[row.virus].color }} />
                    {dict.common.viruses[row.virus].label}
                  </th>
                  <td className="px-4 py-2.5 text-right">{n(row.nDetected)}</td>
                  <td className="px-4 py-2.5 text-right">{n(row.nNotDetected)}</td>
                  <td className="px-4 py-2.5 text-right">{n(row.nIndeterminate)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {p === null ? "—" : formatPct(locale, p)}
                    <span className="sr-only">{t(u.ofTests, { count: n(testedCount(row)) })}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {s.errors.length > 0 && (
        <details className="rounded-[var(--radius-card)] bg-surface p-4 shadow-card ring-1 ring-border/70">
          <summary className="cursor-pointer font-semibold">
            {plural(locale, rejected, u.rejectedRows)}
          </summary>
          <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
            {s.errors.map((e) => (
              <li key={e.rowNumber}>
                <span className="font-mono text-text-muted">{t(u.row, { row: e.rowNumber })}</span>{" "}
                {e.issues.map((i) => t(u.issues[i.code], { column: i.column ?? "" })).join("; ")}
              </li>
            ))}
          </ul>
          {s.errorsTruncated && <p className="mt-2 text-sm text-text-muted">{u.truncated}</p>}
        </details>
      )}
    </div>
  );
}
