import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly", "yearly"];

/** Advance a due date by one period of the given frequency. */
export function advanceDue(from: Date, frequency: Frequency): Date {
  switch (frequency) {
    case "daily": return addDays(from, 1);
    case "weekly": return addWeeks(from, 1);
    case "monthly": return addMonths(from, 1);
    case "yearly": return addYears(from, 1);
  }
}

/** Human-readable cadence, e.g. "Monthly". */
export function frequencyLabel(frequency: string): string {
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
}
