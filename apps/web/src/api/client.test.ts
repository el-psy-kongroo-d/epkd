import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiDelete, apiGet, invalidate } from "./client";

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) }) as Response;

describe("apiGet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    invalidate();
  });

  it("unwraps the success envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [1, 2] })));
    expect(await apiGet<number[]>("/api/posts")).toEqual([1, 2]);
  });

  it("error envelope → ApiClientError(code)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "POST_NOT_FOUND", message: "no" } })),
    );
    await expect(apiGet("/api/posts/x")).rejects.toMatchObject({ code: "POST_NOT_FOUND" });
    await expect(apiGet("/api/posts/x")).rejects.toBeInstanceOf(ApiClientError);
  });

  it("204 No Content (empty body) → success (undefined), no json() parsing attempted", async () => {
    const json = vi.fn().mockRejectedValue(new Error("should not be called on empty body"));
    const res = { status: 204, headers: { get: () => null }, json } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));

    await expect(apiDelete("/api/comments/1", { password: "x" })).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it("200 with non-JSON (unparseable) body → surfaced as ApiClientError(INTERNAL) — does not silently succeed", async () => {
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

describe("apiGet SWR cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    invalidate();
  });

  it("/api/posts returns the cached value immediately without refetching within the TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [1, 2] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await apiGet<number[]>("/api/posts")).toEqual([1, 2]);
    expect(await apiGet<number[]>("/api/posts")).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("/api/posts/:slug is also cached, but different slugs are fetched separately under distinct keys", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { slug: "a" } }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/posts/a");
    await apiGet("/api/posts/a");
    await apiGet("/api/posts/b");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("revalidate:true bypasses the cache and forces a refetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [1] }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/posts");
    await apiGet("/api/posts", { revalidate: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidate(path) clears the cache for a specific path only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [1] }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/posts");
    invalidate("/api/posts");
    await apiGet("/api/posts");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("/api/posts/:slug/comments paths (e.g. comments) are not cached and fetch every time (refetch after post is always fresh)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/posts/first-contribution/comments");
    await apiGet("/api/posts/first-contribution/comments");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
