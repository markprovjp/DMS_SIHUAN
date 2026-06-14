import React from "react";
import { Tag, Tooltip } from "antd";
import { palette } from "../../theme/tokens";
import { statusToLabel, statusToTone } from "../../utils/status";

interface StatusTagProps {
  status?: string | null;
  label?: string;
  tooltip?: string;
}

/** Tag trạng thái chuẩn hoá — dùng cho mọi status trong app. */
export default function StatusTag({ status, label, tooltip }: StatusTagProps) {
  const tone = statusToTone(status);
  const text = label ?? statusToLabel(status ?? null);
  const colors: Record<string, { bg: string; fg: string; border?: string }> = {
    success: { bg: palette.success[50], fg: palette.success[700] },
    warning: { bg: palette.warning[50], fg: palette.warning[700] },
    danger: { bg: palette.danger[50], fg: palette.danger[700] },
    info: { bg: palette.info[50], fg: palette.info[700] },
    default: { bg: palette.gray[100], fg: palette.gray[700] },
  };
  const c = colors[tone];
  const tag = (
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
      {text}
    </Tag>
  );
  return tooltip ? <Tooltip title={tooltip}>{tag}</Tooltip> : tag;
}
