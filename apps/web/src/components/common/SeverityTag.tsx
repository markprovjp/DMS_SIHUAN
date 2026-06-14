import React from "react";
import { Tag } from "antd";
import { palette } from "../../theme/tokens";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

interface SeverityTagProps {
  severity: Severity | string | null | undefined;
}

/** Tag severity cho AI Analysis findings. */
export default function SeverityTag({ severity }: SeverityTagProps) {
  const s = (severity ?? "info").toLowerCase() as Severity;
  const colors: Record<Severity, { bg: string; fg: string; label: string }> = {
    critical: {
      bg: "#FEE2E2",
      fg: palette.severity.critical,
      label: "Nghiêm trọng",
    },
    high: { bg: "#FEE2E2", fg: palette.severity.high, label: "Cao" },
    medium: { bg: "#FEF3C7", fg: palette.severity.medium, label: "Trung bình" },
    low: { bg: "#CFFAFE", fg: palette.severity.low, label: "Thấp" },
    info: {
      bg: palette.gray[100],
      fg: palette.severity.info,
      label: "Thông tin",
    },
  };
  const c = colors[s] ?? colors.info;
  return (
    <Tag
      style={{
        background: c.bg,
        color: c.fg,
        border: "none",
        fontWeight: 500,
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 6,
        margin: 0,
      }}
    >
      {c.label}
    </Tag>
  );
}
