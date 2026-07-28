import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiDelete, apiGet, invalidate } from "./client";

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) }) as Response;

describe("apiGet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    invalidate();
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

  it("204 No Content(빈 본문) → 성공(undefined), json() 파싱 시도 안 함", async () => {
    const json = vi.fn().mockRejectedValue(new Error("should not be called on empty body"));
    const res = { status: 204, headers: { get: () => null }, json } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));

    await expect(apiDelete("/api/comments/1", { password: "x" })).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
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

describe("apiGet SWR 캐시", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    invalidate();
  });

  it("/api/posts는 TTL 내 재요청 시 fetch를 다시 하지 않고 캐시된 값을 즉시 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [1, 2] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await apiGet<number[]>("/api/posts")).toEqual([1, 2]);
    expect(await apiGet<number[]>("/api/posts")).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("/api/posts/:slug도 캐시되지만 서로 다른 slug는 별도 키로 각각 fetch된다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { slug: "a" } }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/posts/a");
    await apiGet("/api/posts/a");
    await apiGet("/api/posts/b");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("revalidate:true는 캐시를 무시하고 강제로 재요청한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [1] }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/posts");
    await apiGet("/api/posts", { revalidate: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidate(path)로 특정 경로만 캐시를 비운다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [1] }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/posts");
    invalidate("/api/posts");
    await apiGet("/api/posts");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("댓글 등 /api/posts/:slug/comments 경로는 캐시되지 않고 매번 fetch한다 (post 후 refetch가 항상 최신)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/posts/steins-gate/comments");
    await apiGet("/api/posts/steins-gate/comments");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
