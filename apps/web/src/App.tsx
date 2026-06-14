import React, { Suspense, lazy, useState, useEffect } from "react";
import { App as AntdApp, ConfigProvider, theme, Spin } from "antd";
import { antdTheme } from "./theme/tokens";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import axios from "axios";
import Login from "./components/Login";
import Layout from "./components/Layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { initSentry } from "./hooks/sentry";

// Init Sentry (no-op nếu VITE_SENTRY_DSN không set)
initSentry();

// Route-level code splitting — mỗi màn là 1 chunk riêng.
// Giảm bundle lần đầu xuống ~30-40%.
const Dashboard = lazy(() => import("./components/Dashboard"));
const Timesheet = lazy(() => import("./components/Timesheet"));
const Visits = lazy(() => import("./components/Visits"));
const Orders = lazy(() => import("./components/Orders"));
const KpiInventory = lazy(() => import("./components/KpiInventory"));
const AiAnalysis = lazy(() => import("./components/AiAnalysis"));
const SyncCenter = lazy(() => import("./components/SyncCenter"));
const Settings = lazy(() => import("./components/Settings"));
const Audit = lazy(() => import("./components/Audit"));

// Shared React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

// React Query Devtools — chỉ load trong dev. Optional dep, gracefully disabled nếu chưa cài.
const QueryDevtools: React.ComponentType<any> | null = (import.meta as any).env
  ?.DEV
  ? null // TODO: re-enable sau khi pin version match với react-query
  : null;

// Skeleton fallback khi đang load chunk
const PageLoader = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 360,
    }}
  >
    <Spin size="large" tip="Đang tải..." />
  </div>
);

// In-memory access token — KHÔNG lưu localStorage (giảm XSS token theft).
// Mất khi refresh page → cần silent refresh on app mount.
// Refresh token nằm trong httpOnly cookie do server set, browser tự gửi.
let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(t: string | null): void {
  inMemoryAccessToken = t;
}

// Inject bearer + withCredentials cho MỌI request
axios.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  // Gửi + nhận cookie httpOnly cho refresh token rotation
  config.withCredentials = true;
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

/** Gọi /api/auth/refresh — cookie httpOnly tự gửi kèm.
 *  Thành công → lưu access token mới vào memory, gọi lại các request đang chờ.
 *  Thất bại → trả null, caller redirect về /login. */
async function tryRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push((t) => resolve(t));
    });
  }
  isRefreshing = true;
  try {
    const res = await axios.post(
      "/api/auth/refresh",
      {},
      { withCredentials: true },
    );
    const newToken = res.data?.access_token as string | undefined;
    if (newToken) {
      inMemoryAccessToken = newToken;
      refreshSubscribers.forEach((cb) => cb(newToken));
      refreshSubscribers = [];
      return newToken;
    }
    refreshSubscribers.forEach((cb) => cb(null));
    refreshSubscribers = [];
    return null;
  } catch {
    refreshSubscribers.forEach((cb) => cb(null));
    refreshSubscribers = [];
    inMemoryAccessToken = null;
    return null;
  } finally {
    isRefreshing = false;
  }
}

// Intercept 401 → thử refresh 1 lần. Fail → redirect login.
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;

    // Không retry cho auth endpoints — fail trả về component luôn
    const isAuthEndpoint = original?.url?.includes("/api/auth/");

    if (status === 401 && !original?._retried && !isAuthEndpoint) {
      original._retried = true;
      const newToken = await tryRefresh();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return axios.request(original);
      }
      // Refresh fail → redirect login (chỉ khi đang ở protected route)
      inMemoryAccessToken = null;
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

function DashboardWrapper() {
  const navigate = useNavigate();
  const handleNavigate = (key: string) => {
    if (key === "ai_analysis") {
      navigate("/ai_analysis");
    } else if (key === "kpi_inventory") {
      navigate("/kpi_inventory");
    } else {
      navigate("/" + key);
    }
  };
  return <Dashboard setActiveKey={handleNavigate} />;
}

interface ProtectedRouteProps {
  user: any;
  onLogout: () => void;
  children: React.ReactNode;
}

function ProtectedRoute({ user, onLogout, children }: ProtectedRouteProps) {
  // Kiểm tra in-memory access token — nếu chưa có nhưng có cookie refresh hợp lệ
  // thì silent-refresh sẽ lấy token mới (xử lý ở App level trước khi render).
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout user={user} onLogout={onLogout}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </Layout>
  );
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  /** On mount: thử silent refresh để khôi phục access token từ cookie.
   *  Nếu cookie hết hạn → không có token → redirect login. */
  useEffect(() => {
    (async () => {
      const newToken = await tryRefresh();
      if (newToken) {
        try {
          const res = await axios.get("/api/auth/me", {
            withCredentials: true,
          });
          setUser(res.data);
        } catch {
          setAccessToken(null);
        }
      }
      setAuthReady(true);
    })();
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    setAccessToken(newToken);
    setUser(loggedUser);
  };

  const handleLogout = () => {
    setAccessToken(null);
    setUser(null);
    // Gọi API logout để revoke refresh token (server clear cookie)
    axios
      .post("/api/auth/logout", {}, { withCredentials: true })
      .catch(() => {})
      .finally(() => {
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }
      });
  };

  // Trong khi silent refresh đang chạy, hiện loader
  if (!authReady) {
    return (
      <ErrorBoundary>
        <ConfigProvider
          theme={{ ...antdTheme, algorithm: theme.defaultAlgorithm }}
        >
          <AntdApp>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
              }}
            >
              <Spin size="large" tip="Đang kiểm tra phiên đăng nhập..." />
            </div>
          </AntdApp>
        </ConfigProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          ...antdTheme,
          algorithm: theme.defaultAlgorithm,
        }}
      >
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <Routes>
                <Route
                  path="/login"
                  element={
                    getAccessToken() ? (
                      <Navigate to="/dashboard" replace />
                    ) : (
                      <Login onLoginSuccess={handleLoginSuccess} />
                    )
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <DashboardWrapper />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/timesheet"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <Timesheet />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/visits"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <Visits />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <Orders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kpi_inventory"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <KpiInventory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai_analysis"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <AiAnalysis />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sync"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <SyncCenter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute user={user} onLogout={handleLogout}>
                      <Audit />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="*"
                  element={
                    <Navigate
                      to={getAccessToken() ? "/dashboard" : "/login"}
                      replace
                    />
                  }
                />
              </Routes>
            </BrowserRouter>
            {QueryDevtools && (
              <Suspense fallback={null}>
                <QueryDevtools
                  initialIsOpen={false}
                  buttonPosition="bottom-left"
                />
              </Suspense>
            )}
          </QueryClientProvider>
        </AntdApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
}
