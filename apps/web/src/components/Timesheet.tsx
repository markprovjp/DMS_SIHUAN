import React, { useState, useEffect } from "react";
import {
  Table,
  Select,
  DatePicker,
  Button,
  Card,
  Tag,
  Drawer,
  Timeline,
  Space,
  Typography,
  Divider,
  App,
  Tooltip,
  Skeleton,
  Pagination,
  Input,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import {
  PageHeader,
  StatusTag,
  TableToolbar,
  EmptyState,
  TableEmpty,
} from "./common";
import { DateCell } from "./common/DataCells";
import { useTableQuery } from "../hooks/useTableQuery";
import { getErrorMessage } from "../hooks/api";
import { palette } from "../theme/tokens";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const scoreColor = (s: number | null | undefined): string => {
  if (s == null) return palette.gray[500];
  if (s >= 85) return palette.success[600];
  if (s >= 60) return palette.warning[600];
  return palette.danger[600];
};

const scoreBg = (s: number | null | undefined): string => {
  if (s == null) return palette.gray[100];
  if (s >= 85) return palette.success[50];
  if (s >= 60) return palette.warning[50];
  return palette.danger[50];
};

export default function Timesheet() {
  const { message } = App.useApp();
  const [departments, setDepartments] = useState<any[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [filters, setFilters] = useState<{
    employeeCode?: string;
    departmentId?: string;
    riskLevel?: string;
    dates?: [any, any] | null;
  }>({});

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Transform filters sang query string phẳng cho server
  const serverFilters: Record<string, unknown> = {};
  if (filters.employeeCode) serverFilters.employeeCode = filters.employeeCode;
  if (filters.departmentId) serverFilters.departmentId = filters.departmentId;
  if (filters.riskLevel) serverFilters.riskLevels = filters.riskLevel;
  if (filters.dates && filters.dates.length === 2) {
    serverFilters.startDate = filters.dates[0].format("YYYY-MM-DD");
    serverFilters.endDate = filters.dates[1].format("YYYY-MM-DD");
  }

  // Reset page về 1 khi filter thay đổi
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const {
    data: pageData,
    isLoading,
    isFetching,
    error,
  } = useTableQuery<typeof serverFilters, any>({
    url: "/api/timesheet/days",
    filters: serverFilters,
    page,
    pageSize,
  });

  useEffect(() => {
    if (error) message.error(getErrorMessage(error));
  }, [error, message]);

  useEffect(() => {
    setDepartments([
      { label: "Phòng Kinh Doanh", value: "SALES" },
      { label: "Phòng Vận Tải", value: "LOGISTICS" },
    ]);
  }, []);

  const data = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const loading = isLoading || isFetching;

  const handleSearch = () => {
    // React Query tự refetch khi page thay đổi; chỉ cần trigger lại
    setPage(1);
  };

  const handleReset = () => setFilters({});

  const handleRowClick = async (record: any) => {
    setDrawerLoading(true);
    setDrawerVisible(true);
    try {
      const res = await axios.get(`/api/timesheet/days/${record.id}`);
      setSelectedDay(res.data);
    } catch (e) {
      message.error("Lỗi tải chi tiết ngày công");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleReevaluate = async () => {
    if (!selectedDay) return;
    setDrawerLoading(true);
    try {
      const res = await axios.post(
        `/api/timesheet/days/${selectedDay.id}/evaluate`,
      );
      setSelectedDay(res.data);
      message.success("Đã tính toán lại điểm chấm công");
      handleSearch();
    } catch (e) {
      message.error("Lỗi khi tính lại điểm chấm công");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const body: any = {};
      if (filters.dates && filters.dates.length === 2) {
        body.startDate = filters.dates[0].format("YYYY-MM-DD");
        body.endDate = filters.dates[1].format("YYYY-MM-DD");
      }
      message.loading({
        content: "Đang tạo báo cáo Excel...",
        key: "exporting",
      });
      const response = await axios.post("/api/timesheet/export", body, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = "Bao_cao_cham_cong_DMS.xlsx";
      link.click();
      message.success({ content: "Xuất báo cáo thành công", key: "exporting" });
    } catch (e) {
      message.error({ content: "Lỗi xuất file Excel", key: "exporting" });
    }
  };

  const columns = [
    {
      title: "Mã NV",
      key: "empCode",
      width: 110,
      render: (_: any, r: any) => (
        <span
          className="num"
          style={{ fontWeight: 500, color: palette.gray[700] }}
        >
          {r?.employee?.code ?? "—"}
        </span>
      ),
    },
    {
      title: "Họ & Tên",
      key: "empName",
      render: (_: any, r: any) => (
        <Space size={8}>
          <UserOutlined style={{ color: palette.gray[400] }} />
          <span style={{ fontWeight: 500 }}>{r?.employee?.name ?? "—"}</span>
        </Space>
      ),
    },
    {
      title: "Phòng ban",
      key: "department",
      render: (_: any, r: any) =>
        r?.employee?.department?.name ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Ngày",
      key: "date",
      width: 120,
      sorter: (a: any, b: any) =>
        new Date(a?.date).getTime() - new Date(b?.date).getTime(),
      render: (_: any, r: any) => <DateCell value={r?.date} />,
    },
    {
      title: "Vào",
      key: "checkIn",
      width: 80,
      render: (_: any, r: any) => (
        <span className="num" style={{ color: palette.gray[700] }}>
          {r?.evaluation?.firstCheckIn || "—"}
        </span>
      ),
    },
    {
      title: "Ra",
      key: "checkOut",
      width: 80,
      render: (_: any, r: any) => (
        <span className="num" style={{ color: palette.gray[700] }}>
          {r?.evaluation?.lastCheckOut || "—"}
        </span>
      ),
    },
    {
      title: "Giờ làm",
      key: "hours",
      width: 100,
      align: "right" as const,
      render: (_: any, r: any) => {
        const h = r?.evaluation?.workHours;
        return (
          <span className="num" style={{ color: palette.gray[700] }}>
            {h != null ? `${h.toFixed(1)}h` : "—"}
          </span>
        );
      },
    },
    {
      title: "Điểm",
      key: "score",
      width: 90,
      align: "right" as const,
      sorter: (a: any, b: any) =>
        (a?.evaluation?.score ?? 0) - (b?.evaluation?.score ?? 0),
      render: (_: any, r: any) => {
        const s = r?.evaluation?.score;
        return (
          <Tag
            style={{
              background: scoreBg(s),
              color: scoreColor(s),
              border: "none",
              fontWeight: 600,
              fontSize: 13,
              minWidth: 40,
              textAlign: "center",
              margin: 0,
            }}
          >
            {s ?? "—"}
          </Tag>
        );
      },
    },
    {
      title: "Đánh giá",
      key: "riskLevel",
      width: 140,
      render: (_: any, r: any) => (
        <StatusTag status={r?.evaluation?.riskLevel} />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="Chấm công"
        subtitle="Theo dõi điểm danh và điểm chuyên cần theo ngày"
        actions={
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Xuất Excel
          </Button>
        }
      />

      {/* Toolbar */}
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
        styles={{ body: { padding: 16 } }}
      >
        <div className="table-toolbar" style={{ marginBottom: 0 }}>
          <div className="filters">
            <Input
              allowClear
              className="search"
              prefix={<SearchOutlined style={{ color: palette.gray[400] }} />}
              placeholder="Mã nhân viên"
              value={filters.employeeCode ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, employeeCode: e.target.value }))
              }
              onPressEnter={handleSearch}
              style={{ width: 180 }}
            />
            <Select
              placeholder="Phòng ban"
              allowClear
              style={{ width: 180 }}
              options={departments}
              value={filters.departmentId}
              onChange={(v) => setFilters((f) => ({ ...f, departmentId: v }))}
            />
            <Select
              placeholder="Đánh giá"
              allowClear
              style={{ width: 140 }}
              options={[
                { label: "Tốt", value: "GOOD" },
                { label: "Cần kiểm tra", value: "CHECK" },
                { label: "Bất thường", value: "ABNORMAL" },
              ]}
              value={filters.riskLevel}
              onChange={(v) => setFilters((f) => ({ ...f, riskLevel: v }))}
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
            {data.length > 0 && `${data.length} kết quả`}
          </div>
        </div>
      </Card>

      {/* Table */}
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
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: "pointer" },
            })}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<ClockCircleOutlined />}
                  title="Chưa có dữ liệu chấm công"
                  description="Điều chỉnh bộ lọc hoặc đồng bộ dữ liệu Mobiwork để bắt đầu."
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

      {/* Detail Drawer */}
      <Drawer
        title={
          selectedDay
            ? `${selectedDay?.employee?.name} • ${selectedDay?.date?.substring(0, 10)}`
            : "Đang tải..."
        }
        placement="right"
        width="min(680px, 100vw)"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        destroyOnClose
      >
        {drawerLoading || !selectedDay ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : (
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            {/* Summary card */}
            <Card
              bordered
              style={{
                background: palette.gray[50],
                borderColor: palette.gray[150],
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: palette.gray[900],
                    }}
                  >
                    {selectedDay?.employee?.name}
                  </div>
                  <Text style={{ fontSize: 13, color: palette.gray[600] }}>
                    {selectedDay?.employee?.roleName || "Nhân viên"}
                  </Text>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: 12, color: palette.gray[500] }}>
                    Điểm chuyên cần
                  </Text>
                  <div
                    className="num"
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      color: scoreColor(selectedDay?.evaluation?.score),
                    }}
                  >
                    {selectedDay?.evaluation?.score ?? "—"}
                  </div>
                </div>
              </div>
            </Card>

            {/* Risk evaluation */}
            <div>
              <div className="section-title">Đánh giá của hệ thống</div>
              <Space size={8} wrap>
                <StatusTag status={selectedDay?.evaluation?.riskLevel} />
                {selectedDay?.evaluation?.statusCodes?.length === 0 ? (
                  <Tag
                    style={{
                      background: palette.success[50],
                      color: palette.success[700],
                      border: "none",
                    }}
                  >
                    Đạt chuẩn
                  </Tag>
                ) : (
                  selectedDay?.evaluation?.reasons?.map(
                    (r: string, i: number) => (
                      <Tag
                        color="error"
                        key={i}
                        style={{
                          fontSize: 12,
                          whiteSpace: "normal",
                          height: "auto",
                          padding: "2px 8px",
                        }}
                      >
                        {r}
                      </Tag>
                    ),
                  )
                )}
              </Space>
            </div>

            {/* Suggestions */}
            {selectedDay?.evaluation?.suggestions?.length > 0 && (
              <div>
                <div className="section-title">Đề xuất hành động</div>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {selectedDay.evaluation.suggestions.map(
                    (s: string, i: number) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 13,
                          color: palette.gray[700],
                          marginBottom: 4,
                        }}
                      >
                        {s}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            <Divider style={{ margin: 0 }} />

            {/* Events timeline */}
            <div>
              <div className="section-title">Dòng sự kiện chấm công</div>
              {selectedDay?.events?.length === 0 ? (
                <Text type="secondary">Không có sự kiện ghi nhận.</Text>
              ) : (
                <Timeline
                  mode="left"
                  items={selectedDay?.events?.map((e: any, idx: number) => ({
                    key: idx,
                    label: e?.time
                      ? new Date(e.time).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—",
                    color: String(e?.type ?? "")
                      .toLowerCase()
                      .match(/vào|in|checkin/)
                      ? "green"
                      : "blue",
                    children: (
                      <>
                        <Text strong>{e?.type}</Text>
                        <br />
                        <Text
                          type="secondary"
                          style={{ fontSize: 12, color: palette.gray[500] }}
                        >
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          {e?.location || "Không có tọa độ"}
                        </Text>
                        {e?.note && (
                          <div
                            style={{
                              fontSize: 12,
                              color: palette.warning[700],
                              marginTop: 2,
                            }}
                          >
                            Ghi chú: {e.note}
                          </div>
                        )}
                      </>
                    ),
                  }))}
                />
              )}
            </div>

            {/* Visits */}
            {selectedDay?.visits?.length > 0 && (
              <>
                <Divider style={{ margin: 0 }} />
                <div>
                  <div className="section-title">
                    Lịch trình viếng thăm trong ngày
                  </div>
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: "100%" }}
                  >
                    {selectedDay.visits.map((v: any, idx: number) => (
                      <Card
                        size="small"
                        key={idx}
                        bordered
                        style={{
                          background: palette.gray[50],
                          borderColor: palette.gray[150],
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <Text strong>{v?.customer?.name}</Text>
                          <StatusTag
                            status={v?.isOnRoute ? "GOOD" : "CHECK"}
                            label={v?.isOnRoute ? "Đúng tuyến" : "Sai tuyến"}
                          />
                        </div>
                        <Text
                          style={{
                            fontSize: 12,
                            color: palette.gray[500],
                            display: "block",
                          }}
                        >
                          Mã KH: {v?.customer?.code} • {v?.customer?.address}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: palette.gray[500],
                            display: "block",
                            marginTop: 2,
                          }}
                        >
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {v?.checkin
                            ? new Date(v.checkin).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}{" "}
                          -{" "}
                          {v?.checkout
                            ? new Date(v.checkout).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </Text>
                        <Space size={4} style={{ marginTop: 6 }} wrap>
                          <Tag
                            style={{
                              background: v?.hasOrder
                                ? palette.info[50]
                                : palette.gray[100],
                              color: v?.hasOrder
                                ? palette.info[700]
                                : palette.gray[600],
                              border: "none",
                              fontSize: 11,
                              margin: 0,
                            }}
                          >
                            {v?.hasOrder ? "Có đơn hàng" : "Không đơn"}
                          </Tag>
                          <Tag
                            style={{
                              background: v?.hasStock
                                ? palette.brand[50]
                                : palette.gray[100],
                              color: v?.hasStock
                                ? palette.brand[700]
                                : palette.gray[600],
                              border: "none",
                              fontSize: 11,
                              margin: 0,
                            }}
                          >
                            {v?.hasStock ? "Có kiểm tồn" : "Không tồn"}
                          </Tag>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                </div>
              </>
            )}

            <div style={{ textAlign: "center" }}>
              <Button
                type="default"
                icon={<PlayCircleOutlined />}
                onClick={handleReevaluate}
              >
                Tính toán lại điểm
              </Button>
            </div>
          </Space>
        )}
      </Drawer>
    </Space>
  );
}
