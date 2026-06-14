import React from "react";
import { Input, Select, Button } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";

interface TableToolbarProps {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onReset?: () => void;
}

/** Thanh search + filter + action dùng trên đầu mỗi table. */
export default function TableToolbar({
  search,
  filters,
  actions,
  onReset,
}: TableToolbarProps) {
  return (
    <div className="table-toolbar">
      <div className="filters">
        {search && (
          <Input
            allowClear
            className="search"
            prefix={<SearchOutlined style={{ color: "#9AA5B1" }} />}
            placeholder={search.placeholder ?? "Tìm kiếm..."}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
          />
        )}
        {filters}
        {onReset && (
          <Button type="text" icon={<ReloadOutlined />} onClick={onReset}>
            Đặt lại
          </Button>
        )}
      </div>
      {actions && <div className="right">{actions}</div>}
    </div>
  );
}

// Re-export Select để dùng nhanh: <TableToolbar.Select ... />
TableToolbar.Select = Select;
