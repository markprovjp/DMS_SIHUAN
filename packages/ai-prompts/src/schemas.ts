import { z } from "zod";

const InsightSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string(),
  evidence: z.string(),
  affectedEmployees: z.array(z.string()),
  affectedDepartments: z.array(z.string()),
  affectedCustomers: z.array(z.string()),
  suggestedAction: z.string(),
});

export const AiAnalysisOutputSchema = z.object({
  executiveSummary: z.string(),
  keyFindings: z.array(
    z.object({
      severity: z.enum(["info", "warning", "critical"]),
      title: z.string(),
      evidence: z.string(),
      affectedEmployees: z.array(z.string()),
      affectedDepartments: z.array(z.string()),
    }),
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(["low", "medium", "high"]),
      action: z.string(),
      ownerRole: z.string(),
      dueHint: z.string(),
    }),
  ),
  employeeComments: z.array(
    z.object({
      employeeCode: z.string(),
      comment: z.string(),
      suggestedAction: z.string(),
    }),
  ),
  dataQualityWarnings: z.array(z.string()),

  // New modules insights
  timesheetInsights: z.array(InsightSchema),
  visitInsights: z.array(InsightSchema),
  orderInsights: z.array(InsightSchema),
  kpiInsights: z.array(InsightSchema),
  inventoryInsights: z.array(InsightSchema),
  crossModuleInsights: z.array(InsightSchema),
});

export type AiAnalysisOutput = z.infer<typeof AiAnalysisOutputSchema>;

export const VisionOutputSchema = z.object({
  classification: z.enum([
    "VALID_WORK_CONTEXT",
    "BLURRY_OR_UNCLEAR",
    "UNRELATED_IMAGE",
    "POSSIBLE_PRIVACY_RISK",
    "NEEDS_HUMAN_REVIEW",
  ]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  visibleIssues: z.array(z.string()),
  suggestedAction: z.string(),
});

export type VisionOutput = z.infer<typeof VisionOutputSchema>;
