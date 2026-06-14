import React from "react";
import { Card, Typography } from "antd";

const { Text } = Typography;

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; trend: "up" | "down" | "flat" };
  icon?: React.ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "info";
  loading?: boolean;
}

const toneBg: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "#EEF2FF",
  success: "#ECFDF5",
  warning: "#FFFBEB",
  danger: "#FEF2F2",
  info: "#EFF6FF",
};
const toneFg: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "#4F5FD1",
  success: "#047857",
  warning: "#B45309",
  danger: "#B91C1C",
  info: "#1D4ED8",
};

const trendColor: Record<"up" | "down" | "flat", string> = {
  up: "#10B981",
  down: "#EF4444",
  flat: "#7B8794",
};
const trendArrow: Record<"up" | "down" | "flat", string> = {
  up: "▲",
  down: "▼",
  flat: "—",
};

/** Card thống kê với delta — dùng cho Dashboard và đầu các màn danh sách. */
export default function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "brand",
  loading,
}: StatCardProps) {
  return (
    <Card
      bordered
      className="lift-on-hover"
      style={{ borderRadius: 10, borderColor: "#EDEFF2" }}
      styles={{ body: { padding: 20 } }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, color: "#616E7C" }}>{label}</Text>
          <div
            className="num"
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#1F2933",
              lineHeight: 1.2,
              marginTop: 4,
            }}
          >
            {loading ? "—" : value}
          </div>
          {delta && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: trendColor[delta.trend],
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{trendArrow[delta.trend]}</span>
              <span>{delta.value}</span>
              <span style={{ color: "#7B8794" }}>so với tuần trước</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: toneBg[tone],
              color: toneFg[tone],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
