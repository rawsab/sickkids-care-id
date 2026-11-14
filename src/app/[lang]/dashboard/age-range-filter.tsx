"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { t } from "@/i18n/format";
import type { AgeBand } from "@/lib/ingest/deidentify";
import type { AgeRange } from "./filters";

const THUMB_PX = 18; // matches .range-dual thumbs in globals.css
const PANEL_PX = 320;
const GUTTER_PX = 16;

/** Where a native range thumb's centre sits, as CSS, for value `v` of `max`. */
const thumbLeft = (v: number, max: number) => `calc(${(v / max) * 100}% + ${(0.5 - v / max) * THUMB_PX}px)`;

/**
 * A button that opens a two-thumb slider over the stored age bands. Thumbs sit
 * on band edges (only bands are stored, never exact ages), so any run of
 * neighbouring bands can be chosen.
 */
export function AgeRangeFilter({
  bands,
  value,
  onApply,
  buttonClass,
}: {
  bands: readonly AgeBand[];
  value: AgeRange | undefined;
  onApply: (range: AgeRange | undefined) => void;
  buttonClass: string;
}) {
  const { dict } = useI18n();
  const f = dict.dashboard.filters;
  const id = useId();
  const [open, setOpen] = useState(false);
  // Shifts the panel left when the button sits too near the right edge (phones).
  const [shift, setShift] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstThumbRef = useRef<HTMLInputElement>(null);

  // Edge i is the start of band i; edge n is the end of the last band.
  const n = bands.length;
  const edgeAge = (i: number) => (i < n ? bands[i].min : bands[n - 1].max);
  const edgesOf = (range: AgeRange | undefined): [number, number] => {
    const lo = range ? bands.findIndex((b) => b.min === range.min) : -1;
    const hi = range ? bands.findIndex((b) => b.max === range.max) : -1;
    return lo >= 0 && hi >= lo ? [lo, hi + 1] : [0, n];
  };
  const [[lo, hi], setEdges] = useState(() => edgesOf(value));

  const rangeText = (from: number, to: number) => t(dict.common.ageBand, { band: `${edgeAge(from)}–${edgeAge(to) - (to < n ? 1 : 0)}` });
  const isAll = lo === 0 && hi === n;

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    firstThumbRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (n === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        onClick={() => {
          if (!open) {
            setEdges(edgesOf(value));
            const left = rootRef.current?.getBoundingClientRect().left ?? 0;
            const width = Math.min(PANEL_PX, window.innerWidth - 2 * GUTTER_PX);
            setShift(Math.min(0, window.innerWidth - GUTTER_PX - left - width));
          }
          setOpen((o) => !o);
        }}
        className={`${buttonClass} text-left`}
      >
        <span className="sr-only">{f.age}: </span>
        {value ? t(dict.common.ageBand, { band: `${value.min}–${value.max}` }) : f.allAges}
      </button>

      {open && (
        <div
          id={`${id}-panel`}
          role="dialog"
          aria-labelledby={`${id}-title`}
          style={{ left: shift }}
          className="absolute top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-card)] bg-surface p-5 shadow-overlay ring-1 ring-border"
        >
          <p id={`${id}-title`} className="text-xs font-semibold uppercase tracking-wider text-brand-royal">
            {f.ageRange}
          </p>
          <p className="mt-1 text-lg font-bold text-text tabular" aria-live="polite">
            {isAll ? f.allAges : rangeText(lo, hi)}
          </p>

          <div className="relative mt-4 h-[18px]">
            <div className="absolute inset-x-[9px] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-royal"
              style={{ left: thumbLeft(lo, n), right: `calc(100% - ${thumbLeft(hi, n)})` }}
            />
            <input
              ref={firstThumbRef}
              type="range"
              className="range-dual"
              min={0}
              max={n}
              step={1}
              value={lo}
              aria-label={f.youngest}
              aria-valuetext={t(dict.common.ageYears, { age: edgeAge(lo) })}
              onChange={(e) => setEdges([Math.min(Number(e.target.value), hi - 1), hi])}
              // Lift the low thumb when both sit at the top, or it couldn't be grabbed.
              style={{ zIndex: lo === n - 1 && hi === n ? 2 : 1 }}
            />
            <input
              type="range"
              className="range-dual"
              min={0}
              max={n}
              step={1}
              value={hi}
              aria-label={f.oldest}
              aria-valuetext={t(dict.common.ageYears, { age: edgeAge(hi) - (hi < n ? 1 : 0) })}
              onChange={(e) => setEdges([lo, Math.max(Number(e.target.value), lo + 1)])}
            />
          </div>

          {/* Edge ages under the track: where each band starts, and the last one's end. */}
          <div aria-hidden className="relative mt-2 h-4 text-xs text-text-subtle tabular">
            {Array.from({ length: n + 1 }, (_, i) => (
              <span key={i} className="absolute -translate-x-1/2" style={{ left: thumbLeft(i, n) }}>
                {edgeAge(i)}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              className="px-2"
              onClick={() => {
                onApply(undefined);
                close();
              }}
            >
              {f.resetAges}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onApply(isAll ? undefined : { min: edgeAge(lo), max: edgeAge(hi) - (hi < n ? 1 : 0) });
                close();
              }}
            >
              {f.apply}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
