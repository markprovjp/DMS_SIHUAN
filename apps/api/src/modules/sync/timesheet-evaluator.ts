import { evaluateTimesheet } from "@dms-admin/rule-engine";
import { parseMobiworkDate } from "@dms-admin/shared";
import { RiskLevel } from "@prisma/client";

export async function evaluateTimesheetDay(
  tsDayId: string,
  prisma: any,
  settingsService: any,
): Promise<void> {
  const tsDay = await prisma.timesheetDay.findUnique({
    where: { id: tsDayId },
    include: {
      employee: true,
      events: true,
    },
  });

  if (!tsDay) return;

  const settings = await settingsService.getAll();
  const shiftConfig = {
    shiftStart: settings["shiftStart"] || "08:00",
    lateAfter: settings["lateAfter"] || "08:15",
    shiftEnd: settings["shiftEnd"] || "17:00",
    minWorkHours: Number(settings["minWorkHours"] || 7.5),
    timezone: settings["timezone"] || "Asia/Bangkok",
  };

  let ruleWeights = undefined;
  if (settings["ruleWeights"]) {
    try {
      ruleWeights = JSON.parse(settings["ruleWeights"]);
    } catch (e) {
      // Fallback
    }
  }

  // Use timezone-safe date boundary
  const dateStr =
    tsDay.date instanceof Date
      ? tsDay.date.toISOString().substring(0, 10)
      : new Date(tsDay.date).toISOString().substring(0, 10);

  const startOfDay = parseMobiworkDate(dateStr, shiftConfig.timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

  const visits = await prisma.visit.findMany({
    where: {
      employeeId: tsDay.employee.id,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const evalInput = {
    employeeCode: tsDay.employee.code,
    employeeName: tsDay.employee.name,
    date: dateStr,
    weekday: tsDay.weekday || undefined,
    events: tsDay.events.map((ev: any) => ({
      type: ev.type,
      time:
        ev.time instanceof Date
          ? ev.time.toISOString()
          : new Date(ev.time).toISOString(),
      location: ev.location || undefined,
      note: ev.note || undefined,
      images: ev.images,
    })),
    visits: visits.map((v: any) => ({
      customerCode: v.customerId,
      isOnRoute: v.isOnRoute,
      hasOrder: v.hasOrder,
    })),
    shiftConfig,
    ruleWeights,
  };

  const graded = evaluateTimesheet(evalInput);

  await prisma.timesheetEvaluation.upsert({
    where: { timesheetDayId: tsDay.id },
    update: {
      score: graded.score,
      riskLevel: graded.riskLevel as RiskLevel,
      statusCodes: graded.statusCodes,
      reasons: graded.reasons,
      suggestions: graded.suggestions,
      hasCheckIn: graded.metrics.hasCheckIn,
      hasCheckOut: graded.metrics.hasCheckOut,
      firstCheckIn: graded.metrics.firstCheckIn || null,
      lastCheckOut: graded.metrics.lastCheckOut || null,
      workHours: graded.metrics.workHours || null,
      eventCount: graded.metrics.eventCount,
      lateMinutes: graded.metrics.lateMinutes || null,
      earlyLeaveMinutes: graded.metrics.earlyLeaveMinutes || null,
    },
    create: {
      timesheetDayId: tsDay.id,
      score: graded.score,
      riskLevel: graded.riskLevel as RiskLevel,
      statusCodes: graded.statusCodes,
      reasons: graded.reasons,
      suggestions: graded.suggestions,
      hasCheckIn: graded.metrics.hasCheckIn,
      hasCheckOut: graded.metrics.hasCheckOut,
      firstCheckIn: graded.metrics.firstCheckIn || null,
      lastCheckOut: graded.metrics.lastCheckOut || null,
      workHours: graded.metrics.workHours || null,
      eventCount: graded.metrics.eventCount,
      lateMinutes: graded.metrics.lateMinutes || null,
      earlyLeaveMinutes: graded.metrics.earlyLeaveMinutes || null,
    },
  });
}
