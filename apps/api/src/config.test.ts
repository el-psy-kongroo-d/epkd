import { describe, expect, it } from "vitest";
import { validateEnv } from "./config";

const valid = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "x".repeat(30),
  PUBLISH_TOKEN: "y".repeat(32),
};

describe("validateEnv", () => {
  it("passes when all required values are present and fills in defaults", () => {
    const result = validateEnv(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.BASE_URL).toBe("http://localhost:5173");
  });

  it("reports the issue when SUPABASE_URL is missing", () => {
    const { SUPABASE_URL: _omit, ...rest } = valid;
    const result = validateEnv(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join()).toContain("SUPABASE_URL");
  });

  it("rejects a short PUBLISH_TOKEN", () => {
    const result = validateEnv({ ...valid, PUBLISH_TOKEN: "short" });
    expect(result.ok).toBe(false);
  });
});
