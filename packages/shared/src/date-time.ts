import { DateTime } from "luxon";

/**
 * Parses a Mobiwork date string (e.g. "14/06/2026" or ISO "2026-06-14")
 * into a Date object representing the start of that day (00:00:00) in the target timezone.
 */
export function parseMobiworkDate(
  dateText: string,
  timezone: string = "Asia/Bangkok",
): Date {
  if (!dateText) return new Date();

  const trimmed = dateText.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (match) {
    const dt = DateTime.fromObject(
      {
        year: Number(match[3]),
        month: Number(match[2]),
        day: Number(match[1]),
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { zone: timezone },
    );
    return dt.isValid ? dt.toJSDate() : new Date();
  }

  // Fallback to ISO parsing
  const dt = DateTime.fromISO(trimmed, { zone: timezone });
  if (dt.isValid) {
    // Force start of day
    return dt.startOf("day").toJSDate();
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Combines a Date object (or date string) with a local time string (e.g. "08:15" or "17:00:00")
 * to produce a Date object representing that combined instant in the target timezone.
 */
export function combineLocalDateAndTime(
  date: Date | string,
  timeText: string,
  timezone: string = "Asia/Bangkok",
): Date {
  let dtDate: DateTime;

  if (typeof date === "string") {
    dtDate = DateTime.fromISO(date, { zone: timezone });
  } else {
    dtDate = DateTime.fromJSDate(date, { zone: timezone });
  }

  if (!dtDate.isValid) {
    dtDate = DateTime.now().setZone(timezone);
  }

  if (!timeText) {
    return dtDate.startOf("day").toJSDate();
  }

  const timeParts = timeText.trim().split(":");
  const hh = Number(timeParts[0] || 0);
  const mm = Number(timeParts[1] || 0);
  const ss = Number(timeParts[2] || 0);

  const dtCombined = dtDate.set({
    hour: hh,
    minute: mm,
    second: ss,
    millisecond: 0,
  });

  return dtCombined.isValid
    ? dtCombined.toJSDate()
    : dtDate.startOf("day").toJSDate();
}

/**
 * Formats a Date object as an HH:mm local time string in the target timezone.
 */
export function formatLocalTime(
  date: Date,
  timezone: string = "Asia/Bangkok",
): string {
  if (!date || isNaN(date.getTime())) return "";
  return DateTime.fromJSDate(date).setZone(timezone).toFormat("HH:mm");
}

/**
 * Formats a Date object as a yyyy-MM-dd local date string in the target timezone.
 */
export function formatLocalDate(
  date: Date,
  timezone: string = "Asia/Bangkok",
): string {
  if (!date || isNaN(date.getTime())) return "";
  return DateTime.fromJSDate(date).setZone(timezone).toFormat("yyyy-MM-dd");
}
