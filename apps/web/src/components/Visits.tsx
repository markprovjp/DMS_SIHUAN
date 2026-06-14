import React, { useState, useEffect } from "react";
import {
  Input,
  DatePicker,
  Button,
  Table,
  Tag,
  Space,
  Card,
  Image,
  Tooltip,
  App,
  Skeleton,
  Drawer,
  Typography,
  Pagination,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CompassOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { PageHeader, StatusTag, TableEmpty } from "./common";
import { DateCell, NumberCell } from "./common/DataCells";
import { useTableQuery } from "../hooks/useTableQuery";
import { getErrorMessage } from "../hooks/api";
import { fmtTime } from "../utils/format";
import { palette } from "../theme/tokens";

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function Visits() {
  const { message } = App.useApp();
  const [filters, setFilters] = useState<{
    employeeCode?: string;
    dates?: [any, any] | null;
  }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const serverFilters: Record<string, unknown> = {};
  if (filters.employeeCode) serverFilters.employeeCode = filters.employeeCode;
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
  } = useTableQuery({
    url: "/api/visits",
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

  const columns = [
    {
      title: "Nhân viên",
      key: "employee",
      width: 200,
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
          <Space direction="vertical" size={2}>
            <span style={{ fontWeight: 500 }}>{r.customer.name}</span>
            <Text style={{ fontSize: 12, color: palette.gray[500] }} ellipsis>
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              {r.customer.address || "—"}
            </Text>
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Ngày",
      key: "date",
      width: 120,
      render: (_: any, r: any) => <DateCell value={r?.date} />,
    },
    {
      title: "Vào",
      key: "checkin",
      width: 80,
      render: (_: any, r: any) => (
        <span className="num" style={{ color: palette.gray[700] }}>
          {fmtTime(r?.checkin)}
        </span>
      ),
    },
    {
      title: "Ra",
      key: "checkout",
      width: 80,
      render: (_: any, r: any) => (
        <span className="num" style={{ color: palette.gray[700] }}>
          {fmtTime(r?.checkout)}
        </span>
      ),
    },
    {
      title: "Thời lượng",
      key: "duration",
      width: 100,
      align: "right" as const,
      render: (_: any, r: any) => {
        if (!r?.checkin || !r?.checkout) return "—";
        const ms =
          new Date(r.checkout).getTime() - new Date(r.checkin).getTime();
        const minutes = Math.max(0, Math.round(ms / 60000));
        return (
          <span className="num" style={{ color: palette.gray[700] }}>
            {minutes} phút
          </span>
        );
      },
    },
    {
      title: "Tuyến",
      key: "isOnRoute",
      width: 120,
      render: (_: any, r: any) => (
        <StatusTag
          status={r?.isOnRoute ? "GOOD" : "CHECK"}
          label={r?.isOnRoute ? "Đúng tuyến" : "Sai tuyến"}
        />
      ),
    },
    {
      title: "Đơn hàng",
      key: "hasOrder",
      width: 110,
      render: (_: any, r: any) => (
        <StatusTag
          status={r?.hasOrder ? "ACTIVE" : "INACTIVE"}
          label={r?.hasOrder ? "Có đơn" : "Không đơn"}
        />
      ),
    },
    {
      title: "Ghi chú",
      key: "note",
      ellipsis: true,
      render: (_: any, r: any) => {
        if (!r?.note && (!r?.images || r.images.length === 0)) {
          return <span style={{ color: palette.gray[400] }}>—</span>;
        }
        return (
          <Space size={4}>
            {r?.note && (
              <Tooltip title={r.note}>
                <Text
                  style={{ fontSize: 13, color: palette.gray[700] }}
                  ellipsis
                >
                  {r.note}
                </Text>
              </Tooltip>
            )}
            {r?.images?.length > 0 && (
              <Image.PreviewGroup>
                <Space size={4}>
                  {r.images.slice(0, 3).map((img: string, i: number) => (
                    <Image
                      key={i}
                      src={img}
                      width={28}
                      height={28}
                      style={{ borderRadius: 4, objectFit: "cover" }}
                    />
                  ))}
                  {r.images.length > 3 && (
                    <span style={{ fontSize: 12, color: palette.gray[500] }}>
                      +{r.images.length - 3}
                    </span>
                  )}
                </Space>
              </Image.PreviewGroup>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="Viếng thăm"
        subtitle="Lịch trình đi tuyến thực địa của đội ngũ sales"
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
            {data.length > 0 && `${data.length} / ${total} lượt`}
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
                  icon={<CompassOutlined />}
                  title="Chưa có lượt viếng thăm"
                  description="Lịch trình viếng thăm sẽ xuất hiện ở đây sau khi đồng bộ dữ liệu Mobiwork."
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
