import React, { useState, useEffect } from "react";
import {
  Card,
  Select,
  DatePicker,
  Button,
  Table,
  Alert,
  Progress,
  Divider,
  Space,
  App,
  Skeleton,
  Row,
  Col,
  Typography,
} from "antd";
import {
  PlayCircleOutlined,
  EyeOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { PageHeader, StatusTag, TableEmpty, EmptyState } from "./common";
import { DateCell } from "./common/DataCells";
import { palette } from "../theme/tokens";

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function SyncCenter() {
  const { message } = App.useApp();
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<any>(null);

  const [syncForm, setSyncForm] = useState<{
    endpoint?: string;
    dates?: [any, any] | null;
  }>({});

  useEffect(() => {
    axios
      .get("/api/mobiwork/endpoints")
      .then((res) => {
        setEndpoints(
          (res.data || []).map((e: any) => ({
            label: `${e.summary} (${e.path})`,
            value: e.path,
          })),
        );
      })
      .catch(() => message.error("Lỗi khi tải metadata OpenAPI"));
    loadJobs();
  }, []);

  // Poll active job
  useEffect(() => {
    if (!activeJobId) return;
    const timer = setInterval(() => {
      axios.get(`/api/sync/jobs/${activeJobId}`).then((res) => {
        const job = res.data;
        setActiveJob(job);
        if (job?.status === "COMPLETED" || job?.status === "FAILED") {
          setActiveJobId(null);
          loadJobs();
          if (job.status === "COMPLETED") {
            message.success("Đồng bộ dữ liệu thành công");
          } else {
            message.error("Đồng bộ thất bại. Kiểm tra nhật ký");
          }
        }
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [activeJobId]);

  const loadJobs = async () => {
    try {
      const res = await axios.get("/api/sync/jobs");
      setJobs(res.data || []);
    } catch {
      // ignore
    }
  };

  const validate = () => {
    if (!syncForm.endpoint || !syncForm.dates || syncForm.dates.length !== 2) {
      message.warning("Vui lòng chọn endpoint và khoảng ngày");
      return false;
    }
    return true;
  };

  const handlePreview = async () => {
    if (!validate()) return;
    setLoading(true);
    setPreviewData(null);
    try {
      const res = await axios.post("/api/mobiwork/preview", {
        endpoint: syncForm.endpoint,
        startDate: syncForm.dates![0].format("YYYY-MM-DD"),
        endDate: syncForm.dates![1].format("YYYY-MM-DD"),
      });
      setPreviewData(res.data);
    } catch (e: any) {
      message.error(
        e.response?.data?.message ||
          "Không có dữ liệu hoặc sai thông tin xác thực",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartSync = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/sync/run", {
        endpoint: syncForm.endpoint,
        startDate: syncForm.dates![0].format("YYYY-MM-DD"),
        endDate: syncForm.dates![1].format("YYYY-MM-DD"),
      });
      setActiveJobId(res.data?.jobId);
      setActiveJob({
        status: "RUNNING",
        processedCount: 0,
        totalRecords: 0,
        logs: "Đang khởi tạo...\n",
      });
      message.info("Bắt đầu đồng bộ trong nền");
    } catch (e: any) {
      message.error(e.response?.data?.message || "Không thể bắt đầu đồng bộ");
    } finally {
      setLoading(false);
    }
  };

  const jobColumns = [
    {
      title: "Endpoint",
      key: "endpoint",
      render: (_: any, r: any) => (
        <code
          style={{
            fontSize: 12,
            background: palette.gray[100],
            color: palette.gray[700],
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {r?.endpoint ?? "—"}
        </code>
      ),
    },
    {
      title: "Khoảng ngày",
      key: "range",
      width: 200,
      render: (_: any, r: any) => (
        <span className="num" style={{ color: palette.gray[700] }}>
          {r?.startDate?.substring(0, 10)} → {r?.endDate?.substring(0, 10)}
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
      title: "Tiến độ",
      key: "progress",
      width: 160,
      render: (_: any, r: any) => {
        const total = r?.totalRecords ?? 0;
        const done = r?.processedCount ?? 0;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <Progress
              percent={percent}
              size="small"
              status={
                r?.status === "FAILED"
                  ? "exception"
                  : r?.status === "RUNNING"
                    ? "active"
                    : percent >= 100
                      ? "success"
                      : "normal"
              }
              showInfo={false}
            />
            <span
              className="num"
              style={{ fontSize: 11, color: palette.gray[500] }}
            >
              {done.toLocaleString("vi-VN")} / {total.toLocaleString("vi-VN")}
            </span>
          </Space>
        );
      },
    },
    {
      title: "Ngày chạy",
      key: "createdAt",
      width: 160,
      render: (_: any, r: any) => (
        <DateCell value={r?.createdAt} format="datetime" />
      ),
    },
  ];

  const percent =
    activeJob?.totalRecords > 0
      ? Math.round((activeJob.processedCount / activeJob.totalRecords) * 100)
      : 0;

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="Đồng bộ dữ liệu"
        subtitle="Crawl, deduplicate và normalize dữ liệu OpenAPI của Mobiwork"
      />

      {/* Sync launcher */}
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
        title={
          <Space size={8}>
            <SyncOutlined style={{ color: palette.brand[500] }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              Khởi chạy đồng bộ
            </span>
          </Space>
        }
      >
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={10}>
            <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              Loại dữ liệu
            </div>
            <Select
              placeholder="Chọn API muốn đồng bộ"
              options={endpoints}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              value={syncForm.endpoint}
              onChange={(v) => setSyncForm((f) => ({ ...f, endpoint: v }))}
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} md={8}>
            <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              Khoảng ngày
            </div>
            <RangePicker
              style={{ width: "100%" }}
              value={syncForm.dates as any}
              onChange={(v) => setSyncForm((f) => ({ ...f, dates: v as any }))}
              placeholder={["Từ ngày", "Đến ngày"]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={loading}
              >
                Xem trước
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStartSync}
                loading={loading}
                disabled={!!activeJobId}
              >
                Đồng bộ ngay
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Live progress */}
        {activeJob && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: palette.gray[50],
              borderRadius: 8,
              border: `1px solid ${palette.gray[150]}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: palette.gray[900],
                }}
              >
                Tiến trình đồng bộ
              </span>
              <StatusTag status={activeJob.status} />
            </div>

            <Progress
              percent={percent}
              status={
                activeJob.status === "FAILED"
                  ? "exception"
                  : activeJob.status === "RUNNING"
                    ? "active"
                    : "normal"
              }
              style={{ marginBottom: 8 }}
            />

            <Text style={{ fontSize: 12, color: palette.gray[500] }}>
              Đã tải:{" "}
              <span className="num">
                {(activeJob.processedCount ?? 0).toLocaleString("vi-VN")}
              </span>{" "}
              /{" "}
              <span className="num">
                {(activeJob.totalRecords ?? 0).toLocaleString("vi-VN")}
              </span>{" "}
              bản ghi
            </Text>

            {activeJob.logs && (
              <>
                <Divider style={{ margin: "12px 0" }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: palette.gray[700],
                  }}
                >
                  Nhật ký
                </span>
                <pre
                  style={{
                    margin: "8px 0 0 0",
                    maxHeight: 150,
                    overflowY: "auto",
                    background: palette.gray[900],
                    color: "#7DD3FC",
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {activeJob.logs}
                </pre>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Preview */}
      {previewData && (
        <Card
          bordered
          style={{ borderRadius: 10, borderColor: palette.gray[150] }}
          title={
            <Space size={8}>
              <EyeOutlined style={{ color: palette.gray[500] }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                Dữ liệu xem trước (5 bản ghi mẫu)
              </span>
            </Space>
          }
        >
          <Alert
            message={`Tìm thấy tổng số ${previewData.totalCount} bản ghi thực địa trong khoảng thời gian.`}
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <pre
            style={{
              background: palette.gray[50],
              padding: 16,
              borderRadius: 8,
              overflow: "auto",
              maxHeight: 300,
              fontSize: 12,
              lineHeight: 1.5,
              color: palette.gray[800],
              border: `1px solid ${palette.gray[150]}`,
            }}
          >
            {JSON.stringify(previewData.previewRecords, null, 2)}
          </pre>
        </Card>
      )}

      {/* Job history */}
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
        styles={{ body: { padding: 0 } }}
        title={
          <div
            style={{
              padding: "16px 20px 0",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              Lịch sử đồng bộ
            </span>
            <span
              style={{
                fontSize: 12,
                color: palette.gray[500],
                fontWeight: 500,
              }}
            >
              {jobs.length} job
            </span>
          </div>
        }
      >
        {loading && jobs.length === 0 ? (
          <div style={{ padding: 20 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyState
              icon={<SyncOutlined />}
              title="Chưa có job đồng bộ nào"
              description="Job đồng bộ sẽ xuất hiện ở đây sau khi bạn chạy đồng bộ dữ liệu lần đầu."
            />
          </div>
        ) : (
          <Table
            dataSource={jobs}
            columns={jobColumns}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: "max-content" }}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<SyncOutlined />}
                  title="Chưa có job"
                  description="Lịch sử đồng bộ sẽ hiển thị ở đây."
                />
              ),
            }}
          />
        )}
      </Card>
    </Space>
  );
}
