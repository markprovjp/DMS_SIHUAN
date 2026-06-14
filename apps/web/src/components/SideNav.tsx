import React from "react";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  CalendarOutlined,
  CompassOutlined,
  ShoppingCartOutlined,
  AreaChartOutlined,
  RobotOutlined,
  SyncOutlined,
  SettingOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { palette } from "../theme/tokens";

const { Sider } = Layout;

interface SideNavProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

type MenuItem = Required<MenuProps>["items"][number];

export default function SideNav({
  collapsed,
  onCollapse,
  isMobile,
  onNavigate,
}: SideNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const groups: Array<{
    label: string;
    items: { key: string; icon: React.ReactNode; label: string }[];
  }> = [
    {
      label: "Tổng quan",
      items: [
        {
          key: "/dashboard",
          icon: <DashboardOutlined />,
          label: "Bảng điều khiển",
        },
      ],
    },
    {
      label: "Vận hành thực địa",
      items: [
        { key: "/timesheet", icon: <CalendarOutlined />, label: "Chấm công" },
        { key: "/visits", icon: <CompassOutlined />, label: "Viếng thăm" },
        { key: "/orders", icon: <ShoppingCartOutlined />, label: "Đơn hàng" },
      ],
    },
    {
      label: "Phân tích",
      items: [
        {
          key: "/kpi_inventory",
          icon: <AreaChartOutlined />,
          label: "KPI & Tồn kho",
        },
        { key: "/ai_analysis", icon: <RobotOutlined />, label: "Phân tích AI" },
      ],
    },
    {
      label: "Hệ thống",
      items: [
        { key: "/sync", icon: <SyncOutlined />, label: "Đồng bộ" },
        { key: "/audit", icon: <FileTextOutlined />, label: "Nhật ký" },
        { key: "/settings", icon: <SettingOutlined />, label: "Cài đặt" },
      ],
    },
  ];

  // Trên mobile: hiện group label (luôn expanded)
  // Trên desktop: expanded thì có group label, collapsed thì không
  const showGroupLabel = isMobile || !collapsed;

  const items: MenuItem[] = [];
  groups.forEach((g, gi) => {
    if (showGroupLabel) {
      items.push({
        key: `__group_${gi}`,
        type: "group",
        label: <span className="sidenav-group-label">{g.label}</span>,
        children: g.items.map((it) => ({
          key: it.key,
          icon: it.icon,
          label: it.label,
        })),
      });
    } else {
      g.items.forEach((it) => {
        items.push({
          key: it.key,
          icon: it.icon,
          label: it.label,
        });
      });
    }
  });

  const selectedKey =
    groups
      .flatMap((g) => g.items)
      .find((it) => location.pathname.startsWith(it.key))?.key || "/dashboard";

  // Mobile: render trong drawer (không cần Sider wrapper)
  if (isMobile) {
    return (
      <div style={{ height: "100%", background: palette.gray[0] }}>
        {/* Brand mini header trong drawer */}
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            borderBottom: `1px solid ${palette.gray[150]}`,
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${palette.brand[500]}, ${palette.brand[700]})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: palette.gray[900],
            }}
          >
            DMS AI Admin
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{
            borderRight: 0,
            paddingTop: 8,
            background: "transparent",
          }}
          items={items}
          onClick={(info) => {
            if (
              typeof info.key === "string" &&
              !info.key.startsWith("__group_")
            ) {
              navigate(info.key);
              onNavigate?.();
            }
          }}
        />
      </div>
    );
  }

  // Desktop: Sider
  return (
    <Sider
      width={240}
      collapsedWidth={64}
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      style={{
        background: palette.gray[0],
        borderRight: `1px solid ${palette.gray[150]}`,
        position: "sticky",
        top: 56,
        height: "calc(100vh - 56px)",
        overflow: "auto",
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        style={{
          borderRight: 0,
          paddingTop: collapsed ? 12 : 0,
          background: "transparent",
        }}
        items={items}
        onClick={(info) => {
          if (
            typeof info.key === "string" &&
            !info.key.startsWith("__group_")
          ) {
            navigate(info.key);
          }
        }}
      />
    </Sider>
  );
}
