import React from "react";
import {
  fmtDate,
  fmtDateTime,
  fmtNumber,
  fmtVND,
  fmtPercent,
  fmtScore,
} from "../../utils/format";

/** Render số có tabular-nums + format an toàn (null → "—"). */
export function NumberCell({
  value,
  format = "number",
}: {
  value?: number | null;
  format?: "number" | "vnd" | "percent" | "score";
}) {
  let text: string;
  switch (format) {
    case "vnd":
      text = fmtVND(value);
      break;
    case "percent":
      text = fmtPercent(value);
      break;
    case "score":
      text = fmtScore(value);
      break;
    default:
      text = fmtNumber(value);
  }
  return <span className="num">{text}</span>;
}

/** Render ngày/giờ an toàn. */
export function DateCell({
  value,
  format = "date",
}: {
  value?: string | Date | null;
  format?: "date" | "datetime";
}) {
  const text = format === "datetime" ? fmtDateTime(value) : fmtDate(value);
  return <span className="num">{text}</span>;
}
