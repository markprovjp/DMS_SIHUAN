import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tabs,
  Tag,
  Progress,
  Space,
  App,
  Skeleton,
  Row,
  Col,
  Typography,
} from "antd";
import {
  AreaChartOutlined,
  DatabaseOutlined,
  TrophyOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { normalizePageResponse } from "../utils/page";
import { PageHeader, StatusTag, StatCard, TableEmpty } from "./common";
import { DateCell, NumberCell } from "./common/DataCells";
import { palette } from "../theme/tokens";

const { Text } = Typography;

const achievementTone = (rate: number | null | undefined) => {
  if (rate == null) return "default";
  if (rate >= 1) return "success";
  if (rate >= 0.5) return "warning";
  return "danger";
};

const achievementLabel = (rate: number | null | undefined) => {
  if (rate == null) return "Chưa đạt";
  if (rate >= 1) return "Đạt";
  if (rate >= 0.5) return "Cần cố gắng";
  return "Chưa đạt";
};

const inventoryTone = (qty: number, minQty?: number) => {
  if (minQty != null && qty < minQty) return "danger";
  if (minQty != null && qty < minQty * 1.5) return "warning";
  return "success";
};

export default function KpiInventory() {
  const { message } = App.useApp();
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [kpiPage, setKpiPage] = useState(1);
  const [kpiPageSize, setKpiPageSize] = useState(10);
  const [kpiTotal, setKpiTotal] = useState(0);

  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(10);
  const [invTotal, setInvTotal] = useState(0);

  const loadKpi = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/kpi", {
        params: { page, pageSize },
      });
      const norm = normalizePageResponse(res.data);
      setKpiData(norm.items);
      setKpiTotal(norm.total);
    } catch (e) {
      message.error("Lỗi khi tải dữ liệu KPI");
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/inventory", {
        params: { page, pageSize },
      });
      const norm = normalizePageResponse(res.data);
      setInventoryData(norm.items);
      setInvTotal(norm.total);
    } catch (e) {
      message.error("Lỗi khi tải dữ liệu Kho hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpi(kpiPage, kpiPageSize);
  }, [kpiPage, kpiPageSize]);

  useEffect(() => {
    loadInventory(invPage, invPageSize);
  }, [invPage, invPageSize]);

  // KPI stats
  const totalKpi = kpiTotal;
  const achievedKpi = kpiData.filter(
    (k) => (k?.achievementRate ?? 0) >= 1,
  ).length;
  const avgAchievement =
    kpiData.length > 0
      ? kpiData.reduce((s, k) => s + (k?.achievementRate ?? 0), 0) /
        kpiData.length
      : 0;

  const kpiColumns = [
    {
      title: "Nhân viên",
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
      title: "Chỉ tiêu",
      key: "kpiName",
      render: (_: any, r: any) => (
        <span style={{ color: palette.gray[800] }}>{r?.kpiName ?? "—"}</span>
      ),
    },
    {
      title: "Kế hoạch",
      key: "targetValue",
      align: "right" as const,
      render: (_: any, r: any) => {
        const isMoney = String(r?.kpiName ?? "").includes("Doanh");
        return (
          <span className="num" style={{ color: palette.gray[700] }}>
            {isMoney ? (
              <NumberCell value={r?.targetValue} format="vnd" />
            ) : (
              <NumberCell value={r?.targetValue} />
            )}
          </span>
        );
      },
    },
    {
      title: "Thực tế",
      key: "actualValue",
      align: "right" as const,
      render: (_: any, r: any) => {
        const isMoney = String(r?.kpiName ?? "").includes("Doanh");
        return (
          <span
            className="num"
            style={{ fontWeight: 600, color: palette.gray[900] }}
          >
            {isMoney ? (
              <NumberCell value={r?.actualValue} format="vnd" />
            ) : (
              <NumberCell value={r?.actualValue} />
            )}
          </span>
        );
      },
    },
    {
      title: "Hoàn thành",
      key: "achievementRate",
      width: 220,
      render: (_: any, r: any) => {
        const rate = r?.achievementRate ?? 0;
        const percent = Math.round(rate * 100);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Progress
                percent={Math.min(percent, 100)}
                size="small"
                status={
                  percent >= 100
                    ? "success"
                    : percent < 50
                      ? "exception"
                      : "normal"
                }
                showInfo={false}
              />
            </div>
            <span
              className="num"
              style={{
                fontSize: 12,
                fontWeight: 600,
                minWidth: 44,
                textAlign: "right",
                color: rate >= 1 ? palette.success[600] : palette.gray[700],
              }}
            >
              {percent}%
            </span>
          </div>
        );
      },
    },
    {
      title: "Xếp loại",
      key: "tone",
      width: 130,
      render: (_: any, r: any) => (
        <StatusTag
          status={
            r?.achievementRate >= 1
              ? "GOOD"
              : r?.achievementRate >= 0.5
                ? "CHECK"
                : "ABNORMAL"
          }
          label={achievementLabel(r?.achievementRate)}
        />
      ),
    },
  ];

  const inventoryColumns = [
    {
      title: "Mã phiếu",
      key: "code",
      width: 130,
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
      title: "Kho",
      key: "warehouse",
      render: (_: any, r: any) => r?.warehouse?.name ?? "—",
    },
    {
      title: "Loại",
      key: "type",
      width: 130,
      render: (_: any, r: any) => {
        const isExport = String(r?.type ?? "").includes("XUẤT");
        return (
          <Tag
            style={{
              background: isExport ? palette.warning[50] : palette.info[50],
              color: isExport ? palette.warning[700] : palette.info[700],
              border: "none",
              fontSize: 12,
              fontWeight: 500,
              margin: 0,
            }}
          >
            {r?.type ?? "—"}
          </Tag>
        );
      },
    },
    {
      title: "Chi tiết",
      key: "details",
      render: (_: any, r: any) => {
        const items = r?.items ?? [];
        if (items.length === 0)
          return <span style={{ color: palette.gray[400] }}>—</span>;
        return (
          <Space direction="vertical" size={2}>
            {items.slice(0, 3).map((i: any, idx: number) => (
              <div key={idx} style={{ fontSize: 13 }}>
                {i?.product?.name}:{" "}
                <span
                  className="num"
                  style={{ fontWeight: 600, color: palette.gray[900] }}
                >
                  <NumberCell value={i?.quantity} />
                </span>{" "}
                {i?.product?.unit || ""}
                {i?.value && (
                  <span style={{ color: palette.gray[500], fontSize: 12 }}>
                    {" "}
                    (
                    <NumberCell value={i.value} format="vnd" />)
                  </span>
                )}
              </div>
            ))}
            {items.length > 3 && (
              <span style={{ fontSize: 12, color: palette.gray[500] }}>
                +{items.length - 3} sản phẩm khác
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: "Trạng thái tồn",
      key: "stockStatus",
      width: 150,
      render: (_: any, r: any) => {
        const totalQty = (r?.items ?? []).reduce(
          (s: number, i: any) => s + (i?.quantity ?? 0),
          0,
        );
        const minQty = r?.minQuantity;
        return (
          <StatusTag
            status={inventoryTone(totalQty, minQty)}
            label={
              inventoryTone(totalQty, minQty) === "danger"
                ? "Sắp hết"
                : inventoryTone(totalQty, minQty) === "warning"
                  ? "Sắp hết"
                  : "Đủ hàng"
            }
          />
        );
      },
    },
    {
      title: "Ngày GD",
      key: "date",
      width: 120,
      render: (_: any, r: any) => <DateCell value={r?.date} />,
    },
  ];

  const items = [
    {
      key: "kpi",
      label: (
        <Space size={6}>
          <AreaChartOutlined />
          <span>Chỉ số KPI</span>
        </Space>
      ),
      children:
        loading && kpiData.length === 0 ? (
          <div style={{ padding: 20 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <>
            {/* KPI stats row */}
            {kpiData.length > 0 && (
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                  <StatCard
                    label="Tổng chỉ tiêu"
                    value={<NumberCell value={totalKpi} />}
                    icon={<RiseOutlined />}
                    tone="brand"
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <StatCard
                    label="Đã đạt"
                    value={<NumberCell value={achievedKpi} />}
                    icon={<TrophyOutlined />}
                    tone="success"
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <StatCard
                    label="Tỷ lệ đạt TB"
                    value={
                      <span className="num">
                        {Math.round(avgAchievement * 100)}%
                      </span>
                    }
                    icon={<AreaChartOutlined />}
                    tone={achievementTone(avgAchievement) as any}
                  />
                </Col>
              </Row>
            )}
            <Table
              dataSource={kpiData}
              columns={kpiColumns}
              rowKey="id"
              pagination={{
                current: kpiPage,
                pageSize: kpiPageSize,
                total: kpiTotal,
                showSizeChanger: true,
                onChange: (page, pageSize) => {
                  setKpiPage(page);
                  setKpiPageSize(pageSize);
                },
              }}
              scroll={{ x: "max-content" }}
              locale={{
                emptyText: (
                  <TableEmpty
                    icon={<AreaChartOutlined />}
                    title="Chưa có dữ liệu KPI"
                    description="KPI sẽ xuất hiện ở đây sau khi đồng bộ dữ liệu Mobiwork."
                  />
                ),
              }}
            />
          </>
        ),
    },
    {
      key: "inventory",
      label: (
        <Space size={6}>
          <DatabaseOutlined />
          <span>Giao dịch kho</span>
        </Space>
      ),
      children:
        loading && inventoryData.length === 0 ? (
          <div style={{ padding: 20 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <Table
            dataSource={inventoryData}
            columns={inventoryColumns}
            rowKey="id"
            pagination={{
              current: invPage,
              pageSize: invPageSize,
              total: invTotal,
              showSizeChanger: true,
              onChange: (page, pageSize) => {
                setInvPage(page);
                setInvPageSize(pageSize);
              },
            }}
            scroll={{ x: "max-content" }}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<DatabaseOutlined />}
                  title="Chưa có giao dịch kho"
                  description="Giao dịch nhập/xuất kho sẽ xuất hiện ở đây sau khi đồng bộ."
                />
              ),
            }}
          />
        ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="KPI & Tồn kho"
        subtitle="Tiến độ thực hiện chỉ số KPI của sales và luồng xuất nhập tồn kho"
      />

      <Card
        bordered
        style={{ borderRadius: 10, borderColor: palette.gray[150] }}
      >
        <Tabs defaultActiveKey="kpi" items={items} />
      </Card>
    </Space>
  );
}
