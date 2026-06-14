import { describe, it, expect } from "vitest";
import { evaluateTimesheet } from "../src";
import { TimesheetEvaluationInput, ShiftConfig } from "@dms-admin/shared";

const mockShiftConfig: ShiftConfig = {
  shiftStart: "08:00",
  lateAfter: "08:15",
  shiftEnd: "17:00",
  minWorkHours: 7.5,
  timezone: "Asia/Bangkok",
};

describe("Rule Engine - Timesheet Evaluation", () => {
  it("should score 100 and risk level GOOD for on-time timesheet with normal events", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [
        { type: "Vào", time: "08:00" },
        { type: "Ra", time: "17:00" },
      ],
      visits: [{ customerCode: "KH001", isOnRoute: true, hasOrder: true }],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe("GOOD");
    expect(result.statusCodes).toEqual([]);
    expect(result.metrics.workHours).toBe(9.0);
  });

  it("should score 0 and risk level ABNORMAL if no events are provided", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe("ABNORMAL");
    expect(result.statusCodes).toContain("NO_EVENTS");
  });

  it("should deduct penalty and log status for missing check-in", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [{ type: "Ra", time: "17:00" }],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    expect(result.score).toBe(65); // 100 - 35
    expect(result.statusCodes).toContain("MISSING_CHECK_IN");
    expect(result.metrics.hasCheckIn).toBe(false);
    expect(result.metrics.hasCheckOut).toBe(true);
  });

  it("should deduct penalty and log status for missing check-out", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [{ type: "Vào", time: "08:00" }],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    expect(result.score).toBe(65); // 100 - 35
    expect(result.statusCodes).toContain("MISSING_CHECK_OUT");
    expect(result.metrics.hasCheckIn).toBe(true);
    expect(result.metrics.hasCheckOut).toBe(false);
  });

  it("should deduct progressive penalty for late check-in (e.g. 30 mins late)", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [
        { type: "Vào", time: "08:30" },
        { type: "Ra", time: "17:00" },
      ],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    // 30 mins late. Penalty: ceil(30/5) * 2 = 6 * 2 = 12 points
    expect(result.score).toBe(88); // 100 - 12
    expect(result.statusCodes).toContain("LATE");
    expect(result.metrics.lateMinutes).toBe(30);
  });

  it("should deduct progressive penalty for early check-out (e.g. 30 mins early)", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [
        { type: "Vào", time: "08:00" },
        { type: "Ra", time: "16:30" },
      ],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    // 30 mins early. Penalty: ceil(30/5) * 2 = 6 * 2 = 12 points
    expect(result.score).toBe(88); // 100 - 12
    expect(result.statusCodes).toContain("EARLY_LEAVE");
    expect(result.metrics.earlyLeaveMinutes).toBe(30);
  });

  it("should deduct penalty for under work hours (e.g. less than 7.5 hours)", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [
        // 09:00 to 16:00 is 7 hours.
        { type: "Vào", time: "09:00" },
        { type: "Ra", time: "16:00" },
      ],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    // Late check-in: 09:00 (60 mins late) -> Penalty = max penalty 20
    // Early leave: 16:00 (60 mins early) -> Penalty = max penalty 20
    // Total hours: 7.0. Limit is 7.5. Missing: 0.5 hours. Penalty: ceil(0.5 * 6) = 3
    // Total score: 100 - 20 - 20 - 3 = 57
    expect(result.score).toBe(57);
    expect(result.statusCodes).toContain("LATE");
    expect(result.statusCodes).toContain("EARLY_LEAVE");
    expect(result.statusCodes).toContain("UNDER_HOURS");
    expect(result.metrics.workHours).toBe(7.0);
  });

  it("should penalize too many events (>4 events)", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [
        { type: "Vào", time: "08:00" },
        { type: "Checkin", time: "09:00" },
        { type: "Checkout", time: "12:00" },
        { type: "Checkin", time: "13:00" },
        { type: "Ra", time: "17:00" },
      ],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    expect(result.score).toBe(90); // 100 - 10
    expect(result.statusCodes).toContain("TOO_MANY_EVENTS");
  });

  it("should penalize duplicate events at the exact same type and time", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [
        { type: "Vào", time: "08:00" },
        { type: "Vào", time: "08:00" }, // Duplicate
        { type: "Ra", time: "17:00" },
      ],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    expect(result.score).toBe(90); // 100 - 10
    expect(result.statusCodes).toContain("DUPLICATE_EVENT");
  });

  it("should penalize no visits on routes when visits is defined as empty array", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [
        { type: "Vào", time: "08:00" },
        { type: "Ra", time: "17:00" },
      ],
      visits: [], // visits defined but empty
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    expect(result.score).toBe(90); // 100 - 10
    expect(result.statusCodes).toContain("NO_VISIT");
  });

  it("should penalize low route rate (less than 80%)", () => {
    const input: TimesheetEvaluationInput = {
      employeeCode: "NV001",
      date: "2026-06-14",
      events: [
        { type: "Vào", time: "08:00" },
        { type: "Ra", time: "17:00" },
      ],
      visits: [
        { customerCode: "KH001", isOnRoute: true },
        { customerCode: "KH002", isOnRoute: false },
        { customerCode: "KH003", isOnRoute: false }, // 1/3 = 33% on route
      ],
      shiftConfig: mockShiftConfig,
    };

    const result = evaluateTimesheet(input);
    expect(result.score).toBe(90); // 100 - 10
    expect(result.statusCodes).toContain("LOW_ON_ROUTE_RATE");
    expect(result.metrics.onRouteVisitRate).toBeCloseTo(0.33, 2);
  });
});
