import React, { useState, useEffect } from "react";
import {
  Input,
  Select,
  DatePicker,
  Button,
  Table,
  Tag,
  Space,
  Card,
  App,
  Skeleton,
  Pagination,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  WarningOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, TableEmpty, ConfirmAction } from "./common";
import { DateCell, NumberCell } from "./common/DataCells";
import { useTableQuery } from "../hooks/useTableQuery";
import { getErrorMessage } from "../hooks/api";
import { palette } from "../theme/tokens";

const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { label: "Chờ duyệt", value: "PENDING" },
  { label: "Đã duyệt", value: "APPROVED" },
  { label: "Từ chối", value: "REJECTED" },
  { label: "Đã hủy", value: "CANCELLED" },
];

export default function Orders() {
  const { message } = App.useApp();
  const [filters, setFilters] = useState<{
    employeeCode?: string;
    status?: string;
    dates?: [any, any] | null;
  }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const serverFilters: Record<string, unknown> = {};
  if (filters.employeeCode) serverFilters.employeeCode = filters.employeeCode;
  if (filters.status) serverFilters.status = filters.status;
  if (filters.dates && filters.dates.length === 2) {
    serverFilters.startDate = filters.dates[0].format("YYYY-MM-DD");
    serverFilters.endDate = filters.dates[1].format("YYYY-MM-DD");
  }

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const {
    data: pageData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useTableQuery({
    url: "/api/orders",
    filters: serverFilters,
    page,
    pageSize,
  });

  useEffect(() => {
    if (error) message.error(getErrorMessage(error));
  }, [error, message]);

  const data = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const loading = isLoading || isFetching;

  const handleReset = () => setFilters({});

  const handleApprove = async (id: string) => {
    try {
      await import("axios").then((m) =>
        m.default.post(`/api/orders/${id}/approve`),
      );
      message.success("Đã duyệt đơn hàng");
      refetch();
    } catch {
      message.error("Lỗi khi duyệt đơn hàng");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await import("axios").then((m) =>
        m.default.post(`/api/orders/${id}/reject`),
      );
      message.success("Đã từ chối đơn hàng");
      refetch();
    } catch {
      message.error("Lỗi khi từ chối đơn hàng");
    }
  };

  const columns = [
    {
      title: "Mã phiếu",
      key: "code",
      width: 140,
      render: (_: any, r: any) => (
        <span
          className="num"
          style={{ fontWeight: 600, color: palette.gray[900] }}
        >
          {r?.code ?? "—"}
        </span>
      ),
    },
    {
      title: "Nhân viên đặt",
      key: "employee",
      render: (_: any, r: any) =>
        r?.employee ? (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 500 }}>{r.employee.name}</span>
            <span
              className="num"
              style={{ fontSize: 12, color: palette.gray[500] }}
            >
              {r.employee.code}
            </span>
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_: any, r: any) =>
        r?.customer ? (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 500 }}>{r.customer.name}</span>
            <span
              className="num"
              style={{ fontSize: 12, color: palette.gray[500] }}
            >
              {r.customer.code}
            </span>
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Ngày đặt",
      key: "date",
      width: 120,
      sorter: (a: any, b: any) =>
        new Date(a?.date).getTime() - new Date(b?.date).getTime(),
      render: (_: any, r: any) => <DateCell value={r?.date} />,
    },
    {
      title: "Giá trị",
      key: "payableAmount",
      width: 140,
      align: "right" as const,
      sorter: (a: any, b: any) =>
        (a?.payableAmount ?? 0) - (b?.payableAmount ?? 0),
      render: (_: any, r: any) => (
        <span
          className="num"
          style={{ fontWeight: 600, color: palette.gray[900] }}
        >
          <NumberCell value={r?.payableAmount} format="vnd" />
        </span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 130,
      render: (_: any, r: any) => <StatusTag status={r?.status} />,
    },
    {
      title: "Bất thường",
      key: "anomaly",
      width: 180,
      render: (_: any, r: any) => {
        const isHighValue = (r?.payableAmount ?? 0) > 2000000;
        const isCancelled = r?.status === "CANCELLED" || r?.status === "HỦY";
        if (!isHighValue && !isCancelled)
          return <span style={{ color: palette.gray[400] }}>—</span>;
        return (
          <Space size={4} wrap>
            {isHighValue && (
              <Tag
                icon={<WarningOutlined />}
                style={{
                  background: palette.warning[50],
                  color: palette.warning[700],
                  border: "none",
                  fontSize: 11,
                  margin: 0,
                }}
              >
                Giá trị lớn
              </Tag>
            )}
            {isCancelled && <StatusTag status="CANCELLED" label="Đã hủy" />}
          </Space>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 160,
      align: "right" as const,
      render: (_: any, r: any) => {
        const isPending = r?.status === "PENDING";
        if (!isPending) return null;
        return (
          <Space size={4}>
            <ConfirmAction
              title="Duyệt đơn hàng này?"
              onConfirm={() => handleApprove(r.id)}
              okText="Duyệt"
            >
              <Button type="link" size="small">
                Duyệt
              </Button>
            </ConfirmAction>
            <ConfirmAction
              title="Từ chối đơn hàng này?"
              onConfirm={() => handleReject(r.id)}
              okText="Từ chối"
              danger
            >
              <Button type="link" size="small" danger>
                Từ chối
              </Button>
            </ConfirmAction>
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="Đơn hàng thực địa"
        subtitle="Thống kê giao dịch đơn hàng và phát hiện biến động mua hàng bất thường"
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
              placeholder="Mã nhân viên"
              value={filters.employeeCode ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, employeeCode: e.target.value }))
              }
              onPressEnter={() => setPage(1)}
              style={{ width: 200 }}
            />
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 160 }}
              options={STATUS_OPTIONS}
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            />
            <RangePicker
              placeholder={["Từ ngày", "Đến ngày"]}
              value={filters.dates as any}
              onChange={(v) => setFilters((f) => ({ ...f, dates: v as any }))}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => setPage(1)}
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
            {data.length > 0 && `${data.length} / ${total} đơn`}
          </div>
        </div>
      </Card>

      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
        styles={{ body: { padding: 0 } }}
      >
        {loading && data.length === 0 ? (
          <div style={{ padding: 20 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : (
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: "max-content" }}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<ShoppingCartOutlined />}
                  title="Chưa có đơn hàng"
                  description="Đơn hàng sẽ xuất hiện ở đây sau khi đồng bộ dữ liệu Mobiwork."
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
              pageSizeOptions={["10", "20", "50", "100"]}
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
