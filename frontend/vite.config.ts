import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 部署在 https://<user>.github.io/<repo>/ 底下，CI 用 VITE_BASE 帶入 repo 名；本機 dev 走 "/"。
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
