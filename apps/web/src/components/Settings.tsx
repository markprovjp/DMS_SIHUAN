import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Switch,
  Divider,
  Space,
  Row,
  Col,
  Select,
  App,
  Skeleton,
  Segmented,
  Alert,
  Typography,
} from "antd";
import {
  SaveOutlined,
  SettingOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { PageHeader } from "./common";
import { palette } from "../theme/tokens";

const { Text } = Typography;

export default function Settings() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testingText, setTestingText] = useState(false);
  const [testingVision, setTestingVision] = useState(false);
  const [textTestResult, setTextTestResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [visionTestResult, setVisionTestResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/settings")
      .then((res) => {
        const config = res.data;
        let weights: any = {};
        if (config.ruleWeights) {
          try {
            weights =
              typeof config.ruleWeights === "string"
                ? JSON.parse(config.ruleWeights)
                : config.ruleWeights;
          } catch {
            // ignore
          }
        }

        const aiApiKeyObj = config.aiApiKey || config.openaiApiKey;
        const aiApiKeyVal =
          typeof aiApiKeyObj === "object"
            ? aiApiKeyObj?.configured
              ? aiApiKeyObj.masked
              : ""
            : aiApiKeyObj || "";

        const mobiworkUserIdObj = config.mobiworkUserId;
        const mobiworkUserIdVal =
          typeof mobiworkUserIdObj === "object"
            ? mobiworkUserIdObj?.configured
              ? mobiworkUserIdObj.masked
              : ""
            : mobiworkUserIdObj || "";

        form.setFieldsValue({
          shiftStart: config.shiftStart || "08:00",
          lateAfter: config.lateAfter || "08:15",
          shiftEnd: config.shiftEnd || "17:00",
          minWorkHours: Number(config.minWorkHours || 7.5),
          timezone: config.timezone || "Asia/Bangkok",
          visionEnabled: config.visionEnabled === "true",
          aiProvider: config.aiProvider || "openai",
          aiBaseUrl: config.aiBaseUrl || "",
          aiWireApi: config.aiWireApi || "openai",
          aiApiKey: aiApiKeyVal,
          aiTextModel:
            config.aiTextModel || config.openaiTextModel || "gpt-4o-mini",
          aiVisionModel:
            config.aiVisionModel || config.openaiVisionModel || "gpt-4o",
          aiReasoningEffort: config.aiReasoningEffort || "high",
          aiVerbosity: config.aiVerbosity || "medium",
          mobiworkBase: config.mobiworkApiBase || "https://openapi.mobiwork.vn",
          mobiworkUserId: mobiworkUserIdVal,
          mobiworkToken: "",
          ...weights,
        });
      })
      .catch(() => message.error("Lỗi khi tải cấu hình hệ thống"))
      .finally(() => setLoading(false));
  }, []);

  const testText = async () => {
    setTestingText(true);
    setTextTestResult(null);
    try {
      const res = await axios.post("/api/ai/test");
      if (res.data?.success) {
        setTextTestResult({
          type: "success",
          text: `Kết nối thành công — Model: ${res.data.model}, Provider: ${res.data.provider}. Phản hồi: ${res.data.message}`,
        });
      } else {
        setTextTestResult({
          type: "error",
          text: `Kết nối thất bại: ${res.data?.error || "Không rõ nguyên nhân"}`,
        });
      }
    } catch (e: any) {
      setTextTestResult({
        type: "error",
        text: `Lỗi khi kiểm tra: ${e.message}`,
      });
    } finally {
      setTestingText(false);
    }
  };

  const testVision = async () => {
    setTestingVision(true);
    setVisionTestResult(null);
    try {
      const res = await axios.post("/api/vision/test", {
        imageUrl:
          "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
      });
      if (res.data?.success) {
        setVisionTestResult({
          type: "success",
          text: `Phân loại: ${res.data.classification} — Model: ${res.data.model}`,
        });
      } else {
        setVisionTestResult({
          type: "error",
          text: `Kiểm tra Vision thất bại: ${res.data?.error || "Không rõ"}`,
        });
      }
    } catch (e: any) {
      setVisionTestResult({
        type: "error",
        text: `Lỗi khi kiểm tra: ${e.message}`,
      });
    } finally {
      setTestingVision(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    const {
      shiftStart,
      lateAfter,
      shiftEnd,
      minWorkHours,
      timezone,
      visionEnabled,
      aiProvider,
      aiBaseUrl,
      aiWireApi,
      aiApiKey,
      aiTextModel,
      aiVisionModel,
      aiReasoningEffort,
      aiVerbosity,
      mobiworkBase,
      mobiworkUserId,
      mobiworkToken,
      ...weights
    } = values;

    try {
      await axios.patch("/api/settings", {
        shiftStart,
        lateAfter,
        shiftEnd,
        minWorkHours,
        timezone,
        visionEnabled: String(visionEnabled),
        aiProvider,
        aiBaseUrl,
        aiWireApi,
        aiApiKey,
        aiTextModel,
        aiVisionModel,
        aiReasoningEffort,
        aiVerbosity,
        mobiworkApiBase: mobiworkBase,
        mobiworkUserId,
        mobiworkToken: mobiworkToken || undefined,
        ruleWeights: weights,
      });
      message.success("Đã lưu cấu hình hệ thống");
    } catch {
      message.error("Lỗi khi cập nhật cấu hình");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <PageHeader
        title="Cài đặt"
        subtitle="Tham số ca làm, hệ số điểm phạt rule engine, và khóa bảo mật AI"
      />

      {loading ? (
        <Card bordered style={{ borderRadius: 10 }}>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      ) : (
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark>
          <Row gutter={[16, 16]}>
            {/* Shift & timezone */}
            <Col xs={24} lg={12}>
              <Card
                bordered
                style={{ borderRadius: 10, borderColor: palette.gray[150] }}
                title={
                  <Space size={8}>
                    <ClockCircleOutlined style={{ color: palette.gray[500] }} />
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      Ca làm việc & chuyên cần
                    </span>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="shiftStart"
                      label="Giờ bắt đầu ca"
                      rules={[{ required: true, message: "Nhập giờ bắt đầu" }]}
                    >
                      <Input placeholder="08:00" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="lateAfter"
                      label="Giới hạn đi trễ"
                      rules={[{ required: true, message: "Nhập giờ giới hạn" }]}
                    >
                      <Input placeholder="08:15" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="shiftEnd"
                      label="Giờ kết thúc ca"
                      rules={[{ required: true, message: "Nhập giờ kết thúc" }]}
                    >
                      <Input placeholder="17:00" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="minWorkHours"
                      label="Số giờ tối thiểu / ca"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        step={0.5}
                        min={0}
                        max={24}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  name="timezone"
                  label="Múi giờ làm việc"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={[
                      { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+7)" },
                      {
                        value: "Asia/Ho_Chi_Minh",
                        label: "Asia/Ho_Chi_Minh (UTC+7)",
                      },
                      { value: "Asia/Jakarta", label: "Asia/Jakarta (UTC+7)" },
                      { value: "UTC", label: "UTC" },
                    ]}
                  />
                </Form.Item>
              </Card>
            </Col>

            {/* AI Provider */}
            <Col xs={24} lg={12}>
              <Card
                bordered
                style={{ borderRadius: 10, borderColor: palette.gray[150] }}
                title={
                  <Space size={8}>
                    <RobotOutlined style={{ color: palette.gray[500] }} />
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      AI Provider
                    </span>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="aiProvider"
                      label="Provider"
                      rules={[{ required: true }]}
                    >
                      <Select
                        options={[
                          { value: "openai", label: "OpenAI / Compatible" },
                          { value: "9router", label: "9Router Gateway" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="aiWireApi"
                      label="Wire API"
                      rules={[{ required: true }]}
                    >
                      <Segmented
                        options={[
                          { value: "openai", label: "Chat Completions" },
                          { value: "responses", label: "Responses" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="aiBaseUrl" label="Base URL (Gateway)">
                  <Input placeholder="https://qrouter.online/v1" />
                </Form.Item>

                <Form.Item name="aiApiKey" label="API Key">
                  <Input.Password placeholder="Nhập API key..." />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="aiTextModel"
                      label="Text Model"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="cx/gpt-5.5 hoặc gpt-4o-mini" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="aiVisionModel"
                      label="Vision Model"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="cx/gpt-5.5 hoặc gpt-4o" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="aiReasoningEffort"
                      label="Reasoning Effort"
                    >
                      <Segmented
                        options={[
                          { value: "low", label: "Low" },
                          { value: "medium", label: "Medium" },
                          { value: "high", label: "High" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="aiVerbosity" label="Verbosity">
                      <Segmented
                        options={[
                          { value: "low", label: "Low" },
                          { value: "medium", label: "Medium" },
                          { value: "high", label: "High" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider style={{ margin: "16px 0" }} />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <Text strong style={{ fontSize: 13 }}>
                      AI Vision check-in
                    </Text>
                    <br />
                    <Text style={{ fontSize: 12, color: palette.gray[500] }}>
                      Phân loại chất lượng ảnh thực địa (mặc định tắt)
                    </Text>
                  </div>
                  <Form.Item
                    name="visionEnabled"
                    valuePropName="checked"
                    style={{ margin: 0 }}
                  >
                    <Switch />
                  </Form.Item>
                </div>

                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Space.Compact style={{ width: "100%" }}>
                    <Button
                      onClick={testText}
                      loading={testingText}
                      icon={<ExperimentOutlined />}
                      style={{ flex: 1 }}
                    >
                      Test Text AI
                    </Button>
                    <Button
                      onClick={testVision}
                      loading={testingVision}
                      style={{ flex: 1 }}
                    >
                      Test Vision
                    </Button>
                  </Space.Compact>
                  {textTestResult && (
                    <Alert
                      type={textTestResult.type}
                      showIcon
                      message={textTestResult.text}
                      closable
                      onClose={() => setTextTestResult(null)}
                    />
                  )}
                  {visionTestResult && (
                    <Alert
                      type={visionTestResult.type}
                      showIcon
                      message={visionTestResult.text}
                      closable
                      onClose={() => setVisionTestResult(null)}
                    />
                  )}
                </Space>
              </Card>
            </Col>

            {/* Mobiwork */}
            <Col xs={24} lg={12}>
              <Card
                bordered
                style={{ borderRadius: 10, borderColor: palette.gray[150] }}
                title={
                  <Space size={8}>
                    <SettingOutlined style={{ color: palette.gray[500] }} />
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      Mobiwork OpenAPI
                    </span>
                  </Space>
                }
              >
                <Form.Item
                  name="mobiworkBase"
                  label="API Base URL"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="https://openapi.mobiwork.vn" />
                </Form.Item>
                <Form.Item
                  name="mobiworkUserId"
                  label="User ID"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Mobiwork user id" />
                </Form.Item>
                <Form.Item
                  name="mobiworkToken"
                  label="API Token (để trống nếu không đổi)"
                >
                  <Input.Password placeholder="••••••" />
                </Form.Item>
              </Card>
            </Col>

            {/* Rule weights */}
            <Col xs={24} lg={12}>
              <Card
                bordered
                style={{ borderRadius: 10, borderColor: palette.gray[150] }}
                title={
                  <Space size={8}>
                    <SettingOutlined style={{ color: palette.gray[500] }} />
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      Hệ số điểm phạt (Rule Weights)
                    </span>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="missingCheckInPenalty"
                      label="Phạt thiếu Check-in"
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        max={100}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="missingCheckOutPenalty"
                      label="Phạt thiếu Check-out"
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        max={100}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="lateMinutePenaltyMultiplier"
                      label="Hệ số đi trễ / 5p"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="lateMaxPenalty" label="Phạt đi trễ tối đa">
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="earlyLeaveMinutePenaltyMultiplier"
                      label="Hệ số về sớm / 5p"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="earlyLeaveMaxPenalty"
                      label="Phạt về sớm tối đa"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="underHoursPenaltyMultiplier"
                      label="Hệ số thiếu giờ / 1h"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="underHoursMaxPenalty"
                      label="Phạt thiếu giờ tối đa"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="tooManyEventsPenalty"
                      label="Phạt quá nhiều lần chấm"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="duplicateEventPenalty"
                      label="Phạt chấm trùng lặp"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="noVisitPenalty"
                      label="Phạt ngày không viếng thăm"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="lowOnRouteRatePenalty"
                      label="Phạt sai tuyến"
                    >
                      <InputNumber style={{ width: "100%" }} min={0} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      )}
    </Space>
  );
}
