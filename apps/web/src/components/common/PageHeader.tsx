import React from "react";
import { Typography, Space, Grid } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Khi có quá nhiều action, gom vào menu "..." trên mobile.
   *  Truyền vào dạng mảng đối tượng {key,label,onClick,icon} */
  overflowActions?: MenuProps["items"];
}

/** Header chuẩn cho mọi màn hình.
 *  Desktop: title + subtitle bên trái, actions bên phải wrap nếu hẹp.
 *  Mobile: title + subtitle trên, actions dưới (nếu > 2 thì gom vào menu "..."). */
export default function PageHeader({
  title,
  subtitle,
  actions,
  overflowActions,
}: PageHeaderProps) {
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  // Nếu mobile + có overflowActions, render 1 nút primary + dropdown "..."
  const renderActions = () => {
    if (isMobile && overflowActions && overflowActions.length > 0) {
      return (
        <Space>
          {/* actions chỉ chứa 1 nút primary (slot đầu) */}
          {actions}
          <Dropdown
            menu={{ items: overflowActions }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <a
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--ant-color-border)",
                background: "var(--ant-color-bg-container)",
                color: "var(--ant-color-text)",
              }}
              aria-label="Thêm hành động"
            >
              <MoreOutlined />
            </a>
          </Dropdown>
        </Space>
      );
    }
    return actions;
  };

  return (
    <div className="page-header">
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1>{title}</h1>
        {subtitle && <Text className="subtitle">{subtitle}</Text>}
      </div>
      {actions && <div className="actions">{renderActions()}</div>}
    </div>
  );
}
