import React, { useState } from "react";
import { App, Form, Input, Button, Card, Alert, Typography } from "antd";
import { UserOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import axios from "axios";
import { palette } from "../theme/tokens";

const { Text } = Typography;

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        "/api/auth/login",
        { email: values.email, password: values.password },
        { withCredentials: true }, // nhận cookie httpOnly refresh
      );

      const { access_token, user } = response.data;
      message.success("Đăng nhập thành công!");
      onLoginSuccess(access_token, user);
    } catch (e: any) {
      const msg =
        e.response?.data?.message ||
        "Đăng nhập thất bại. Kiểm tra lại thông tin!";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: palette.gray[50],
      }}
    >
      {/* Cột trái: form */}
      <div
        style={{
          flex: "1 1 480px",
          minWidth: 320,
          maxWidth: 560,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        <Card
          bordered
          style={{
            width: "100%",
            maxWidth: 400,
            background: palette.gray[0],
            borderRadius: 12,
            borderColor: palette.gray[200],
          }}
          styles={{ body: { padding: 40 } }}
        >
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${palette.brand[500]}, ${palette.brand[700]})`,
                color: "#fff",
                fontSize: 22,
                marginBottom: 14,
              }}
            >
              <SafetyOutlined />
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: palette.gray[900],
                letterSpacing: -0.01,
                marginBottom: 4,
              }}
            >
              Đăng nhập
            </div>
            <Text style={{ fontSize: 14, color: palette.gray[600] }}>
              Sử dụng tài khoản quản trị được cấp
            </Text>
          </div>

          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              style={{ marginBottom: 16 }}
            />
          )}

          <Form
            name="login_form"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Vui lòng điền email" },
                { type: "email", message: "Email không đúng định dạng" },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: palette.gray[400] }} />}
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: "Vui lòng điền mật khẩu" }]}
              style={{ marginBottom: 20 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: palette.gray[400] }} />}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              color: palette.gray[500],
              marginTop: 8,
            }}
          >
            Liên hệ quản trị viên nếu quên mật khẩu
          </div>
        </Card>
      </div>

      {/* Cột phải: brand panel (subtle) — ẩn ở màn < 960px */}
      <div
        className="login-brand-panel"
        style={{
          flex: 1,
          background: `linear-gradient(135deg, ${palette.brand[700]} 0%, ${palette.brand[900]} 100%)`,
          color: "#fff",
          padding: 60,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div>
          <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: 0.5 }}>
            DMS AI Admin
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.2,
              marginTop: 12,
              letterSpacing: -0.02,
              maxWidth: 480,
            }}
          >
            Quản trị chuyên cần & phân tích thực địa
          </div>
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              marginTop: 16,
              opacity: 0.85,
              maxWidth: 440,
            }}
          >
            Đồng bộ dữ liệu Mobiwork, chấm điểm chuyên cần bằng rule engine nội
            bộ, và nhận nhận định quản trị từ AI — tất cả trong một bảng điều
            khiển.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            fontSize: 13,
            opacity: 0.7,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, opacity: 1 }}>9</div>
            <div>Màn hình nghiệp vụ</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, opacity: 1 }}>10+</div>
            <div>Quy tắc chấm công</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, opacity: 1 }}>AI</div>
            <div>Nhận định quản trị</div>
          </div>
        </div>

        {/* Decorative blob — subtle */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 80,
            bottom: -100,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />
      </div>

      {/* Brand panel ẩn trên mobile đã được handle bằng CSS class trong global.css */}
    </div>
  );
}
