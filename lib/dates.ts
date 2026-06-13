// Pure YYYY-MM-DD date-string helpers. Market-data tables (Price.d, Catalyst.d,
// ManualSeries.d) live entirely in this string space.

const DAY_MS = 86_400_000;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar date of a Date instance. */
export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** UTC calendar date — correct for daily bar timestamps from Yahoo (US sessions). */
export function barDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDaysStr(d: string, days: number): string {
  const t = Date.parse(`${d}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** True when `d` falls within the last `days` days of `today` (inclusive), not in the future. */
export function withinDays(d: string, days: number, today: string = todayStr()): boolean {
  const diff = daysBetween(d, today);
  return diff >= 0 && diff <= days;
}

export function isLastDayOfMonth(date: Date = new Date()): boolean {
  const next = new Date(date);
  next.setDate(date.getDate() + 1);
  return next.getDate() === 1;
}
