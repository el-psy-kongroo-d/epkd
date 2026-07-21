import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiGet } from "./client";

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) }) as Response;

describe("apiGet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("성공 엔벨로프 언래핑", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [1, 2] })));
    expect(await apiGet<number[]>("/api/posts")).toEqual([1, 2]);
  });

  it("에러 엔벨로프 → ApiClientError(code)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "POST_NOT_FOUND", message: "no" } })),
    );
    await expect(apiGet("/api/posts/x")).rejects.toMatchObject({ code: "POST_NOT_FOUND" });
    await expect(apiGet("/api/posts/x")).rejects.toBeInstanceOf(ApiClientError);
  });

  it("200인데 non-JSON(파싱 실패) 본문 → ApiClientError(INTERNAL)로 표면화 — 조용히 성공 처리하지 않는다", async () => {
    const res = {
      status: 200,
      headers: { get: () => null },
      json: () => Promise.reject(new SyntaxError("Unexpected token < in JSON")),
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));

    await expect(apiGet("/api/posts")).rejects.toMatchObject({ code: "INTERNAL" });
    await expect(apiGet("/api/posts")).rejects.toBeInstanceOf(ApiClientError);
  });
});
