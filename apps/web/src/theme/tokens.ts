// Design tokens — single source of truth for colors, radii, spacing, typography.
// Consumed by AntD ConfigProvider and custom CSS variables.
// Không hardcode màu/spacing/radius ở bất kỳ component nào khác.

export const palette = {
  // Neutrals — nền tảng cho mọi thứ
  gray: {
    0: "#FFFFFF",
    50: "#FAFAFA",
    100: "#F4F5F7",
    150: "#EDEFF2",
    200: "#E4E7EB",
    300: "#CBD2D9",
    400: "#9AA5B1",
    500: "#7B8794",
    600: "#616E7C",
    700: "#3E4C59",
    800: "#323F4B",
    850: "#26303B",
    900: "#1F2933",
    950: "#0F1620",
  },

  // Brand — slate-blue, không chói
  brand: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#5B6CE5", // PRIMARY
    600: "#4F5FD1",
    700: "#3F4FB8",
    800: "#3742A0",
    900: "#2D3685",
  },

  // Semantic
  success: { 50: "#ECFDF5", 500: "#10B981", 600: "#059669", 700: "#047857" },
  warning: { 50: "#FFFBEB", 500: "#F59E0B", 600: "#D97706", 700: "#B45309" },
  danger: { 50: "#FEF2F2", 500: "#EF4444", 600: "#DC2626", 700: "#B91C1C" },
  info: { 50: "#EFF6FF", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8" },

  // Severity riêng cho AI Analysis
  severity: {
    critical: "#B91C1C",
    high: "#DC2626",
    medium: "#D97706",
    low: "#0891B2",
    info: "#6B7280",
  },
} as const;

// AntD ConfigProvider theme — light mode mặc định
export const antdTheme = {
  token: {
    // Color
    colorPrimary: palette.brand[500],
    colorSuccess: palette.success[500],
    colorWarning: palette.warning[500],
    colorError: palette.danger[500],
    colorInfo: palette.info[500],

    colorBgBase: palette.gray[0],
    colorBgLayout: palette.gray[50],
    colorBgContainer: palette.gray[0],
    colorBgElevated: palette.gray[0],
    colorBgSpotlight: palette.gray[900],

    colorBorder: palette.gray[200],
    colorBorderSecondary: palette.gray[150],

    colorText: palette.gray[900],
    colorTextSecondary: palette.gray[600],
    colorTextTertiary: palette.gray[500],
    colorTextQuaternary: palette.gray[400],

    // Radius
    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Spacing
    padding: 16,
    paddingLG: 20,
    paddingSM: 12,
    paddingXS: 8,
    margin: 16,
    marginLG: 24,

    // Typography
    fontFamily:
      "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 13,
    fontSizeXL: 20,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    lineHeight: 1.6,
    lineHeightHeading1: 1.25,
    lineHeightHeading2: 1.3,
    lineHeightHeading3: 1.4,

    // Misc
    wireframe: false,
    motionDurationMid: "0.2s",
    motionEaseInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow:
      "0 1px 2px 0 rgba(15, 22, 32, 0.04), 0 1px 1px 0 rgba(15, 22, 32, 0.02)",
    boxShadowSecondary:
      "0 4px 12px -2px rgba(15, 22, 32, 0.08), 0 2px 4px -2px rgba(15, 22, 32, 0.04)",
  },
  components: {
    Layout: {
      headerBg: palette.gray[0],
      headerColor: palette.gray[900],
      headerHeight: 56,
      headerPadding: "0 24px",
      siderBg: palette.gray[0],
      bodyBg: palette.gray[50],
      triggerBg: "transparent",
      triggerColor: palette.gray[600],
    },
    Menu: {
      itemBg: "transparent",
      itemColor: palette.gray[600],
      itemHoverColor: palette.gray[900],
      itemHoverBg: palette.gray[100],
      itemSelectedBg: palette.brand[50],
      itemSelectedColor: palette.brand[600],
      itemActiveBg: palette.brand[50],
      itemBorderRadius: 6,
      itemMarginInline: 8,
      itemHeight: 36,
      iconSize: 16,
    },
    Card: {
      colorBgContainer: palette.gray[0],
      paddingLG: 20,
      borderRadiusLG: 10,
    },
    Table: {
      headerBg: palette.gray[50],
      headerColor: palette.gray[700],
      headerSplitColor: "transparent",
      borderColor: palette.gray[150],
      rowHoverBg: palette.gray[50],
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      headerBorderRadius: 0,
    },
    Button: {
      fontWeight: 500,
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
    },
    Input: {
      paddingBlock: 8,
      borderRadius: 8,
    },
    Select: { borderRadius: 8 },
    DatePicker: { borderRadius: 8 },
    Modal: {
      borderRadiusLG: 12,
      paddingContentHorizontalLG: 24,
    },
    Tag: {
      defaultBg: palette.gray[100],
      defaultColor: palette.gray[700],
    },
    Tabs: {
      itemSelectedColor: palette.brand[600],
      inkBarColor: palette.brand[500],
      itemHoverColor: palette.gray[900],
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 28,
    },
  },
} as const;
