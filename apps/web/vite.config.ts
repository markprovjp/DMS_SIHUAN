import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://localhost:3005",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["@dms-admin/shared"],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    commonjsOptions: {
      include: [/[\\/]packages[\\/]shared[\\/]/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("echarts")) {
              return "vendor-echarts";
            }
            if (id.includes("antd") || id.includes("@ant-design") || id.includes("rc-")) {
              return "vendor-antd";
            }
            return "vendor-core";
          }
        },
      },
    },
  },
});
