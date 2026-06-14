import { describe, test, expect } from "vitest";
import {
  parseMobiworkDate,
  combineLocalDateAndTime,
  formatLocalTime,
  formatLocalDate,
} from "../src/date-time";

describe("Date Time Utilities (Asia/Bangkok timezone safe)", () => {
  test("parseMobiworkDate parses DD/MM/YYYY correctly", () => {
    const date = parseMobiworkDate("01/06/2026", "Asia/Bangkok");

    // The date should represent 2026-06-01T00:00:00+07:00
    // In UTC, this is 2026-05-31T17:00:00.000Z
    expect(date.toISOString()).toBe("2026-05-31T17:00:00.000Z");
  });

  test("parseMobiworkDate parses ISO date correctly", () => {
    const date = parseMobiworkDate("2026-06-01", "Asia/Bangkok");
    expect(date.toISOString()).toBe("2026-05-31T17:00:00.000Z");
  });

  test("combineLocalDateAndTime combines date and time string in Asia/Bangkok", () => {
    const date = parseMobiworkDate("01/06/2026", "Asia/Bangkok");
    const combined = combineLocalDateAndTime(date, "08:15:00", "Asia/Bangkok");

    // In Asia/Bangkok, 2026-06-01 08:15:00 is 2026-06-01T01:15:00.000Z
    expect(combined.toISOString()).toBe("2026-06-01T01:15:00.000Z");
  });

  test("combineLocalDateAndTime supports shorter time strings (HH:mm)", () => {
    const date = parseMobiworkDate("01/06/2026", "Asia/Bangkok");
    const combined = combineLocalDateAndTime(date, "08:00", "Asia/Bangkok");
    expect(combined.toISOString()).toBe("2026-06-01T01:00:00.000Z");
  });

  test("formatLocalTime formats UTC date back to Asia/Bangkok local time", () => {
    // 2026-06-01T01:00:00.000Z is 08:00 in Asia/Bangkok (+07:00)
    const date = new Date("2026-06-01T01:00:00.000Z");
    const localTime = formatLocalTime(date, "Asia/Bangkok");
    expect(localTime).toBe("08:00");
  });

  test("formatLocalDate formats UTC date back to Asia/Bangkok local date string", () => {
    // 2026-05-31T17:00:00.000Z is 2026-06-01 00:00:00 in Asia/Bangkok (+07:00)
    const date = new Date("2026-05-31T17:00:00.000Z");
    const localDate = formatLocalDate(date, "Asia/Bangkok");
    expect(localDate).toBe("2026-06-01");
  });

  test("timezone support other than Asia/Bangkok (e.g. UTC, Asia/Tokyo)", () => {
    // 2026-06-01T01:00:00.000Z is 10:00 in Tokyo (+09:00)
    const date = new Date("2026-06-01T01:00:00.000Z");
    const localTimeTokyo = formatLocalTime(date, "Asia/Tokyo");
    expect(localTimeTokyo).toBe("10:00");

    // In UTC, it's 01:00
    const localTimeUtc = formatLocalTime(date, "UTC");
    expect(localTimeUtc).toBe("01:00");
  });
});
