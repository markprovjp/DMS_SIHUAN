import React, { useState, useEffect } from "react";
import { Layout, Drawer, Button, Grid } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { palette } from "../theme/tokens";
import TopBar from "./TopBar";
import SideNav from "./SideNav";

const { Content } = Layout;
const { useBreakpoint } = Grid;

interface AppLayoutProps {
  user: any;
  onLogout: () => void;
  children: React.ReactNode;
}

const COLLAPSE_KEY = "dms.sidenav.collapsed";
const MOBILE_BP = "md"; // < 768px là mobile

/** Shell layout gồm TopBar (trên) + SideNav (trái trên desktop / Drawer trên mobile) + Content. */
export default function AppLayout({
  user,
  onLogout,
  children,
}: AppLayoutProps) {
  const screens = useBreakpoint();
  const isMobile = !screens[MOBILE_BP as keyof typeof screens];

  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
      // đóng drawer khi chuyển sang mobile
      setMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, desktopCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [desktopCollapsed]);

  return (
    <Layout style={{ minHeight: "100vh", background: palette.gray[50] }}>
      <TopBar
        user={user}
        onLogout={onLogout}
        collapsed={isMobile ? false : desktopCollapsed}
        onToggleCollapse={() => {
          if (isMobile) {
            setMobileOpen((v) => !v);
          } else {
            setDesktopCollapsed((v) => !v);
          }
        }}
        isMobile={isMobile}
      />

      <Layout style={{ background: palette.gray[50] }}>
        {/* Desktop sider */}
        {!isMobile && (
          <SideNav
            collapsed={desktopCollapsed}
            onCollapse={setDesktopCollapsed}
            isMobile={false}
            onNavigate={() => {}}
          />
        )}

        {/* Mobile drawer */}
        {isMobile && (
          <Drawer
            placement="left"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            closable={false}
            width={280}
            styles={{
              body: { padding: 0, background: palette.gray[0] },
              header: { display: "none" },
            }}
          >
            <SideNav
              collapsed={false}
              onCollapse={() => {}}
              isMobile={true}
              onNavigate={() => setMobileOpen(false)}
            />
          </Drawer>
        )}

        <Content style={{ padding: 0 }}>
          <div className="page-container">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
