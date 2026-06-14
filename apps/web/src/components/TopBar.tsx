import React from "react";
import { Layout, Button, Space, Avatar, Dropdown, Tag, Tooltip } from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  MenuOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { palette } from "../theme/tokens";

const { Header } = Layout;

interface TopBarProps {
  user: any;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

/** TopBar 56px, nền trắng, border-bottom. Logo + collapse toggle trái, user menu phải. */
export default function TopBar({
  user,
  onLogout,
  onToggleCollapse,
  isMobile,
}: TopBarProps) {
  const email = user?.email || "admin@example.com";
  const initial = (email[0] ?? "A").toUpperCase();

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: "Hồ sơ cá nhân",
      icon: <UserOutlined />,
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <Header
      style={{
        background: palette.gray[0],
        padding: "0 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `1px solid ${palette.gray[150]}`,
        position: "sticky",
        top: 0,
        zIndex: 10,
        gap: 8,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}
      >
        <Tooltip title={isMobile ? "Mở menu" : "Thu gọn / mở rộng menu"}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onToggleCollapse}
            style={{ color: palette.gray[600] }}
            aria-label="Toggle menu"
          />
        </Tooltip>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            marginLeft: 4,
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
              letterSpacing: -0.5,
              flexShrink: 0,
            }}
            aria-hidden
          >
            D
          </div>
          <span
            className="hide-on-mobile"
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: palette.gray[900],
              letterSpacing: -0.01,
              whiteSpace: "nowrap",
            }}
          >
            DMS AI Admin
          </span>
          {(import.meta as any).env?.DEV && (
            <Tag
              color="warning"
              style={{
                margin: 0,
                marginLeft: 4,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Dev
            </Tag>
          )}
        </div>
      </div>

      <Space size={4} wrap={false}>
        <Tooltip title="Thông báo">
          <Button
            type="text"
            icon={<BellOutlined />}
            style={{ color: palette.gray[600] }}
          />
        </Tooltip>
        <Dropdown
          menu={{ items: userMenuItems }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button
            type="text"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 8px",
              height: 36,
              color: palette.gray[700],
            }}
          >
            <Avatar
              size={28}
              style={{
                background: palette.brand[500],
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {initial}
            </Avatar>
            <span
              className="topbar-email num"
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {email}
            </span>
            <CaretDownOutlined
              className="hide-on-mobile"
              style={{ fontSize: 10, color: palette.gray[400] }}
            />
          </Button>
        </Dropdown>
      </Space>
    </Header>
  );
}
