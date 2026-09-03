import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api 与 /socket.io 代理到后端，避免开发期跨域，也贴合"同源"的部署形态
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 分包：把体积大的第三方库单独拆出，便于长缓存
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("@tanstack")) return "query";
            if (id.includes("socket.io") || id.includes("engine.io")) return "socket";
            if (id.includes("react")) return "react";
            return "vendor";
          }
        },
      },
    },
  },
});
