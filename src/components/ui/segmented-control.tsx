"use client";

import { useRef } from "react";

export interface Segment<T extends string> {
  value: T;
  label: string;
  /** Optional colour dot shown before the label. */
  color?: string;
}

/** Single-select radio group styled as a segmented control; arrow keys move the selection. */
export function SegmentedControl<T extends string>({
  label,
  segments,
  value,
  onChange,
  className = "",
  size = "md",
}: {
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** "lg": 44px-plus targets and body-size labels, wrapping onto two rows if needed (kids page). */
  size?: "md" | "lg";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (index: number) => {
    const next = (index + segments.length) % segments.length;
    onChange(segments[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex rounded-[var(--radius-control)] bg-surface-muted p-1 ${size === "lg" ? "flex-wrap gap-1" : ""} ${className}`}
    >
      {segments.map((s, i) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(s.value)}
            onKeyDown={(e) => {
              const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
              if (step) {
                e.preventDefault();
                move(i + step);
              }
            }}
            className={`flex flex-1 items-center justify-center whitespace-nowrap rounded-[calc(var(--radius-control)-2px)] font-semibold transition ${
              size === "lg" ? "min-h-12 min-w-[7.5rem] gap-2 px-4 text-lg" : "gap-1 px-2 py-1.5 text-sm sm:gap-1.5 sm:px-3"
            } ${
              active ? "bg-surface text-text shadow-raised" : "text-text-muted hover:text-text"
            }`}
          >
            {s.color && <span aria-hidden className={`${size === "lg" ? "size-3" : "size-2"} rounded-full`} style={{ background: s.color }} />}
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
