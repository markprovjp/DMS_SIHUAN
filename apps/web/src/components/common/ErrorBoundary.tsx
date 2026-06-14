import React from "react";
import { Result, Button } from "antd";
import { palette } from "../../theme/tokens";

interface State {
  hasError: boolean;
  error?: Error;
}

interface Props {
  children: React.ReactNode;
}

/** Global Error Boundary — bắt mọi lỗi render không mong đợi.
 *  Hiển thị fallback Result thay vì crash trắng trang.
 *  Track error vào Sentry nếu Sentry đã init. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Nếu có Sentry global, capture
    const Sentry = (window as any).Sentry;
    if (Sentry?.captureException) {
      Sentry.captureException(error, { extra: info });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Có lỗi xảy ra"
          subTitle={
            <span style={{ color: palette.gray[600] }}>
              {this.state.error?.message ||
                "Lỗi không xác định. Vui lòng thử lại."}
            </span>
          }
          extra={[
            <Button
              type="primary"
              key="reload"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </Button>,
            <Button
              key="home"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Về Dashboard
            </Button>,
          ]}
        />
      );
    }
    return this.props.children;
  }
}
