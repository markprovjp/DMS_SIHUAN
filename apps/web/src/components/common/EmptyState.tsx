import React from "react";
import { Card } from "antd";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Empty state có ý nghĩa — dùng cho table/list rỗng. */
export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

/** Empty state chuẩn cho AntD Table (locale.emptyText). */
export function TableEmpty({
  icon,
  title,
  description,
}: Omit<EmptyStateProps, "action">) {
  return (
    <div className="empty-state" style={{ padding: "32px 16px" }}>
      <div className="icon">{icon}</div>
      <h3 style={{ fontSize: 14 }}>{title}</h3>
      {description && <p style={{ fontSize: 13 }}>{description}</p>}
    </div>
  );
}
