// Stroke icons on a 24px grid, drawn to match the header's menu icon (2px
// stroke, round caps). Decorative: always paired with visible or sr-only text.

import type { ComponentProps } from "react";

const PATHS = {
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  arrowUpRight: "M7 17 17 7M8 7h9v9",
  arrowDownRight: "M7 7l10 10M17 8v9H8",
  minus: "M5 12h14",
  check: "M20 6 9 17l-5-5",
  chevronsUpDown: "M7 15l5 5 5-5M7 9l5-5 5 5",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  globe: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-4", ...props }: { name: IconName } & ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
