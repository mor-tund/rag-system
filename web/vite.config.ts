import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// SPA wired to the FastAPI backend. Dev proxies /api -> :8210 so the session
// cookie stays same-origin (no CORS dance). Override target via VITE_API_TARGET.
const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:8210";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    host: true,
    proxy: { "/api": { target: API_TARGET, changeOrigin: true } },
  },
});
