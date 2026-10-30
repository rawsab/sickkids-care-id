// Epidemiological weeks run Sunday to Saturday (MMWR convention, as used by
// Public Health Ontario). Week 1 is the first week with at least four days in
// the calendar year, i.e. the week containing January 4.

const DAY_MS = 86_400_000;

/** Parse a YYYY-MM-DD string as a UTC date, or return null if it isn't a real date. */
export function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The Sunday starting the epi week that contains `date`. */
export function weekStart(date: Date): Date {
  return new Date(date.getTime() - date.getUTCDay() * DAY_MS);
}

export function epiWeek(date: Date): { year: number; week: number } {
  const start = weekStart(date);
  // A week belongs to the year holding at least four of its days, which is
  // the year its Wednesday falls in.
  const wednesday = new Date(start.getTime() + 3 * DAY_MS);
  const year = wednesday.getUTCFullYear();
  const firstWeekStart = weekStart(new Date(Date.UTC(year, 0, 4)));
  const week = Math.round((start.getTime() - firstWeekStart.getTime()) / (7 * DAY_MS)) + 1;
  return { year, week };
}
