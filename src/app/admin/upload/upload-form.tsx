"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { pct } from "@/lib/format";
import { positivity, testedCount } from "@/lib/metrics";
import { VIRUS_BY_KEY } from "@/lib/viruses";
import { uploadAction, type UploadState, type UploadSummary } from "./actions";

const STEPS = ["Choose file", "Review", "Saved"] as const;

const formatBytes = (n: number) => (n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function UploadForm() {
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
      <ol className="flex items-center gap-3 text-sm" aria-label="Upload progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-3" aria-current={i === step ? "step" : undefined}>
            <span
              className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                i < step ? "bg-success text-white" : i === step ? "bg-brand-blue text-white" : "bg-surface-muted text-text-subtle"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={i === step ? "font-semibold text-text" : "text-text-muted"}>{label}</span>
            {i < STEPS.length - 1 && <span aria-hidden className="h-px w-8 bg-border-strong sm:w-14" />}
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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed px-6 py-10 text-center transition-colors ${
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
              {formatBytes(file.size)} · {pending ? "Checking…" : "Choose another file"}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold">Drop a results CSV here, or click to choose</span>
            <span className="mt-0.5 text-sm text-text-muted">Files are checked before anything is saved</span>
          </>
        )}
      </label>

      <div aria-live="polite" className="space-y-6">
        {state.status === "error" && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-danger ring-1 ring-red-200">
            {state.message}
          </p>
        )}
        {state.status === "saved" && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-success ring-1 ring-green-200">
            Saved. {state.summary.acceptedCount.toLocaleString()} results were added as weekly totals and are now on the
            map and dashboard.
          </p>
        )}
        {summary && <Summary summary={summary} />}
        {state.status === "preview" && (
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => submit("commit")} disabled={!canSave || pending}>
              {pending ? "Saving…" : `Save ${summary?.acceptedCount.toLocaleString()} valid results`}
            </Button>
            {summary && summary.rowCount > summary.acceptedCount && (
              <span className="text-sm text-text-muted">Rejected rows will be skipped.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ summary: s }: { summary: UploadSummary }) {
  if (s.missingHeaders.length > 0) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-danger ring-1 ring-red-200">
        This file is missing required columns: {s.missingHeaders.join(", ")}.
      </p>
    );
  }
  const rejected = s.rowCount - s.acceptedCount;
  return (
    <div className="space-y-6">
      {s.warning && <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">{s.warning}</p>}
      {s.duplicateOf && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
          This exact file was already uploaded on {new Date(s.duplicateOf).toLocaleString()}.
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-4">
        {[
          ["Rows in file", s.rowCount.toLocaleString()],
          ["Valid", s.acceptedCount.toLocaleString()],
          ["Rejected", rejected.toLocaleString()],
          ["Collection dates", s.minDate ? `${s.minDate} – ${s.maxDate}` : "—"],
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
            Totals across {s.weekCount} week{s.weekCount === 1 ? "" : "s"} and {s.fsaCount} FSA{s.fsaCount === 1 ? "" : "s"}
          </caption>
          <thead className="bg-surface-muted text-text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Virus</th>
              <th className="px-4 py-2.5 text-right font-semibold">Detected</th>
              <th className="px-4 py-2.5 text-right font-semibold">Not detected</th>
              <th className="px-4 py-2.5 text-right font-semibold">Indeterminate</th>
              <th className="px-4 py-2.5 text-right font-semibold">Positivity</th>
            </tr>
          </thead>
          <tbody className="tabular divide-y divide-border">
            {s.totals.map((t) => {
              const p = positivity(t);
              return (
                <tr key={t.virus}>
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full" style={{ background: VIRUS_BY_KEY[t.virus].color }} />
                    {VIRUS_BY_KEY[t.virus].label}
                  </th>
                  <td className="px-4 py-2.5 text-right">{t.nDetected.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">{t.nNotDetected.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">{t.nIndeterminate.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    {p === null ? "—" : pct(p)}
                    <span className="sr-only"> of {testedCount(t)} tests</span>
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
            {rejected.toLocaleString()} rejected row{rejected === 1 ? "" : "s"}
          </summary>
          <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
            {s.errors.map((e) => (
              <li key={e.rowNumber}>
                <span className="font-mono text-text-muted">Row {e.rowNumber}</span> {e.messages.join("; ")}
              </li>
            ))}
          </ul>
          {s.errorsTruncated && <p className="mt-2 text-sm text-text-muted">Only the first 200 are listed.</p>}
        </details>
      )}
    </div>
  );
}
