import React, { useState, useEffect } from "react";
import {
  Table,
  Card,
  Space,
  App,
  Skeleton,
  DatePicker,
  Select,
  Button,
  Input,
  Tooltip,
  Pagination,
} from "antd";
import {
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, TableEmpty } from "./common";
import { DateCell } from "./common/DataCells";
import { palette } from "../theme/tokens";

import { useTableQuery } from "../hooks/useTableQuery";
import { getErrorMessage } from "../hooks/api";

const { RangePicker } = DatePicker;

interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
}

const actionTone = (
  action: string,
): "success" | "warning" | "danger" | "info" | "default" => {
  const a = action.toUpperCase();
  if (
    a.includes("FAILED") ||
    a.includes("ERROR") ||
    a.includes("DELETE") ||
    a.includes("REJECT")
  )
    return "danger";
  if (a.includes("RUN") || a.includes("START") || a.includes("PENDING"))
    return "warning";
  if (a.includes("SUCCESS") || a.includes("APPROVE") || a.includes("COMPLETED"))
    return "success";
  if (a.includes("READ") || a.includes("VIEW") || a.includes("GET"))
    return "info";
  return "default";
};

export default function Audit() {
  const { message } = App.useApp();
  const [filters, setFilters] = useState<{
    action?: string;
    keyword?: string;
    dates?: [any, any] | null;
  }>({});

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const serverFilters: Record<string, unknown> = {};
  if (filters.action) serverFilters.action = filters.action;
  if (filters.keyword) {
    // Backend chưa hỗ trợ `keyword` search — fallback bằng action LIKE keyword
    serverFilters.action = filters.keyword;
  }
  if (filters.dates && filters.dates.length === 2) {
    serverFilters.startDate = filters.dates[0].format("YYYY-MM-DD");
    serverFilters.endDate = filters.dates[1].format("YYYY-MM-DD");
  }

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const {
    data: pageData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useTableQuery({
    url: "/api/audit",
    filters: serverFilters,
    page,
    pageSize,
  });

  useEffect(() => {
    if (error) message.error(getErrorMessage(error));
  }, [error, message]);

  const logs = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const loading = isLoading || isFetching;

  const handleSearch = () => setPage(1);
  const handleReset = () => setFilters({});

  const actionOptions = [
    { value: "LOGIN", label: "Đăng nhập" },
    { value: "SYNC", label: "Đồng bộ" },
    { value: "AI_ANALYSIS", label: "Phân tích AI" },
    { value: "VISION", label: "Vision" },
    { value: "SETTINGS", label: "Cài đặt" },
    { value: "EXPORT", label: "Xuất báo cáo" },
    { value: "APPROVE", label: "Phê duyệt" },
  ];

  const columns = [
    {
      title: "Thời gian",
      key: "createdAt",
      width: 180,
      render: (_: any, r: AuditLogEntry) => (
        <DateCell value={r.createdAt} format="datetime" />
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 200,
      render: (_: any, r: AuditLogEntry) => (
        <StatusTag status={actionTone(r.action)} label={r.action} />
      ),
    },
    {
      title: "Người thực hiện",
      key: "userId",
      width: 140,
      render: (_: any, r: AuditLogEntry) => (
        <span
          className="num"
          style={{ fontSize: 13, color: palette.gray[700] }}
        >
          {r.userId ?? "—"}
        </span>
      ),
    },
    {
      title: "Chi tiết",
      key: "details",
      ellipsis: true,
      render: (_: any, r: AuditLogEntry) =>
        r.details ? (
          <Tooltip title={r.details} placement="topLeft">
            <span style={{ color: palette.gray[700], fontSize: 13 }}>
              {r.details}
            </span>
          </Tooltip>
        ) : (
          <span style={{ color: palette.gray[400] }}>—</span>
        ),
    },
    {
      title: "IP",
      key: "ipAddress",
      width: 130,
      render: (_: any, r: AuditLogEntry) => (
        <code
          style={{
            fontSize: 12,
            color: palette.gray[600],
            background: palette.gray[100],
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {r.ipAddress || "—"}
        </code>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="Nhật ký hoạt động"
        subtitle="Theo dõi các hoạt động đồng bộ, cập nhật cấu hình và phân tích AI"
      />

      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
        styles={{ body: { padding: 16 } }}
      >
        <div className="table-toolbar" style={{ marginBottom: 0 }}>
          <div className="filters">
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: palette.gray[400] }} />}
              placeholder="Tìm theo chi tiết, action, user..."
              value={filters.keyword ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, keyword: e.target.value }))
              }
              onPressEnter={handleSearch}
              style={{ width: 280 }}
            />
            <Select
              placeholder="Loại hành động"
              allowClear
              style={{ width: 180 }}
              options={actionOptions}
              value={filters.action}
              onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
            />
            <RangePicker
              placeholder={["Từ ngày", "Đến ngày"]}
              value={filters.dates as any}
              onChange={(v) => setFilters((f) => ({ ...f, dates: v as any }))}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              Tìm kiếm
            </Button>
            <Button type="text" icon={<ReloadOutlined />} onClick={handleReset}>
              Đặt lại
            </Button>
          </div>
          <div
            className="right"
            style={{ fontSize: 13, color: palette.gray[500] }}
          >
            {logs.length > 0 && `${logs.length} bản ghi`}
          </div>
        </div>
      </Card>

      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
        styles={{ body: { padding: 0 } }}
      >
        {loading && logs.length === 0 ? (
          <div style={{ padding: 20 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </div>
        ) : (
          <Table
            dataSource={logs}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: "max-content" }}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<FileTextOutlined />}
                  title="Chưa có nhật ký"
                  description="Các hoạt động đồng bộ, AI, settings sẽ xuất hiện ở đây."
                />
              ),
            }}
          />
        )}
        {total > 0 && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: `1px solid ${palette.gray[150]}`,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              showTotal={(t, range) => `${range[0]}-${range[1]} / ${t}`}
              pageSizeOptions={["20", "50", "100", "200"]}
              onChange={(p, s) => {
                setPage(p);
                setPageSize(s);
              }}
            />
          </div>
        )}
      </Card>
    </Space>
  );
}
