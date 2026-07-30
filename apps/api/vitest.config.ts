import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 30_000 },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: "es2022",
      },
      module: { type: "es6" },
    }),
  ],
});
