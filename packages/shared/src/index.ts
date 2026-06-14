import { z } from "zod";

// Shift Configuration Schema
export const ShiftConfigSchema = z.object({
  shiftStart: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:mm format"),
  lateAfter: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:mm format"),
  shiftEnd: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:mm format"),
  minWorkHours: z.number().min(0).max(24),
  timezone: z.string().default("Asia/Bangkok"),
});

export type ShiftConfig = z.infer<typeof ShiftConfigSchema>;

// Rule Weights Schema
export const RuleWeightsSchema = z.object({
  missingCheckInPenalty: z.number().default(35),
  missingCheckOutPenalty: z.number().default(35),
  lateMinutePenaltyMultiplier: z.number().default(2),
  lateMaxPenalty: z.number().default(20),
  earlyLeaveMinutePenaltyMultiplier: z.number().default(2),
  earlyLeaveMaxPenalty: z.number().default(20),
  underHoursPenaltyMultiplier: z.number().default(6),
  underHoursMaxPenalty: z.number().default(25),
  tooManyEventsPenalty: z.number().default(10),
  duplicateEventPenalty: z.number().default(10),
  noVisitPenalty: z.number().default(10),
  lowOnRouteRatePenalty: z.number().default(10),
});

export type RuleWeights = z.infer<typeof RuleWeightsSchema>;

// Timesheet Event Schema
export const TimesheetEventInputSchema = z.object({
  type: z.string().optional(),
  time: z.string().optional(), // HH:mm or full ISO datetime
  location: z.string().optional(),
  note: z.string().optional(),
  images: z.array(z.string()).optional(),
  raw: z.any().optional(),
});

export type TimesheetEventInput = z.infer<typeof TimesheetEventInputSchema>;

// Visit Input Schema
export const VisitInputSchema = z.object({
  customerCode: z.string().optional(),
  customerName: z.string().optional(),
  checkin: z.string().optional(),
  checkout: z.string().optional(),
  isOnRoute: z.boolean().optional(),
  hasOrder: z.boolean().optional(),
});

export type VisitInput = z.infer<typeof VisitInputSchema>;

// Timesheet Evaluation Input
export const TimesheetEvaluationInputSchema = z.object({
  employeeCode: z.string(),
  employeeName: z.string().optional(),
  departmentName: z.string().optional(),
  date: z.string(), // ISO date (YYYY-MM-DD)
  weekday: z.string().optional(),
  events: z.array(TimesheetEventInputSchema),
  visits: z.array(VisitInputSchema).optional(),
  shiftConfig: ShiftConfigSchema,
  ruleWeights: RuleWeightsSchema.optional(),
});

export type TimesheetEvaluationInput = z.infer<
  typeof TimesheetEvaluationInputSchema
>;

// Timesheet Evaluation Output
export const TimesheetEvaluationOutputSchema = z.object({
  score: z.number().min(0).max(100),
  riskLevel: z.enum(["GOOD", "CHECK", "ABNORMAL"]),
  statusCodes: z.array(z.string()),
  reasons: z.array(z.string()),
  suggestions: z.array(z.string()),
  metrics: z.object({
    hasCheckIn: z.boolean(),
    hasCheckOut: z.boolean(),
    firstCheckIn: z.string().optional(),
    lastCheckOut: z.string().optional(),
    workHours: z.number().optional(),
    eventCount: z.number(),
    lateMinutes: z.number().optional(),
    earlyLeaveMinutes: z.number().optional(),
    visitCount: z.number().optional(),
    onRouteVisitRate: z.number().optional(),
  }),
});

export type TimesheetEvaluationOutput = z.infer<
  typeof TimesheetEvaluationOutputSchema
>;

import {
  parseMobiworkDate as parseMobiworkDateFn,
  combineLocalDateAndTime as combineLocalDateAndTimeFn,
  formatLocalTime as formatLocalTimeFn,
  formatLocalDate as formatLocalDateFn,
} from "./date-time";

export const parseMobiworkDate = parseMobiworkDateFn;
export const combineLocalDateAndTime = combineLocalDateAndTimeFn;
export const formatLocalTime = formatLocalTimeFn;
export const formatLocalDate = formatLocalDateFn;

import {
  getPageItems as getPageItemsFn,
  getPageTotal as getPageTotalFn,
  normalizePage as normalizePageFn,
  normalizePageResponse as normalizePageResponseFn,
} from "./page-helper";

export const getPageItems = getPageItemsFn;
export const getPageTotal = getPageTotalFn;
export const normalizePage = normalizePageFn;
export const normalizePageResponse = normalizePageResponseFn;
export type { NormalizedPage } from "./page-helper";
