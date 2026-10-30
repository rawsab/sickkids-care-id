import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./icons";

type Variant = "primary" | "secondary" | "ghost";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-blue text-white hover:bg-brand-blue-dark shadow-card",
  secondary: "bg-surface text-text border border-border-strong hover:bg-surface-muted",
  ghost: "text-brand-blue hover:bg-brand-sky",
};

export const buttonClass = (variant: Variant = "primary", extra = "") => `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${extra}`;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-[var(--radius-card)] bg-surface shadow-card ring-1 ring-border/70 ${className}`} {...props} />;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">{eyebrow}</p>}
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-[var(--radius-control)] bg-surface-muted ${className}`} />;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-brand-sky text-brand-blue">
        <Icon name="activity" className="size-6" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="mt-1 max-w-md text-text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export const inputClass =
  "w-full rounded-[var(--radius-control)] border border-border-control bg-surface px-3 py-2.5 text-sm text-text shadow-[inset_0_1px_1px_rgb(15_27_45/0.04)] placeholder:text-text-subtle focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20";
