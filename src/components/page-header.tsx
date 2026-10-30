export function PageHeader({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto max-w-[90rem] px-4 pb-6 pt-8 sm:px-6">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text sm:text-3xl">{title}</h1>
        {lead && <p className="mt-2 max-w-3xl text-text-muted">{lead}</p>}
        {children}
      </div>
    </div>
  );
}
