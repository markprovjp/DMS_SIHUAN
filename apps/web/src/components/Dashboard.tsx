import React, { useEffect, useRef, useState } from "react";
// Force HMR rebuild to invalidate stale chunk cache
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Space,
  Alert,
  Typography,
  Button,
  Skeleton,
} from "antd";
import { getPageItems, normalizePageResponse } from "../utils/page";
import {
  UserOutlined,
  CalendarOutlined,
  WarningOutlined,
  CompassOutlined,
  RightOutlined,
  RobotOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import * as echarts from "echarts";
import axios from "axios";
import {
  PageHeader,
  StatCard,
  StatusTag,
  SeverityTag,
  TableEmpty,
} from "./common";
import { DateCell, NumberCell } from "./common/DataCells";
import { palette } from "../theme/tokens";

const { Text } = Typography;

export default function Dashboard({
  setActiveKey,
}: {
  setActiveKey: (key: string) => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [criticalDays, setCriticalDays] = useState<any[]>([]);
  const [latestAiRun, setLatestAiRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const chartTrendRef = useRef<HTMLDivElement>(null);
  const chartRatioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Backend trả paginated {items,total,...} cho cả days lẫn ai runs.
    // Dùng helper getPageItems() để chịu được cả array thuần.
    Promise.all([
      axios.get("/api/timesheet/summary").catch(() => ({ data: null })),
      axios
        .get("/api/timesheet/days?riskLevels=ABNORMAL")
        .catch(() => ({ data: { items: [] } })),
      // Dùng pageSize=1 thay cho limit=1 (backend ignore limit).
      axios
        .get("/api/ai/runs?page=1&pageSize=1")
        .catch(() => ({ data: { items: [] } })),
    ])
      .then(([sumRes, daysRes, aiRes]) => {
        if (cancelled) return;
        if (sumRes.data) setSummary(sumRes.data);
        setCriticalDays(normalizePageResponse(daysRes.data).items.slice(0, 5));
        setLatestAiRun(normalizePageResponse(aiRes.data).items[0] ?? null);
      })
      .catch((e) => {
        // Không silent — log ra console để devtools thấy, nhưng vẫn render partial.
        // eslint-disable-next-line no-console
        console.warn("Dashboard load partial failure:", e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!summary) return;

    let chartTrend: echarts.ECharts | null = null;
    if (chartTrendRef.current) {
      chartTrend = echarts.init(chartTrendRef.current);
      chartTrend.setOption({
        title: {
          text: "Xu hướng đánh giá chuyên cần (14 ngày)",
          left: "left",
          textStyle: {
            fontSize: 14,
            fontWeight: 600,
            color: palette.gray[900],
          },
          padding: [0, 0, 8, 0],
        },
        tooltip: { trigger: "axis" },
        legend: {
          data: ["Tốt", "Cần kiểm tra", "Bất thường"],
          bottom: 0,
          icon: "circle",
          itemWidth: 8,
          textStyle: { color: palette.gray[600], fontSize: 12 },
        },
        grid: {
          left: "0",
          right: "8px",
          bottom: "32px",
          top: "40px",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: [
            "01/06",
            "02/06",
            "03/06",
            "04/06",
            "05/06",
            "08/06",
            "09/06",
            "10/06",
            "11/06",
            "12/06",
          ],
          axisLine: { lineStyle: { color: palette.gray[200] } },
          axisLabel: { color: palette.gray[500], fontSize: 11 },
        },
        yAxis: {
          type: "value",
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: palette.gray[150] } },
          axisLabel: { color: palette.gray[500], fontSize: 11 },
        },
        series: [
          {
            name: "Tốt",
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            data: [5, 4, 4, 3, 5, 4, 3, 4, 5, 4],
            itemStyle: { color: palette.success[500] },
            lineStyle: { width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(16,185,129,0.18)" },
                { offset: 1, color: "rgba(16,185,129,0)" },
              ]),
            },
          },
          {
            name: "Cần kiểm tra",
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            data: [0, 1, 1, 2, 1, 0, 1, 1, 0, 1],
            itemStyle: { color: palette.warning[500] },
            lineStyle: { width: 2 },
          },
          {
            name: "Bất thường",
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            data: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
            itemStyle: { color: palette.danger[500] },
            lineStyle: { width: 2 },
          },
        ],
      });
    }

    let chartRatio: echarts.ECharts | null = null;
    if (chartRatioRef.current) {
      chartRatio = echarts.init(chartRatioRef.current);
      chartRatio.setOption({
        title: {
          text: "Tỷ lệ lỗi vi phạm",
          left: "left",
          textStyle: {
            fontSize: 14,
            fontWeight: 600,
            color: palette.gray[900],
          },
          padding: [0, 0, 8, 0],
        },
        tooltip: { trigger: "item" },
        legend: {
          orient: "vertical",
          right: 0,
          top: "middle",
          icon: "circle",
          itemWidth: 8,
          textStyle: { color: palette.gray[600], fontSize: 12 },
        },
        series: [
          {
            name: "Lỗi chấm công",
            type: "pie",
            radius: ["50%", "72%"],
            center: ["38%", "55%"],
            avoidLabelOverlap: true,
            label: { show: false },
            data: [
              {
                value: summary.lateCount,
                name: "Đi trễ",
                itemStyle: { color: palette.warning[500] },
              },
              {
                value: summary.earlyLeaveCount,
                name: "Về sớm",
                itemStyle: { color: "#F97316" },
              },
              {
                value: summary.missingCheckInCount,
                name: "Thiếu giờ vào",
                itemStyle: { color: palette.danger[500] },
              },
              {
                value: summary.missingCheckOutCount,
                name: "Thiếu giờ ra",
                itemStyle: { color: "#B91C1C" },
              },
            ],
          },
        ],
      });
    }

    const handleResize = () => {
      chartTrend?.resize();
      chartRatio?.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartTrend?.dispose();
      chartRatio?.dispose();
    };
  }, [summary]);

  const columns = [
    {
      title: "Nhân viên",
      key: "employee",
      render: (_: any, r: any) => (
        <div>
          <Text strong style={{ color: palette.gray[900] }}>
            {r?.employee?.name}
          </Text>
          <br />
          <Text style={{ fontSize: 12, color: palette.gray[500] }}>
            {r?.employee?.code}
          </Text>
        </div>
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
      render: (_: any, r: any) => <DateCell value={r?.date} />,
    },
    {
      title: "Điểm",
      key: "score",
      align: "right" as const,
      render: (_: any, r: any) => {
        const score = r?.evaluation?.score;
        const color =
          score == null
            ? palette.gray[500]
            : score >= 85
              ? palette.success[600]
              : score >= 60
                ? palette.warning[600]
                : palette.danger[600];
        return (
          <span className="num" style={{ fontWeight: 600, color }}>
            {score ?? "—"}
          </span>
        );
      },
    },
    {
      title: "Lỗi ghi nhận",
      key: "reasons",
      render: (_: any, r: any) => {
        const reasons: string[] = r?.evaluation?.reasons ?? [];
        if (!reasons.length)
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              —
            </Text>
          );
        return (
          <Space size={[4, 4]} wrap>
            {reasons.slice(0, 2).map((rr, i) => (
              <Tag
                key={i}
                style={{
                  margin: 0,
                  background: palette.danger[50],
                  color: palette.danger[700],
                  border: "none",
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                {rr}
              </Tag>
            ))}
            {reasons.length > 2 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                +{reasons.length - 2}
              </Text>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="Bảng điều khiển"
        subtitle="Số liệu cập nhật theo đồng bộ thực địa mới nhất"
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Tổng nhân sự"
            value={
              summary ? <NumberCell value={summary.employeeCount} /> : undefined
            }
            icon={<UserOutlined />}
            tone="brand"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Ngày công đã lưu"
            value={
              summary ? <NumberCell value={summary.workdayCount} /> : undefined
            }
            icon={<CalendarOutlined />}
            tone="success"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Cảnh báo bất thường"
            value={
              summary ? <NumberCell value={summary.abnormalCount} /> : undefined
            }
            icon={<WarningOutlined />}
            tone="danger"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Tỷ lệ dữ liệu đạt chuẩn"
            value={
              summary ? (
                <span className="num">
                  {Number(summary.dataQualityRate ?? 0).toFixed(1)}%
                </span>
              ) : undefined
            }
            icon={<CompassOutlined />}
            tone="info"
            loading={loading}
          />
        </Col>
      </Row>

      {/* Charts + AI callout */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            bordered
            style={{
              borderRadius: 10,
              borderColor: palette.gray[150],
              height: 380,
            }}
            styles={{ body: { padding: 20, height: "100%" } }}
          >
            {summary ? (
              <div ref={chartTrendRef} style={{ width: "100%", height: 320 }} />
            ) : (
              <Skeleton active paragraph={{ rows: 6 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card
              bordered
              style={{
                borderRadius: 10,
                borderColor: palette.gray[150],
                height: 182,
                background: `linear-gradient(135deg, ${palette.brand[50]} 0%, #fff 100%)`,
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: palette.brand[500],
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  <RobotOutlined />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: palette.gray[900],
                      marginBottom: 4,
                    }}
                  >
                    Nhận định AI mới nhất
                  </div>
                  {latestAiRun ? (
                    <>
                      <div
                        style={{
                          fontSize: 12,
                          color: palette.gray[600],
                          marginBottom: 8,
                        }}
                      >
                        {DateCell({ value: latestAiRun.createdAt })}
                        {" • "}
                        <SeverityTag severity={latestAiRun.status} />
                      </div>
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: "auto" }}
                        onClick={() => setActiveKey("ai_analysis")}
                        icon={<RightOutlined />}
                        iconPosition="end"
                      >
                        Xem chi tiết
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          fontSize: 12,
                          color: palette.gray[600],
                          marginBottom: 8,
                        }}
                      >
                        Chưa có báo cáo AI nào được tạo.
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => setActiveKey("ai_analysis")}
                      >
                        Chạy phân tích
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
            <Card
              bordered
              style={{
                borderRadius: 10,
                borderColor: palette.gray[150],
                height: 182,
              }}
              styles={{ body: { padding: 20, height: "100%" } }}
            >
              {summary ? (
                <div
                  ref={chartRatioRef}
                  style={{ width: "100%", height: 144 }}
                />
              ) : (
                <Skeleton active paragraph={{ rows: 4 }} />
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Critical cases */}
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
        styles={{ body: { padding: 0 } }}
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px 0",
            }}
          >
            <Space size={8}>
              <BulbOutlined style={{ color: palette.warning[600] }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                Cần xử lý gấp hôm nay
              </span>
              <Tag
                style={{
                  margin: 0,
                  background: palette.danger[50],
                  color: palette.danger[700],
                  border: "none",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {criticalDays.length} trường hợp
              </Tag>
            </Space>
            <Button
              type="link"
              size="small"
              onClick={() => setActiveKey("timesheet")}
              icon={<RightOutlined />}
              iconPosition="end"
              style={{ padding: 0 }}
            >
              Xem tất cả
            </Button>
          </div>
        }
      >
        {loading ? (
          <div style={{ padding: 20 }}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : criticalDays.length === 0 ? (
          <Alert
            message="Không có vi phạm nghiêm trọng cần duyệt."
            type="success"
            showIcon
            style={{ margin: 20 }}
          />
        ) : (
          <Table
            dataSource={criticalDays}
            columns={columns}
            rowKey="id"
            pagination={false}
            onRow={() => ({
              onClick: () => setActiveKey("timesheet"),
              style: { cursor: "pointer" },
            })}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<CompassOutlined />}
                  title="Chưa có cảnh báo"
                  description="Khi có vi phạm bất thường, chúng sẽ xuất hiện ở đây."
                />
              ),
            }}
          />
        )}
      </Card>
    </Space>
  );
}
