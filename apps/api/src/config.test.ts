import { describe, expect, it } from "vitest";
import { validateEnv } from "./config";

const valid = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "x".repeat(30),
  PUBLISH_TOKEN: "y".repeat(32),
};

describe("validateEnv", () => {
  it("필수 값이 모두 있으면 통과하고 기본값을 채운다", () => {
    const result = validateEnv(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.BASE_URL).toBe("http://localhost:5173");
  });

  it("SUPABASE_URL 누락 시 해당 이슈를 보고한다", () => {
    const { SUPABASE_URL: _omit, ...rest } = valid;
    const result = validateEnv(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join()).toContain("SUPABASE_URL");
  });

  it("짧은 PUBLISH_TOKEN 거부", () => {
    const result = validateEnv({ ...valid, PUBLISH_TOKEN: "short" });
    expect(result.ok).toBe(false);
  });
});
