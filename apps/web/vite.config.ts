import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/rss.xml": "http://localhost:3000",
    },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
