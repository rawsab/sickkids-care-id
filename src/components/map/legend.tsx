import { ACTIVITY, ACTIVITY_ORDER, POSITIVITY_BINS } from "@/lib/display";

export function ActivityLegend({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <div className="rounded-xl bg-surface/95 px-3 py-2.5 text-xs shadow-raised ring-1 ring-border backdrop-blur">
      <p className={`mb-1.5 font-semibold text-text ${compact ? "sr-only" : ""}`}>{title}</p>
      <ul className={compact ? "flex flex-wrap gap-x-3 gap-y-1" : "space-y-1"}>
        {ACTIVITY_ORDER.map((level) => (
          <li key={level} className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-3 w-5 rounded-sm ${level === "insufficient" ? "hatch" : ""}`}
              style={level === "insufficient" ? undefined : { background: ACTIVITY[level].color }}
            />
            <span className="text-text-muted">{ACTIVITY[level].label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PositivityLegend({ title }: { title: string }) {
  return (
    <div className="rounded-xl bg-surface/95 px-3 py-2.5 text-xs shadow-raised ring-1 ring-border backdrop-blur">
      <p className="mb-1.5 font-semibold text-text">{title}</p>
      <ul className="space-y-1">
        {[...POSITIVITY_BINS].reverse().map((b) => (
          <li key={b.label} className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-5 rounded-sm" style={{ background: b.color }} />
            <span className="text-text-muted">{b.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span aria-hidden className="hatch h-3 w-5 rounded-sm" />
          <span className="text-text-muted">Too few tests</span>
        </li>
      </ul>
    </div>
  );
}
