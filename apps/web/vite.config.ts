import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @epkd/shared ships CommonJS (dist/index.js uses TS's __exportStar helper for
      // re-exports). Rollup's production build can't statically resolve named exports
      // (e.g. ErrorCode) through that pattern ("ErrorCode is not exported by
      // .../dist/index.js"), even though it works fine in dev/test and in the Nest api
      // app. Aliasing straight to the TS source sidesteps the CJS interop entirely —
      // esbuild/Rollup then see real ESM exports.
      "@epkd/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/rss.xml": "http://localhost:3000",
    },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
