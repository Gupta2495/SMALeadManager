import type { CallOutcome } from "./types";

/**
 * Picks a default `next_follow_up` timestamp based on the call outcome,
 * matching the prototype's `suggestNextFollowUp`:
 *   - no_answer           → next day 10:00
 *   - busy                → same day +4h (or next day 10:00 if after 17:00)
 *   - interested          → +3 days 11:00
 *   - callback_requested  → +2 days 11:00
 *   - visit_scheduled     → +2 days 10:00
 *   - admitted / lost / not_interested → null (closes the lead)
 */
export function suggestNextFollowUp(outcome: CallOutcome, now: Date = new Date()): Date | null {
  const d = new Date(now);
  switch (outcome) {
    case "no_answer":
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return d;
    case "busy": {
      const h = d.getHours();
      if (h < 17) {
        d.setHours(h + 4, 0, 0, 0);
      } else {
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
      }
      return d;
    }
    case "interested":
      d.setDate(d.getDate() + 3);
      d.setHours(11, 0, 0, 0);
      return d;
    case "callback_requested":
      d.setDate(d.getDate() + 2);
      d.setHours(11, 0, 0, 0);
      return d;
    case "visit_scheduled":
      d.setDate(d.getDate() + 2);
      d.setHours(10, 0, 0, 0);
      return d;
    default:
      return null;
  }
}

/** ISO → `yyyy-MM-ddThh:mm` for `<input type="datetime-local">`. */
export function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
