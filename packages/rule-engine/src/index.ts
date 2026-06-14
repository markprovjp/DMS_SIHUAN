import {
  TimesheetEvaluationInput,
  TimesheetEvaluationOutput,
  RuleWeights,
} from "@dms-admin/shared";

// Helper: Parse HH:mm to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

// Helper: Format minutes from midnight to HH:mm
export function minutesToTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Helper: Extract HH:mm in target timezone
export function getLocalTimePart(
  timeStr: string,
  timezone: string = "Asia/Bangkok",
): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.substring(0, 5);

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      const formatted = formatter.format(d);
      // Sometimes formatter returns "24:00" instead of "00:00" depending on environment
      if (formatted.startsWith("24:")) {
        return "00:" + formatted.substring(3);
      }
      return formatted;
    }
  } catch (e) {
    // Ignore and fallback
  }

  // Try extracting HH:mm from raw string (e.g. "08:15:30")
  const match = trimmed.match(/(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  return "";
}

// Default Rule Weights
const DEFAULT_WEIGHTS: RuleWeights = {
  missingCheckInPenalty: 35,
  missingCheckOutPenalty: 35,
  lateMinutePenaltyMultiplier: 2,
  lateMaxPenalty: 20,
  earlyLeaveMinutePenaltyMultiplier: 2,
  earlyLeaveMaxPenalty: 20,
  underHoursPenaltyMultiplier: 6,
  underHoursMaxPenalty: 25,
  tooManyEventsPenalty: 10,
  duplicateEventPenalty: 10,
  noVisitPenalty: 10,
  lowOnRouteRatePenalty: 10,
};

export function evaluateTimesheet(
  input: TimesheetEvaluationInput,
): TimesheetEvaluationOutput {
  const { events, visits = [], shiftConfig } = input;
  const weights = input.ruleWeights || DEFAULT_WEIGHTS;
  const timezone = shiftConfig.timezone || "Asia/Bangkok";

  let score = 100;
  const statusCodes: string[] = [];
  const reasons: string[] = [];
  const suggestions: string[] = [];

  // 1. Check if there are no events at all
  if (!events || events.length === 0) {
    return {
      score: 0,
      riskLevel: "ABNORMAL",
      statusCodes: ["NO_EVENTS"],
      reasons: ["Không có dữ liệu chấm công."],
      suggestions: ["Yêu cầu nhân viên bổ sung giải trình chấm công."],
      metrics: {
        hasCheckIn: false,
        hasCheckOut: false,
        eventCount: 0,
      },
    };
  }

  // Normalize event times
  const normalizedEvents = events
    .map((e) => ({
      ...e,
      localTime: e.time ? getLocalTimePart(e.time, timezone) : "",
    }))
    .filter((e) => e.localTime !== "");

  // Detect first check-in and last check-out
  let firstCheckIn: string | undefined;
  let lastCheckOut: string | undefined;

  // Find all check-ins (types containing 'vao', 'checkin', 'in')
  const checkInEvents = normalizedEvents.filter((e) => {
    const type = String(e.type || "").toLowerCase();
    return (
      type.includes("vào") ||
      type.includes("vao") ||
      type.includes("checkin") ||
      type.includes("in")
    );
  });

  // Find all check-outs (types containing 'ra', 'checkout', 'out')
  const checkOutEvents = normalizedEvents.filter((e) => {
    const type = String(e.type || "").toLowerCase();
    return (
      type.includes("ra") || type.includes("checkout") || type.includes("out")
    );
  });

  // If we have check-in events, sort them to find the earliest
  if (checkInEvents.length > 0) {
    checkInEvents.sort(
      (a, b) => timeToMinutes(a.localTime) - timeToMinutes(b.localTime),
    );
    firstCheckIn = checkInEvents[0].localTime;
  }

  // If we have check-out events, sort them to find the latest
  if (checkOutEvents.length > 0) {
    checkOutEvents.sort(
      (a, b) => timeToMinutes(a.localTime) - timeToMinutes(b.localTime),
    );
    lastCheckOut = checkOutEvents[checkOutEvents.length - 1].localTime;
  }

  const hasCheckIn = !!firstCheckIn;
  const hasCheckOut = !!lastCheckOut;

  // 2. Missing Check-in
  if (!hasCheckIn) {
    score -= weights.missingCheckInPenalty;
    statusCodes.push("MISSING_CHECK_IN");
    reasons.push("Thiếu thông tin giờ vào (Check-in).");
    suggestions.push("Bổ sung giờ vào hoặc đối soát với quản lý.");
  }

  // 3. Missing Check-out
  if (!hasCheckOut) {
    score -= weights.missingCheckOutPenalty;
    statusCodes.push("MISSING_CHECK_OUT");
    reasons.push("Thiếu thông tin giờ ra (Check-out).");
    suggestions.push("Bổ sung giờ ra để tính đủ giờ làm.");
  }

  // 4. Late Arrival
  let lateMinutes = 0;
  if (firstCheckIn) {
    const checkInMins = timeToMinutes(firstCheckIn);
    const lateAfterMins = timeToMinutes(shiftConfig.lateAfter);
    const shiftStartMins = timeToMinutes(shiftConfig.shiftStart);

    if (checkInMins > lateAfterMins) {
      lateMinutes = checkInMins - shiftStartMins;
      const penalty = Math.min(
        weights.lateMaxPenalty,
        Math.ceil(lateMinutes / 5) * weights.lateMinutePenaltyMultiplier,
      );
      score -= penalty;
      statusCodes.push("LATE");
      reasons.push(
        `Đi trễ ${lateMinutes} phút (chấm lúc ${firstCheckIn}, giới hạn đi trễ là ${shiftConfig.lateAfter}).`,
      );
      suggestions.push("Lưu ý đi làm đúng giờ quy định.");
    }
  }

  // 5. Early Leave
  let earlyLeaveMinutes = 0;
  if (lastCheckOut) {
    const checkOutMins = timeToMinutes(lastCheckOut);
    const shiftEndMins = timeToMinutes(shiftConfig.shiftEnd);

    if (checkOutMins < shiftEndMins) {
      earlyLeaveMinutes = shiftEndMins - checkOutMins;
      const penalty = Math.min(
        weights.earlyLeaveMaxPenalty,
        Math.ceil(earlyLeaveMinutes / 5) *
          weights.earlyLeaveMinutePenaltyMultiplier,
      );
      score -= penalty;
      statusCodes.push("EARLY_LEAVE");
      reasons.push(
        `Về sớm ${earlyLeaveMinutes} phút (về lúc ${lastCheckOut}, giờ tan ca quy định là ${shiftConfig.shiftEnd}).`,
      );
      suggestions.push("Vui lòng làm việc đủ giờ ca làm quy định.");
    }
  }

  // 6. Under Hours
  let workHours = 0;
  if (firstCheckIn && lastCheckOut) {
    const inMins = timeToMinutes(firstCheckIn);
    const outMins = timeToMinutes(lastCheckOut);
    workHours = Math.max(0, (outMins - inMins) / 60);

    if (workHours < shiftConfig.minWorkHours) {
      const missingHours = shiftConfig.minWorkHours - workHours;
      const penalty = Math.min(
        weights.underHoursMaxPenalty,
        Math.ceil(missingHours * weights.underHoursPenaltyMultiplier),
      );
      score -= penalty;
      statusCodes.push("UNDER_HOURS");
      reasons.push(
        `Thiếu giờ làm việc (chỉ đạt ${workHours.toFixed(1)}h / tối thiểu ${shiftConfig.minWorkHours}h).`,
      );
      suggestions.push("Sắp xếp công việc đảm bảo thời lượng ca quy định.");
    }
  }

  // 7. Too Many Events
  if (events.length > 4) {
    score -= weights.tooManyEventsPenalty;
    statusCodes.push("TOO_MANY_EVENTS");
    reasons.push(`Số lần chấm công nhiều bất thường (${events.length} lần).`);
    suggestions.push("Tránh bấm nút chấm công lặp lại nhiều lần liên tục.");
  }

  // 8. Duplicate Events
  let duplicateCount = 0;
  const eventKeys = new Set<string>();
  for (const e of normalizedEvents) {
    if (e.localTime) {
      const key = `${e.type || ""}-${e.localTime}`;
      if (eventKeys.has(key)) {
        duplicateCount++;
      } else {
        eventKeys.add(key);
      }
    }
  }
  if (duplicateCount > 0) {
    score -= weights.duplicateEventPenalty;
    statusCodes.push("DUPLICATE_EVENT");
    reasons.push("Phát hiện các sự kiện chấm công trùng lặp cùng thời điểm.");
    suggestions.push("Kiểm tra kết nối hoặc thiết bị ghi nhận chấm công.");
  }

  // 9. No Visits
  // Only evaluate this rule if visits is defined (even if empty) to support role/department differences
  const totalVisits = visits.length;
  if (totalVisits === 0 && input.visits !== undefined) {
    score -= weights.noVisitPenalty;
    statusCodes.push("NO_VISIT");
    reasons.push("Không phát hiện lượt viếng thăm khách hàng nào trong ngày.");
    suggestions.push("Cần giải trình lý do không đi tuyến viếng thăm.");
  }

  // 10. Low On-Route Rate
  let onRouteVisitRate = 0;
  if (totalVisits > 0) {
    const onRouteVisits = visits.filter((v) => v.isOnRoute).length;
    onRouteVisitRate = onRouteVisits / totalVisits;

    if (onRouteVisitRate < 0.8) {
      score -= weights.lowOnRouteRatePenalty;
      statusCodes.push("LOW_ON_ROUTE_RATE");
      reasons.push(
        `Tỷ lệ viếng thăm đúng tuyến thấp (${(onRouteVisitRate * 100).toFixed(0)}% < 80%).`,
      );
      suggestions.push(
        "Thực hiện viếng thăm khách hàng theo đúng tuyến phân công.",
      );
    }
  }

  // Ensure score is within 0-100 bounds
  score = Math.max(0, Math.min(100, score));

  // Determine Risk Level
  let riskLevel: "GOOD" | "CHECK" | "ABNORMAL" = "GOOD";
  if (
    score < 60 ||
    (statusCodes.includes("MISSING_CHECK_IN") &&
      statusCodes.includes("MISSING_CHECK_OUT"))
  ) {
    riskLevel = "ABNORMAL";
  } else if (score < 85 || statusCodes.length > 0) {
    riskLevel = "CHECK";
  }

  return {
    score,
    riskLevel,
    statusCodes,
    reasons,
    suggestions:
      suggestions.length > 0
        ? Array.from(new Set(suggestions))
        : ["Thực hiện tốt nội quy chấm công."],
    metrics: {
      hasCheckIn,
      hasCheckOut,
      firstCheckIn,
      lastCheckOut,
      workHours: firstCheckIn && lastCheckOut ? workHours : undefined,
      eventCount: events.length,
      lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
      earlyLeaveMinutes: earlyLeaveMinutes > 0 ? earlyLeaveMinutes : undefined,
      visitCount: totalVisits,
      onRouteVisitRate: totalVisits > 0 ? onRouteVisitRate : undefined,
    },
  };
}
