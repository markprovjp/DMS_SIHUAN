import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Tag,
  Modal,
  DatePicker,
  Space,
  Typography,
  Alert,
  List,
  Tooltip,
  App,
  Skeleton,
  Tabs,
} from "antd";
import {
  RobotOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  FileTextOutlined,
  UserOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import {
  PageHeader,
  StatusTag,
  SeverityTag,
  EmptyState,
  TableEmpty,
  TableToolbar,
} from "./common";
import { DateCell, NumberCell } from "./common/DataCells";
import { palette } from "../theme/tokens";
import {
  getPageItems,
  getPageTotal,
  normalizePageResponse,
} from "../utils/page";

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;

const priorityToTone = (p?: string) => {
  const k = (p ?? "").toLowerCase();
  if (k === "high")
    return { bg: palette.danger[50], fg: palette.danger[700], label: "Cao" };
  if (k === "medium")
    return {
      bg: palette.warning[50],
      fg: palette.warning[700],
      label: "Trung bình",
    };
  return { bg: palette.gray[100], fg: palette.gray[700], label: "Thấp" };
};

const RenderInsightList = ({
  insights,
  title,
  emptyText,
}: {
  insights: any[];
  title: string;
  emptyText: string;
}) => {
  if (!insights || insights.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center" }}>
        <Text type="secondary">{emptyText}</Text>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: palette.gray[800],
          marginBottom: 12,
        }}
      >
        {title} ({insights.length})
      </div>
      <List
        dataSource={insights}
        renderItem={(item: any) => (
          <List.Item
            style={{
              display: "block",
              padding: "16px",
              background: palette.gray[50],
              borderRadius: 8,
              marginBottom: 10,
              border: `1px solid ${palette.gray[150]}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <Space>
                <SeverityTag severity={item.severity} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: palette.gray[900],
                  }}
                >
                  {item.title}
                </span>
              </Space>
            </div>

            <div
              style={{
                fontSize: 13,
                color: palette.gray[700],
                lineHeight: 1.6,
                marginBottom: 8,
              }}
            >
              <strong>Bằng chứng dữ liệu:</strong> {item.evidence}
            </div>

            {item.suggestedAction && (
              <div
                style={{
                  fontSize: 13,
                  color: palette.brand[700],
                  background: palette.brand[50],
                  padding: "8px 12px",
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <strong>Đề xuất hành động:</strong> {item.suggestedAction}
              </div>
            )}

            {(item.affectedEmployees?.length > 0 ||
              item.affectedDepartments?.length > 0 ||
              item.affectedCustomers?.length > 0) && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginTop: 8,
                }}
              >
                {item.affectedEmployees?.length > 0 && (
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        color: palette.gray[500],
                        marginRight: 6,
                      }}
                    >
                      Nhân viên liên quan:
                    </span>
                    <Space size={4} wrap>
                      {item.affectedEmployees.map((e: string, idx: number) => (
                        <Tag
                          key={idx}
                          style={{
                            fontSize: 11,
                            background: palette.gray[100],
                            border: "none",
                          }}
                        >
                          {e}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
                {item.affectedDepartments?.length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: palette.gray[500],
                        marginRight: 6,
                      }}
                    >
                      Phòng ban liên quan:
                    </span>
                    <Space size={4} wrap>
                      {item.affectedDepartments.map(
                        (d: string, idx: number) => (
                          <Tag
                            key={idx}
                            style={{
                              fontSize: 11,
                              background: palette.gray[150],
                              border: "none",
                            }}
                          >
                            {d}
                          </Tag>
                        ),
                      )}
                    </Space>
                  </div>
                )}
                {item.affectedCustomers?.length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: palette.gray[500],
                        marginRight: 6,
                      }}
                    >
                      Khách hàng liên quan:
                    </span>
                    <Space size={4} wrap>
                      {item.affectedCustomers.map((c: string, idx: number) => (
                        <Tag
                          key={idx}
                          style={{
                            fontSize: 11,
                            background: palette.gray[150],
                            border: "none",
                          }}
                        >
                          {c}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </div>
            )}
          </List.Item>
        )}
      />
    </div>
  );
};

export default function AiAnalysis() {
  const { message } = App.useApp();
  const [runs, setRuns] = useState<any[]>([]);
  const [runsTotal, setRunsTotal] = useState<number | null>(null);
  const [latestAiRun, setLatestAiRun] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formDates, setFormDates] = useState<any>(null);

  useEffect(() => {
    loadRuns();
    loadLatestRun();
  }, []);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/ai/runs");
      const { items, total } = normalizePageResponse(res.data);
      setRuns(items);
      setRunsTotal(total);
    } catch (e) {
      message.error("Lỗi khi tải lịch sử phân tích AI");
    } finally {
      setLoading(false);
    }
  };

  /** Fetch 1 run mới nhất để hiển thị ở "latest run" callout.
   *  Dùng pageSize=1 để minimize payload. */
  const loadLatestRun = async () => {
    try {
      const res = await axios.get("/api/ai/runs?page=1&pageSize=1");
      const { items } = normalizePageResponse(res.data);
      setLatestAiRun(items[0] ?? null);
    } catch {
      // silent — latest callout optional
    }
  };

  const handleCreateAnalysis = async () => {
    if (!formDates || formDates.length !== 2) {
      message.warning("Vui lòng chọn khoảng ngày phân tích");
      return;
    }

    setLoading(true);
    setCreateModalVisible(false);
    const startDate = formDates[0].format("YYYY-MM-DD");
    const endDate = formDates[1].format("YYYY-MM-DD");

    message.loading({
      content: "AI đang đọc dữ liệu và viết báo cáo chuyên cần...",
      key: "ai_thinking",
      duration: 0,
    });

    try {
      const res = await axios.post("/api/ai/timesheet/analyze", {
        startDate,
        endDate,
      });
      message.success({
        content: "AI phân tích hoàn tất!",
        key: "ai_thinking",
      });
      setSelectedRun(res.data);
      setViewModalVisible(true);
      // Refresh cả list lịch sử lẫn "latest run" callout để báo cáo mới xuất hiện ngay.
      await Promise.all([loadRuns(), loadLatestRun()]);
    } catch (e: any) {
      const msg =
        e.response?.data?.message ||
        "Có lỗi xảy ra. Hãy kiểm tra cài đặt AI Provider!";
      message.error({ content: msg, key: "ai_thinking", duration: 4 });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await axios.post(`/api/ai/runs/${id}/approve`);
      message.success("Đã duyệt báo cáo quản trị AI");
      if (selectedRun?.id === id) {
        setSelectedRun((prev: any) => ({ ...prev, isApproved: true }));
      }
      loadRuns();
    } catch (e) {
      message.error("Lỗi khi phê duyệt báo cáo");
    }
  };

  const handleView = async (record: any) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/ai/runs/${record.id}`);
      setSelectedRun(res.data);
      setViewModalVisible(true);
    } catch (e) {
      message.error("Lỗi tải thông tin chi tiết báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Khoảng thời gian",
      key: "range",
      width: 180,
      fixed: "left" as const,
      render: (_: any, r: any) => (
        <span className="num" style={{ fontWeight: 500 }}>
          {r?.startDate?.substring(0, 10)} → {r?.endDate?.substring(0, 10)}
        </span>
      ),
    },
    {
      title: "Tóm tắt",
      dataIndex: "executiveSummary",
      key: "summary",
      width: 360,
      ellipsis: true,
      render: (text: string) =>
        text ? (
          <Tooltip title={text} placement="topLeft">
            <span style={{ color: palette.gray[600] }}>{text}</span>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Trạng thái duyệt",
      key: "isApproved",
      width: 150,
      render: (_: any, r: any) => (
        <StatusTag
          status={r?.isApproved ? "APPROVED" : "PENDING"}
          label={r?.isApproved ? "Đã phê duyệt" : "Chờ duyệt"}
        />
      ),
    },
    {
      title: "Ngày tạo",
      key: "createdAt",
      width: 150,
      render: (_: any, r: any) => (
        <DateCell value={r?.createdAt} format="datetime" />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 140,
      fixed: "right" as const,
      align: "right" as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(r)}
            />
          </Tooltip>
          {!r?.isApproved && (
            <Tooltip title="Phê duyệt">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(r.id)}
                style={{ color: palette.success[600] }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const hasRuns = runs.length > 0;
  // Ưu tiên `latestRun` state từ API pageSize=1, fallback lấy runs[0] nếu backend
  // chưa support hoặc initial load race condition.
  const latestRun = latestAiRun ?? (hasRuns ? runs[0] : null);

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="Phân tích AI"
        subtitle="Trợ lý đọc dữ liệu chấm công, viếng thăm, KPI và sinh nhận định quản trị"
        actions={
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Chạy phân tích mới
          </Button>
        }
      />

      {/* Latest run callout */}
      {latestRun && (
        <Card
          bordered
          className="lift-on-hover"
          style={{
            borderRadius: 10,
            borderColor: palette.gray[150],
            background: `linear-gradient(135deg, ${palette.brand[50]} 0%, #fff 100%)`,
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: palette.brand[500],
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <RobotOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div
                style={{
                  fontSize: 13,
                  color: palette.gray[600],
                  fontWeight: 500,
                  marginBottom: 2,
                }}
              >
                Báo cáo mới nhất
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: palette.gray[900],
                  marginBottom: 4,
                }}
              >
                {latestRun.startDate?.substring(0, 10)} →{" "}
                {latestRun.endDate?.substring(0, 10)}
                {latestRun.model && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: palette.gray[500],
                      marginLeft: 8,
                    }}
                  >
                    • {latestRun.model} ({latestRun.provider})
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: palette.gray[500] }}>
                {latestRun.tokenUsagePrompt != null &&
                  `Input: ${fmtN(latestRun.tokenUsagePrompt)} • `}
                {latestRun.tokenUsageCompletion != null &&
                  `Output: ${fmtN(latestRun.tokenUsageCompletion)} • `}
                {latestRun.latencyMs != null &&
                  `Latency: ${(latestRun.latencyMs / 1000).toFixed(1)}s`}
              </div>
            </div>
            <Space>
              <StatusTag
                status={latestRun.isApproved ? "APPROVED" : "PENDING"}
                label={latestRun.isApproved ? "Đã phê duyệt" : "Chờ duyệt"}
              />
              <Button
                onClick={() => handleView(latestRun)}
                icon={<EyeOutlined />}
              >
                Xem chi tiết
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* Runs table */}
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
        styles={{ body: { padding: 0 } }}
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 20px 0",
            }}
          >
            <FileTextOutlined style={{ color: palette.gray[500] }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              Lịch sử phân tích
            </span>
            <Tag
              style={{
                margin: 0,
                background: palette.gray[100],
                color: palette.gray[700],
                border: "none",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {runsTotal ?? runs.length} báo cáo
            </Tag>
          </div>
        }
      >
        {loading && runs.length === 0 ? (
          <div style={{ padding: 20 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : !hasRuns ? (
          <div style={{ padding: 20 }}>
            <EmptyState
              icon={<RobotOutlined />}
              title="Chưa có báo cáo AI"
              description="Chạy phân tích để nhận nhận định tự động về tình hình chuyên cần, viếng thăm và KPI trong khoảng thời gian bạn chọn."
              action={
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  Chạy phân tích đầu tiên
                </Button>
              }
            />
          </div>
        ) : (
          <Table
            dataSource={runs}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            // 180 + 360 + 150 + 150 + 140 = 980. Set explicit width để
            // AntD render scroll wrapper + fixed columns (left+right) hoạt động đúng.
            scroll={{ x: 980 }}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<RobotOutlined />}
                  title="Chưa có báo cáo"
                  description="Chạy phân tích AI để tạo báo cáo đầu tiên."
                />
              ),
            }}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: palette.brand[500] }} />
            <span>Yêu cầu phân tích AI mới</span>
          </Space>
        }
        open={createModalVisible}
        onOk={handleCreateAnalysis}
        onCancel={() => setCreateModalVisible(false)}
        okText="Bắt đầu phân tích"
        cancelText="Hủy"
        confirmLoading={loading}
        width={520}
      >
        <Space
          direction="vertical"
          size={16}
          style={{ width: "100%", padding: "8px 0" }}
        >
          <Text style={{ color: palette.gray[700] }}>
            Chọn khoảng thời gian muốn AI tiến hành phân tích số liệu chấm công,
            viếng thăm và KPI:
          </Text>
          <RangePicker
            style={{ width: "100%" }}
            onChange={(val) => setFormDates(val)}
            placeholder={["Từ ngày", "Đến ngày"]}
          />
          <Alert
            message="Lưu ý"
            description="AI chỉ diễn giải kết quả từ các chỉ số đã tính toán của Rule Engine, đảm bảo tính khách quan và chính xác."
            type="info"
            showIcon
          />
        </Space>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: palette.brand[500] }} />
            <span>Báo cáo phân tích chuyên cần từ AI</span>
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        width={780}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Đóng
          </Button>,
          selectedRun && !selectedRun.isApproved ? (
            <Button
              key="approve"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(selectedRun.id)}
            >
              Phê duyệt báo cáo
            </Button>
          ) : null,
        ]}
      >
        {selectedRun && (
          <Space
            direction="vertical"
            size={16}
            style={{ width: "100%", paddingTop: 8 }}
          >
            {/* Header meta */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Text strong style={{ fontSize: 14 }}>
                {selectedRun.startDate?.substring(0, 10)} →{" "}
                {selectedRun.endDate?.substring(0, 10)}
              </Text>
              <Space size={8} wrap>
                <StatusTag
                  status={selectedRun.isApproved ? "APPROVED" : "PENDING"}
                  label={selectedRun.isApproved ? "Đã phê duyệt" : "Chờ duyệt"}
                />
                {selectedRun.model && (
                  <Tag
                    style={{
                      background: palette.gray[100],
                      color: palette.gray[700],
                      border: "none",
                      fontSize: 12,
                    }}
                  >
                    {selectedRun.model} • {selectedRun.provider}
                  </Tag>
                )}
              </Space>
            </div>

            {/* Sử dụng Tabs */}
            <Tabs
              defaultActiveKey="summary"
              items={[
                {
                  key: "summary",
                  label: "Tóm tắt & Phát hiện chính",
                  children: (
                    <Space
                      direction="vertical"
                      size={16}
                      style={{ width: "100%" }}
                    >
                      {/* Executive Summary */}
                      <div>
                        <div className="section-title">
                          <BulbOutlined /> Tóm tắt nhận định chung
                        </div>
                        <div
                          style={{
                            padding: "12px 16px",
                            borderLeft: `3px solid ${palette.brand[500]}`,
                            background: palette.gray[50],
                            borderRadius: 6,
                            fontSize: 14,
                            lineHeight: 1.7,
                            color: palette.gray[800],
                          }}
                        >
                          {selectedRun.executiveSummary || (
                            <Text type="secondary">Chưa có tóm tắt.</Text>
                          )}
                        </div>
                      </div>

                      {/* Findings */}
                      {selectedRun.findings?.length > 0 && (
                        <div>
                          <div className="section-title">
                            <BulbOutlined /> Phát hiện chính (
                            {selectedRun.findings.length})
                          </div>
                          <List
                            dataSource={selectedRun.findings}
                            renderItem={(f: any) => (
                              <List.Item
                                style={{
                                  display: "block",
                                  padding: "12px 14px",
                                  background: palette.gray[50],
                                  borderRadius: 8,
                                  marginBottom: 8,
                                  border: `1px solid ${palette.gray[150]}`,
                                }}
                              >
                                <Space
                                  align="start"
                                  style={{ width: "100%" }}
                                  size={12}
                                >
                                  <SeverityTag severity={f.severity} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: palette.gray[900],
                                        marginBottom: 4,
                                      }}
                                    >
                                      {f.title}
                                    </div>
                                    <Paragraph
                                      style={{
                                        margin: 0,
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                        color: palette.gray[600],
                                      }}
                                    >
                                      {f.evidence}
                                    </Paragraph>
                                    {f.affectedUnits?.length > 0 && (
                                      <div style={{ marginTop: 8 }}>
                                        <Text
                                          style={{
                                            fontSize: 12,
                                            color: palette.gray[500],
                                            marginRight: 4,
                                          }}
                                        >
                                          Đối tượng liên quan:
                                        </Text>
                                        <Space size={4} wrap>
                                          {f.affectedUnits.map(
                                            (u: string, idx: number) => (
                                              <Tag
                                                key={idx}
                                                style={{
                                                  background: palette.gray[100],
                                                  color: palette.gray[700],
                                                  border: "none",
                                                  fontSize: 11,
                                                }}
                                              >
                                                {u}
                                              </Tag>
                                            ),
                                          )}
                                        </Space>
                                      </div>
                                    )}
                                  </div>
                                </Space>
                              </List.Item>
                            )}
                          />
                        </div>
                      )}
                    </Space>
                  ),
                },
                {
                  key: "timesheet",
                  label: "Chấm công",
                  children: (
                    <RenderInsightList
                      insights={selectedRun.outputJson?.timesheetInsights}
                      title="Nhận định chấm công"
                      emptyText="Không có nhận định về chấm công cho báo cáo này hoặc là báo cáo phiên bản cũ."
                    />
                  ),
                },
                {
                  key: "visits",
                  label: "Viếng thăm",
                  children: (
                    <RenderInsightList
                      insights={selectedRun.outputJson?.visitInsights}
                      title="Nhận định viếng thăm khách hàng"
                      emptyText="Không có nhận định về viếng thăm cho báo cáo này hoặc là báo cáo phiên bản cũ."
                    />
                  ),
                },
                {
                  key: "orders",
                  label: "Đơn hàng",
                  children: (
                    <RenderInsightList
                      insights={selectedRun.outputJson?.orderInsights}
                      title="Nhận định đơn hàng & doanh số"
                      emptyText="Không có nhận định về đơn hàng cho báo cáo này hoặc là báo cáo phiên bản cũ."
                    />
                  ),
                },
                {
                  key: "kpi",
                  label: "Chỉ tiêu KPI",
                  children: (
                    <RenderInsightList
                      insights={selectedRun.outputJson?.kpiInsights}
                      title="Nhận định chỉ tiêu KPI"
                      emptyText="Không có nhận định về KPI cho báo cáo này hoặc là báo cáo phiên bản cũ."
                    />
                  ),
                },
                {
                  key: "inventory",
                  label: "Tồn kho",
                  children: (
                    <RenderInsightList
                      insights={selectedRun.outputJson?.inventoryInsights}
                      title="Nhận định xuất nhập tồn kho"
                      emptyText="Không có nhận định về tồn kho cho báo cáo này hoặc là báo cáo phiên bản cũ."
                    />
                  ),
                },
                {
                  key: "cross",
                  label: "Liên kết chéo",
                  children: (
                    <RenderInsightList
                      insights={selectedRun.outputJson?.crossModuleInsights}
                      title="Phát hiện đa mô-đun liên kết"
                      emptyText="Không có nhận định liên kết chéo cho báo cáo này hoặc là báo cáo phiên bản cũ."
                    />
                  ),
                },
                {
                  key: "details",
                  label: "Đề xuất & Ý kiến",
                  children: (
                    <Space
                      direction="vertical"
                      size={16}
                      style={{ width: "100%" }}
                    >
                      {/* Recommendations */}
                      {selectedRun.recommendations?.length > 0 && (
                        <div>
                          <div className="section-title">
                            <CheckCircleOutlined /> Hành động đề xuất (
                            {selectedRun.recommendations.length})
                          </div>
                          <List
                            dataSource={selectedRun.recommendations}
                            renderItem={(r: any) => {
                              const p = priorityToTone(r.priority);
                              return (
                                <List.Item
                                  style={{
                                    display: "block",
                                    padding: "10px 14px",
                                    borderLeft: `3px solid ${p.fg}`,
                                    background: "#fff",
                                    border: `1px solid ${palette.gray[150]}`,
                                    borderLeftWidth: 3,
                                    borderRadius: 6,
                                    marginBottom: 8,
                                  }}
                                >
                                  <Space
                                    align="start"
                                    style={{ width: "100%" }}
                                    size={12}
                                  >
                                    <Tag
                                      style={{
                                        background: p.bg,
                                        color: p.fg,
                                        border: "none",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        margin: 0,
                                      }}
                                    >
                                      Ưu tiên {p.label}
                                    </Tag>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontSize: 14,
                                          fontWeight: 500,
                                          color: palette.gray[900],
                                        }}
                                      >
                                        {r.action}
                                      </div>
                                      <div
                                        style={{
                                          marginTop: 4,
                                          fontSize: 12,
                                          color: palette.gray[500],
                                        }}
                                      >
                                        <UserOutlined
                                          style={{ marginRight: 4 }}
                                        />
                                        {r.ownerRole}
                                        {r.dueHint && (
                                          <>
                                            {" • "}
                                            <ClockCircleOutlined
                                              style={{ marginRight: 4 }}
                                            />
                                            {r.dueHint}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </Space>
                                </List.Item>
                              );
                            }}
                          />
                        </div>
                      )}

                      {/* Employee Comments */}
                      {selectedRun.employeeComments?.length > 0 && (
                        <div>
                          <div className="section-title">
                            <UserOutlined /> Đánh giá theo nhân viên (
                            {selectedRun.employeeComments.length})
                          </div>
                          <List
                            dataSource={selectedRun.employeeComments}
                            renderItem={(ec: any) => (
                              <List.Item
                                style={{
                                  display: "block",
                                  padding: "10px 14px",
                                  background: palette.gray[50],
                                  borderRadius: 6,
                                  marginBottom: 6,
                                }}
                              >
                                <Text
                                  strong
                                  style={{
                                    color: palette.brand[700],
                                    fontSize: 13,
                                    marginRight: 8,
                                  }}
                                >
                                  [{ec.employeeCode}]
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    color: palette.gray[800],
                                  }}
                                >
                                  {ec.comment}
                                </Text>
                                {ec.suggestedAction && (
                                  <div
                                    style={{
                                      marginTop: 6,
                                      paddingLeft: 12,
                                      fontSize: 12,
                                      color: palette.gray[500],
                                      borderLeft: `2px solid ${palette.gray[200]}`,
                                    }}
                                  >
                                    Gợi ý xử lý: {ec.suggestedAction}
                                  </div>
                                )}
                              </List.Item>
                            )}
                          />
                        </div>
                      )}

                      {/* Data Quality Warnings */}
                      {selectedRun.dataQualityWarnings?.length > 0 && (
                        <div>
                          <div className="section-title">
                            <WarningOutlined
                              style={{ color: palette.warning[600] }}
                            />{" "}
                            Cảnh báo chất lượng dữ liệu (
                            {selectedRun.dataQualityWarnings.length})
                          </div>
                          <Space
                            direction="vertical"
                            size={6}
                            style={{ width: "100%" }}
                          >
                            {selectedRun.dataQualityWarnings.map(
                              (w: any, idx: number) => {
                                const text =
                                  typeof w === "string"
                                    ? w
                                    : (w?.message ??
                                      w?.text ??
                                      JSON.stringify(w));
                                return (
                                  <Alert
                                    key={idx}
                                    message={text}
                                    type="warning"
                                    showIcon
                                    style={{ width: "100%" }}
                                  />
                                );
                              },
                            )}
                          </Space>
                        </div>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}

function fmtN(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}
