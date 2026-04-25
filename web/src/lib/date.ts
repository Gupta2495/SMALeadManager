// Date formatting — ported from web/prototype/ui.jsx.
// Uses real `now()` (not the prototype's hard-coded 2026-04-18 anchor).

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_FMT_NO_YEAR = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

const TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return "";
  return TIME_FMT.format(new Date(iso)).replace(" ", "");
}

export function fmtDate(
  iso?: string | null,
  opts: { relative?: boolean; withTime?: boolean; noYear?: boolean } = {},
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();

  if (opts.relative) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (sameDay(d, now)) return opts.withTime ? `Today, ${fmtTime(iso)}` : "Today";
    if (sameDay(d, tomorrow)) return opts.withTime ? `Tomorrow, ${fmtTime(iso)}` : "Tomorrow";
    if (sameDay(d, yesterday)) return opts.withTime ? `Yesterday, ${fmtTime(iso)}` : "Yesterday";
  }

  return (opts.noYear ? DATE_FMT_NO_YEAR : DATE_FMT).format(d);
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const ad = new Date(a);
  const bd = new Date(b);
  const ms = ad.setHours(0, 0, 0, 0) - bd.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function isOlderThanDays(
  iso: string | null | undefined,
  days: number,
  now: Date = new Date(),
): boolean {
  if (!iso) return false;
  return daysBetween(now, iso) > days;
}

export type FollowUpState =
  | { kind: "overdue"; days: number; label: string }
  | { kind: "due"; label: string }
  | { kind: "upcoming"; days: number; label: string }
  | null;

export function followUpState(iso?: string | null, now: Date = new Date()): FollowUpState {
  if (!iso) return null;
  const d = daysBetween(iso, now);
  if (d < 0) {
    const days = -d;
    return { kind: "overdue", days, label: days === 1 ? "Overdue 1 day" : `Overdue ${days} days` };
  }
  if (d === 0) return { kind: "due", label: `Due today · ${fmtTime(iso)}` };
  return { kind: "upcoming", days: d, label: d === 1 ? "Due tomorrow" : `Due in ${d} days` };
}
